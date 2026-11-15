-- =============================================================================
-- Testes das regras do banco (rodados no CI depois de aplicar todas as migrações).
-- Cada bloco simula uma requisição da API (papel anon, IP no x-forwarded-for) e
-- falha com "FALHOU: ..." se a regra não se comportar como esperado.
-- Tudo roda numa transação desfeita no fim.
-- =============================================================================
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.verificar(condicao boolean, mensagem text) returns void language plpgsql as $$
begin
  if not condicao then raise exception 'FALHOU: %', mensagem; end if;
  raise notice 'ok: %', mensagem;
end $$;

-- 1) Limite de registros, contadores forçados a zero, bairro e categoria ------------
do $t$
declare i int; ok int := 0; id1 uuid := gen_random_uuid(); barrado boolean := false; r record;
begin
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.10"}', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  for i in 1..9 loop
    begin
      insert into public.ocorrencias (id, categoria, descricao, status, localizacao, total_apoios, foto_url)
      values (case when i = 1 then id1 else gen_random_uuid() end, 'lixo', 'teste', 'pendente',
              'SRID=4326;POINT(-48.39 -1.365)', 99, 'https://exemplo/foto.jpg');
      ok := ok + 1;
    exception when others then
      barrado := sqlerrm = 'LIMITE_REGISTROS';
    end;
  end loop;
  reset role;
  perform pg_temp.verificar(ok = 8 and barrado, '8 registros por hora e o 9º barrado com LIMITE_REGISTROS');
  select * into r from public.ocorrencias where id = id1;
  perform pg_temp.verificar(r.total_apoios = 0, 'quem registra não define o contador de apoios');
  perform pg_temp.verificar(r.bairro = 'Bairro de Teste', 'bairro preenchido pelo ponto do GPS');

  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.11"}', true);
  begin
    insert into public.ocorrencias (categoria, status, localizacao) values ('inventada', 'pendente', 'SRID=4326;POINT(-48.39 -1.365)');
    perform pg_temp.verificar(false, 'categoria desconhecida deveria ser recusada');
  exception when check_violation then
    perform pg_temp.verificar(true, 'categoria desconhecida recusada');
  end;
end $t$;

-- 2) Denúncias: uma por celular, foto oculta com 3, view esconde do público -----------
do $t$
declare alvo uuid; j jsonb; foto text;
begin
  select id into alvo from public.ocorrencias where descricao = 'teste' limit 1;
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.20"}', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  j := public.denunciar_ocorrencia(alvo, '00000000-0000-0000-0000-0000000000a1', 'foto_impropria');
  j := public.denunciar_ocorrencia(alvo, '00000000-0000-0000-0000-0000000000a1', 'foto_impropria');
  perform pg_temp.verificar(j ->> 'motivo' = 'repetido', 'mesmo celular não denuncia duas vezes');
  j := public.denunciar_ocorrencia(alvo, '00000000-0000-0000-0000-0000000000a2', 'pessoa_ou_placa');
  perform pg_temp.verificar((j ->> 'oculta')::boolean = false, 'com 2 denúncias a foto continua');
  j := public.denunciar_ocorrencia(alvo, '00000000-0000-0000-0000-0000000000a3', 'falso_ou_repetido');
  perform pg_temp.verificar((j ->> 'oculta')::boolean, 'com 3 denúncias a foto é ocultada');
  select foto_url into foto from public.ocorrencias_georreferenciadas where id = alvo;
  perform pg_temp.verificar(foto is null, 'view esconde a foto oculta do público');
  begin
    perform count(*) from public.denuncias;
    perform pg_temp.verificar(false, 'anônimo não pode ler denúncias');
  exception when insufficient_privilege then
    perform pg_temp.verificar(true, 'anônimo não lê denúncias');
  end;
  reset role;
end $t$;

-- 3) Apoios: um por celular ----------------------------------------------------------
do $t$
declare alvo uuid; j jsonb;
begin
  select id into alvo from public.ocorrencias where descricao = 'teste' limit 1;
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.30"}', true);
  set local role anon;
  j := public.apoiar_ocorrencia(alvo, '00000000-0000-0000-0000-0000000000b1');
  perform pg_temp.verificar((j ->> 'apoiado')::boolean and (j ->> 'total')::int = 1, 'primeiro apoio conta');
  j := public.apoiar_ocorrencia(alvo, '00000000-0000-0000-0000-0000000000b1');
  perform pg_temp.verificar(j ->> 'motivo' = 'repetido', 'apoio repetido não conta');
  reset role;
end $t$;

-- 4) Anônimo não altera nem apaga ocorrências ----------------------------------------
do $t$
declare alterados int;
begin
  set local role anon;
  update public.ocorrencias set status = 'resolvido' where descricao = 'teste';
  get diagnostics alterados = row_count;
  reset role;
  perform pg_temp.verificar(alterados = 0, 'anônimo não altera ocorrências');
end $t$;

-- 5) Resolução registra a data e transparência soma por bairro -----------------------
do $t$
declare alvo uuid; quando timestamptz; abertos int;
begin
  select id into alvo from public.ocorrencias where descricao = 'teste' limit 1;
  update public.ocorrencias set status = 'resolvido' where id = alvo;
  select resolvido_em into quando from public.ocorrencias where id = alvo;
  perform pg_temp.verificar(quando is not null, 'resolvido_em preenchido ao resolver');
  update public.ocorrencias set status = 'pendente' where id = alvo;
  select resolvido_em into quando from public.ocorrencias where id = alvo;
  perform pg_temp.verificar(quando is null, 'resolvido_em limpo ao reabrir');
  select t.abertos into abertos from public.transparencia_bairros t where t.bairro = 'Bairro de Teste';
  perform pg_temp.verificar(abertos = 8, 'transparência conta os abertos do bairro');
end $t$;

-- 6) Verificação em duas etapas dos gestores ------------------------------------------
do $t$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email) values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gestor-teste@exemplo.invalid');
  insert into public.gestores (user_id, nome) values (u, 'Gestor de teste');
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform pg_temp.verificar(public.eh_gestor(), 'gestor sem app autenticador entra com a senha');
  insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
  values (gen_random_uuid(), u, 'teste', 'totp', 'verified', now(), now(), 'SEGREDO');
  perform pg_temp.verificar(not public.eh_gestor(), 'com app autenticador, só a senha não basta');
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform pg_temp.verificar(public.eh_gestor(), 'com o código (aal2) o gestor entra');
end $t$;

-- 7) Erros do app: limite e rota sem parâmetros -------------------------------------
do $t$
declare i int; n int; rota_salva text;
begin
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.40","user-agent":"CI"}', true);
  set local role anon;
  for i in 1..25 loop perform public.registrar_erro('erro ' || i, null, '/x?token=segredo', 'teste'); end loop;
  reset role;
  select count(*), max(rota) into n, rota_salva from public.erros_app where versao = 'teste';
  perform pg_temp.verificar(n = 20, 'no máximo 20 erros por hora por conexão');
  perform pg_temp.verificar(rota_salva = '/x', 'rota salva sem parâmetros');
end $t$;

rollback;
