import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Sessão do gestor via Supabase Auth.
// A permissão real é verificada no servidor pela função public.eh_gestor() e pelas
// políticas RLS da tabela ocorrencias; este hook só decide o que mostrar no ecrã.
export default function useSessaoGestor() {
  const [sessao, setSessao] = useState(null)
  const [ehGestor, setEhGestor] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erroVerificacao, setErroVerificacao] = useState(null)
  // Verificação em duas etapas: a conta tem app autenticador e esta sessão ainda não digitou o código.
  const [precisaCodigo, setPrecisaCodigo] = useState(false)
  // Órgão do gestor (null = gestor geral, vê tudo).
  const [orgaoGestor, setOrgaoGestor] = useState(null)

  useEffect(() => {
    let ativo = true

    const verificar = async (novaSessao) => {
      if (!ativo) return
      setSessao(novaSessao)
      setErroVerificacao(null)
      if (!novaSessao) {
        setEhGestor(false)
        setOrgaoGestor(null)
        setPrecisaCodigo(false)
        setCarregando(false)
        return
      }
      const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!ativo) return
      const faltaCodigo = nivel?.nextLevel === 'aal2' && nivel?.currentLevel !== 'aal2'
      setPrecisaCodigo(faltaCodigo)
      if (faltaCodigo) {
        setEhGestor(false)
        setCarregando(false)
        return
      }
      const { data, error } = await supabase.rpc('eh_gestor')
      if (!ativo) return
      if (error) {
        console.error('Falha ao verificar permissão de gestor:', error)
        setErroVerificacao('Não foi possível confirmar a permissão de gestor. Verifique a conexão e tente novamente.')
        setEhGestor(false)
      } else {
        setEhGestor(data === true)
        if (data === true) {
          // Antes da migração de órgãos a coluna não existe: segue como gestor geral.
          const { data: gestor, error: erroOrgao } = await supabase
            .from('gestores')
            .select('orgao')
            .eq('user_id', novaSessao.user.id)
            .maybeSingle()
          if (!ativo) return
          setOrgaoGestor(erroOrgao ? null : gestor?.orgao ?? null)
        }
      }
      setCarregando(false)
    }

    supabase.auth.getSession().then(({ data }) => verificar(data.session))
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      // Fora do callback, para não bloquear o cliente de autenticação.
      window.setTimeout(() => verificar(novaSessao), 0)
    })

    // Limpa a marca do antigo acesso por PIN.
    sessionStorage.removeItem('gestao_autenticada')

    return () => {
      ativo = false
      assinatura.subscription.unsubscribe()
    }
  }, [])

  const entrar = useCallback(async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (!error) return null
    if (error.status === 400 || /invalid login/i.test(error.message)) return 'E-mail ou senha incorretos.'
    if (error.status === 429) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.'
    return `Não foi possível entrar: ${error.message}`
  }, [])

  // Segunda etapa do login: o código de 6 dígitos do app autenticador.
  const confirmarCodigo = useCallback(async (codigo) => {
    const { data: fatores, error: erroFatores } = await supabase.auth.mfa.listFactors()
    if (erroFatores) return 'Não foi possível verificar o código agora. Tente novamente.'
    const fator = fatores?.totp?.find((f) => f.status === 'verified')
    if (!fator) return 'Nenhum app autenticador ativo nesta conta.'
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo.trim() })
    if (!error) return null
    if (error.status === 429) return 'Muitas tentativas seguidas. Aguarde alguns minutos.'
    return 'Código incorreto ou expirado. Confira o app autenticador e tente de novo.'
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { sessao, ehGestor, orgaoGestor, carregando, erroVerificacao, precisaCodigo, entrar, confirmarCodigo, sair }
}
