-- =============================================================================
-- Carga dos limites dos bairros de Ananindeua (OpenStreetMap)
-- =============================================================================
-- Dados © colaboradores do OpenStreetMap, licença ODbL: https://www.openstreetmap.org/copyright
--
-- Como usar (SQL Editor do Supabase), em DOIS passos:
--   1) Rode o PASSO 1. Ele pede os limites ao Overpass e mostra um número (id do pedido).
--   2) Espere 1 a 3 minutos e rode o PASSO 2 trocando :id pelo número do passo 1.
--      Ele monta os polígonos, guarda só os bairros que ficam (na maior parte) dentro
--      do município de Ananindeua e recalcula o bairro de todas as ocorrências.
-- Pode ser repetido para atualizar: bairros já existentes são substituídos (osm_id).
-- =============================================================================

-- PASSO 1 -------------------------------------------------------------------
select net.http_get(
  url := 'https://overpass-api.de/api/interpreter',
  params := jsonb_build_object('data',
    '[out:json][timeout:120][bbox:-1.50,-48.50,-1.20,-48.25];'
    '(relation["boundary"="administrative"]["admin_level"="10"];'
    'relation["boundary"="administrative"]["admin_level"="8"]["name"="Ananindeua"];);out geom;'),
  headers := '{"User-Agent":"ZeladorDigital/1.0 (projeto academico)"}'::jsonb,
  timeout_milliseconds := 180000) as id;

-- PASSO 2 (troque :id) --------------------------------------------------------
-- select status_code, length(content) from net._http_response where id = :id;  -- deve ser 200
insert into public.bairros (nome, osm_id, geom)
with els as (
  select e from net._http_response r, jsonb_array_elements(r.content::jsonb -> 'elements') e
  where r.id = :id and e ->> 'type' = 'relation'
), linhas as (
  select (e ->> 'id')::bigint as rid, e -> 'tags' ->> 'name' as nome, e -> 'tags' ->> 'admin_level' as nivel,
         ST_MakeLine(array(
           select ST_SetSRID(ST_MakePoint((g ->> 'lon')::float8, (g ->> 'lat')::float8), 4326)
           from jsonb_array_elements(m -> 'geometry') with ordinality as x(g, o) order by o)) as geom
  from els, jsonb_array_elements(e -> 'members') m
  where m ->> 'type' = 'way' and m ? 'geometry' and m ->> 'role' in ('outer', 'inner', '')
), poli as (
  select rid, nome, nivel, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_BuildArea(ST_Collect(geom))), 3)) as geom
  from linhas group by 1, 2, 3
), municipio as (
  select geom from poli where nivel = '8'
)
select p.nome, p.rid, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SimplifyPreserveTopology(p.geom, 0.00005)), 3))
from poli p, municipio m
where p.nivel = '10' and not ST_IsEmpty(p.geom)
  and ST_Area(ST_Intersection(p.geom, m.geom)::geography) / ST_Area(p.geom::geography) >= 0.5
on conflict (osm_id) do update set nome = excluded.nome, geom = excluded.geom;

update public.ocorrencias set bairro = public.bairro_do_ponto(localizacao::geometry);
