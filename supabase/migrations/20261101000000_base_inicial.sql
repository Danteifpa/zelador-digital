-- =============================================================================
-- Zelador Digital — Base inicial (estado do banco antes das migrações versionadas)
-- =============================================================================
-- A tabela ocorrencias e os buckets foram criados pelo painel do Supabase antes de o
-- projeto ter migrações. Este arquivo recria esse ponto de partida para que um banco
-- vazio (CI, ambiente local) chegue ao mesmo estado de produção aplicando as migrações
-- em ordem. Tudo é "if not exists": rodar em produção não muda nada.
-- =============================================================================

begin;

create extension if not exists postgis;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.ocorrencias (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default timezone('utc'::text, now()),
  categoria          text not null,
  descricao          text,
  foto_url           text,
  localizacao        geometry(Point, 4326) not null,
  status             text not null default 'pendente',
  total_apoios       integer not null default 0,
  foto_resolucao_url text
);

insert into storage.buckets (id, name, public)
values ('ocorrencias', 'ocorrencias', true), ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

drop policy if exists "Permitir leitura publica de imagens" on storage.objects;
create policy "Permitir leitura publica de imagens" on storage.objects
  for select using (bucket_id in ('ocorrencias', 'fotos'));

drop policy if exists "Permitir upload publico em ocorrencias" on storage.objects;
create policy "Permitir upload publico em ocorrencias" on storage.objects
  for insert with check (bucket_id = 'ocorrencias');

drop policy if exists "Permitir leitura publica evidencias" on storage.objects;
create policy "Permitir leitura publica evidencias" on storage.objects
  for select using (bucket_id = 'evidencias');

drop policy if exists "Permitir upload publico evidencias" on storage.objects;
create policy "Permitir upload publico evidencias" on storage.objects
  for insert with check (bucket_id = 'evidencias');

commit;
