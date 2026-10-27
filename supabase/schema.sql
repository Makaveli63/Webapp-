-- GamingBase : commentaires et « j'aime » (Supabase / PostgreSQL)
-- À coller une fois dans Supabase → SQL Editor → New query → Run.
--
-- Sécurité :
-- - Aucune table n'est accessible directement depuis le navigateur : tout passe par des fonctions
--   (RPC) qui valident, filtrent et limitent le débit avant d'écrire.
-- - Filtre côté serveur : insultes, propos racistes, homophobes ou haineux (avec détection des
--   contournements : accents, chiffres à la place des lettres, lettres espacées…), liens interdits.
-- - Anti-spam : 3 commentaires par minute et 30 par jour au maximum par adresse IP (stockée hachée).
-- - Un commentaire signalé par 3 personnes différentes est masqué automatiquement.

-- Supabase range les extensions dans le schéma « extensions ».
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- Tables
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null check (char_length(article_slug) between 1 and 200),
  author text not null check (char_length(author) between 2 and 30),
  body text not null check (char_length(body) between 2 and 1000),
  created_at timestamptz not null default now(),
  ip_hash text not null,
  hidden boolean not null default false
);
create index if not exists comments_article_idx on public.comments (article_slug, created_at desc);
create index if not exists comments_ip_idx on public.comments (ip_hash, created_at desc);

create table if not exists public.likes (
  target_type text not null check (target_type in ('article', 'comment')),
  target_id text not null check (char_length(target_id) between 1 and 200),
  voter text not null check (char_length(voter) between 8 and 64),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, voter)
);

create table if not exists public.reports (
  comment_id uuid not null references public.comments (id) on delete cascade,
  voter text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, voter)
);

create table if not exists public.banned_terms (
  term text primary key
);

alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;
alter table public.banned_terms enable row level security;
-- Aucune politique : le navigateur (rôle anon) ne peut ni lire ni écrire directement ces tables.
revoke all on public.comments, public.likes, public.reports, public.banned_terms from anon, authenticated;

-- ---------------------------------------------------------------- Liste de termes interdits
-- Termes normalisés (minuscules, sans accents). Complétez la liste à volonté :
--   insert into public.banned_terms values ('nouveau terme') on conflict do nothing;
insert into public.banned_terms (term) values
  -- insultes (FR)
  ('connard'), ('connasse'), ('salope'), ('salaud'), ('pute'), ('putain de ta'), ('encule'), ('enculer'),
  ('fdp'), ('fils de pute'), ('ntm'), ('nique ta mere'), ('niquer ta mere'), ('ta mere la'), ('batard'),
  ('trou du cul'), ('sac a merde'), ('va crever'), ('suicide toi'), ('tue toi'),
  ('grosse merde'), ('petite merde'), ('pauvre merde'), ('ferme ta gueule'), ('ftg'), ('tg'),
  -- haine, racisme, antisémitisme, homophobie, validisme (FR)
  ('negre'), ('negro'), ('bougnoule'), ('bicot'), ('youpin'), ('youtre'), ('chintok'),
  ('bamboula'), ('sale arabe'), ('sale noir'), ('sale juif'), ('sale musulman'), ('sale blanc'),
  ('sale race'), ('sous race'), ('race inferieure'), ('retourne dans ton pays'), ('pd'), ('pede'),
  ('tapette'), ('tarlouze'), ('gouine'), ('sale gay'), ('heil hitler'), ('sieg heil'), ('hitler avait raison'), ('gazer les'),
  -- insultes et haine (EN)
  ('fuck you'), ('motherfucker'), ('cunt'), ('whore'), ('bitch'), ('nigger'), ('nigga'), ('faggot'),
  ('fag'), ('kike'), ('spic'), ('chink'), ('tranny'), ('kill yourself'), ('kys')
on conflict do nothing;

-- ---------------------------------------------------------------- Fonctions internes
create or replace function public.gb_normalize(t text) returns text
language sql immutable set search_path = public, extensions as $$
  -- minuscules, sans accents, chiffres/symboles « leet » remplacés, ponctuation → espaces
  select regexp_replace(
           translate(lower(unaccent(coalesce(t, ''))), '0134578@$!|', 'oieastbasii'),
           '[^a-z]+', ' ', 'g')
$$;

