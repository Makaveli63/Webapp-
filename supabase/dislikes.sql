-- GamingBase : « Je n'aime pas » sur les articles et les commentaires (à exécuter APRÈS schema.sql)
-- Supabase → SQL Editor → New query → coller ce fichier → Run. Ré-exécutable sans risque.
-- Un visiteur a soit un j'aime, soit un je n'aime pas sur un même contenu : l'un retire l'autre.

create table if not exists public.dislikes (
  target_type text not null check (target_type in ('article', 'comment')),
  target_id text not null check (char_length(target_id) between 1 and 200),
  voter text not null check (char_length(voter) between 8 and 64),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, voter)
);
create index if not exists dislikes_ip_idx on public.dislikes (ip_hash, created_at desc);
alter table public.dislikes enable row level security;
revoke all on public.dislikes from anon, authenticated;

-- « Je n'aime pas » / l'annuler : renvoie le nouveau nombre. Retire le j'aime du même visiteur.
create or replace function public.toggle_dislike(p_type text, p_target text, p_voter text)
returns bigint
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
begin
  if p_type not in ('article', 'comment') or char_length(coalesce(p_voter, '')) not between 8 and 64 then
    raise exception 'REQUETE_INVALIDE';
  end if;
  if exists (select 1 from public.dislikes where target_type = p_type and target_id = p_target and voter = p_voter) then
    delete from public.dislikes where target_type = p_type and target_id = p_target and voter = p_voter;
  else
    if (select count(*) from public.dislikes where ip_hash = v_ip and created_at > now() - interval '1 minute') >= 30 then
      raise exception 'TROP_DE_MESSAGES';
    end if;
    insert into public.dislikes (target_type, target_id, voter, ip_hash) values (p_type, left(p_target, 200), p_voter, v_ip);
    delete from public.likes where target_type = p_type and target_id = p_target and voter = p_voter;
  end if;
  return (select count(*) from public.dislikes where target_type = p_type and target_id = p_target);
end $$;

-- Même fonction que dans schema.sql, qui retire en plus le « je n'aime pas » quand on aime.
create or replace function public.toggle_like(p_type text, p_target text, p_voter text)
returns bigint
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
begin
  if p_type not in ('article', 'comment') or char_length(coalesce(p_voter, '')) not between 8 and 64 then
    raise exception 'REQUETE_INVALIDE';
  end if;
  if exists (select 1 from public.likes where target_type = p_type and target_id = p_target and voter = p_voter) then
    delete from public.likes where target_type = p_type and target_id = p_target and voter = p_voter;
  else
    if (select count(*) from public.likes where ip_hash = v_ip and created_at > now() - interval '1 minute') >= 30 then
      raise exception 'TROP_DE_MESSAGES';
    end if;
    insert into public.likes (target_type, target_id, voter, ip_hash) values (p_type, left(p_target, 200), p_voter, v_ip);
    delete from public.dislikes where target_type = p_type and target_id = p_target and voter = p_voter;
  end if;
  return (select count(*) from public.likes where target_type = p_type and target_id = p_target);
end $$;

-- Nombre de « je n'aime pas » de plusieurs contenus (articles ou commentaires) et ceux de ce visiteur.
create or replace function public.get_dislikes(p_type text, p_ids text[], p_voter text)
returns table (id text, dislikes bigint, disliked boolean)
language sql stable security definer set search_path = public, extensions as $$
  select s, (select count(*) from public.dislikes d where d.target_type = p_type and d.target_id = s),
         exists (select 1 from public.dislikes d where d.target_type = p_type and d.target_id = s and d.voter = p_voter)
  from unnest(p_ids[1:100]) as s
$$;

grant execute on function public.toggle_dislike(text, text, text) to anon;
grant execute on function public.toggle_like(text, text, text) to anon;
grant execute on function public.get_dislikes(text, text[], text) to anon;
