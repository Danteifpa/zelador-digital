import { describe, expect, it } from 'vitest'
import { calcularPontuacaoGUT, categoriaGravidade, distanciaMetros, escapeCsv, tendenciaPorContexto, urgenciaPorData } from './gestao'

const SECO = new Date('2026-08-15T12:00:00Z') // fora do período chuvoso (dez–mai)
const CHUVOSO = new Date('2026-02-15T12:00:00Z')

describe('prioridade GUT do Painel', () => {
  it('dá mais gravidade a esgoto do que a buraco, poste e lixo', () => {
    expect(categoriaGravidade('esgoto')).toBe(5)
    expect(categoriaGravidade('buraco')).toBe(4)
    expect(categoriaGravidade('iluminacao')).toBe(3)
    expect(categoriaGravidade('lixo')).toBe(2)
  })

  it('aumenta a urgência de pendentes antigos e não de chamados em análise', () => {
    const agora = new Date('2026-11-11T12:00:00Z')
    expect(urgenciaPorData('2026-11-10T12:00:00Z', 'pendente', agora)).toBe(3)
    expect(urgenciaPorData('2026-11-07T12:00:00Z', 'pendente', agora)).toBe(4)
    expect(urgenciaPorData('2026-11-01T12:00:00Z', 'pendente', agora)).toBe(5)
    expect(urgenciaPorData('2026-11-01T12:00:00Z', 'em_analise', agora)).toBe(3)
  })

  it('sobe a tendência no período chuvoso e com recorrência', () => {
    expect(tendenciaPorContexto({}, false, SECO)).toBe(3)
    expect(tendenciaPorContexto({}, true, SECO)).toBe(4)
    expect(tendenciaPorContexto({}, false, CHUVOSO)).toBe(4)
  })

  it('dá tendência máxima com 3 ou mais "Também vi"', () => {
    expect(tendenciaPorContexto({ total_apoios: 2 }, false, SECO)).toBe(3)
    expect(tendenciaPorContexto({ total_apoios: 3 }, false, SECO)).toBe(5)
    expect(tendenciaPorContexto({ total_apoios: '7' }, false, SECO)).toBe(5)
  })

  it('marca como recorrente outro chamado a menos de 500 m', () => {
    const item = { id: 'a', categoria: 'buraco', status: 'pendente', created_at: '2026-08-15T00:00:00Z', latitude: -1.365, longitude: -48.375 }
    const perto = { id: 'b', latitude: -1.366, longitude: -48.375 } // ~110 m
    const longe = { id: 'c', latitude: -1.38, longitude: -48.375 } // ~1,7 km
    expect(calcularPontuacaoGUT(item, [item, longe], SECO).recorrente).toBe(false)
    const gut = calcularPontuacaoGUT(item, [item, perto], SECO)
    expect(gut).toMatchObject({ gravidade: 4, urgencia: 3, tendencia: 4, recorrente: true, pontuacao: 48 })
  })

  it('calcula distâncias e ignora pontos sem coordenadas', () => {
    expect(distanciaMetros({ latitude: -1.365, longitude: -48.375 }, { latitude: -1.366, longitude: -48.375 })).toBeCloseTo(111, 0)
    expect(distanciaMetros({ latitude: null, longitude: 1 }, { latitude: 1, longitude: 1 })).toBe(Infinity)
  })

  it('escapa aspas no CSV exportado', () => {
    expect(escapeCsv('Rua "A", 10')).toBe('"Rua ""A"", 10"')
    expect(escapeCsv(null)).toBe('""')
  })
})

describe('formatarKm', () => {
  it('usa vírgula e uma casa decimal, como no Brasil', async () => {
    const { formatarKm } = await import('./gestao')
    expect(formatarKm(3.7)).toBe('3,7 km')
    expect(formatarKm(12)).toBe('12,0 km')
    expect(formatarKm(0.04)).toBe('0,0 km')
  })
})
