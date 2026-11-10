-- =============================================================================
-- Zelador Digital — acesso de gestores com Supabase Auth + regras de acesso (RLS)
-- =============================================================================
-- Substitui o PIN fixo no código do cliente. Depois deste script:
--   * qualquer pessoa pode LER ocorrências e REGISTAR novas (sempre como 'pendente');
--   * só utilizadores na tabela public.gestores podem ALTERAR ou APAGAR ocorrências.
--
-- Como aplicar: Supabase → SQL Editor → New query → colar este ficheiro → Run.
-- O script corre numa única transação: se algo falhar, nada é alterado.
-- Seguro para correr mais do que uma vez.
-- =============================================================================

begin;

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

-- Remove TODAS as políticas antigas desta tabela: as regras do Postgres somam-se,
-- por isso uma política antiga que deixe 'anon' alterar ou apagar manteria a falha aberta.
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

-- 4. Consulta de protocolo no servidor --------------------------------------
-- Devolve só a ocorrência pedida (antes o app descarregava até 1000 linhas).
create index if not exists ocorrencias_protocolo_idx
  on public.ocorrencias (upper(left(id::text, 6)));

create or replace function public.consultar_protocolo(codigo text)
returns setof public.ocorrencias
language sql
stable
set search_path = public
as $$
  select *
  from public.ocorrencias
  where upper(left(id::text, 6)) =
        upper(left(regexp_replace(trim(codigo), '^(protocolo\s+)?zd-', '', 'i'), 6))
  order by created_at desc
  limit 5;
$$;

grant execute on function public.consultar_protocolo(text) to anon, authenticated;

-- 5. Storage: gestores com sessão iniciada enviam fotos de resolução --------
-- Com login, os pedidos do gestor deixam de ser 'anon' e passam a 'authenticated'.
-- Esta política só acrescenta permissão de envio para gestores; não altera as existentes.
drop policy if exists "gestor envia fotos" on storage.objects;
create policy "gestor envia fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ocorrencias' and public.eh_gestor());

commit;

-- =============================================================================
-- DEPOIS DE CORRER O SCRIPT: registar os gestores
-- =============================================================================
-- 1. Authentication → Users → Add user → Create new user
--    (email + senha, marcar "Auto Confirm User"). Repetir para cada gestor.
-- 2. Correr, trocando os emails e nomes:
--
-- insert into public.gestores (user_id, nome)
-- select id, 'Nome do Gestor 1' from auth.users where email = 'gestor1@exemplo.com'
-- on conflict (user_id) do nothing;
--
-- insert into public.gestores (user_id, nome)
-- select id, 'Nome do Gestor 2' from auth.users where email = 'gestor2@exemplo.com'
-- on conflict (user_id) do nothing;
--
-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
-- Políticas ativas (deve listar só as 4 criadas acima):
--   select policyname, cmd, roles from pg_policies where tablename = 'ocorrencias';
-- Gestores registados:
--   select g.nome, u.email from public.gestores g join auth.users u on u.id = g.user_id;
-- Políticas do Storage (rever: 'anon' não deve poder UPDATE nem DELETE):
--   select policyname, cmd, roles from pg_policies where schemaname = 'storage' and tablename = 'objects';
