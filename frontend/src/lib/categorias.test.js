import { describe, expect, it } from 'vitest'
import { iconeDaCategoria, rotuloDaCategoria } from './categorias'

describe('categorias', () => {
  it('mostra o nome amigável das categorias conhecidas', () => {
    expect(rotuloDaCategoria('buraco')).toBe('Buraco na Rua')
    expect(rotuloDaCategoria(' LIXO ')).toBe('Lixo / Entulho')
    expect(rotuloDaCategoria('outro')).toBe('Outro')
  })

  it('mostra dados antigos de forma legível', () => {
    expect(rotuloDaCategoria('alagamento')).toBe('Alagamento')
    expect(rotuloDaCategoria(null)).toBe('Não classificado')
    expect(iconeDaCategoria('desconhecida')).toBe('📍')
  })
})
