import { describe, expect, it } from 'vitest'
import { calcularEquidade, formatarPercentual } from './equidade'

const HOJE = new Date('2026-11-30T12:00:00Z')

/** Gera `n` registros de um bairro: `noPrazo` resolvidos em 2 dias, `tarde` em 20 dias, o resto aberto. */
function registros(bairro, n, noPrazo, tarde = 0, registrado = '2026-10-01') {
  return Array.from({ length: n }, (_, i) => {
    if (i < noPrazo) return { bairro, status: 'resolvido', registrado_em: registrado, resolvido_em: '2026-10-03' }
    if (i < noPrazo + tarde) return { bairro, status: 'resolvido', registrado_em: registrado, resolvido_em: '2026-10-21' }
    return { bairro, status: 'pendente', registrado_em: registrado, resolvido_em: null }
  })
}

describe('painel de equidade', () => {
  it('calcula o percentual resolvido no prazo e ordena do pior para o melhor', () => {
    const linhas = [...registros('Centro', 10, 8, 1), ...registros('Icuí-Guajará', 10, 2, 3)]
    const r = calcularEquidade(linhas, { hoje: HOJE })
    expect(r.bairros.map((b) => b.bairro)).toEqual(['Icuí-Guajará', 'Centro'])
    expect(r.bairros[0].percentual).toBe(20)
    expect(r.bairros[1].percentual).toBe(80)
    expect(r.cidade.percentual).toBe(50)
    expect(r.diferenca.pontos).toBe(60)
    expect(r.diferenca.pior.bairro).toBe('Icuí-Guajará')
    expect(r.bairros[0].abaixoDaMedia).toBe(true)
    expect(r.bairros[1].abaixoDaMedia).toBe(false)
  })

  it('conta abertos há mais de 30 dias e a mediana de dias até resolver', () => {
    const r = calcularEquidade(registros('Paar', 6, 2, 2), { hoje: HOJE })
    const [paar] = r.bairros
    expect(paar.abertosMais30).toBe(2)
    expect(paar.medianaDias).toBe(11) // resolvidos em 2, 2, 20, 20 dias
  })

  it('ignora registros ainda dentro do prazo, sem bairro ou sem data', () => {
    const linhas = [
      ...registros('Guanabara', 5, 5),
      { bairro: 'Guanabara', status: 'pendente', registrado_em: '2026-11-28', resolvido_em: null },
      { bairro: null, status: 'pendente', registrado_em: '2026-10-01' },
      { bairro: 'Guanabara', status: 'pendente', registrado_em: '' }
    ]
    const r = calcularEquidade(linhas, { hoje: HOJE })
    expect(r.bairros[0].elegiveis).toBe(5)
    expect(r.bairros[0].percentual).toBe(100)
  })

  it('deixa de fora da comparação bairros com poucos registros', () => {
    const linhas = [...registros('Aurá', 3, 0), ...registros('Cidade Nova', 5, 4)]
    const r = calcularEquidade(linhas, { hoje: HOJE })
    expect(r.bairros.map((b) => b.bairro)).toEqual(['Cidade Nova'])
    expect(r.foraDaComparacao).toBe(1)
    expect(r.diferenca).toBeNull()
    expect(r.cidade.elegiveis).toBe(8) // a cidade conta todos
  })

  it('resolvido sem data de resolução não conta como no prazo', () => {
    const linhas = registros('Coqueiro', 5, 0).map((l) => ({ ...l, status: 'resolvido', resolvido_em: null }))
    const r = calcularEquidade(linhas, { hoje: HOJE })
    expect(r.bairros[0].percentual).toBe(0)
    expect(r.bairros[0].medianaDias).toBeNull()
    expect(r.bairros[0].abertosMais30).toBe(0)
  })

  it('funciona sem dados', () => {
    const r = calcularEquidade([], { hoje: HOJE })
    expect(r.bairros).toEqual([])
    expect(r.cidade.percentual).toBeNull()
    expect(r.diferenca).toBeNull()
    expect(formatarPercentual(null)).toBe('—')
    expect(formatarPercentual(66.6)).toBe('67%')
  })
})