create or replace function public.gb_is_offensive(t text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  spaced text := ' ' || trim(public.gb_normalize(t)) || ' ';
  -- Lettres collées : « c o n n a r d » et « c.o.n.n.a.r.d » deviennent « connard ».
  squashed text := replace(public.gb_normalize(t), ' ', '');
  -- Lettres répétées réduites : « connnnaaard » → « conard » (comparé aussi au terme réduit).
  reduced text := regexp_replace(squashed, '(.)\1+', '\1', 'g');
  w text;
begin
  for w in select term from public.banned_terms loop
    if position(' ' || w || ' ' in spaced) > 0 then return true; end if;
    -- Termes longs : recherchés aussi sans espaces ni lettres répétées (contournements).
    if char_length(replace(w, ' ', '')) >= 6 and (
         position(replace(w, ' ', '') in squashed) > 0 or
         position(regexp_replace(replace(w, ' ', ''), '(.)\1+', '\1', 'g') in reduced) > 0) then
      return true;
    end if;
  end loop;
  return false;
end $$;

create or replace function public.gb_ip_hash() returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip text := split_part(coalesce(headers ->> 'x-forwarded-for', headers ->> 'x-real-ip', 'inconnue'), ',', 1);
begin
  -- Seule l'empreinte est conservée, jamais l'adresse IP elle-même.
  return encode(digest('gamingbase:' || trim(ip), 'sha256'), 'hex');
end $$;

-- ---------------------------------------------------------------- API publique (RPC)
-- Commentaires visibles d'un article, avec leurs « j'aime » et ce que ce visiteur a aimé.
create or replace function public.get_comments(p_slug text, p_voter text)
returns table (id uuid, author text, body text, created_at timestamptz, likes bigint, liked boolean)
language sql stable security definer set search_path = public, extensions as $$
  select c.id, c.author, c.body, c.created_at,
         (select count(*) from public.likes l where l.target_type = 'comment' and l.target_id = c.id::text),
         exists (select 1 from public.likes l where l.target_type = 'comment' and l.target_id = c.id::text and l.voter = p_voter)
  from public.comments c
  where c.article_slug = p_slug and not c.hidden
  order by c.created_at desc
  limit 200
$$;

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
  if (select count(*) from public.comments where ip_hash = v_ip and created_at > now() - interval '1 minute') >= 3
     or (select count(*) from public.comments where ip_hash = v_ip and created_at > now() - interval '1 day') >= 30 then
    raise exception 'TROP_DE_MESSAGES';
  end if;
  insert into public.comments (article_slug, author, body, ip_hash)
  values (left(p_slug, 200), v_author, v_body, v_ip)
  returning comments.id into v_id;
  return v_id;
end $$;

-- « J'aime » / « Je n'aime plus » : renvoie le nouveau nombre de j'aime.
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
  end if;
  return (select count(*) from public.likes where target_type = p_type and target_id = p_target);
end $$;

-- Nombre de « j'aime » de plusieurs articles (listes) et ce que ce visiteur a aimé.
create or replace function public.get_article_likes(p_slugs text[], p_voter text)
returns table (slug text, likes bigint, liked boolean)
language sql stable security definer set search_path = public, extensions as $$
  select s, (select count(*) from public.likes l where l.target_type = 'article' and l.target_id = s),
         exists (select 1 from public.likes l where l.target_type = 'article' and l.target_id = s and l.voter = p_voter)
  from unnest(p_slugs[1:100]) as s
$$;

-- Signalement : masqué automatiquement à partir de 3 signalements distincts.
create or replace function public.report_comment(p_id uuid, p_voter text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  insert into public.reports (comment_id, voter) values (p_id, left(p_voter, 64)) on conflict do nothing;
  update public.comments set hidden = true
  where id = p_id and (select count(*) from public.reports where comment_id = p_id) >= 3;
end $$;

-- Seules les fonctions publiques sont appelables depuis le site.
revoke execute on all functions in schema public from anon, authenticated, public;
grant execute on function public.get_comments(text, text) to anon;
grant execute on function public.add_comment(text, text, text, text) to anon;
grant execute on function public.toggle_like(text, text, text) to anon;
grant execute on function public.get_article_likes(text[], text) to anon;
grant execute on function public.report_comment(uuid, text) to anon;
