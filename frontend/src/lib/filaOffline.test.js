// @vitest-environment node
// Ambiente node: o structuredClone do Node preserva Blob dentro do IndexedDB, como no navegador.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

// localStorage mínimo (só para a migração da fila antiga).
const memoria = new Map()
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
  clear: () => memoria.clear()
}

// Cada teste começa com um IndexedDB vazio e módulos novos (a ligação ao banco fica em cache).
let fila
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  memoria.clear()
  vi.resetModules()
  fila = await import('./filaOffline')
})

const item = (id, extra = {}) => ({
  id,
  categoria: 'buraco',
  descricao: 'Rua A',
  latitude: -1.365,
  longitude: -48.375,
  foto: new Blob(['jpeg'], { type: 'image/jpeg' }),
  criadoEm: `2026-11-11T10:00:0${id.length % 10}Z`,
  ...extra
})

describe('fila offline (IndexedDB)', () => {
  it('guarda a foto como Blob e devolve a fila por ordem de criação', async () => {
    await fila.adicionarAFila(item('b', { criadoEm: '2026-11-11T10:00:02Z' }))
    const lista = await fila.adicionarAFila(item('a', { criadoEm: '2026-11-11T10:00:01Z' }))
    expect(lista.map((i) => i.id)).toEqual(['a', 'b'])
    expect(lista[0].foto).toBeInstanceOf(Blob)
  })

  it('não perde um registro guardado durante a sincronização', async () => {
    await fila.adicionarAFila(item('enviado'))
    const lidaAntesDoEnvio = await fila.lerFila()
    // Enquanto o envio acontece, o morador registra outro problema:
    await fila.adicionarAFila(item('novo'))
    const restante = await fila.removerDaFila(lidaAntesDoEnvio.map((i) => i.id))
    expect(restante.map((i) => i.id)).toEqual(['novo'])
  })

  it('guarda o endereço da foto depois do upload e libera o Blob', async () => {
    await fila.adicionarAFila(item('x'))
    await fila.atualizarItemNaFila('x', { fotoUrl: 'https://exemplo/foto.jpg', foto: null })
    const [salvo] = await fila.lerFila()
    expect(salvo.fotoUrl).toBe('https://exemplo/foto.jpg')
    expect(salvo.foto).toBeNull()
  })

  it('migra a fila antiga do localStorage (foto em base64) uma única vez', async () => {
    const antigo = [{ id: 'velho', categoria: 'lixo', fotoBase64: 'data:image/jpeg;base64,/9j/', criadoEm: '2026-01-01T00:00:00Z' }]
    localStorage.setItem(fila.FILA_OFFLINE_KEY, JSON.stringify(antigo))
    const lista = await fila.lerFila()
    expect(lista).toHaveLength(1)
    expect(lista[0].foto).toBeInstanceOf(Blob)
    expect(lista[0].foto.type).toBe('image/jpeg')
    expect(lista[0]).not.toHaveProperty('fotoBase64')
    expect(localStorage.getItem(fila.FILA_OFFLINE_KEY)).toBeNull()
  })

  it('guarda uma cópia se a fila antiga estiver ilegível, sem travar o app', async () => {
    localStorage.setItem(fila.FILA_OFFLINE_KEY, '{quebrado')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(fila.lerFila()).resolves.toEqual([])
    expect(localStorage.getItem('fila_ocorrencias_offline_corrompida')).toBe('{quebrado')
  })

  it('avisa com uma mensagem clara quando o espaço do celular acaba', async () => {
    await fila.lerFila() // abre o banco
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('cheio', 'QuotaExceededError')
    }
    try {
      await expect(fila.adicionarAFila(item('y'))).rejects.toBeInstanceOf(fila.FilaCheiaError)
    } finally {
      IDBObjectStore.prototype.put = original
    }
  })
})
