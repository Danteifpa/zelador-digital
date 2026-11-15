-- Fixa o search_path de pontuacao_sus (alerta do linter de segurança do Supabase).
alter function public.pontuacao_sus(smallint[]) set search_path = public;
