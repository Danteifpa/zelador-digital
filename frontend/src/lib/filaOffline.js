// Fila de ocorrências registadas sem rede.
//
// Guardada em IndexedDB (lib/armazenamento.js): a foto fica como Blob, sem base64, e a quota
// chega a centenas de registos com foto. Na primeira utilização, a fila antiga do localStorage
// é migrada automaticamente.
//
// Todas as operações leem a fila guardada no momento (nunca uma cópia antiga em memória),
// para que um registo guardado durante uma sincronização não seja apagado por ela.

import { LOJA_FILA, transacao } from './armazenamento'

export const FILA_OFFLINE_KEY = 'fila_ocorrencias_offline'
const CHAVE_ANTIGA = 'zelador_fila_offline'
const CHAVE_BACKUP = 'fila_ocorrencias_offline_corrompida'

export class FilaCheiaError extends Error {
  constructor() {
    super('O espaço do telemóvel para registos offline está cheio. Ligue-se à internet e sincronize os registos pendentes antes de guardar mais.')
    this.name = 'FilaCheiaError'
  }
}

function eQuotaExcedida(erro) {
  return erro?.name === 'QuotaExceededError' || erro?.code === 22 || erro?.code === 1014
}

async function comTratamentoDeQuota(promessa) {
  try {
    return await promessa
  } catch (erro) {
    if (eQuotaExcedida(erro)) throw new FilaCheiaError()
    throw erro
  }
}

function base64ParaBlob(dataUrl) {
  const [cabecalho, dados] = String(dataUrl).split(',')
  const tipo = cabecalho.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
  const binario = atob(dados)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

// Converte um item da fila antiga (foto em base64) para o formato novo (foto como Blob).
export function migrarItemAntigo(item) {
  const { fotoBase64, ...resto } = item
  return { ...resto, foto: fotoBase64 ? base64ParaBlob(fotoBase64) : resto.foto ?? null }
}

let migracao = null

// Move a fila do localStorage (versões anteriores) para o IndexedDB, uma única vez.
function migrarDoLocalStorage() {
  if (migracao) return migracao
  migracao = (async () => {
    let bruto = null
    try {
      bruto = localStorage.getItem(FILA_OFFLINE_KEY) ?? localStorage.getItem(CHAVE_ANTIGA)
      if (!bruto) return
      const antiga = JSON.parse(bruto)
      if (Array.isArray(antiga) && antiga.length > 0) {
        await comTratamentoDeQuota(
          transacao(LOJA_FILA, 'readwrite', (loja) => {
            antiga.forEach((item) => loja.put(migrarItemAntigo(item)))
          })
        )
      }
      // Só apaga depois de o IndexedDB confirmar a gravação.
      localStorage.removeItem(FILA_OFFLINE_KEY)
      localStorage.removeItem(CHAVE_ANTIGA)
    } catch (erro) {
      if (erro instanceof SyntaxError) {
        // Conteúdo ilegível: guarda uma cópia para recuperação manual e segue sem ele.
        console.warn('Fila offline antiga ilegível; cópia guardada em', CHAVE_BACKUP, erro)
        try {
          localStorage.setItem(CHAVE_BACKUP, bruto)
          localStorage.removeItem(FILA_OFFLINE_KEY)
          localStorage.removeItem(CHAVE_ANTIGA)
        } catch {
          /* sem espaço para a cópia */
        }
      } else {
        migracao = null // tenta outra vez na próxima leitura
        throw erro
      }
    }
  })()
  return migracao
}

export async function lerFila() {
  await migrarDoLocalStorage()
  const itens = (await transacao(LOJA_FILA, 'readonly', (loja) => loja.getAll())) || []
  return itens.sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)))
}

export async function adicionarAFila(item) {
  await comTratamentoDeQuota(transacao(LOJA_FILA, 'readwrite', (loja) => loja.put(item)))
  return lerFila()
}

export async function atualizarItemNaFila(id, alteracoes) {
  await transacao(LOJA_FILA, 'readwrite', (loja) => {
    const pedido = loja.get(id)
    pedido.onsuccess = () => {
      if (pedido.result) loja.put({ ...pedido.result, ...alteracoes })
    }
  })
}

export async function removerDaFila(ids) {
  if (ids.length > 0) {
    await transacao(LOJA_FILA, 'readwrite', (loja) => {
      ids.forEach((id) => loja.delete(id))
    })
  }
  return lerFila()
}
