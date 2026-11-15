import { beforeEach, describe, expect, it } from 'vitest'
import { AFIRMACOES_SUS, classificarSus, deveConvidarParaPesquisa, marcarPesquisa, pontuacaoSus } from './pesquisaSus'

describe('pesquisa SUS', () => {
  beforeEach(() => localStorage.clear())

  it('tem as 10 afirmações', () => {
    expect(AFIRMACOES_SUS).toHaveLength(10)
  })

  it('calcula a pontuação como o banco', () => {
    expect(pontuacaoSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100)
    expect(pontuacaoSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0)
    expect(pontuacaoSus([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(50)
    expect(pontuacaoSus([4, 2, 4, 2, 4, 2, 4, 2, 4, 2])).toBe(75)
    expect(pontuacaoSus([4, 2, 4])).toBeNull()
  })

  it('classifica a pontuação', () => {
    expect(classificarSus(90)).toBe('Excelente')
    expect(classificarSus(75)).toBe('Boa')
    expect(classificarSus(60)).toBe('Aceitável')
    expect(classificarSus(null)).toBe('—')
  })

  it('não convida de novo quem respondeu e espera 30 dias quem dispensou', () => {
    expect(deveConvidarParaPesquisa()).toBe(true)
    marcarPesquisa('dispensado')
    expect(deveConvidarParaPesquisa()).toBe(false)
    expect(deveConvidarParaPesquisa(Date.now() + 31 * 86400000)).toBe(true)
    marcarPesquisa('respondido')
    expect(deveConvidarParaPesquisa(Date.now() + 365 * 86400000)).toBe(false)
  })
})
