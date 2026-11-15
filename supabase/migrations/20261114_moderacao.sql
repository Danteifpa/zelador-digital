-- =============================================================================
-- Zelador Digital — Moderação: limite de registros e denúncia de fotos
-- =============================================================================
-- 1) Limite de registros por conexão
--    * No máximo 8 registros por hora e 20 por dia vindos da mesma conexão.
--    * O IP NÃO é guardado: só um HMAC com o sal secreto 'apoios_sal' (Vault).
--    * Gestores logados não têm limite. Reenvio do mesmo registro (fila offline
--      repetindo um envio que já chegou) não conta de novo.
--    * Ao bater o limite o insert falha com a mensagem 'LIMITE_REGISTROS'.
--    * Quem registra não consegue definir contadores nem moderação no insert.
--
-- 2) Denúncia de fotos
--    * Um morador denuncia uma vez por ocorrência (por celular), até 10 por hora
--      por conexão, pela função denunciar_ocorrencia().
--    * Com 3 denúncias a foto fica oculta no app até um gestor revisar.
--    * A view pública esconde foto_url de fotos ocultas para quem não é gestor.
--    * Gestores podem apagar fotos do Storage (antes ninguém podia).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Origem da requisição (HMAC do primeiro IP do x-forwarded-for)
-- Retorna null quando a chamada não veio pela API (ex.: SQL Editor).
-- ---------------------------------------------------------------------------
create or replace function public.origem_da_requisicao()
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_headers text := current_setting('request.headers', true);
  v_ip      text;
  v_sal     text;
begin
  if v_headers is null or v_headers = '' then
    return null;
  end if;
  v_ip := coalesce(nullif(trim(split_part(v_headers::json ->> 'x-forwarded-for', ',', 1)), ''), 'desconhecido');
  select decrypted_secret into v_sal from vault.decrypted_secrets where name = 'apoios_sal';
  return encode(hmac(v_ip, coalesce(v_sal, 'sem-sal'), 'sha256'), 'hex');
end;
$$;

revoke all on function public.origem_da_requisicao() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Limite de registros
-- ---------------------------------------------------------------------------
create table if not exists public.registros_origem (
  id          bigint generated always as identity primary key,
  origem_hash text not null,
  criado_em   timestamptz not null default now()
);

create index if not exists registros_origem_idx on public.registros_origem (origem_hash, criado_em);

alter table public.registros_origem enable row level security;
revoke all on public.registros_origem from anon, authenticated;

alter table public.ocorrencias
  add column if not exists total_denuncias integer not null default 0,
  add column if not exists foto_oculta boolean not null default false;

create or replace function public.limitar_registros()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origem text;
  v_hora   integer;
  v_dia    integer;
begin
  if public.eh_gestor() then
    return new;
  end if;

  -- Quem registra não define contadores nem moderação.
  new.total_apoios    := 0;
  new.total_denuncias := 0;
  new.foto_oculta     := false;

  v_origem := public.origem_da_requisicao();
  if v_origem is null then
    return new; -- não veio pela API
  end if;

  -- Reenvio de um registro que já chegou: deixa o banco recusar pelo id, sem contar.
  if new.id is not null and exists (select 1 from ocorrencias where id = new.id) then
    return new;
  end if;

  select count(*) filter (where criado_em > now() - interval '1 hour'),
         count(*)
    into v_hora, v_dia
  from registros_origem
  where origem_hash = v_origem and criado_em > now() - interval '1 day';

  if v_hora >= 8 or v_dia >= 20 then
    raise exception 'LIMITE_REGISTROS'
      using errcode = 'P0001',
            hint = 'Muitos registros seguidos desta conexão. Tente novamente mais tarde.';
  end if;

  insert into registros_origem (origem_hash) values (v_origem);
  delete from registros_origem where origem_hash = v_origem and criado_em < now() - interval '2 days';

  return new;
end;
$$;

revoke all on function public.limitar_registros() from public, anon, authenticated;

