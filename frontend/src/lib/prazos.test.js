import { describe, expect, it } from 'vitest'
import { resumoDosPrazos, rotuloDoPrazo, situacaoDoPrazo } from './prazos'

const AGORA = new Date('2026-11-27T12:00:00Z')
const diasAtras = (n) => new Date(AGORA.getTime() - n * 86_400_000).toISOString()

describe('prazos por órgão', () => {
  it('usa o prazo do órgão da categoria', () => {
    // lixo → limpeza urbana, 5 dias
    expect(situacaoDoPrazo({ categoria: 'lixo', status: 'pendente', created_at: diasAtras(1) }, AGORA)).toMatchObject({ estado: 'no_prazo', prazoDias: 5, diasRestantes: 4 })
    // buraco → vias, 15 dias
    expect(situacaoDoPrazo({ categoria: 'buraco', status: 'pendente', created_at: diasAtras(1) }, AGORA).prazoDias).toBe(15)
  })

  it('respeita o órgão para onde o chamado foi encaminhado', () => {
    const s = situacaoDoPrazo({ categoria: 'buraco', orgao: 'triagem', status: 'pendente', created_at: diasAtras(4) }, AGORA)
    expect(s).toMatchObject({ estado: 'atrasado', prazoDias: 3, diasAtraso: 1 })
    expect(rotuloDoPrazo(s)).toBe('Atrasado 1 dia')
  })

  it('avisa quando faltam 2 dias ou menos', () => {
    const s = situacaoDoPrazo({ categoria: 'lixo', status: 'em_analise', created_at: diasAtras(3.5) }, AGORA)
    expect(s.estado).toBe('vence_logo')
    expect(rotuloDoPrazo(s)).toBe('Vence em 1 dia')
  })

  it('separa resolvido no prazo e fora do prazo', () => {
    const noPrazo = situacaoDoPrazo({ categoria: 'lixo', status: 'resolvido', created_at: diasAtras(10), resolvido_em: diasAtras(8) }, AGORA)
    expect(noPrazo.estado).toBe('resolvido_no_prazo')
    expect(rotuloDoPrazo(noPrazo)).toBeNull()
    const fora = situacaoDoPrazo({ categoria: 'lixo', status: 'resolvido', created_at: diasAtras(10), resolvido_em: diasAtras(2) }, AGORA)
    expect(fora).toMatchObject({ estado: 'resolvido_com_atraso', diasAtraso: 3 })
  })

  it('sem data não quebra', () => {
    expect(situacaoDoPrazo({ categoria: 'lixo', status: 'pendente' }, AGORA).estado).toBe('sem_data')
  })

  it('resume atrasados e perto de vencer', () => {
    const lista = [
      { categoria: 'lixo', status: 'pendente', created_at: diasAtras(9) },
      { categoria: 'lixo', status: 'pendente', created_at: diasAtras(4) },
      { categoria: 'lixo', status: 'pendente', created_at: diasAtras(0) },
      { categoria: 'lixo', status: 'resolvido', created_at: diasAtras(9), resolvido_em: diasAtras(1) }
    ]
    expect(resumoDosPrazos(lista, AGORA)).toEqual({ atrasados: 1, venceLogo: 1 })
  })
})
