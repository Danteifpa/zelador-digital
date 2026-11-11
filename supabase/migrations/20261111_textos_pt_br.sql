-- =============================================================================
-- Zelador Digital — textos padrão antigos em português do Brasil
-- =============================================================================
-- Versões antigas do app gravavam a descrição padrão em português de Portugal.
-- Só troca esse texto exato gerado pelo app; descrições escritas por moradores
-- não são tocadas. Pode correr mais do que uma vez.
-- =============================================================================

update public.ocorrencias
set descricao = 'Ocorrência registrada pela comunidade'
where descricao = 'Ocorrência registada pela comunidade';
