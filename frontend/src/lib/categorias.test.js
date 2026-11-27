import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { CATEGORIAS, CATEGORIA_OUTRO, iconeDaCategoria, rotuloDaCategoria } from './categorias'
import { SVG_MARCADOR } from './iconesSvg'

describe('categorias', () => {
  it('mostra o nome amigável das categorias conhecidas', () => {
    expect(rotuloDaCategoria('buraco')).toBe('Buraco na rua')
    expect(rotuloDaCategoria(' LIXO ')).toBe('Lixo e entulho')
    expect(rotuloDaCategoria('outro')).toBe('Outro')
  })

  it('mostra dados antigos de forma legível', () => {
    expect(rotuloDaCategoria('poda')).toBe('Poda')
    expect(rotuloDaCategoria(null)).toBe('Não classificado')
    expect(iconeDaCategoria('desconhecida')).toBe('📍')
  })

  it('cada categoria tem marcador no mapa e cor', () => {
    for (const cat of CATEGORIAS) {
      expect(SVG_MARCADOR[cat.id], cat.id).toMatch(/^<svg/)
      expect(cat.cor, cat.id).toMatch(/^#[0-9a-f]{6}$/)
      expect(cat.curto, cat.id).toBeTruthy()
    }
  })

  it('a lista do app é a mesma aceita pelo banco', () => {
    const sql = readFileSync(resolve(process.cwd(), '../supabase/migrations/20261115022825_categorias.sql'), 'utf8')
    const doBanco = [...sql.match(/categoria in \(([^)]+)\)/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()
    expect(doBanco).toEqual([...CATEGORIAS, CATEGORIA_OUTRO].map((cat) => cat.id).sort())
  })
})
