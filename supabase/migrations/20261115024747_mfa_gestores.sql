-- =============================================================================
-- Zelador Digital — Verificação em duas etapas para gestores
-- =============================================================================
-- Depois que um gestor ativa a verificação em duas etapas (app autenticador, TOTP),
-- a senha sozinha deixa de dar acesso: eh_gestor() só é verdadeiro com uma sessão
-- verificada pelo código (aal2). Gestores que ainda não ativaram continuam entrando
-- só com a senha, para ninguém ficar trancado do lado de fora.
-- =============================================================================

begin;

create or replace function public.eh_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.gestores where user_id = auth.uid())
     and (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       or not exists (
         select 1 from auth.mfa_factors f
         where f.user_id = auth.uid() and f.status = 'verified'
       )
     );
$$;

commit;
