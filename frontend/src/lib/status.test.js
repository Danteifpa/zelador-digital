import { describe, expect, it } from 'vitest'
import { estaResolvido, etapaDoEstado, normalizarEstado, rotuloDoEstado, VALORES_EM_ABERTO } from './status'

describe('status das ocorrências', () => {
  it('mantém os três valores oficiais', () => {
    expect(normalizarEstado('pendente')).toBe('pendente')
    expect(normalizarEstado('em_analise')).toBe('em_analise')
    expect(normalizarEstado('resolvido')).toBe('resolvido')
  })

  it.each([
    ['em analise', 'em_analise'],
    ['Em Análise', 'em_analise'],
    ['em_andamento', 'em_analise'],
    ['oficiada', 'em_analise'],
    ['concluido', 'resolvido'],
    ['Concluído', 'resolvido'],
    ['resolvida', 'resolvido'],
    ['  RESOLVIDO  ', 'resolvido']
  ])('converte a grafia antiga "%s" em "%s"', (antigo, esperado) => {
    expect(normalizarEstado(antigo)).toBe(esperado)
  })

  it('trata vazio e desconhecido como pendente', () => {
    expect(normalizarEstado(null)).toBe('pendente')
    expect(normalizarEstado('')).toBe('pendente')
    expect(normalizarEstado('qualquer coisa')).toBe('pendente')
  })

  it('dá etapas e rótulos em português do Brasil', () => {
    expect([etapaDoEstado('pendente'), etapaDoEstado('em analise'), etapaDoEstado('concluido')]).toEqual([1, 2, 3])
    expect(rotuloDoEstado('em_andamento')).toBe('Em análise')
    expect(estaResolvido('concluído')).toBe(true)
    expect(estaResolvido('pendente')).toBe(false)
  })

  it('lista como "em aberto" as grafias que ainda não foram resolvidas', () => {
    expect(VALORES_EM_ABERTO).toEqual(expect.arrayContaining(['pendente', 'em_analise', 'em analise', 'oficiada']))
    expect(VALORES_EM_ABERTO).not.toContain('resolvido')
    expect(VALORES_EM_ABERTO).not.toContain('concluido')
  })
})
