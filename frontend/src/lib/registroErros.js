// Registro de erros do app: o que quebra no celular dos moradores chega ao Painel.
//
// Sem dados pessoais: mensagem, pilha, rota sem parâmetros, versão do app e navegador.
// O servidor (registrar_erro) limita a 20 por hora por conexão; aqui evitamos repetir
// o mesmo erro na mesma sessão e não enviamos nada em desenvolvimento.

import { supabase } from './supabase'
import { version as VERSAO_APP } from '../../package.json'

const enviados = new Set()
const MAX_POR_SESSAO = 10

// Erros de extensões, redes instáveis e scripts de terceiros: não são falha do app.
const IGNORAR = [
  /ResizeObserver loop/i,
  /Script error\.?$/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /Load failed/i,
  /AbortError/i,
  /chrome-extension:|moz-extension:|safari-extension:/i
]

/** Tira e-mails, números longos e tokens que possam ter vindo junto na mensagem. */
export function limparTexto(texto, limite) {
  return String(texto ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\b(?:eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '[token]')
    .replace(/\b\d{8,}\b/g, '[número]')
    .replace(/([?&](?:token|key|apikey|access_token|code)=)[^&\s]+/gi, '$1[oculto]')
    .slice(0, limite)
}

export function deveIgnorar(mensagem, pilha = '') {
  const texto = `${mensagem || ''}\n${pilha || ''}`
  return !mensagem || IGNORAR.some((padrao) => padrao.test(texto))
}

export async function registrarErro(erro, contexto = '') {
  try {
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') return
    const mensagem = limparTexto(`${contexto ? `[${contexto}] ` : ''}${erro?.message || erro || ''}`, 500)
    const pilha = limparTexto(erro?.stack || '', 2000)
    if (deveIgnorar(mensagem, pilha)) return
    if (enviados.has(mensagem) || enviados.size >= MAX_POR_SESSAO) return
    enviados.add(mensagem)
    await supabase.rpc('registrar_erro', {
      p_mensagem: mensagem,
      p_pilha: pilha || null,
      p_rota: window.location.pathname,
      p_versao: VERSAO_APP
    })
  } catch {
    /* registrar erro nunca pode causar outro erro */
  }
}

/** Escuta erros não tratados da página inteira. Chamar uma vez, no início do app. */
export function iniciarRegistroDeErros() {
  window.addEventListener('error', (evento) => registrarErro(evento.error || evento.message, 'janela'))
  window.addEventListener('unhandledrejection', (evento) => registrarErro(evento.reason, 'promessa'))
}
