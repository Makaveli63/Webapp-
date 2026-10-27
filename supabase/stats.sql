-- GamingBase : statistiques de fréquentation et tableau de bord privé (à exécuter APRÈS schema.sql)
-- Supabase → SQL Editor → New query → coller ce fichier → Run.
-- Puis choisir le mot de passe du tableau de bord (dans le SQL Editor, jamais sur le site) :
--   select public.admin_set_password('un-mot-de-passe-long-et-unique');
--
-- Respect de la vie privée : aucun cookie, aucune adresse IP stockée. Un visiteur est compté une fois
-- par jour grâce à une empreinte (IP + navigateur + jour + sel secret) qui change chaque jour :
-- impossible de suivre quelqu'un d'un jour à l'autre. Données effacées après 13 mois.

create table if not exists public.page_views (
  id bigserial primary key,
  day date not null default (now() at time zone 'Europe/Paris')::date,
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 200),
  source text check (char_length(source) <= 100),
  device text not null check (device in ('mobile', 'tablette', 'ordinateur')),
  visitor text not null
);
create index if not exists page_views_day_idx on public.page_views (day);
create index if not exists page_views_visitor_idx on public.page_views (visitor, created_at desc);

create table if not exists public.admin_config (
  id int primary key default 1 check (id = 1),
  password_hash text,
  salt text not null default encode(extensions.gen_random_bytes(32), 'hex')
);
insert into public.admin_config (id) values (1) on conflict do nothing;

