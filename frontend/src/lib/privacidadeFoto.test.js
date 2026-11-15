import { describe, expect, it } from 'vitest'
import { ampliarRetangulo, tamanhoDoBloco } from './privacidadeFoto'

describe('privacidade da foto', () => {
  it('amplia o retângulo do rosto sem sair da imagem', () => {
    const r = ampliarRetangulo({ x: 10, y: 10, largura: 100, altura: 100 }, 120, 1000)
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
    expect(r.x + r.largura).toBeLessThanOrEqual(120)
    expect(r.altura).toBe(150)
  })

  it('usa blocos grandes o bastante para não reconhecer', () => {
    expect(tamanhoDoBloco({ largura: 40, altura: 40 })).toBe(10)
    expect(tamanhoDoBloco({ largura: 300, altura: 200 })).toBe(40)
  })
})
