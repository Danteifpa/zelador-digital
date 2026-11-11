// @vitest-environment node
// Testa public/sync-sw.js (envio em segundo plano) num "service worker" simulado.
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

const CODIGO = readFileSync(new URL('../../public/sync-sw.js', import.meta.url), 'utf8')
const URL_SUPABASE = 'https://exemplo.supabase.co'
const ID = '83803783-78f0-494c-97ff-3a79d97e5d8e'

let ambiente

function carregarServiceWorker({ janelas = [] } = {}) {
  const ouvintes = {}
  const self = {
    addEventListener: (tipo, funcao) => { ouvintes[tipo] = funcao },
    clients: { matchAll: vi.fn(async () => janelas) },
    registration: { showNotification: vi.fn(async () => {}) },
    navigator: {},
    Notification: { permission: 'granted' }
  }
  const fetch = vi.fn()
  new Function('self', 'indexedDB', 'fetch', 'console', CODIGO)(self, ambiente.indexedDB, fetch, { warn() {} })
  const disparar = async (tag = 'enviar-fila-offline') => {
    let promessa = Promise.resolve()
    ouvintes.sync({ tag, waitUntil: (p) => { promessa = p } })
    return promessa
  }
  return { self, fetch, disparar }
}

async function abrir() {
  return new Promise((resolve, reject) => {
    const pedido = ambiente.indexedDB.open('zelador-digital', 1)
    pedido.onupgradeneeded = () => {
      pedido.result.createObjectStore('fila', { keyPath: 'id' })
      pedido.result.createObjectStore('cache')
    }
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error)
  })
}

async function gravar(loja, valor, chave) {
  const bd = await abrir()
  await new Promise((resolve) => {
    const tx = bd.transaction(loja, 'readwrite')
    chave ? tx.objectStore(loja).put(valor, chave) : tx.objectStore(loja).put(valor)
    tx.oncomplete = resolve
  })
  bd.close()
}

async function lerFila() {
  const bd = await abrir()
  const itens = await new Promise((resolve) => {
    const pedido = bd.transaction('fila').objectStore('fila').getAll()
    pedido.onsuccess = () => resolve(pedido.result)
  })
  bd.close()
  return itens
}

const resposta = (status, corpo = {}) => ({ ok: status < 300, status, json: async () => corpo })

beforeEach(async () => {
  ambiente = { indexedDB: new IDBFactory() }
  await gravar('cache', { url: URL_SUPABASE, chave: 'sb_publishable_teste' }, 'config-envio')
  await gravar('fila', {
    id: ID,
    categoria: 'buraco',
    descricao: 'Rua A',
    latitude: -1.365,
    longitude: -48.375,
    foto: new Blob(['jpeg'], { type: 'image/jpeg' }),
    criadoEm: '2026-11-11T10:00:00Z'
  })
})

describe('envio em segundo plano (public/sync-sw.js)', () => {
  it('envia foto e registro, esvazia a fila e avisa o morador com o app fechado', async () => {
    const sw = carregarServiceWorker()
    sw.fetch.mockResolvedValueOnce(resposta(200)).mockResolvedValueOnce(resposta(201))

    await sw.disparar()

    const [urlFoto, pedidoFoto] = sw.fetch.mock.calls[0]
    expect(urlFoto).toMatch(/^https:\/\/exemplo\.supabase\.co\/storage\/v1\/object\/ocorrencias\/ocorrencias\/.+_offline_.+\.jpg$/)
    expect(pedidoFoto.headers).toMatchObject({ apikey: 'sb_publishable_teste', Authorization: 'Bearer sb_publishable_teste' })

    const [urlRegistro, pedidoRegistro] = sw.fetch.mock.calls[1]
    expect(urlRegistro).toBe(`${URL_SUPABASE}/rest/v1/ocorrencias`)
    const corpo = JSON.parse(pedidoRegistro.body)
    expect(corpo).toMatchObject({ id: ID, categoria: 'buraco', status: 'pendente', localizacao: 'POINT(-48.375 -1.365)' })
    expect(corpo.foto_url).toMatch(/\/storage\/v1\/object\/public\/ocorrencias\//)

    expect(await lerFila()).toEqual([])
    expect(sw.self.registration.showNotification).toHaveBeenCalledWith('Registro enviado', expect.objectContaining({ data: { url: '/?protocolo=ZD-838037' } }))
  })

  it('considera enviado um registro que já existe no servidor (código 23505)', async () => {
    const sw = carregarServiceWorker()
    sw.fetch.mockResolvedValueOnce(resposta(200)).mockResolvedValueOnce(resposta(409, { code: '23505' }))
    await sw.disparar()
    expect(await lerFila()).toEqual([])
  })

  it('mantém o registro na fila, sem repetir a foto, e pede nova tentativa quando falha', async () => {
    const sw = carregarServiceWorker()
    sw.fetch.mockResolvedValueOnce(resposta(200)).mockResolvedValueOnce(resposta(500, { code: 'XX000' }))

    await expect(sw.disparar()).rejects.toThrow('1 registro(s) ainda na fila')

    const [item] = await lerFila()
    expect(item.fotoUrl).toMatch(/\/object\/public\/ocorrencias\//)
    expect(item.foto).toBeNull()

    // Na nova tentativa a foto não é enviada de novo.
    const outra = carregarServiceWorker()
    outra.fetch.mockResolvedValueOnce(resposta(201))
    await outra.disparar()
    expect(outra.fetch).toHaveBeenCalledTimes(1)
    expect(outra.fetch.mock.calls[0][0]).toBe(`${URL_SUPABASE}/rest/v1/ocorrencias`)
    expect(await lerFila()).toEqual([])
  })

  it('com o app aberto, avisa a tela em vez de mostrar notificação', async () => {
    const janela = { visibilityState: 'visible', postMessage: vi.fn() }
    const sw = carregarServiceWorker({ janelas: [janela] })
    sw.fetch.mockResolvedValueOnce(resposta(200)).mockResolvedValueOnce(resposta(201))
    await sw.disparar()
    expect(janela.postMessage).toHaveBeenCalledWith({ tipo: 'fila-enviada', ids: [ID] })
    expect(sw.self.registration.showNotification).not.toHaveBeenCalled()
  })

  it('usa a mesma trava do app quando o navegador tem Web Locks', async () => {
    const sw = carregarServiceWorker()
    sw.self.navigator.locks = { request: vi.fn((nome, funcao) => funcao()) }
    sw.fetch.mockResolvedValueOnce(resposta(200)).mockResolvedValueOnce(resposta(201))
    await sw.disparar()
    expect(sw.self.navigator.locks.request).toHaveBeenCalledWith('zelador-fila-offline', expect.any(Function))
  })

  it('ignora outras etiquetas e não faz nada sem a configuração do app', async () => {
    const sw = carregarServiceWorker()
    await sw.disparar('outra-coisa')
    expect(sw.fetch).not.toHaveBeenCalled()

    ambiente.indexedDB = new IDBFactory()
    await gravar('fila', { id: ID, categoria: 'lixo', latitude: 0, longitude: 0 })
    const semConfig = carregarServiceWorker()
    await semConfig.disparar()
    expect(semConfig.fetch).not.toHaveBeenCalled()
  })
})
