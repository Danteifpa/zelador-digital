-- Dados de teste do banco local/CI (nunca rodado em produção).
-- Um bairro fictício ao redor do ponto usado nos testes de ponta a ponta.
insert into public.bairros (nome, osm_id, geom)
values ('Bairro de Teste', -1,
  ST_Multi(ST_GeomFromText('POLYGON((-48.40 -1.37, -48.38 -1.37, -48.38 -1.36, -48.40 -1.36, -48.40 -1.37))', 4326)))
on conflict (osm_id) do nothing;
