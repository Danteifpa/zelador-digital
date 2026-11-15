import { describe, expect, it } from 'vitest'
import { PASSOS_COMO_USAR, textoDoPasso } from './comoUsar'

describe('como usar', () => {
  it('tem passos curtos, com id único e ação válida', () => {
    const ids = new Set(PASSOS_COMO_USAR.map((p) => p.id))
    expect(ids.size).toBe(PASSOS_COMO_USAR.length)
    for (const p of PASSOS_COMO_USAR) {
      expect(p.titulo.length, p.id).toBeLessThanOrEqual(45)
      expect(p.resumo.split(' ').length, p.id).toBeLessThanOrEqual(45)
      if (p.acao) expect(['registrar', 'consultar', 'registos', 'mapa', 'transparencia']).toContain(p.acao.destino)
    }
  })

  it('monta o texto para a voz com o número do passo', () => {
    expect(textoDoPasso(PASSOS_COMO_USAR[0], 0)).toMatch(/^Passo 1\. /)
  })
})
