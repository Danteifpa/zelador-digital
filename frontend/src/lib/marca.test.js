import { describe, expect, it } from 'vitest'
import { MARCA_PADRAO, cidadeUf, marcaDe } from './marca'

describe('marca por prefeitura', () => {
  it('sem variáveis usa a marca padrão', () => {
    expect(marcaDe({})).toEqual(MARCA_PADRAO)
    expect(cidadeUf(marcaDe({}))).toBe('Ananindeua - PA')
  })

  it('lê nome, cidade, prefeitura, centro e categorias', () => {
    const m = marcaDe({
      VITE_MARCA_NOME: ' Zela Marituba ',
      VITE_MARCA_CIDADE: 'Marituba',
      VITE_MARCA_PREFEITURA: 'Prefeitura de Marituba',
      VITE_MARCA_CENTRO: '-1.355, -48.341',
      VITE_MARCA_RAIO_KM: '12',
      VITE_CATEGORIAS: 'lixo, Buraco,iluminacao'
    })
    expect(m).toMatchObject({
      nome: 'Zela Marituba', nomeCurto: 'Zela', cidade: 'Marituba', uf: 'PA', prefeitura: 'Prefeitura de Marituba',
      latitude: -1.355, longitude: -48.341, raioKm: 12, categorias: ['lixo', 'buraco', 'iluminacao']
    })
  })

  it('ignora centro e raio inválidos', () => {
    const m = marcaDe({ VITE_MARCA_CENTRO: 'abc', VITE_MARCA_RAIO_KM: '-3' })
    expect(m.latitude).toBe(MARCA_PADRAO.latitude)
    expect(m.raioKm).toBe(MARCA_PADRAO.raioKm)
    expect(marcaDe({ VITE_MARCA_CENTRO: '200,10' }).latitude).toBe(MARCA_PADRAO.latitude)
  })
})
