import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const { from, storage } = vi.hoisted(() => ({ from: vi.fn(), storage: { from: vi.fn() } }))
vi.mock('../lib/supabase', () => ({ supabase: { from, storage, rpc: vi.fn() } }))
vi.mock('../lib/useSessaoGestor', () => ({
  default: () => ({ sessao: null, ehGestor: false, orgaoGestor: null, carregando: false, erroVerificacao: null, precisaCodigo: false, entrar: vi.fn(), confirmarCodigo: vi.fn(), sair: vi.fn() })
}))

import DemoGestao from './DemoGestao'

describe('demonstração do Painel de Gestão', () => {
  it('abre sem login, avisa que é fictício e muda o chamado só na memória', () => {
    const onSair = vi.fn()
    render(<DemoGestao onSair={onSair} />)
    expect(screen.getByText(/nada é salvo/)).toBeTruthy()

    for (const linha of screen.getAllByRole('button', { expanded: false })) fireEvent.click(linha)
    const emAnaliseAntes = screen.getAllByText('Em análise', { selector: 'span' }).length
    fireEvent.click(screen.getAllByRole('button', { name: 'Colocar em análise' })[0])
    expect(screen.getAllByText('Em análise', { selector: 'span' }).length).toBeGreaterThan(emAnaliseAntes)

    // nada foi para o banco nem para o armazenamento de fotos
    expect(from).not.toHaveBeenCalled()
    expect(storage.from).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Sair da demonstração' }))
    expect(onSair).toHaveBeenCalled()
  })
})
