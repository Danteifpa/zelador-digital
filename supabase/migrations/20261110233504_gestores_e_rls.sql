-- =============================================================================
-- Zelador Digital — acesso de gestores com Supabase Auth + regras de acesso (RLS)
-- =============================================================================
-- Substitui o PIN fixo no código do cliente. Depois deste script:
--   * qualquer pessoa pode LER ocorrências e REGISTAR novas (sempre como 'pendente');
--   * só utilizadores na tabela public.gestores podem ALTERAR ou APAGAR ocorrências;
--   * a vista ocorrencias_georreferenciadas passa a ser só de leitura e a respeitar o RLS.
--
-- Como aplicar: Supabase → SQL Editor → New query → colar este ficheiro → Run.
-- Corre numa única transação: se algo falhar, nada é alterado. Pode correr mais de uma vez.
-- =============================================================================

begin;

-- 0. Colunas que o Painel de Gestão já usa e não existiam ------------------
alter table public.ocorrencias add column if not exists updated_at timestamptz;
alter table public.ocorrencias add column if not exists observacoes text;

-- 1. Tabela de gestores ------------------------------------------------------
create table if not exists public.gestores (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  nome      text not null,
  criado_em timestamptz not null default now()
);

alter table public.gestores enable row level security;

drop policy if exists "gestor ve o proprio registo" on public.gestores;
create policy "gestor ve o proprio registo"
  on public.gestores for select
  to authenticated
  using (user_id = auth.uid());

-- 2. Função usada pelas regras e pelo app -----------------------------------
create or replace function public.eh_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.gestores where user_id = auth.uid());
$$;

revoke all on function public.eh_gestor() from public;
grant execute on function public.eh_gestor() to anon, authenticated;

-- 3. Regras de acesso da tabela ocorrencias ---------------------------------
alter table public.ocorrencias enable row level security;

-- Remove TODAS as políticas antigas desta tabela: as regras do Postgres somam-se, por isso
-- uma política antiga que deixe qualquer pessoa alterar ou apagar manteria a falha aberta.
do $$
declare
  politica record;
begin
  for politica in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'ocorrencias'
  loop
    execute format('drop policy %I on public.ocorrencias', politica.policyname);
  end loop;
end $$;

create policy "leitura publica"
  on public.ocorrencias for select
  to anon, authenticated
  using (true);

create policy "cidadao regista ocorrencia pendente"
  on public.ocorrencias for insert
  to anon, authenticated
  with check (status = 'pendente');

create policy "gestor altera ocorrencias"
  on public.ocorrencias for update
  to authenticated
  using (public.eh_gestor())
  with check (public.eh_gestor());

create policy "gestor apaga ocorrencias"
  on public.ocorrencias for delete
  to authenticated
  using (public.eh_gestor());

-- TRUNCATE ignora o RLS; ninguém do lado do cliente precisa dele.
revoke truncate on public.ocorrencias from anon, authenticated;

-- 4. Vista usada pelo mapa e pela lista ------------------------------------
-- Mantém as colunas existentes pela mesma ordem e acrescenta as que o Painel usa.
-- foto_resolucao_url é exposta como foto_resolucao, o nome que o app lê.
create or replace view public.ocorrencias_georreferenciadas as
select
  id,
  created_at,
  categoria,
  descricao,
  foto_url,
  status,
  st_y((localizacao)::geometry) as latitude,
  st_x((localizacao)::geometry) as longitude,
  observacoes,
  updated_at,
  foto_resolucao_url as foto_resolucao,
  total_apoios
from public.ocorrencias;

-- A vista corria com as permissões do dono (ignorando o RLS) e aceitava UPDATE/DELETE de 'anon':
-- passa a respeitar o RLS de quem consulta e fica só de leitura.
alter view public.ocorrencias_georreferenciadas set (security_invoker = on);
revoke insert, update, delete, truncate, references, trigger
  on public.ocorrencias_georreferenciadas from anon, authenticated;
grant select on public.ocorrencias_georreferenciadas to anon, authenticated;

-- 5. Consulta de protocolo no servidor --------------------------------------
-- Devolve só a ocorrência pedida (antes o app descarregava a tabela inteira).
create index if not exists ocorrencias_protocolo_idx
  on public.ocorrencias (upper(left(id::text, 6)));

drop function if exists public.consultar_protocolo(text);
create function public.consultar_protocolo(codigo text)
returns setof public.ocorrencias_georreferenciadas
language sql
stable
set search_path = public
as $$
  select v.*
  from public.ocorrencias_georreferenciadas v
  where upper(left(v.id::text, 6)) =
        upper(left(regexp_replace(trim(codigo), '^(protocolo\s+)?zd-', '', 'i'), 6))
  order by v.created_at desc
  limit 5;
$$;

grant execute on function public.consultar_protocolo(text) to anon, authenticated;

commit;

-- =============================================================================
-- DEPOIS DE CORRER O SCRIPT: registar os gestores
-- =============================================================================
-- 1. Authentication → Users → Add user → Create new user
--    (email + senha, marcar "Auto Confirm User"). Repetir para cada gestor.
-- 2. Correr, trocando os emails e nomes:
--
-- insert into public.gestores (user_id, nome)
-- select id, 'Nome do Gestor' from auth.users where email = 'gestor@exemplo.com'
-- on conflict (user_id) do nothing;
--
-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
--   select policyname, cmd, roles from pg_policies where tablename = 'ocorrencias';  -- 4 políticas
--   select g.nome, u.email from public.gestores g join auth.users u on u.id = g.user_id;
-- O Storage já tem upload público para o bucket 'ocorrencias' (anon e authenticated) e não
-- tem políticas de UPDATE/DELETE, por isso não precisa de alterações.
