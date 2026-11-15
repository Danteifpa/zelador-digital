-- =============================================================================
-- Zelador Digital — Registro de erros do app
-- =============================================================================
-- Erros que acontecem no celular dos moradores, para a gestão saber que algo quebrou.
--   * Sem dados pessoais: só mensagem, pilha, rota (sem parâmetros), versão e navegador.
--   * Gravado só pela função registrar_erro(), com limite de 20 por hora por conexão
--     (hash da origem, o IP não é guardado) e textos cortados.
--   * Só gestores leem. Erros com mais de 90 dias são apagados a cada novo registro.
-- =============================================================================

begin;

create table if not exists public.erros_app (
  id          bigint generated always as identity primary key,
  criado_em   timestamptz not null default now(),
  mensagem    text not null,
  pilha       text,
  rota        text,
  versao      text,
  navegador   text,
  origem_hash text
);

create index if not exists erros_app_criado_idx on public.erros_app (criado_em desc);
create index if not exists erros_app_origem_idx on public.erros_app (origem_hash, criado_em);

alter table public.erros_app enable row level security;
revoke all on public.erros_app from anon, authenticated;

drop policy if exists "gestor le erros" on public.erros_app;
create policy "gestor le erros" on public.erros_app
  for select to authenticated using (public.eh_gestor());
grant select on public.erros_app to authenticated;

create or replace function public.registrar_erro(p_mensagem text, p_pilha text default null, p_rota text default null, p_versao text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origem    text := coalesce(public.origem_da_requisicao(), 'interno');
  v_recentes  integer;
  v_navegador text;
begin
  if coalesce(trim(p_mensagem), '') = '' then
    return;
  end if;

  select count(*) into v_recentes
  from erros_app where origem_hash = v_origem and criado_em > now() - interval '1 hour';
  if v_recentes >= 20 then
    return;
  end if;

  v_navegador := left(coalesce(current_setting('request.headers', true), '{}')::json ->> 'user-agent', 200);

  insert into erros_app (mensagem, pilha, rota, versao, navegador, origem_hash)
  values (left(p_mensagem, 500), left(p_pilha, 2000), left(split_part(split_part(p_rota, '?', 1), '#', 1), 200),
          left(p_versao, 20), v_navegador, v_origem);

  delete from erros_app where criado_em < now() - interval '90 days';
end;
$$;

revoke all on function public.registrar_erro(text, text, text, text) from public;
grant execute on function public.registrar_erro(text, text, text, text) to anon, authenticated;

commit;
