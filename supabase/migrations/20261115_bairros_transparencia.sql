-- =============================================================================
-- Zelador Digital — Bairro automático, transparência e dados abertos
-- =============================================================================
-- * bairros: limites dos bairros de Ananindeua (OpenStreetMap, © colaboradores do
--   OpenStreetMap, licença ODbL). Carga em supabase/dados/bairros_ananindeua.sql.
-- * ocorrencias.bairro: preenchido sozinho pelo ponto do GPS (ou o bairro a até 300 m).
-- * ocorrencias.resolvido_em: data em que virou "resolvido" (tempo de resolução real).
-- * transparencia_bairros: números públicos por bairro.
-- * dados_abertos: registros sem foto, sem descrição e com coordenada arredondada (~100 m).
-- =============================================================================

begin;

create table if not exists public.bairros (
  id      serial primary key,
  nome    text not null,
  osm_id  bigint unique,
  geom    geometry(MultiPolygon, 4326) not null
);
create index if not exists bairros_geom_idx on public.bairros using gist (geom);

alter table public.bairros enable row level security;
drop policy if exists "bairros sao publicos" on public.bairros;
create policy "bairros sao publicos" on public.bairros for select to anon, authenticated using (true);
grant select on public.bairros to anon, authenticated;

alter table public.ocorrencias
  add column if not exists bairro text,
  add column if not exists resolvido_em timestamptz;

create index if not exists ocorrencias_bairro_idx on public.ocorrencias (bairro);

create or replace function public.bairro_do_ponto(p_ponto geometry)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(
    (select nome from bairros where ST_Covers(geom, p_ponto) limit 1),
    (select nome from bairros
      where ST_DWithin(geom::geography, p_ponto::geography, 300)
      order by geom <-> p_ponto limit 1)
  );
$$;

create or replace function public.preencher_bairro_e_resolucao()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.localizacao is not null
     and (tg_op = 'INSERT' or new.localizacao is distinct from old.localizacao or new.bairro is null) then
    new.bairro := public.bairro_do_ponto(new.localizacao::geometry);
  end if;

  if new.status = 'resolvido' then
    if tg_op = 'INSERT' or old.status is distinct from 'resolvido' then
      new.resolvido_em := coalesce(new.resolvido_em, now());
    end if;
  else
    new.resolvido_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists bairro_e_resolucao on public.ocorrencias;
create trigger bairro_e_resolucao
  before insert or update on public.ocorrencias
  for each row execute function public.preencher_bairro_e_resolucao();

-- Resolvidas antigas: a última atualização é a melhor estimativa da data de resolução.
update public.ocorrencias set resolvido_em = coalesce(updated_at, created_at)
where status = 'resolvido' and resolvido_em is null;

-- View pública do app (mesmas colunas de antes + bairro e resolvido_em no fim).
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
       bairro, resolvido_em
from ocorrencias;

create or replace view public.transparencia_bairros
with (security_invoker = true) as
select coalesce(bairro, 'Fora dos bairros mapeados') as bairro,
       count(*)::int as total,
       count(*) filter (where status <> 'resolvido')::int as abertos,
       count(*) filter (where status = 'resolvido')::int as resolvidos,
       count(*) filter (where status <> 'resolvido' and created_at < now() - interval '30 days')::int as abertos_mais_30_dias,
       round(avg(extract(epoch from (resolvido_em - created_at)) / 86400)
             filter (where status = 'resolvido' and resolvido_em is not null)::numeric, 1) as dias_medios_resolucao,
       coalesce(sum(total_apoios), 0)::int as apoios
from ocorrencias
group by 1;

create or replace view public.dados_abertos
with (security_invoker = true) as
select upper('ZD-' || left(id::text, 6)) as protocolo,
       categoria, status, bairro,
       round(st_y(localizacao::geometry)::numeric, 3) as latitude,
       round(st_x(localizacao::geometry)::numeric, 3) as longitude,
       created_at::date as registrado_em,
       resolvido_em::date as resolvido_em,
       total_apoios as apoios
from ocorrencias;

grant select on public.transparencia_bairros, public.dados_abertos to anon, authenticated;

commit;
