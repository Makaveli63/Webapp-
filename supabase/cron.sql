-- GamingBase : mise à jour du site toutes les heures, déclenchée par Supabase (pg_cron).
-- Les tâches planifiées de GitHub sont « au mieux » : elles sont souvent retardées de plusieurs heures,
-- voire sautées. pg_cron, lui, est ponctuel : il demande à GitHub de lancer « Publier le site » à HH:07.
-- (La planification GitHub reste en secours ; deux mises à jour la même heure ne posent aucun problème.)
--
-- AVANT d'exécuter ce fichier, une seule fois :
--   1. GitHub → photo de profil → Settings → Developer settings → Personal access tokens → Fine-grained tokens
--      → Generate new token : Repository access « Only select repositories » → le dépôt du site ;
--      Permissions → Repository permissions → Actions : « Read and write ». Copier le jeton (github_pat_…).
--   2. Dans le SQL Editor, dans une requête À PART (ne pas l'enregistrer, ne la partager avec personne) :
--        select vault.create_secret('github_pat_…', 'github_dispatch_token');
--      Pour remplacer un jeton expiré :
--        select vault.update_secret((select id from vault.secrets where name = 'github_dispatch_token'), 'github_pat_…');
-- Puis : SQL Editor → New query → coller ce fichier → Run. Ré-exécutable sans risque.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Demandes envoyées à GitHub (pour le suivi, voir gb_deploy_log plus bas).
create table if not exists public.gb_deploy_requests (
  request_id bigint primary key,
  at timestamptz not null default now()
);
alter table public.gb_deploy_requests enable row level security;
revoke all on public.gb_deploy_requests from anon, authenticated;

-- Adresse par identifiant du dépôt : elle reste valable si le dépôt est renommé.
create or replace function public.gb_trigger_deploy()
returns bigint
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_token text := (select decrypted_secret from vault.decrypted_secrets where name = 'github_dispatch_token');
  v_id bigint;
begin
  if v_token is null then
    raise warning 'jeton github_dispatch_token absent : voir supabase/cron.sql';
    return null;
  end if;
  v_id := net.http_post(
    url := 'https://api.github.com/repositories/1435253173/actions/workflows/deploy.yml/dispatches',
    body := '{"ref": "main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'GamingBase-cron',
      'Content-Type', 'application/json'
    )
  );
  insert into public.gb_deploy_requests (request_id) values (v_id) on conflict do nothing;
  delete from public.gb_deploy_requests where at < now() - interval '3 days';
  return v_id;
end $$;
-- Réservée à pg_cron : ni les visiteurs ni le site ne peuvent la lancer.
revoke all on function public.gb_trigger_deploy() from public, anon, authenticated;

-- Dernières demandes (204 = acceptée par GitHub ; 401 = jeton refusé ou expiré) :
--   select * from public.gb_deploy_log;
create or replace view public.gb_deploy_log as
  select r.at, h.status_code, left(coalesce(h.error_msg, h.content::text, 'en attente'), 200) as detail
  from public.gb_deploy_requests r
  left join net._http_response h on h.id = r.request_id
  order by r.at desc
  limit 24;
revoke all on public.gb_deploy_log from anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'gamingbase-hourly';
select cron.schedule('gamingbase-hourly', '7 * * * *', 'select public.gb_trigger_deploy()');

-- Essai immédiat : lance une mise à jour tout de suite (à voir dans GitHub → Actions).
select public.gb_trigger_deploy();
