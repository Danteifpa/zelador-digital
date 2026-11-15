-- =============================================================================
-- Zelador Digital — Limpeza semanal de fotos órfãs
-- =============================================================================
-- * fotos_orfas(): arquivos dos buckets de fotos que nenhuma ocorrência usa, com mais
--   de N dias. Só o service_role (Edge Function) pode chamar.
-- * token_limpeza_valido(): confere o token do pedido com o segredo "limpeza_token"
--   do Vault (criado aqui, aleatório, nunca sai do banco).
-- * pg_cron: todo domingo às 6h UTC (3h em Ananindeua) chama a Edge Function
--   limpar-fotos-orfas, que apaga os arquivos pelo Storage.
-- =============================================================================

begin;

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'limpeza_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'limpeza_token', 'Token da limpeza semanal de fotos órfãs');
  end if;
end $$;

create or replace function public.fotos_orfas(p_dias integer default 7, p_limite integer default 500)
returns table (bucket text, caminho text)
language sql
stable
security definer
set search_path = public, storage
as $$
  with usadas as (
    select foto_url as url from public.ocorrencias where foto_url is not null
    union
    select foto_resolucao_url from public.ocorrencias where foto_resolucao_url is not null
  )
  select o.bucket_id, o.name
  from storage.objects o
  where o.bucket_id in ('ocorrencias', 'fotos', 'evidencias')
    and o.created_at < now() - make_interval(days => greatest(p_dias, 1))
    and o.name not like '%.emptyFolderPlaceholder'
    and not exists (select 1 from usadas u where u.url like '%/' || o.bucket_id || '/' || o.name)
  order by o.created_at
  limit least(greatest(p_limite, 1), 1000);
$$;

create or replace function public.token_limpeza_valido(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(length(p_token) >= 32
    and p_token = (select decrypted_secret from vault.decrypted_secrets where name = 'limpeza_token'), false);
$$;

revoke all on function public.fotos_orfas(integer, integer) from public, anon, authenticated;
revoke all on function public.token_limpeza_valido(text) from public, anon, authenticated;
grant execute on function public.fotos_orfas(integer, integer) to service_role;
grant execute on function public.token_limpeza_valido(text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'limpar-fotos-orfas';
select cron.schedule(
  'limpar-fotos-orfas',
  '0 6 * * 0',
  $job$
    select net.http_post(
      url := 'https://xtskjevtskjjlyusccxy.supabase.co/functions/v1/limpar-fotos-orfas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'limpeza_token')),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000);
  $job$
);

commit;
