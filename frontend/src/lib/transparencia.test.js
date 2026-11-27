import { describe, expect, it } from 'vitest'
import { dadosAbertosParaCsv, dadosAbertosParaGeoJson, formatarDias, ordenarBairros, resumirTransparencia } from './transparencia'

const BAIRROS = [
  { bairro: 'Coqueiro', total: 5, abertos: 5, resolvidos: 0, abertos_mais_30_dias: 1, dias_medios_resolucao: null, apoios: 2 },
  { bairro: 'Icuí-Laranjeira', total: 5, abertos: 4, resolvidos: 1, abertos_mais_30_dias: 0, dias_medios_resolucao: '3.6', apoios: 0 },
  { bairro: 'Atalaia', total: 3, abertos: 0, resolvidos: 3, abertos_mais_30_dias: 0, dias_medios_resolucao: '10.0', apoios: 0 }
]

describe('transparência', () => {
  it('soma a cidade e faz a média de tempo ponderada pelos resolvidos', () => {
    const r = resumirTransparencia(BAIRROS)
    expect(r.abertos).toBe(9)
    expect(r.resolvidos).toBe(4)
    expect(r.abertosMais30).toBe(1)
    expect(r.diasMedios).toBeCloseTo((3.6 + 30) / 4)
    expect(resumirTransparencia([]).diasMedios).toBeNull()
  })

  it('ordena por abertos, espera, tempo e nome', () => {
    expect(ordenarBairros(BAIRROS, 'abertos').map((b) => b.bairro)).toEqual(['Coqueiro', 'Icuí-Laranjeira', 'Atalaia'])
    expect(ordenarBairros(BAIRROS, 'espera')[0].bairro).toBe('Coqueiro')
    expect(ordenarBairros(BAIRROS, 'tempo').map((b) => b.bairro)).toEqual(['Coqueiro', 'Atalaia', 'Icuí-Laranjeira'])
    expect(ordenarBairros(BAIRROS, 'nome')[0].bairro).toBe('Atalaia')
  })

  it('escreve o tempo em dias', () => {
    expect(formatarDias(null)).toBe('—')
    expect(formatarDias('0.4')).toBe('menos de 1 dia')
    expect(formatarDias(1.2)).toBe('1 dia')
    expect(formatarDias('3.6')).toBe('4 dias')
  })

  it('gera CSV e GeoJSON sem campos pessoais', () => {
    const linhas = [{ protocolo: 'ZD-83803A', categoria: 'buraco', status: 'pendente', bairro: 'Coqueiro', latitude: -1.372, longitude: -48.418, registrado_em: '2026-11-01', resolvido_em: null, apoios: 2 }]
    const csv = dadosAbertosParaCsv(linhas)
    expect(csv.split('\n')[0]).toBe('\uFEFFprotocolo,categoria,tipo,status,situacao,bairro,latitude,longitude,registrado_em,resolvido_em,apoios')
    expect(csv).toContain('"Buraco na rua"')
    const geo = dadosAbertosParaGeoJson(linhas)
    expect(geo.features[0].geometry.coordinates).toEqual([-48.418, -1.372])
    expect(Object.keys(geo.features[0].properties)).not.toContain('descricao')
  })
})
