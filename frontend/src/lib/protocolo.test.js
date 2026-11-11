import { describe, expect, it } from 'vitest'
import { ehUuid, gerarIdOcorrencia, protocoloCivico } from './protocolo'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('protocolo', () => {
  it('gera UUID v4 diferentes a cada chamada', () => {
    const ids = new Set(Array.from({ length: 50 }, gerarIdOcorrencia))
    expect(ids.size).toBe(50)
    ids.forEach((id) => expect(id).toMatch(UUID_V4))
  })

  it('gera UUID v4 válido mesmo sem crypto.randomUUID (navegadores antigos)', () => {
    const original = crypto.randomUUID
    crypto.randomUUID = undefined
    try {
      expect(gerarIdOcorrencia()).toMatch(UUID_V4)
    } finally {
      crypto.randomUUID = original
    }
  })

  it('reconhece UUIDs', () => {
    expect(ehUuid('83803783-78f0-494c-97ff-3a79d97e5d8e')).toBe(true)
    expect(ehUuid('123')).toBe(false)
    expect(ehUuid(null)).toBe(false)
  })

  it('monta o protocolo ZD- com os 6 primeiros caracteres em maiúsculas', () => {
    expect(protocoloCivico('fd666b90-c8d3-4667-8e87-a84d47de80fa')).toBe('ZD-FD666B')
  })
})
