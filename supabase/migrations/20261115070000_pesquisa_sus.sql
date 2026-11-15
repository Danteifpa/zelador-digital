-- =============================================================================
-- Zelador Digital — Questionário de usabilidade (SUS)
-- =============================================================================
-- System Usability Scale: 10 afirmações respondidas de 1 (discordo totalmente) a
-- 5 (concordo totalmente), opcional, oferecido depois de um registro.
--   * Anônimo: sem identificação, só o hash da conexão para limitar abusos (3 por dia).
--   * Pontuação SUS (0 a 100) calculada no banco.
--   * Só gestores leem as respostas.
-- =============================================================================

begin;

create table if not exists public.pesquisa_sus (
  id          bigint generated always as identity primary key,
  criado_em   timestamptz not null default now(),
  respostas   smallint[] not null check (
                array_length(respostas, 1) = 10
                and 1 <= all (respostas) and 5 >= all (respostas)),
  pontuacao   numeric(5, 1) not null,
  comentario  text check (length(comentario) <= 500),
  versao      text,
  origem_hash text
);

create index if not exists pesquisa_sus_origem_idx on public.pesquisa_sus (origem_hash, criado_em);

alter table public.pesquisa_sus enable row level security;
revoke all on public.pesquisa_sus from anon, authenticated;
drop policy if exists "gestor le pesquisa" on public.pesquisa_sus;
create policy "gestor le pesquisa" on public.pesquisa_sus for select to authenticated using (public.eh_gestor());
grant select on public.pesquisa_sus to authenticated;

-- Itens ímpares (positivos): resposta - 1. Itens pares (negativos): 5 - resposta. Soma × 2,5.
create or replace function public.pontuacao_sus(p_respostas smallint[])
returns numeric
language sql
immutable
as $$
  select sum(case when i % 2 = 1 then p_respostas[i] - 1 else 5 - p_respostas[i] end) * 2.5
  from generate_series(1, 10) as i;
$$;

create or replace function public.registrar_pesquisa_sus(p_respostas integer[], p_comentario text default null, p_versao text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origem  text := coalesce(public.origem_da_requisicao(), 'interno');
  v_hoje    integer;
  v_resp    smallint[];
  v_pontos  numeric;
begin
  if p_respostas is null or array_length(p_respostas, 1) <> 10
     or not (1 <= all (p_respostas) and 5 >= all (p_respostas)) then
    raise exception 'Respostas inválidas' using errcode = '22023';
  end if;

  select count(*) into v_hoje from pesquisa_sus where origem_hash = v_origem and criado_em > now() - interval '1 day';
  if v_hoje >= 3 then
    return jsonb_build_object('registrado', false, 'motivo', 'limite');
  end if;

  v_resp := p_respostas::smallint[];
  v_pontos := public.pontuacao_sus(v_resp);
  insert into pesquisa_sus (respostas, pontuacao, comentario, versao, origem_hash)
  values (v_resp, v_pontos, nullif(left(trim(p_comentario), 500), ''), left(p_versao, 20), v_origem);
  return jsonb_build_object('registrado', true, 'pontuacao', v_pontos);
end;
$$;

revoke all on function public.registrar_pesquisa_sus(integer[], text, text) from public;
grant execute on function public.registrar_pesquisa_sus(integer[], text, text) to anon, authenticated;

commit;
