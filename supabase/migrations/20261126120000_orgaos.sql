-- =============================================================================
-- Zelador Digital — Encaminhamento por órgão
-- =============================================================================
-- * Tabela pública `orgaos` com os órgãos responsáveis (nomes genéricos; a Prefeitura
--   pode renomear sem mudar o id).
-- * Cada ocorrência ganha `orgao`, preenchido sozinho pela categoria. O morador não
--   escolhe o órgão; o gestor pode encaminhar para outro.
-- * Cada gestor pode ficar ligado a um órgão (`gestores.orgao`). Gestor sem órgão é
--   gestor geral: vê e altera tudo, como antes. Gestor de um órgão só altera ou apaga
--   o que está no órgão dele, mas pode encaminhar um chamado dele para outro órgão.
-- * A view ocorrencias_georreferenciadas ganha a coluna `orgao` no fim.
-- Roda numa transação e pode ser aplicada mais de uma vez.
-- =============================================================================

begin;

-- 1. Órgãos -------------------------------------------------------------------
create table if not exists public.orgaos (
  id    text primary key,
  nome  text not null,
  ordem int  not null default 0
);

insert into public.orgaos (id, nome, ordem) values
  ('iluminacao',    'Iluminação pública',           1),
  ('limpeza',       'Limpeza urbana',               2),
  ('saneamento',    'Saneamento e drenagem',        3),
  ('vias',          'Vias e calçadas',              4),
  ('meio_ambiente', 'Meio ambiente e arborização',  5),
  ('transito',      'Trânsito e sinalização',       6),
  ('triagem',       'Triagem geral',                7)
on conflict (id) do nothing;

alter table public.orgaos enable row level security;
drop policy if exists "orgaos sao publicos" on public.orgaos;
create policy "orgaos sao publicos" on public.orgaos for select to anon, authenticated using (true);
grant select on public.orgaos to anon, authenticated;

-- 2. Órgão padrão de cada categoria (mesma tabela de frontend/src/lib/orgaos.js) ---
create or replace function public.orgao_da_categoria(p_categoria text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_categoria
    when 'iluminacao'  then 'iluminacao'
    when 'lixo'        then 'limpeza'
    when 'esgoto'      then 'saneamento'
    when 'alagamento'  then 'saneamento'
    when 'buraco'      then 'vias'
    when 'calcada'     then 'vias'
    when 'arvore'      then 'meio_ambiente'
    when 'sinalizacao' then 'transito'
    else 'triagem'
  end;
$$;

-- 3. Coluna nas ocorrências e nos gestores -------------------------------------
alter table public.ocorrencias add column if not exists orgao text references public.orgaos (id);
create index if not exists ocorrencias_orgao_idx on public.ocorrencias (orgao);

update public.ocorrencias set orgao = public.orgao_da_categoria(categoria) where orgao is null;

alter table public.gestores add column if not exists orgao text references public.orgaos (id);

-- Órgão do gestor logado (null = gestor geral).
create or replace function public.orgao_do_gestor()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select orgao from public.gestores where user_id = auth.uid();
$$;

revoke all on function public.orgao_do_gestor() from public;
grant execute on function public.orgao_do_gestor() to authenticated;

-- 4. Órgão automático ----------------------------------------------------------
-- No registro, o órgão vem sempre da categoria (o morador não escolhe).
-- Na edição, se a categoria muda e o órgão não foi trocado junto, segue a nova categoria.
create or replace function public.definir_orgao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.orgao is null or not public.eh_gestor() then
      new.orgao := public.orgao_da_categoria(new.categoria);
    end if;
  elsif new.categoria is distinct from old.categoria and new.orgao is not distinct from old.orgao then
    new.orgao := public.orgao_da_categoria(new.categoria);
  elsif new.orgao is null then
    new.orgao := public.orgao_da_categoria(new.categoria);
  end if;
  return new;
end;
$$;

drop trigger if exists definir_orgao on public.ocorrencias;
create trigger definir_orgao
  before insert or update on public.ocorrencias
  for each row execute function public.definir_orgao();

-- 5. Regras de acesso: gestor de órgão só mexe no que é do órgão dele ------------
drop policy if exists "gestor altera ocorrencias" on public.ocorrencias;
create policy "gestor altera ocorrencias"
  on public.ocorrencias for update
  to authenticated
  using (public.eh_gestor() and (public.orgao_do_gestor() is null or orgao = public.orgao_do_gestor()))
  with check (public.eh_gestor());

drop policy if exists "gestor apaga ocorrencias" on public.ocorrencias;
create policy "gestor apaga ocorrencias"
  on public.ocorrencias for delete
  to authenticated
  using (public.eh_gestor() and (public.orgao_do_gestor() is null or orgao = public.orgao_do_gestor()));

-- 6. View do app: mesmas colunas de antes + orgao no fim ------------------------
create or replace view public.ocorrencias_georreferenciadas
with (security_invoker = true) as
select id, created_at, categoria, descricao,
       case when foto_oculta and not public.eh_gestor() then null else foto_url end as foto_url,
       status,
       st_y(localizacao::geometry) as latitude,
       st_x(localizacao::geometry) as longitude,
       observacoes, updated_at,
       foto_resolucao_url as foto_resolucao,
       total_apoios, total_denuncias, foto_oculta,
       bairro, resolvido_em,
       orgao
from ocorrencias;

commit;

-- =============================================================================
-- LIGAR UM GESTOR A UM ÓRGÃO (sem isso ele continua gestor geral)
-- =============================================================================
-- update public.gestores set orgao = 'iluminacao'
-- where user_id = (select id from auth.users where email = 'gestor@exemplo.com');
--
-- Voltar a gestor geral: update public.gestores set orgao = null where user_id = ...;
-- Renomear um órgão:     update public.orgaos set nome = 'Secretaria de ...' where id = 'vias';
-- =============================================================================
