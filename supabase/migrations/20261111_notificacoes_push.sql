-- =============================================================================
-- Zelador Digital — avisos push ao cidadão quando o status do protocolo muda
-- =============================================================================
-- Fluxo:
--   1. O cidadão toca "Receber avisos deste protocolo": o app grava a inscrição do
--      celular (endpoint + chaves) em public.inscricoes_push.
--   2. Quando um gestor muda o status, o gatilho chama a Edge Function
--      notificar-status (via pg_net, sem bloquear o UPDATE).
--   3. A função lê o status atual e envia o aviso a quem ainda não o recebeu.
--
-- A função só recebe o id da ocorrência e confirma tudo no banco: chamá-la de fora
-- não permite enviar textos arbitrários nem repetir avisos (ultimo_status_notificado).
-- =============================================================================

begin;

create extension if not exists pg_net with schema extensions;

create table if not exists public.inscricoes_push (
  id                       uuid primary key default gen_random_uuid(),
  ocorrencia_id            uuid not null references public.ocorrencias (id) on delete cascade,
  endpoint                 text not null,
  p256dh                   text not null,
  auth                     text not null,
  ultimo_status_notificado text,
  criado_em                timestamptz not null default now(),
  unique (ocorrencia_id, endpoint)
);

create index if not exists inscricoes_push_ocorrencia_idx on public.inscricoes_push (ocorrencia_id);

-- O cidadão só pode INSERIR a própria inscrição. Ninguém do lado do app pode ler,
-- alterar ou apagar inscrições (os endpoints identificam celulares).
alter table public.inscricoes_push enable row level security;

drop policy if exists "cidadao se inscreve" on public.inscricoes_push;
create policy "cidadao se inscreve"
  on public.inscricoes_push for insert
  to anon, authenticated
  with check (
    endpoint like 'https://%'
    and length(endpoint) <= 1000
    and length(p256dh) between 20 and 200
    and length(auth) between 10 and 100
    and ultimo_status_notificado is null
  );

revoke select, update, delete, truncate on public.inscricoes_push from anon, authenticated;

-- Gatilho: só quando o status muda e só se alguém acompanha o protocolo.
create or replace function public.avisar_mudanca_de_status()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from public.inscricoes_push where ocorrencia_id = new.id) then
    perform net.http_post(
      url     := 'https://xtskjevtskjjlyusccxy.supabase.co/functions/v1/notificar-status',
      body    := jsonb_build_object('ocorrencia_id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

revoke all on function public.avisar_mudanca_de_status() from public, anon, authenticated;

drop trigger if exists ao_mudar_status on public.ocorrencias;
create trigger ao_mudar_status
  after update of status on public.ocorrencias
  for each row
  when (old.status is distinct from new.status)
  execute function public.avisar_mudanca_de_status();

commit;
