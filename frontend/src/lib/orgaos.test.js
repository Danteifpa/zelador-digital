import { describe, expect, it } from 'vitest'
import { CATEGORIAS, CATEGORIA_OUTRO } from './categorias'
import { ORGAOS, filtrarPorOrgao, nomeDoOrgao, orgaoDaCategoria, orgaoDoChamado } from './orgaos'

describe('órgãos', () => {
  it('toda categoria tem um órgão conhecido', () => {
    const ids = ORGAOS.map((o) => o.id)
    for (const c of [...CATEGORIAS, CATEGORIA_OUTRO]) expect(ids).toContain(orgaoDaCategoria(c.id))
  })

  it('segue a mesma regra do banco', () => {
    expect(orgaoDaCategoria('iluminacao')).toBe('iluminacao')
    expect(orgaoDaCategoria('lixo')).toBe('limpeza')
    expect(orgaoDaCategoria('esgoto')).toBe('saneamento')
    expect(orgaoDaCategoria('alagamento')).toBe('saneamento')
    expect(orgaoDaCategoria('calcada')).toBe('vias')
    expect(orgaoDaCategoria('arvore')).toBe('meio_ambiente')
    expect(orgaoDaCategoria('sinalizacao')).toBe('transito')
    expect(orgaoDaCategoria('outro')).toBe('triagem')
    expect(orgaoDaCategoria(null)).toBe('triagem')
  })

  it('usa o órgão do banco e, em dado antigo, o da categoria', () => {
    expect(orgaoDoChamado({ categoria: 'lixo', orgao: 'vias' })).toBe('vias')
    expect(orgaoDoChamado({ categoria: 'lixo' })).toBe('limpeza')
    expect(orgaoDoChamado({ categoria: 'lixo', orgao: 'desconhecido' })).toBe('limpeza')
    expect(nomeDoOrgao('saneamento')).toBe('Saneamento e drenagem')
    expect(nomeDoOrgao('x')).toBe('Triagem geral')
  })

  it('filtra a lista por órgão', () => {
    const lista = [{ id: 1, categoria: 'lixo' }, { id: 2, categoria: 'buraco' }, { id: 3, categoria: 'lixo', orgao: 'vias' }]
    expect(filtrarPorOrgao(lista, 'todos')).toHaveLength(3)
    expect(filtrarPorOrgao(lista, 'vias').map((i) => i.id)).toEqual([2, 3])
    expect(filtrarPorOrgao(lista, 'limpeza').map((i) => i.id)).toEqual([1])
  })
})
