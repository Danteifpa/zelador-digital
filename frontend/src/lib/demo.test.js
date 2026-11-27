import { describe, expect, it } from 'vitest'
import { aplicarAlteracaoDemo, gerarChamadosDemo } from './demo'

const AGORA = new Date('2026-11-27T12:00:00Z')

describe('modo demonstração', () => {
  it('gera sempre os mesmos chamados fictícios, completos e do mais novo ao mais antigo', () => {
    const a = gerarChamadosDemo({ agora: AGORA })
    const b = gerarChamadosDemo({ agora: AGORA })
    expect(a).toEqual(b)
    expect(a).toHaveLength(48)
    for (const c of a) {
      expect(c.id).toMatch(/-demo-/)
      expect(c.orgao).toBeTruthy()
      expect(c.bairro).toBeTruthy()
      expect(Number.isFinite(c.latitude)).toBe(true)
      expect(c.status === 'resolvido').toBe(Boolean(c.resolvido_em))
    }
    expect(a[0].created_at >= a[a.length - 1].created_at).toBe(true)
    // tem de tudo um pouco para a demonstração fazer sentido
    expect(new Set(a.map((c) => c.status)).size).toBe(3)
  })

  it('aplica alterações como o banco faria', () => {
    const lista = gerarChamadosDemo({ agora: AGORA, quantidade: 5 })
    const alvo = lista.find((c) => c.status !== 'resolvido')
    const resolvida = aplicarAlteracaoDemo(lista, alvo.id, { status: 'resolvido', foto_resolucao_url: 'blob:foto' }, AGORA)
    const item = resolvida.find((c) => c.id === alvo.id)
    expect(item.resolvido_em).toBe(AGORA.toISOString())
    expect(item.foto_resolucao).toBe('blob:foto')
    expect(item).not.toHaveProperty('foto_resolucao_url')
    expect(resolvida.filter((c) => c.id !== alvo.id)).toEqual(lista.filter((c) => c.id !== alvo.id))

    const reaberta = aplicarAlteracaoDemo(resolvida, alvo.id, { status: 'pendente' }, AGORA)
    expect(reaberta.find((c) => c.id === alvo.id).resolvido_em).toBeNull()

    const novaCategoria = aplicarAlteracaoDemo(lista, alvo.id, { categoria: 'iluminacao' }, AGORA)
    expect(novaCategoria.find((c) => c.id === alvo.id).orgao).toBe('iluminacao')
    const encaminhada = aplicarAlteracaoDemo(lista, alvo.id, { categoria: 'iluminacao', orgao: 'triagem' }, AGORA)
    expect(encaminhada.find((c) => c.id === alvo.id).orgao).toBe('triagem')
  })
})