drop trigger if exists antes_de_registrar on public.ocorrencias;
create trigger antes_de_registrar
  before insert on public.ocorrencias
  for each row execute function public.limitar_registros();

-- ---------------------------------------------------------------------------
-- 2) Denúncias
-- ---------------------------------------------------------------------------
create table if not exists public.denuncias (
  ocorrencia_id  uuid not null references public.ocorrencias (id) on delete cascade,
  dispositivo_id uuid not null,
  origem_hash    text,
  motivo         text not null check (motivo in ('foto_impropria', 'pessoa_ou_placa', 'falso_ou_repetido')),
  criado_em      timestamptz not null default now(),
  primary key (ocorrencia_id, dispositivo_id)
);

create index if not exists denuncias_origem_idx on public.denuncias (origem_hash, criado_em);

alter table public.denuncias enable row level security;
revoke all on public.denuncias from anon, authenticated;

-- Gestores podem ler os motivos das denúncias no Painel.
drop policy if exists "gestor le denuncias" on public.denuncias;
create policy "gestor le denuncias" on public.denuncias
  for select to authenticated using (public.eh_gestor());
grant select on public.denuncias to authenticated;

create or replace function public.denunciar_ocorrencia(p_ocorrencia_id uuid, p_dispositivo_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origem   text;
  v_recentes integer;
  v_inserido integer;
  v_total    integer;
  v_oculta   boolean;
begin
  if p_ocorrencia_id is null or p_dispositivo_id is null
     or p_motivo not in ('foto_impropria', 'pessoa_ou_placa', 'falso_ou_repetido') then
    raise exception 'Parâmetros inválidos' using errcode = '22023';
  end if;

  if not exists (select 1 from ocorrencias where id = p_ocorrencia_id) then
    raise exception 'Ocorrência não encontrada' using errcode = 'P0002';
  end if;

  v_origem := coalesce(public.origem_da_requisicao(), 'interno');

  select count(*) into v_recentes
  from denuncias where origem_hash = v_origem and criado_em > now() - interval '1 hour';
  if v_recentes >= 10 then
    return jsonb_build_object('denunciado', false, 'motivo', 'limite');
  end if;

  insert into denuncias (ocorrencia_id, dispositivo_id, origem_hash, motivo)
  values (p_ocorrencia_id, p_dispositivo_id, v_origem, p_motivo)
  on conflict do nothing;
  get diagnostics v_inserido = row_count;

  if v_inserido = 0 then
    return jsonb_build_object('denunciado', false, 'motivo', 'repetido');
  end if;

  update ocorrencias
     set total_denuncias = total_denuncias + 1,
         foto_oculta = foto_oculta or (total_denuncias + 1 >= 3 and foto_url is not null)
   where id = p_ocorrencia_id
  returning total_denuncias, foto_oculta into v_total, v_oculta;

  return jsonb_build_object('denunciado', true, 'oculta', v_oculta);
end;
$$;

revoke all on function public.denunciar_ocorrencia(uuid, uuid, text) from public;
grant execute on function public.denunciar_ocorrencia(uuid, uuid, text) to anon, authenticated;

-- View pública: foto oculta some para quem não é gestor.
create or replace view public.ocorrencias_georreferenciadas
with (security_invoker = true) as
select id,
       created_at,
       categoria,
       descricao,
       case when foto_oculta and not public.eh_gestor() then null else foto_url end as foto_url,
       status,
       st_y(localizacao::geometry) as latitude,
       st_x(localizacao::geometry) as longitude,
       observacoes,
       updated_at,
       foto_resolucao_url as foto_resolucao,
       total_apoios,
       total_denuncias,
       foto_oculta
from ocorrencias;

-- Gestores podem apagar fotos denunciadas do Storage.
drop policy if exists "gestor apaga fotos" on storage.objects;
create policy "gestor apaga fotos" on storage.objects
  for delete to authenticated
  using (bucket_id in ('ocorrencias', 'fotos', 'evidencias') and public.eh_gestor());

commit;
