-- GamingBase : profil joueur (pseudo unique, avatar, XP) — à exécuter APRÈS schema.sql
-- Supabase → SQL Editor → New query → coller ce fichier → Run. Ré-exécutable sans risque.
-- Sans compte : le joueur est l'identifiant anonyme de l'appareil (voter), comme pour les j'aime.

create table if not exists public.players (
  voter text primary key check (char_length(voter) between 8 and 64),
  pseudo text not null check (char_length(pseudo) between 3 and 20),
  pseudo_key text not null unique, -- pseudo en minuscules : « Kenji » et « kenji » sont le même pseudo
  avatar smallint not null default 0 check (avatar between 0 and 11),
  xp integer not null default 0 check (xp between 0 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Badge attribué par l'admin (« Soutien »), affiché à côté du pseudo.
alter table public.players add column if not exists role text check (role is null or role in ('Soutien'));
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

-- Pseudo valable et libre ? 'ok', ou le code d'erreur affiché par le site.
create or replace function public.check_pseudo(p_pseudo text, p_voter text)
returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v text := trim(coalesce(p_pseudo, ''));
begin
  if v !~ '^[[:alnum:]_.-]{3,20}$' then return 'PSEUDO_FORMAT'; end if;
  if public.gb_is_offensive(v) then return 'PROPOS_INTERDITS'; end if;
  if exists (select 1 from public.players where pseudo_key = lower(v) and voter <> coalesce(p_voter, '')) then return 'PSEUDO_PRIS'; end if;
  return 'ok';
end $$;

-- Création ou mise à jour du profil. L'XP ne peut que monter, et de 3 000 au plus par envoi (anti-triche simple).
create or replace function public.save_player(p_voter text, p_pseudo text, p_avatar int, p_xp int)
returns json
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v text := trim(coalesce(p_pseudo, ''));
  v_check text;
  v_row public.players;
begin
  if char_length(coalesce(p_voter, '')) not between 8 and 64 then raise exception 'REQUETE_INVALIDE'; end if;
  v_check := public.check_pseudo(v, p_voter);
  if v_check <> 'ok' then raise exception '%', v_check; end if;
  insert into public.players as p (voter, pseudo, pseudo_key, avatar, xp)
  values (p_voter, v, lower(v), least(greatest(coalesce(p_avatar, 0), 0), 11), least(greatest(coalesce(p_xp, 0), 0), 3000))
  on conflict (voter) do update set
    pseudo = excluded.pseudo,
    pseudo_key = excluded.pseudo_key,
    avatar = excluded.avatar,
    xp = greatest(p.xp, least(greatest(coalesce(p_xp, 0), 0), p.xp + 3000)),
    updated_at = now()
  returning * into v_row;
  return json_build_object('pseudo', v_row.pseudo, 'avatar', v_row.avatar, 'xp', v_row.xp);
end $$;

-- Profil de cet appareil (pour le retrouver après avoir vidé le cache du site).
create or replace function public.get_player(p_voter text)
returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object('pseudo', pseudo, 'avatar', avatar, 'xp', xp, 'role', role) from public.players where voter = p_voter
$$;

-- Niveau, avatar et badge des auteurs d'une liste de commentaires : { "kenji": { "xp": 120, "avatar": 2, "role": null } }.
create or replace function public.get_players(p_pseudos text[])
returns json
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(json_object_agg(pseudo_key, json_build_object('xp', xp, 'avatar', avatar, 'role', role)), '{}'::json)
  from public.players where pseudo_key = any (select lower(x) from unnest(p_pseudos[1:60]) as x)
$$;

-- Même fonction que dans schema.sql, qui refuse en plus le pseudo réservé par un autre joueur.
create or replace function public.add_comment(p_slug text, p_author text, p_body text, p_voter text)
returns uuid
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
  v_author text := trim(regexp_replace(coalesce(p_author, ''), '\s+', ' ', 'g'));
  v_body text := trim(regexp_replace(coalesce(p_body, ''), '[ \t]+', ' ', 'g'));
  v_id uuid;
begin
  if char_length(v_author) not between 2 and 30 then raise exception 'PSEUDO_INVALIDE'; end if;
  if char_length(v_body) not between 2 and 1000 then raise exception 'MESSAGE_INVALIDE'; end if;
  if v_body ~* '(https?://|www\.|\.(com|fr|net|org|io|gg|ru|xyz)\b)' then raise exception 'LIENS_INTERDITS'; end if;
  if public.gb_is_offensive(v_author) or public.gb_is_offensive(v_body) then raise exception 'PROPOS_INTERDITS'; end if;
  if exists (select 1 from public.players where pseudo_key = lower(v_author) and voter <> coalesce(p_voter, '')) then
    raise exception 'PSEUDO_PRIS';
  end if;
  if (select count(*) from public.comments where ip_hash = v_ip and created_at > now() - interval '1 minute') >= 3
     or (select count(*) from public.comments where ip_hash = v_ip and created_at > now() - interval '1 day') >= 30 then
    raise exception 'TROP_DE_MESSAGES';
  end if;
  insert into public.comments (article_slug, author, body, ip_hash)
  values (left(p_slug, 200), v_author, v_body, v_ip)
  returning comments.id into v_id;
  return v_id;
end $$;

-- Appareils liés par une même clé de synchronisation : ils adoptent le même identifiant (p_new).
-- Le profil de l'ancien identifiant y est rattaché ; s'il en existe déjà un, on garde le plus avancé.
-- Connaître l'ancien identifiant (aléatoire, jamais affiché) prouve qu'on est bien cet appareil.
create or replace function public.merge_player(p_old text, p_new text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_old public.players;
  v_new public.players;
begin
  if p_old is null or p_new is null or p_old = p_new or char_length(p_new) not between 8 and 64 then return; end if;
  select * into v_old from public.players where voter = p_old;
  if not found then return; end if;
  select * into v_new from public.players where voter = p_new;
  if not found then
    update public.players set voter = p_new, updated_at = now() where voter = p_old;
  elsif v_old.xp > v_new.xp then
    delete from public.players where voter = p_new;
    update public.players set voter = p_new, updated_at = now() where voter = p_old;
  else
    delete from public.players where voter = p_old;
  end if;
end $$;

grant execute on function public.merge_player(text, text) to anon;
grant execute on function public.check_pseudo(text, text) to anon;
grant execute on function public.save_player(text, text, int, int) to anon;
grant execute on function public.get_player(text) to anon;
grant execute on function public.get_players(text[]) to anon;
grant execute on function public.add_comment(text, text, text, text) to anon;
