-- =============================================================================
-- Zelador Digital — Prazo de atendimento por órgão
-- =============================================================================
-- Cada órgão ganha um prazo padrão, em dias (mesmos valores de
-- frontend/src/lib/orgaos.js). A Prefeitura pode ajustar:
--   update public.orgaos set prazo_dias = 10 where id = 'vias';
-- Roda numa transação e pode ser aplicada mais de uma vez.
-- =============================================================================

begin;

alter table public.orgaos add column if not exists prazo_dias int not null default 7;
alter table public.orgaos drop constraint if exists orgaos_prazo_valido;
alter table public.orgaos add constraint orgaos_prazo_valido check (prazo_dias between 1 and 365);

-- Só preenche os valores de fábrica; não sobrescreve um prazo já ajustado.
update public.orgaos o set prazo_dias = v.prazo
from (values ('iluminacao', 7), ('limpeza', 5), ('saneamento', 10), ('vias', 15),
             ('meio_ambiente', 10), ('transito', 7), ('triagem', 3)) as v(id, prazo)
where o.id = v.id and o.prazo_dias = 7 and v.prazo <> 7;

commit;
