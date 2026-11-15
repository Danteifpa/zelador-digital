-- =============================================================================
-- Zelador Digital — "Também vi este problema" (apoios)
-- =============================================================================
-- Em vez de registrar um problema repetido, o morador apoia o registro existente.
--
--   * Um apoio por celular e por ocorrência (dispositivo_id gerado no app).
--   * No máximo 30 apoios por hora vindos da mesma conexão, para dificultar inflar
--     a contagem por script. O IP NÃO é guardado: só um HMAC com sal secreto (Vault).
--   * O contador ocorrencias.total_apoios só muda pela função apoiar_ocorrencia().
--   * Substitui incrementar_apoio(), que aceitava chamadas ilimitadas de qualquer pessoa.
-- =============================================================================

begin;

-- Sal secreto para o hash da origem (criado uma única vez).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'apoios_sal') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'apoios_sal', 'Sal do hash de origem dos apoios');
  end if;
end $$;

create table if not exists public.apoios (
  ocorrencia_id  uuid not null references public.ocorrencias (id) on delete cascade,
  dispositivo_id uuid not null,
  origem_hash    text,
  criado_em      timestamptz not null default now(),
  primary key (ocorrencia_id, dispositivo_id)
);

create index if not exists apoios_origem_idx on public.apoios (origem_hash, criado_em);

-- Ninguém do lado do app lê nem escreve diretamente: só pela função abaixo.
alter table public.apoios enable row level security;
revoke all on public.apoios from anon, authenticated;

drop function if exists public.incrementar_apoio(uuid);

create or replace function public.apoiar_ocorrencia(p_ocorrencia_id uuid, p_dispositivo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_status   text;
  v_total    integer;
  v_ip       text;
  v_sal      text;
  v_origem   text;
  v_recentes integer;
  v_inserido integer;
begin
  if p_ocorrencia_id is null or p_dispositivo_id is null then
    raise exception 'Parâmetros obrigatórios' using errcode = '22023';
  end if;

  select status, total_apoios into v_status, v_total
  from ocorrencias where id = p_ocorrencia_id;
  if not found then
    raise exception 'Ocorrência não encontrada' using errcode = 'P0002';
  end if;
  if v_status = 'resolvido' then
    return jsonb_build_object('apoiado', false, 'total', v_total, 'motivo', 'resolvida');
  end if;

  -- Origem: primeiro IP do x-forwarded-for, transformado em HMAC (o IP não é guardado).
  v_ip := coalesce(nullif(trim(split_part(
            coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-forwarded-for', ',', 1)), ''), 'desconhecido');
  select decrypted_secret into v_sal from vault.decrypted_secrets where name = 'apoios_sal';
  v_origem := encode(hmac(v_ip, coalesce(v_sal, 'sem-sal'), 'sha256'), 'hex');

  select count(*) into v_recentes
  from apoios where origem_hash = v_origem and criado_em > now() - interval '1 hour';
  if v_recentes >= 30 then
    return jsonb_build_object('apoiado', false, 'total', v_total, 'motivo', 'limite');
  end if;

  insert into apoios (ocorrencia_id, dispositivo_id, origem_hash)
  values (p_ocorrencia_id, p_dispositivo_id, v_origem)
  on conflict do nothing;
  get diagnostics v_inserido = row_count;

  if v_inserido = 1 then
    update ocorrencias set total_apoios = total_apoios + 1
    where id = p_ocorrencia_id
    returning total_apoios into v_total;
    return jsonb_build_object('apoiado', true, 'total', v_total);
  end if;

  return jsonb_build_object('apoiado', false, 'total', v_total, 'motivo', 'repetido');
end;
$$;

revoke all on function public.apoiar_ocorrencia(uuid, uuid) from public;
grant execute on function public.apoiar_ocorrencia(uuid, uuid) to anon, authenticated;

commit;
