import { describe, expect, it } from 'vitest'
import { deveIgnorar, limparTexto } from './registroErros'

describe('registro de erros', () => {
  it('tira dados pessoais e segredos da mensagem', () => {
    const texto = limparTexto('Falhou para maria.silva@gmail.com tel 91988887777 em /x?token=abc123&y=1 jwt eyJhbGc.eyJzdWI.assinatura', 500)
    expect(texto).not.toMatch(/maria/)
    expect(texto).not.toMatch(/91988887777/)
    expect(texto).not.toMatch(/abc123/)
    expect(texto).not.toMatch(/eyJhbGc/)
    expect(texto).toMatch(/\[email\]/)
  })

  it('corta textos longos', () => {
    expect(limparTexto('x'.repeat(900), 500)).toHaveLength(500)
  })

  it('ignora erros de rede e de extensões', () => {
    expect(deveIgnorar('TypeError: Failed to fetch')).toBe(true)
    expect(deveIgnorar('erro', 'at chrome-extension://abc/x.js')).toBe(true)
    expect(deveIgnorar('')).toBe(true)
    expect(deveIgnorar("TypeError: Cannot read properties of undefined (reading 'id')")).toBe(false)
  })
})
