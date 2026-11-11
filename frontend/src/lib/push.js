// Inscrição do celular para receber avisos push de um protocolo.
//
// A chave pública VAPID é pública por definição (vai dentro do app); a chave privada fica
// só nos segredos da Edge Function notificar-status, no Supabase.

import { supabase } from './supabase'
import { ehUuid } from './protocolo'

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '__VAPID_PUBLIC_KEY__'

const CHAVE_INSCRITOS = 'zelador_avisos_protocolos'
const CHAVE_PENDENTES = 'zelador_avisos_pendentes'

function lerLista(chave) {
  try {
    const lista = JSON.parse(localStorage.getItem(chave) || '[]')
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

function gravarLista(chave, lista) {
  try {
    localStorage.setItem(chave, JSON.stringify([...new Set(lista)].slice(-100)))
  } catch {
    /* sem espaço: não é crítico */
  }
}

export const avisosAtivosPara = (ocorrenciaId) => lerLista(CHAVE_INSCRITOS).includes(ocorrenciaId)

const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const instalado = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// 'ok' | 'ios-instalar' | 'sem-suporte' | 'sem-chave'
export function situacaoDoSuporte() {
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('__')) return 'sem-chave'
  if (ehIOS() && !instalado()) return 'ios-instalar' // no iPhone, só funciona com o app na tela inicial
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'sem-suporte'
  return 'ok'
}

function base64UrlParaBytes(base64Url) {
  const preenchido = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(preenchido)
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

async function obterInscricaoDoCelular() {
  const registo = await navigator.serviceWorker.ready
  const existente = await registo.pushManager.getSubscription()
  if (existente) return existente
  return registo.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlParaBytes(VAPID_PUBLIC_KEY)
  })
}

async function gravarInscricao(ocorrenciaId, inscricao) {
  const { endpoint, keys } = inscricao.toJSON()
  const { error } = await supabase
    .from('inscricoes_push')
    .insert({ ocorrencia_id: ocorrenciaId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
  // 23505 = este celular já acompanha este protocolo.
  if (error && error.code !== '23505') throw error
  gravarLista(CHAVE_INSCRITOS, [...lerLista(CHAVE_INSCRITOS), ocorrenciaId])
}

/**
 * Pede permissão e inscreve o celular nos avisos do protocolo.
 * Se o registro ainda está só no celular (offline), guarda o pedido e conclui
 * automaticamente quando a ocorrência chegar ao servidor (ver concluirAvisosPendentes).
 * @returns {Promise<'ativado'|'pendente'|'negado'|'ignorado'|'ios-instalar'|'sem-suporte'|'sem-chave'>}
 */
export async function ativarAvisosDoProtocolo(ocorrenciaId, { jaNoServidor = true } = {}) {
  const situacao = situacaoDoSuporte()
  if (situacao !== 'ok') return situacao
  if (!ehUuid(ocorrenciaId)) return 'sem-suporte'

  const permissao = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permissao === 'denied') return 'negado'
  if (permissao !== 'granted') return 'ignorado'

  if (!jaNoServidor || !navigator.onLine) {
    gravarLista(CHAVE_PENDENTES, [...lerLista(CHAVE_PENDENTES), ocorrenciaId])
    return 'pendente'
  }
  await gravarInscricao(ocorrenciaId, await obterInscricaoDoCelular())
  return 'ativado'
}

/** Chamado depois de sincronizar a fila offline: ativa os avisos pedidos sem rede. */
export async function concluirAvisosPendentes(idsSincronizados) {
  const pendentes = lerLista(CHAVE_PENDENTES)
  const prontos = pendentes.filter((id) => idsSincronizados.includes(id))
  if (prontos.length === 0 || situacaoDoSuporte() !== 'ok' || Notification.permission !== 'granted') return
  const inscricao = await obterInscricaoDoCelular()
  for (const id of prontos) {
    try {
      await gravarInscricao(id, inscricao)
    } catch (erro) {
      console.warn('Não foi possível ativar os avisos do protocolo', id, erro)
    }
  }
  gravarLista(CHAVE_PENDENTES, pendentes.filter((id) => !prontos.includes(id)))
}

export const MENSAGENS_AVISOS = {
  ativado: 'Avisos ativados: você será notificado quando o status deste protocolo mudar.',
  pendente: 'Avisos guardados: serão ativados assim que o registro for enviado.',
  negado: 'As notificações estão bloqueadas para este site. Libere nas configurações do navegador.',
  ignorado: 'Permissão não concedida. Toque de novo quando quiser receber avisos.',
  'ios-instalar': 'No iPhone, os avisos só funcionam com o app instalado: toque em Compartilhar → "Adicionar à Tela de Início".',
  'sem-suporte': 'Este navegador não recebe notificações. Tente no Chrome ou com o app instalado.',
  'sem-chave': 'Os avisos ainda não estão configurados no servidor.'
}
