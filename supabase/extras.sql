-- GamingBase : sondage de la semaine et synchronisation entre appareils (à exécuter APRÈS schema.sql)
-- Supabase → SQL Editor → New query → coller ce fichier → Run. Ré-exécutable sans risque.

-- ---------------------------------------------------------------- Sondage de la semaine
-- Les questions et réponses sont définies sur le site (src/data/polls.json) ; la base ne garde que les votes.
create table if not exists public.poll_votes (
  poll_id text not null check (poll_id ~ '^[0-9]{4}-W[0-9]{2}$'),
  option_id text not null check (option_id ~ '^[a-z0-9-]{1,80}$'),
  voter text not null check (char_length(voter) between 8 and 64),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter)
);
create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id, option_id);
alter table public.poll_votes enable row level security;
revoke all on public.poll_votes from anon, authenticated;

-- Vote (ou change son vote). 3 votants max par adresse et par sondage (foyer, partage de connexion).
create or replace function public.vote_poll(p_poll text, p_option text, p_voter text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
begin
  if p_poll !~ '^[0-9]{4}-W[0-9]{2}$' or p_option !~ '^[a-z0-9-]{1,80}$' or char_length(coalesce(p_voter, '')) not between 8 and 64 then
    raise exception 'VOTE_INVALIDE';
  end if;
  if not exists (select 1 from poll_votes where poll_id = p_poll and voter = p_voter)
     and (select count(*) from poll_votes where poll_id = p_poll and ip_hash = v_ip) >= 3 then
    raise exception 'TROP_DE_VOTES';
  end if;
  insert into poll_votes (poll_id, option_id, voter, ip_hash) values (p_poll, p_option, p_voter, v_ip)
  on conflict (poll_id, voter) do update set option_id = excluded.option_id, created_at = now();
  if random() < 0.01 then delete from poll_votes where created_at < now() - interval '400 days'; end if;
end $$;

-- Résultats : nombre de votes par réponse + la réponse choisie par ce votant.
create or replace function public.get_poll(p_poll text, p_voter text)
returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'counts', coalesce((select json_object_agg(option_id, n) from (
        select option_id, count(*) as n from poll_votes where poll_id = p_poll group by option_id) t), '{}'::json),
    'mine', (select option_id from poll_votes where poll_id = p_poll and voter = p_voter)
  )
$$;

-- ---------------------------------------------------------------- Synchronisation entre appareils
-- Un « code de synchronisation » secret (16 caractères, ~80 bits) relie les appareils d'une même
-- personne, sans compte ni email. La base ne stocke que l'empreinte du code, jamais le code.
create table if not exists public.sync_store (
  code_hash text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.sync_attempts (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists sync_attempts_idx on public.sync_attempts (ip_hash, created_at desc);
alter table public.sync_store enable row level security;
alter table public.sync_attempts enable row level security;
revoke all on public.sync_store, public.sync_attempts from anon, authenticated;

create or replace function public.gb_sync_hash(p_code text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
begin
  if p_code is null or p_code !~ '^[A-HJ-NP-Z2-9]{16}$' then raise exception 'CODE_INVALIDE'; end if;
  -- Limite : 120 opérations par heure et par adresse.
  if (select count(*) from sync_attempts where ip_hash = v_ip and created_at > now() - interval '1 hour') >= 120 then
    raise exception 'TROP_DE_REQUETES';
  end if;
  insert into sync_attempts (ip_hash) values (v_ip);
  if random() < 0.02 then delete from sync_attempts where created_at < now() - interval '1 day'; end if;
  return encode(digest('gamingbase-sync|' || p_code, 'sha256'), 'hex');
end $$;

create or replace function public.sync_save(p_code text, p_data jsonb)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_hash text := public.gb_sync_hash(p_code);
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 300000 then
    raise exception 'DONNEES_INVALIDES';
  end if;
  insert into sync_store (code_hash, data, updated_at) values (v_hash, p_data, now())
  on conflict (code_hash) do update set data = excluded.data, updated_at = now();
  if random() < 0.01 then delete from sync_store where updated_at < now() - interval '400 days'; end if;
  return 'ok';
end $$;

create or replace function public.sync_load(p_code text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_hash text := public.gb_sync_hash(p_code);
begin
  return (select data from sync_store where code_hash = v_hash);
end $$;

revoke execute on function public.gb_sync_hash(text) from anon, authenticated, public;
grant execute on function public.vote_poll(text, text, text) to anon;
grant execute on function public.get_poll(text, text) to anon;
grant execute on function public.sync_save(text, jsonb) to anon;
grant execute on function public.sync_load(text) to anon;
