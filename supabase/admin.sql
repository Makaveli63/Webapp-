-- GamingBase : outils du tableau de bord (à exécuter APRÈS schema.sql, stats.sql et profiles.sql)
-- Supabase → SQL Editor → New query → coller ce fichier → Run. Ré-exécutable sans risque.
-- Chaque action d'administration vérifie le mot de passe (gb_admin_check : 5 essais ratés / 15 min au plus).

-- ---------------------------------------------------------------- Appareils connectés en admin
create table if not exists public.admin_devices (
  voter text primary key check (char_length(voter) between 8 and 64),
  label text not null default 'Appareil' check (char_length(label) between 1 and 60),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revoked boolean not null default false
);
alter table public.admin_devices enable row level security;
revoke all on public.admin_devices from anon, authenticated;

-- Connexion réussie : l'appareil est (ré)inscrit dans la liste.
create or replace function public.admin_register_device(p_password text, p_voter text, p_label text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  if char_length(coalesce(p_voter, '')) not between 8 and 64 then return 'REQUETE_INVALIDE'; end if;
  insert into public.admin_devices as d (voter, label) values (p_voter, left(coalesce(nullif(trim(p_label), ''), 'Appareil'), 60))
  on conflict (voter) do update set label = excluded.label, last_seen = now(), revoked = false;
  return 'ok';
end $$;

create or replace function public.admin_list_devices(p_password text)
returns json
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return json_build_object('error', v_check); end if;
  return coalesce((select json_agg(json_build_object('voter', voter, 'label', label, 'first_seen', first_seen, 'last_seen', last_seen) order by last_seen desc)
                   from public.admin_devices where not revoked), '[]'::json);
end $$;

-- « Oublier » : l'appareil perd l'onglet Admin et son mot de passe enregistré à sa prochaine ouverture.
create or replace function public.admin_forget_device(p_password text, p_voter text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  update public.admin_devices set revoked = true where voter = p_voter;
  return 'ok';
end $$;

-- Lu par chaque appareil (sans mot de passe) : 'revoked' s'il a été oublié, sinon 'ok'.
create or replace function public.admin_device_status(p_voter text)
returns text
language sql stable security definer set search_path = public, extensions as $$
  select case when exists (select 1 from public.admin_devices where voter = p_voter and revoked) then 'revoked' else 'ok' end
$$;

-- ---------------------------------------------------------------- Joueurs inscrits et « je n'aime pas »
create or replace function public.admin_community(p_password text)
returns json
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
  v_players json := '{"total":0,"week":0,"list":[]}'::json;
  v_dislikes json := '{"total":0,"top":[]}'::json;
begin
  if v_check <> 'ok' then return json_build_object('error', v_check); end if;
  if to_regclass('public.players') is not null then
    execute $q$
      select json_build_object(
        'total', (select count(*) from public.players),
        'week', (select count(*) from public.players where created_at > now() - interval '7 days'),
        'list', coalesce((select json_agg(p order by p.created_at desc) from (
          select pseudo, avatar, xp, role, created_at, updated_at from public.players order by created_at desc limit 300) p), '[]'::json))
    $q$ into v_players;
  end if;
  if to_regclass('public.dislikes') is not null then
    execute $q$
      select json_build_object(
        'total', (select count(*) from public.dislikes),
        'top', coalesce((select json_agg(t) from (
          select target_id as slug, count(*) as n from public.dislikes where target_type = 'article'
          group by target_id order by count(*) desc limit 10) t), '[]'::json))
    $q$ into v_dislikes;
  end if;
  return json_build_object('players', v_players, 'dislikes', v_dislikes);
end $$;

-- Badge « Soutien » sur un pseudo (null pour le retirer). Le badge « Fondateur » est réservé au site.
create or replace function public.admin_set_role(p_password text, p_pseudo text, p_role text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  if p_role is not null and p_role <> 'Soutien' then return 'REQUETE_INVALIDE'; end if;
  execute 'update public.players set role = $1 where pseudo_key = lower($2)' using p_role, trim(coalesce(p_pseudo, ''));
  return 'ok';
end $$;

-- ---------------------------------------------------------------- Sources d'actus ajoutées par l'admin
create table if not exists public.admin_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  url text not null unique check (url ~ '^https://[^\s]{4,500}$'),
  category text check (category is null or category = 'Anime'),
  created_at timestamptz not null default now()
);
alter table public.admin_sources enable row level security;
revoke all on public.admin_sources from anon, authenticated;

create or replace function public.admin_add_source(p_password text, p_name text, p_url text, p_category text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  if (select count(*) from public.admin_sources) >= 40 then return 'TROP_DE_SOURCES'; end if;
  insert into public.admin_sources (name, url, category)
  values (trim(p_name), trim(p_url), case when p_category = 'Anime' then 'Anime' end);
  return 'ok';
exception
  when unique_violation then return 'SOURCE_EXISTANTE';
  when check_violation then return 'SOURCE_INVALIDE';
end $$;

create or replace function public.admin_delete_source(p_password text, p_id uuid)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  delete from public.admin_sources where id = p_id;
  return 'ok';
end $$;

-- Lecture publique (noms et adresses de flux publics), utilisée à chaque mise à jour du site.
create or replace function public.get_sources()
returns json
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(json_agg(json_build_object('id', id, 'name', name, 'url', url, 'category', category) order by created_at), '[]'::json)
  from public.admin_sources
$$;

-- ---------------------------------------------------------------- Grosses sorties ajoutées par l'admin
create table if not exists public.admin_releases (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  release_date date not null check (release_date > date '2020-01-01'),
  platforms text[] not null default '{}',
  image text check (image is null or image ~ '^https://'),
  source text check (source is null or source ~ '^https://'),
  created_at timestamptz not null default now()
);
alter table public.admin_releases enable row level security;
revoke all on public.admin_releases from anon, authenticated;

create or replace function public.admin_add_release(p_password text, p_title text, p_date date, p_platforms text[], p_image text, p_source text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  insert into public.admin_releases (title, release_date, platforms, image, source)
  values (trim(p_title), p_date,
          (select coalesce(array_agg(p), '{}') from unnest(coalesce(p_platforms, '{}')) p where p in ('PC', 'PS5', 'Switch 2', 'Xbox', 'Mobile', 'Multi')),
          nullif(trim(coalesce(p_image, '')), ''), nullif(trim(coalesce(p_source, '')), ''));
  return 'ok';
exception when check_violation or invalid_datetime_format then
  return 'SORTIE_INVALIDE';
end $$;

create or replace function public.admin_delete_release(p_password text, p_id uuid)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  delete from public.admin_releases where id = p_id;
  return 'ok';
end $$;

-- Lecture publique, utilisée à chaque mise à jour du site (sorties à venir seulement).
create or replace function public.get_admin_releases()
returns json
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(json_agg(json_build_object('id', id, 'title', title, 'date', release_date, 'platforms', platforms, 'image', image, 'source', source)
                           order by release_date), '[]'::json)
  from public.admin_releases where release_date >= current_date - 1
$$;

grant execute on function public.admin_register_device(text, text, text) to anon;
grant execute on function public.admin_list_devices(text) to anon;
grant execute on function public.admin_forget_device(text, text) to anon;
grant execute on function public.admin_device_status(text) to anon;
grant execute on function public.admin_community(text) to anon;
grant execute on function public.admin_set_role(text, text, text) to anon;
grant execute on function public.admin_add_source(text, text, text, text) to anon;
grant execute on function public.admin_delete_source(text, uuid) to anon;
grant execute on function public.get_sources() to anon;
grant execute on function public.admin_add_release(text, text, date, text[], text, text) to anon;
grant execute on function public.admin_delete_release(text, uuid) to anon;
grant execute on function public.get_admin_releases() to anon;
