-- =============================================================================
-- Zelador Digital — estados das ocorrências unificados
-- =============================================================================
-- A partir daqui só existem três estados, e a base recusa qualquer outro:
--   pendente → em_analise → resolvido
-- (o app lê e escreve através de frontend/src/lib/status.js)
--
-- Aplicar DEPOIS de publicar o frontend que escreve 'em_analise' (o app antigo
-- escrevia 'em analise', que esta regra passa a recusar).
-- Corre numa única transação e pode correr mais do que uma vez.
-- =============================================================================

begin;

-- 1. Converte as grafias antigas
update public.ocorrencias
set status = case lower(trim(status))
  when 'em analise'   then 'em_analise'
  when 'em análise'   then 'em_analise'
  when 'em_andamento' then 'em_analise'
  when 'em andamento' then 'em_analise'
  when 'oficiada'     then 'em_analise'
  when 'concluido'    then 'resolvido'
  when 'concluído'    then 'resolvido'
  when 'resolvida'    then 'resolvido'
  else lower(trim(status))
end
where status is distinct from case lower(trim(status))
  when 'em analise'   then 'em_analise'
  when 'em análise'   then 'em_analise'
  when 'em_andamento' then 'em_analise'
  when 'em andamento' then 'em_analise'
  when 'oficiada'     then 'em_analise'
  when 'concluido'    then 'resolvido'
  when 'concluído'    then 'resolvido'
  when 'resolvida'    then 'resolvido'
  else lower(trim(status))
end;

-- Qualquer valor desconhecido que reste volta a 'pendente' (fica visível para triagem).
update public.ocorrencias
set status = 'pendente'
where status not in ('pendente', 'em_analise', 'resolvido');

-- 2. A base passa a recusar estados fora do contrato
alter table public.ocorrencias drop constraint if exists ocorrencias_status_valido;
alter table public.ocorrencias
  add constraint ocorrencias_status_valido
  check (status in ('pendente', 'em_analise', 'resolvido'));

commit;

-- Verificação:
--   select status, count(*) from public.ocorrencias group by 1;   -- só os 3 estados
