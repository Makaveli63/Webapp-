-- GamingBase : note des lecteurs, pronostics, badges, articles de l'admin et rapport hebdomadaire
-- À exécuter APRÈS schema.sql, stats.sql, notifications.sql et extras.sql. Ré-exécutable sans risque.
-- Pour le rapport hebdomadaire : Supabase → Database → Extensions → activer « pg_cron » avant de lancer ce fichier.

-- ---------------------------------------------------------------- Note des lecteurs (sur 20)
create table if not exists public.game_ratings (
  game_key text not null check (game_key ~ '^[a-z0-9-]{1,80}$'),
  voter text not null check (char_length(voter) between 8 and 64),
  score smallint not null check (score between 0 and 20),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (game_key, voter)
);

-- ---------------------------------------------------------------- Pronostics (note de la presse devinée)
create table if not exists public.predictions (
  game_key text not null check (game_key ~ '^[a-z0-9-]{1,80}$'),
  voter text not null check (char_length(voter) between 8 and 64),
  score numeric(3, 1) not null check (score between 0 and 20),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  primary key (game_key, voter)
);

alter table public.game_ratings enable row level security;
alter table public.predictions enable row level security;
revoke all on public.game_ratings, public.predictions from anon, authenticated;

create or replace function public.rate_game(p_game text, p_score int, p_voter text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
begin
  if p_game !~ '^[a-z0-9-]{1,80}$' or p_score not between 0 and 20 or char_length(coalesce(p_voter, '')) not between 8 and 64 then
    raise exception 'VOTE_INVALIDE';
  end if;
  if not exists (select 1 from game_ratings where game_key = p_game and voter = p_voter)
     and (select count(*) from game_ratings where game_key = p_game and ip_hash = v_ip) >= 3 then
    raise exception 'TROP_DE_VOTES';
  end if;
  insert into game_ratings (game_key, voter, score, ip_hash) values (p_game, p_voter, p_score, v_ip)
  on conflict (game_key, voter) do update set score = excluded.score, created_at = now();
end $$;

create or replace function public.get_game_rating(p_game text, p_voter text)
returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'avg', (select round(avg(score)::numeric, 1) from game_ratings where game_key = p_game),
    'count', (select count(*) from game_ratings where game_key = p_game),
    'mine', (select score from game_ratings where game_key = p_game and voter = p_voter)
  )
$$;

create or replace function public.predict_game(p_game text, p_score numeric, p_voter text)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ip text := public.gb_ip_hash();
begin
  if p_game !~ '^[a-z0-9-]{1,80}$' or p_score not between 0 and 20 or char_length(coalesce(p_voter, '')) not between 8 and 64 then
    raise exception 'VOTE_INVALIDE';
  end if;
  if not exists (select 1 from predictions where game_key = p_game and voter = p_voter)
     and (select count(*) from predictions where game_key = p_game and ip_hash = v_ip) >= 3 then
    raise exception 'TROP_DE_VOTES';
  end if;
  insert into predictions (game_key, voter, score, ip_hash) values (p_game, p_voter, round(p_score, 1), v_ip)
  on conflict (game_key, voter) do update set score = excluded.score, created_at = now();
end $$;

create or replace function public.get_predictions(p_game text, p_voter text)
returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'avg', (select round(avg(score), 1) from predictions where game_key = p_game),
    'count', (select count(*) from predictions where game_key = p_game),
    'mine', (select score from predictions where game_key = p_game and voter = p_voter)
  )
$$;

-- ---------------------------------------------------------------- Badges
-- Activité de cet appareil (votes, notes, pronostics) pour « Mes badges ».
create or replace function public.get_my_activity(p_voter text)
returns json
language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'polls', (select count(*) from poll_votes where voter = p_voter),
    'ratings', (select count(*) from game_ratings where voter = p_voter),
    'predictions', (select count(*) from predictions where voter = p_voter),
    'likes', (select count(*) from likes where voter = p_voter)
  )
$$;

-- Nombre de commentaires visibles par pseudo (badges « Fidèle », « Pilier » à côté des pseudos).
create or replace function public.get_author_badges(p_authors text[])
returns json
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(json_object_agg(author, n), '{}'::json) from (
    select author, count(*) as n from comments
    where not hidden and author = any (p_authors[1:50])
    group by author
  ) t
$$;

