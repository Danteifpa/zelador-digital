import { describe, expect, it } from 'vitest'
import { MAXIMO_POR_ORDEM, itensDaOrdem, linkDoMapa, numeroDaOrdem, textoDaOrdem } from './ordemServico'

const AGORA = new Date('2026-11-27T12:00:00Z')
const diasAtras = (n) => new Date(AGORA.getTime() - n * 86_400_000).toISOString()

describe('ordem de serviço', () => {
  it('numera pela data e hora', () => {
    expect(numeroDaOrdem(new Date(2026, 10, 27, 9, 5))).toBe('OS-20261127-0905')
  })

  it('monta o link de rota só com coordenadas válidas', () => {
    expect(linkDoMapa({ latitude: -1.3654321, longitude: '-48.3712346' })).toBe('https://www.google.com/maps/dir/?api=1&destination=-1.365432,-48.371235')
    expect(linkDoMapa({ latitude: null, longitude: 1 })).toBeNull()
  })

  it('põe atrasados e maior GUT primeiro, com limite por ordem', () => {
    const lista = [
      { id: 'a', categoria: 'buraco', created_at: diasAtras(1), gut: { pontuacao: 80 } },
      { id: 'b', categoria: 'lixo', created_at: diasAtras(9), gut: { pontuacao: 10 } },
      { id: 'c', categoria: 'buraco', created_at: diasAtras(1), gut: { pontuacao: 30 } }
    ]
    expect(itensDaOrdem(lista, AGORA).map((i) => i.id)).toEqual(['b', 'a', 'c'])
    const muitos = Array.from({ length: 40 }, (_, i) => ({ id: String(i), categoria: 'lixo', created_at: diasAtras(0), gut: { pontuacao: i } }))
    expect(itensDaOrdem(muitos, AGORA)).toHaveLength(MAXIMO_POR_ORDEM)
  })

  it('escreve o texto para o WhatsApp da equipe', () => {
    const itens = [{ id: '83803783-0000', categoria: 'lixo', status: 'pendente', created_at: diasAtras(9), bairro: 'Icuí-Guajará', descricao: 'Entulho na esquina', latitude: -1.36, longitude: -48.37 }]
    const texto = textoDaOrdem(itens, { numero: 'OS-1', equipe: 'Equipe 2', agora: AGORA })
    expect(texto).toContain('Ordem de serviço OS-1')
    expect(texto).toContain('Equipe: Equipe 2')
    expect(texto).toContain('1. Lixo / Entulho · Protocolo ZD-838037 · Atrasado 4 dias')
    expect(texto).toContain('Icuí-Guajará · Limpeza urbana')
    expect(texto).toContain('Rota: https://www.google.com/maps/dir/?api=1&destination=-1.360000,-48.370000')
    expect(texto).toContain('foto do depois')
  })
})
