import { describe, expect, it } from 'vitest'
import { mesesDisponiveis, relatorioDoMes } from './relatorioMensal'

const AGORA = new Date('2026-12-05T12:00:00')

const lista = [
  // novembro: 2 de limpeza (1 resolvido em 2 dias), 1 de vias aberto
  { id: '1', categoria: 'lixo', status: 'resolvido', created_at: '2026-11-03T10:00:00', resolvido_em: '2026-11-05T10:00:00', bairro: 'Paar', latitude: -1.36, longitude: -48.37 },
  { id: '2', categoria: 'lixo', status: 'pendente', created_at: '2026-11-10T10:00:00', bairro: 'Paar', latitude: -1.36001, longitude: -48.37001 },
  { id: '3', categoria: 'buraco', status: 'em_analise', created_at: '2026-11-20T10:00:00', bairro: 'Centro', latitude: -1.40, longitude: -48.40 },
  // outubro, resolvido em novembro
  { id: '4', categoria: 'esgoto', status: 'resolvido', created_at: '2026-10-28T10:00:00', resolvido_em: '2026-11-15T10:00:00', bairro: 'Centro' }
]

describe('relatório mensal', () => {
  it('soma o mês, por órgão e por bairro', () => {
    const r = relatorioDoMes(lista, 2026, 10, AGORA)
    expect(r.titulo).toBe('novembro de 2026')
    expect(r.geral).toMatchObject({ registrados: 3, resolvidos: 1, abertos: 2, resolvidosNoMes: 2, medianaDias: 2 })
    expect(Math.round(r.geral.taxaResolucao)).toBe(33)
    expect(r.geral.noPrazo).toBe(100)
    // 2 dos 3 pontos estão a menos de 500 m um do outro
    expect(Math.round(r.geral.reincidencia)).toBe(67)
    expect(r.porOrgao.map((o) => [o.orgao, o.registrados])).toEqual([['limpeza', 2], ['vias', 1]])
    // lixo aberto desde 10/11, prazo de 5 dias: atrasado em 05/12
    expect(r.porOrgao[0].atrasados).toBe(1)
    expect(r.porBairro.map((b) => b.bairro)).toEqual(['Paar', 'Centro'])
  })

  it('mês vazio não quebra', () => {
    const r = relatorioDoMes(lista, 2026, 0, AGORA)
    expect(r.geral.registrados).toBe(0)
    expect(r.geral.taxaResolucao).toBeNull()
    expect(r.porOrgao).toEqual([])
  })

  it('lista os meses com registros, do mais novo ao mais antigo', () => {
    expect(mesesDisponiveis(lista)).toEqual([{ ano: 2026, mes: 10 }, { ano: 2026, mes: 9 }])
  })
})
