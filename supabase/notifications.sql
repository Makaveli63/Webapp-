-- GamingBase : notifications sur ton téléphone (nouveau commentaire, nouveau « j'aime »)
-- À exécuter APRÈS schema.sql et stats.sql (et profiles.sql pour l'alerte « nouveau joueur »), dans Supabase → SQL Editor → New query → Run.
--
-- Les notifications passent par ntfy (https://ntfy.sh), service gratuit sans compte :
--   1. installe l'app « ntfy » sur ton iPhone (App Store) ;
--   2. dans l'app : « + » → choisis un nom de sujet long et impossible à deviner
--      (ex. gamingbase-makaveli-8f3k2q9x7z) → Subscribe ;
--   3. ici, dans le SQL Editor, lance (avec TON nom de sujet) :
--        select public.admin_set_notifications('gamingbase-makaveli-8f3k2q9x7z', true);
--      le second paramètre : true = aussi les « j'aime », false = commentaires seulement.
--   Pour tout couper : select public.admin_set_notifications(null, false);
--
-- Le nom du sujet sert de clé : quiconque le connaît peut lire les notifications. Garde-le pour toi.
-- Les notifications ne contiennent que le pseudo, le début du commentaire et l'article concerné.
--
-- AUSSI (ou à la place) : alertes admin sur ton iPhone / ton PC par OneSignal, sans appli à installer.
--   1. Dans le SQL Editor, dans une requête À PART (ne pas l'enregistrer, ne la partager avec personne),
--      avec la même clé API OneSignal que le secret ONESIGNAL_API_KEY de GitHub :
--        select vault.create_secret('os_v2_app_…', 'onesignal_api_key');
--   2. Tableau de bord du site → « Alertes admin » → « Recevoir les alertes sur cet appareil ».
-- Alertes : suggestions, commentaires, signalements, nouveaux joueurs, articles des rédacteurs (+ « j'aime » si activé).

create extension if not exists pg_net; -- requêtes HTTP sortantes depuis la base (fourni par Supabase)

create table if not exists public.notify_config (
  id int primary key default 1 check (id = 1),
  ntfy_topic text check (ntfy_topic ~ '^[A-Za-z0-9_-]{12,64}$'),
  notify_likes boolean not null default true,
  site_url text not null default 'https://makaveli63.github.io/Webapp-'
);
insert into public.notify_config (id) values (1) on conflict do nothing;

-- Anti-rafale pour les « j'aime » : au plus une notification par article toutes les 15 minutes.
create table if not exists public.notify_log (
  key text primary key,
  sent_at timestamptz not null default now(),
  pending int not null default 0
);

alter table public.notify_config enable row level security;
alter table public.notify_log enable row level security;
revoke all on public.notify_config, public.notify_log from anon, authenticated;

create or replace function public.admin_set_notifications(p_topic text, p_likes boolean default true)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if p_topic is not null and p_topic !~ '^[A-Za-z0-9_-]{12,64}$' then
    raise exception 'SUJET_INVALIDE : 12 à 64 caractères, lettres, chiffres, - ou _ uniquement';
  end if;
  update public.notify_config set ntfy_topic = p_topic, notify_likes = coalesce(p_likes, true) where id = 1;
  if p_topic is null then return 'Notifications désactivées.'; end if;
  perform public.gb_notify('GamingBase', 'Les notifications sont activées ✅', null, 'white_check_mark');
  return 'Notifications activées : une notification de test vient d''être envoyée.';
end $$;

-- Appareils de l'admin qui reçoivent les alertes par OneSignal (identifiant d'abonnement OneSignal).
create table if not exists public.admin_push (
  subscription_id text primary key check (subscription_id ~ '^[0-9a-fA-F-]{36}$'),
  label text not null default 'Appareil' check (char_length(label) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.admin_push enable row level security;
revoke all on public.admin_push from anon, authenticated;

-- Au moins un moyen d'alerte configuré (ntfy ou OneSignal) ?
create or replace function public.gb_notify_on()
returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.notify_config where id = 1 and ntfy_topic is not null)
      or exists (select 1 from public.admin_push)
$$;

-- Envoi d'une notification (asynchrone : n'attend pas la réponse, ne bloque jamais l'utilisateur).
create or replace function public.gb_notify(p_title text, p_message text, p_click text, p_tag text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_topic text := (select ntfy_topic from public.notify_config where id = 1);
  v_subs text[] := (select array_agg(subscription_id) from public.admin_push);
  v_key text;
begin
  if v_topic is not null then
    perform net.http_post(
      url := 'https://ntfy.sh/',
      body := jsonb_strip_nulls(jsonb_build_object(
        'topic', v_topic,
        'title', left(p_title, 120),
        'message', left(p_message, 300),
        'click', p_click,
        'tags', jsonb_build_array(p_tag)
      )),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  if v_subs is not null then
    begin
      v_key := (select decrypted_secret from vault.decrypted_secrets where name = 'onesignal_api_key');
    exception when others then
      v_key := null; -- coffre (vault) indisponible
    end;
    if v_key is not null then
      perform net.http_post(
        url := 'https://api.onesignal.com/notifications?c=push',
        body := jsonb_strip_nulls(jsonb_build_object(
          'app_id', 'a643844e-4e4c-4653-8d05-0dd407d79f8f',
          'target_channel', 'push',
          'include_subscription_ids', to_jsonb(v_subs),
          'headings', jsonb_build_object('en', left(p_title, 120), 'fr', left(p_title, 120)),
          'contents', jsonb_build_object('en', left(coalesce(nullif(p_message, ''), ' '), 300), 'fr', left(coalesce(nullif(p_message, ''), ' '), 300)),
          'url', p_click,
          'web_push_topic', 'gb-admin-' || coalesce(p_tag, 'info'),
          'ttl', 86400
        )),
        headers := jsonb_build_object('Authorization', 'Key ' || v_key, 'Content-Type', 'application/json')
      );
    end if;
  end if;
exception when others then
  -- Une notification ratée ne doit jamais empêcher un commentaire ou un « j'aime ».
  raise warning 'notification non envoyée : %', sqlerrm;
end $$;

-- Tableau de bord → « Alertes admin » (mot de passe admin vérifié par gb_admin_check, stats.sql).
create or replace function public.admin_push_register(p_password text, p_subscription text, p_label text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  if coalesce(p_subscription, '') !~ '^[0-9a-fA-F-]{36}$' then return 'REQUETE_INVALIDE'; end if;
  insert into public.admin_push (subscription_id, label) values (p_subscription, left(coalesce(nullif(trim(p_label), ''), 'Appareil'), 60))
  on conflict (subscription_id) do update set label = excluded.label;
  return 'ok';
end $$;

create or replace function public.admin_push_remove(p_password text, p_subscription text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  delete from public.admin_push where subscription_id = p_subscription;
  return 'ok';
end $$;

-- État : clé OneSignal enregistrée ?, ntfy configuré ?, « j'aime » inclus ?, appareils inscrits.
create or replace function public.admin_push_status(p_password text)
returns json
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
  v_key boolean := false;
begin
  if v_check <> 'ok' then return json_build_object('error', v_check); end if;
  begin
    v_key := exists (select 1 from vault.decrypted_secrets where name = 'onesignal_api_key' and coalesce(decrypted_secret, '') <> '');
  exception when others then
    v_key := false;
  end;
  return json_build_object(
    'has_key', v_key,
    'ntfy', exists (select 1 from public.notify_config where id = 1 and ntfy_topic is not null),
    'likes', coalesce((select notify_likes from public.notify_config where id = 1), true),
    'devices', coalesce((select json_agg(json_build_object('id', subscription_id, 'label', label, 'created_at', created_at) order by created_at desc) from public.admin_push), '[]'::json));
end $$;

create or replace function public.admin_push_likes(p_password text, p_on boolean)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  update public.notify_config set notify_likes = coalesce(p_on, false) where id = 1;
  return 'ok';
end $$;

create or replace function public.admin_push_test(p_password text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  perform public.gb_notify('GamingBase', 'Les alertes admin fonctionnent ✅', 'https://makaveli63.github.io/Webapp-/admin/', 'white_check_mark');
  return 'ok';
end $$;

-- « rss-gamekult-test-de-zelda » → « test de zelda » (le titre exact n'est pas dans la base).
create or replace function public.gb_slug_label(p_slug text)
returns text
language sql immutable as $$
  select left(regexp_replace(regexp_replace(coalesce(p_slug, ''), '^rss-[a-z0-9]+(-fr)?-', ''), '-', ' ', 'g'), 80)
$$;

create or replace function public.gb_on_comment()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_site text := (select site_url from public.notify_config where id = 1);
begin
  if not new.hidden then
    perform public.gb_notify(
      '💬 ' || new.author || ' a commenté',
      left(new.body, 200) || E'\n— ' || public.gb_slug_label(new.article_slug),
      v_site || '/actualites/' || new.article_slug || '/',
      'speech_balloon');
  end if;
  return new;
end $$;

create or replace function public.gb_on_like()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg public.notify_config := (select c from public.notify_config c where id = 1);
  v_slug text;
  v_what text;
  v_key text;
  v_last timestamptz;
  v_pending int;
begin
  if not public.gb_notify_on() or not cfg.notify_likes then return new; end if;
  if new.target_type = 'article' then
    v_slug := new.target_id;
    v_what := 'ton article';
  else
    select article_slug into v_slug from public.comments where id::text = new.target_id;
    v_what := 'un commentaire';
  end if;
  if v_slug is null then return new; end if;

  v_key := 'like:' || new.target_type || ':' || new.target_id;
  select sent_at, pending into v_last, v_pending from public.notify_log where key = v_key;
  if v_last is not null and v_last > now() - interval '15 minutes' then
    update public.notify_log set pending = pending + 1 where key = v_key; -- regroupé dans la prochaine
    return new;
  end if;
  insert into public.notify_log (key, sent_at, pending) values (v_key, now(), 0)
    on conflict (key) do update set sent_at = now(), pending = 0;
  perform public.gb_notify(
    '❤️ ' || case when coalesce(v_pending, 0) > 0 then (v_pending + 1) || ' nouveaux j''aime' else 'Nouveau j''aime' end,
    'Sur ' || v_what || ' : ' || public.gb_slug_label(v_slug),
    cfg.site_url || '/actualites/' || v_slug || '/',
    'heart');
  -- Ménage occasionnel.
  if random() < 0.02 then delete from public.notify_log where sent_at < now() - interval '2 days'; end if;
  return new;
end $$;

drop trigger if exists gb_comment_notify on public.comments;
create trigger gb_comment_notify after insert on public.comments
  for each row execute function public.gb_on_comment();

drop trigger if exists gb_like_notify on public.likes;
create trigger gb_like_notify after insert on public.likes
  for each row execute function public.gb_on_like();

-- Premier signalement d'un commentaire (puis masquage automatique au 3e, voir schema.sql).
create or replace function public.gb_on_report()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_comment public.comments;
begin
  if (select count(*) from public.reports where comment_id = new.comment_id) <> 1 then return new; end if;
  select * into v_comment from public.comments where id = new.comment_id;
  if not found then return new; end if;
  perform public.gb_notify(
    '🚩 Commentaire signalé',
    v_comment.author || ' : ' || left(v_comment.body, 200),
    (select site_url from public.notify_config where id = 1) || '/admin/',
    'triangular_flag_on_post');
  return new;
end $$;

drop trigger if exists gb_report_notify on public.reports;
create trigger gb_report_notify after insert on public.reports
  for each row execute function public.gb_on_report();

-- Nouveau joueur (profil créé avec un pseudo : profiles.sql).
create or replace function public.gb_on_player()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.gb_notify('🎮 Nouveau joueur', new.pseudo || ' vient de créer son profil.',
    (select site_url from public.notify_config where id = 1) || '/admin/', 'video_game');
  return new;
end $$;

do $$ begin
  if to_regclass('public.players') is not null then
    drop trigger if exists gb_player_notify on public.players;
    create trigger gb_player_notify after insert on public.players
      for each row execute function public.gb_on_player();
  end if;
end $$;

revoke execute on function public.admin_set_notifications(text, boolean) from anon, authenticated, public;
revoke execute on function public.gb_notify_on() from anon, authenticated, public;
grant execute on function public.admin_push_register(text, text, text) to anon;
grant execute on function public.admin_push_remove(text, text) to anon;
grant execute on function public.admin_push_status(text) to anon;
grant execute on function public.admin_push_likes(text, boolean) to anon;
grant execute on function public.admin_push_test(text) to anon;
revoke execute on function public.gb_notify(text, text, text, text) from anon, authenticated, public;