-- ---------------------------------------------------------------- Articles écrits par l'admin
create table if not exists public.admin_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 200),
  category text not null check (category in ('Actu', 'Test', 'Console')),
  platforms text[] not null default '{}',
  score text check (score is null or score ~ '^[0-9]{1,2}([,.][0-9])?/(5|10|20|100)$'),
  image text check (image is null or image ~ '^https://'),
  body text not null check (char_length(body) between 20 and 20000),
  created_at timestamptz not null default now()
);
alter table public.admin_articles enable row level security;
revoke all on public.admin_articles from anon, authenticated;

create or replace function public.admin_publish_article(
  p_password text, p_title text, p_category text, p_platforms text[], p_score text, p_image text, p_body text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  insert into admin_articles (title, category, platforms, score, image, body)
  values (trim(p_title), p_category,
          (select coalesce(array_agg(p), '{}') from unnest(coalesce(p_platforms, '{}')) p
            where p in ('PC', 'PS5', 'Switch 2', 'Xbox', 'Mobile', 'Multi')),
          nullif(trim(coalesce(p_score, '')), ''), nullif(trim(coalesce(p_image, '')), ''), trim(p_body));
  return 'ok';
exception when check_violation then
  return 'ARTICLE_INVALIDE';
end $$;

create or replace function public.admin_delete_article(p_password text, p_id uuid)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_check text := public.gb_admin_check(p_password);
begin
  if v_check <> 'ok' then return v_check; end if;
  delete from admin_articles where id = p_id;
  return 'ok';
end $$;

-- Lecture publique (articles publiés), utilisée à la mise à jour du site.
create or replace function public.get_published_articles()
returns json
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json) from (
    select id, title, category, platforms, score, image, body, created_at from admin_articles order by created_at desc limit 200
  ) t
$$;

-- ---------------------------------------------------------------- Rapport hebdomadaire (lundi 9 h, via ntfy)
create or replace function public.gb_weekly_report()
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_week date := (now() at time zone 'Europe/Paris')::date - 7;
  v_views bigint := (select count(*) from page_views where day > v_week);
  v_prev bigint := (select count(*) from page_views where day > v_week - 7 and day <= v_week);
  v_visitors bigint := (select count(distinct (day, visitor)) from page_views where day > v_week);
  v_likes bigint := (select count(*) from likes where created_at > now() - interval '7 days');
  v_comments bigint := (select count(*) from comments where created_at > now() - interval '7 days');
  v_top text := (select string_agg(path, ', ') from (
                   select path from page_views where day > v_week and path like '/actualites/_%'
                   group by path order by count(*) desc limit 3) t);
  v_poll text := (select option_id || ' (' || n || ' votes)' from (
                    select option_id, count(*) n from poll_votes where created_at > now() - interval '7 days'
                    group by option_id order by 2 desc limit 1) t);
  v_site text := (select site_url from notify_config where id = 1);
begin
  perform public.gb_notify(
    '📈 Ton rapport de la semaine',
    v_views || ' pages vues (' ||
      case when v_prev = 0 then 'nouveau' else (case when v_views >= v_prev then '+' else '' end) || round((v_views - v_prev) * 100.0 / v_prev) || ' %' end ||
      '), ' || v_visitors || ' visiteurs, ' || v_likes || ' j''aime, ' || v_comments || ' commentaires.' ||
      coalesce(E'\nTop : ' || v_top, '') || coalesce(E'\nSondage : ' || v_poll, ''),
    v_site || '/admin/',
    'chart_with_upwards_trend');
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'gamingbase-rapport';
    perform cron.schedule('gamingbase-rapport', '0 7 * * 1', 'select public.gb_weekly_report()'); -- 7 h UTC ≈ 8-9 h à Paris
  else
    raise notice 'pg_cron non activé : le rapport hebdomadaire ne sera pas planifié (Database → Extensions → pg_cron).';
  end if;
end $$;

revoke execute on function public.gb_weekly_report() from anon, authenticated, public;
grant execute on function public.rate_game(text, int, text) to anon;
grant execute on function public.get_game_rating(text, text) to anon;
grant execute on function public.predict_game(text, numeric, text) to anon;
grant execute on function public.get_predictions(text, text) to anon;
grant execute on function public.get_my_activity(text) to anon;
grant execute on function public.get_author_badges(text[]) to anon;
grant execute on function public.admin_publish_article(text, text, text, text[], text, text, text) to anon;
grant execute on function public.admin_delete_article(text, uuid) to anon;
grant execute on function public.get_published_articles() to anon;
