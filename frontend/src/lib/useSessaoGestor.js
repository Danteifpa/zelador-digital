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

  useEffect(() => {
    let ativo = true

    const verificar = async (novaSessao) => {
      if (!ativo) return
      setSessao(novaSessao)
      setErroVerificacao(null)
      if (!novaSessao) {
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
    if (error.status === 400 || /invalid login/i.test(error.message)) return 'Email ou senha incorretos.'
    if (error.status === 429) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.'
    return `Não foi possível entrar: ${error.message}`
  }, [])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { sessao, ehGestor, carregando, erroVerificacao, entrar, sair }
}