create table if not exists public.admin_attempts (
  ip_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.page_views enable row level security;
alter table public.admin_config enable row level security;
alter table public.admin_attempts enable row level security;
revoke all on public.page_views, public.admin_config, public.admin_attempts from anon, authenticated;

-- ---------------------------------------------------------------- Mesure d'audience
create or replace function public.track_view(p_path text, p_source text, p_device text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip text := split_part(coalesce(headers ->> 'x-forwarded-for', headers ->> 'x-real-ip', ''), ',', 1);
  today date := (now() at time zone 'Europe/Paris')::date;
  v_visitor text;
begin
  if p_path is null or left(p_path, 1) <> '/' or char_length(p_path) > 200 then return; end if;
  if p_device not in ('mobile', 'tablette', 'ordinateur') then return; end if;
  v_visitor := left(encode(digest(
    (select salt from public.admin_config where id = 1) || '|' || trim(ip) || '|' ||
    coalesce(headers ->> 'user-agent', '') || '|' || today::text, 'sha256'), 'hex'), 20);
  -- Anti-abus : au-delà de 300 pages vues par heure pour une même empreinte, on n'enregistre plus.
  if (select count(*) from public.page_views where visitor = v_visitor and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  insert into public.page_views (day, path, source, device, visitor)
  values (today, p_path, nullif(left(lower(trim(coalesce(p_source, ''))), 100), ''), p_device, v_visitor);
  -- Ménage occasionnel : conservation 13 mois.
  if random() < 0.01 then delete from public.page_views where day < today - 400; end if;
end $$;

-- ---------------------------------------------------------------- Accès administrateur
create or replace function public.admin_set_password(p_password text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if char_length(coalesce(p_password, '')) < 10 then raise exception 'MOT_DE_PASSE_TROP_COURT (10 caractères minimum)'; end if;
  update public.admin_config set password_hash = crypt(p_password, gen_salt('bf', 10)) where id = 1;
  return 'Mot de passe du tableau de bord enregistré.';
end $$;

-- Vérifie le mot de passe. Renvoie 'ok', 'ACCES_REFUSE' ou 'TROP_DE_TENTATIVES' sans lever d'erreur :
-- une erreur annulerait aussi l'enregistrement de l'essai raté, et la limite ne servirait à rien.
create or replace function public.gb_admin_check(p_password text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
  v_hash text := (select password_hash from public.admin_config where id = 1);
begin
  -- 5 essais ratés en 15 minutes au maximum par adresse (protection contre les essais en série).
  if (select count(*) from public.admin_attempts where ip_hash = v_ip and created_at > now() - interval '15 minutes') >= 5 then
    return 'TROP_DE_TENTATIVES';
  end if;
  if v_hash is null or p_password is null or crypt(p_password, v_hash) <> v_hash then
    insert into public.admin_attempts (ip_hash) values (v_ip);
    return 'ACCES_REFUSE';
  end if;
  delete from public.admin_attempts where created_at < now() - interval '1 day';
  return 'ok';
end $$;

create or replace function public.admin_stats(p_password text, p_days int default 30)
returns json
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  n int := least(greatest(coalesce(p_days, 30), 1), 365);
  today date := (now() at time zone 'Europe/Paris')::date;
  d_from date := today - (n - 1);
  p_from date := d_from - n;
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return json_build_object('error', v_check); end if;
  return json_build_object(
    'days', n,
    'totals', json_build_object(
      'views', (select count(*) from page_views where day >= d_from),
      'visitors', (select count(distinct (day, visitor)) from page_views where day >= d_from),
      'likes', (select count(*) from likes where created_at >= d_from),
      'likes_total', (select count(*) from likes),
      'comments', (select count(*) from comments where created_at >= d_from),
      'comments_total', (select count(*) from comments),
      'reported', (select count(distinct comment_id) from reports r join comments c on c.id = r.comment_id where not c.hidden)
    ),
    'previous', json_build_object(
      'views', (select count(*) from page_views where day >= p_from and day < d_from),
      'visitors', (select count(distinct (day, visitor)) from page_views where day >= p_from and day < d_from)
    ),
    'daily', (select coalesce(json_agg(json_build_object('day', g.day::date, 'views', coalesce(v.views, 0), 'visitors', coalesce(v.visitors, 0)) order by g.day), '[]')
              from generate_series(d_from, today, interval '1 day') as g(day)
              left join (select day, count(*) as views, count(distinct visitor) as visitors from page_views where day >= d_from group by day) v
                on v.day = g.day::date),
    'pages', (select coalesce(json_agg(t), '[]') from (select path, count(*) as views from page_views where day >= d_from group by path order by 2 desc limit 10) t),
    'sources', (select coalesce(json_agg(t), '[]') from (select coalesce(source, 'Accès direct') as source, count(*) as views from page_views where day >= d_from group by 1 order by 2 desc limit 8) t),
    'devices', (select coalesce(json_agg(t), '[]') from (select device, count(*) as views from page_views where day >= d_from group by device order by 2 desc) t),
    'liked', (select coalesce(json_agg(t), '[]') from (select target_id as slug, count(*) as likes from likes where target_type = 'article' group by target_id order by 2 desc limit 10) t),
    'comments', (select coalesce(json_agg(t), '[]') from (
                   select c.id, c.article_slug as slug, c.author, c.body, c.created_at, c.hidden,
                          (select count(*) from reports r where r.comment_id = c.id) as reports
                   from comments c order by (select count(*) from reports r where r.comment_id = c.id) > 0 and not c.hidden desc, c.created_at desc limit 40) t)
  );
end $$;

-- Modération depuis le tableau de bord : masquer, réafficher ou supprimer un commentaire.
create or replace function public.admin_moderate(p_password text, p_id uuid, p_action text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  if p_action = 'hide' then update comments set hidden = true where id = p_id;
  elsif p_action = 'show' then update comments set hidden = false where id = p_id; delete from reports where comment_id = p_id;
  elsif p_action = 'delete' then delete from comments where id = p_id;
  else return 'ACTION_INCONNUE';
  end if;
  return 'ok';
end $$;

revoke execute on function public.admin_set_password(text) from anon, authenticated, public;
revoke execute on function public.gb_admin_check(text) from anon, authenticated, public;
grant execute on function public.track_view(text, text, text) to anon;
grant execute on function public.admin_stats(text, int) to anon;
grant execute on function public.admin_moderate(text, uuid, text) to anon;
