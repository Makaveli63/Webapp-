-- GamingBase : notifications sur ton téléphone (nouveau commentaire, nouveau « j'aime »)
-- À exécuter APRÈS schema.sql, dans Supabase → SQL Editor → New query → Run.
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

-- Envoi d'une notification (asynchrone : n'attend pas la réponse, ne bloque jamais l'utilisateur).
create or replace function public.gb_notify(p_title text, p_message text, p_click text, p_tag text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_topic text := (select ntfy_topic from public.notify_config where id = 1);
begin
  if v_topic is null then return; end if;
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
exception when others then
  -- Une notification ratée ne doit jamais empêcher un commentaire ou un « j'aime ».
  raise warning 'notification non envoyée : %', sqlerrm;
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
  if cfg.ntfy_topic is null or not cfg.notify_likes then return new; end if;
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

revoke execute on function public.admin_set_notifications(text, boolean) from anon, authenticated, public;
revoke execute on function public.gb_notify(text, text, text, text) from anon, authenticated, public;
