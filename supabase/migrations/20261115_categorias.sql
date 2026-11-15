-- =============================================================================
-- Zelador Digital — Novas categorias e lista fechada de categorias
-- =============================================================================
-- Adiciona alagamento, arvore, calcada e sinalizacao. Até aqui a coluna aceitava
-- qualquer texto; agora só os ids conhecidos (mesma lista de frontend/src/lib/categorias.js).
-- =============================================================================

begin;

alter table public.ocorrencias drop constraint if exists ocorrencias_categoria_valida;
alter table public.ocorrencias
  add constraint ocorrencias_categoria_valida
  check (categoria in ('lixo', 'iluminacao', 'buraco', 'esgoto', 'alagamento', 'arvore', 'calcada', 'sinalizacao', 'outro'));

commit;
