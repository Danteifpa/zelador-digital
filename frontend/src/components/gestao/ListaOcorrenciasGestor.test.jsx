import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ListaOcorrenciasGestor from './ListaOcorrenciasGestor'

const base = { id: '83803783-78f0-494c-97ff-3a79d97e5d8e', categoria: 'buraco', descricao: 'Rua A, em frente à escola', created_at: '2026-11-10T12:00:00Z', gut: { pontuacao: 48, gravidade: 4, urgencia: 3, tendencia: 4 } }

function renderizar(item, extra = {}) {
  const props = {
    acaoEmAndamento: null, alterarStatusOcorrencia: vi.fn(), carregandoAcao: false, confirmarResolucao: vi.fn(), despachoPorId: {},
    fotoResolucaoPorId: {}, itemResolucao: null, ocorrenciasFiltradasComGut: [item], salvarDespacho: vi.fn(), setDespachoPorId: vi.fn(),
    setFotoResolucaoPorId: vi.fn(), setItemEdicao: vi.fn(), setItemExclusao: vi.fn(), setItemResolucao: vi.fn(), setTramitacaoAberta: vi.fn(),
    tramitacaoAberta: null, ...extra
  }
  render(<ListaOcorrenciasGestor {...props} />)
  return props
}

describe('lista do Painel de Gestão', () => {
  it('mostra cada chamado numa linha e abre os detalhes ao tocar', () => {
    renderizar({ ...base, status: 'pendente' })
    expect(screen.getByText(/ZD-838037/)).toBeTruthy()
    expect(screen.queryByText('Excluir chamado')).toBeNull()
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText('Excluir chamado')).toBeTruthy()
  })

  it('não oferece o status atual como botão e coloca em análise direto', () => {
    const props = renderizar({ ...base, status: 'pendente' })
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.queryByRole('button', { name: 'Voltar para pendente' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Colocar em análise' }))
    expect(props.alterarStatusOcorrencia).toHaveBeenCalledWith(base.id, 'em_analise')
  })

  it('"Marcar como resolvido" pede a foto do depois antes de confirmar', () => {
    const props = renderizar({ ...base, status: 'em_analise' })
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('button', { name: '✓ Marcar como resolvido' }))
    expect(props.setItemResolucao).toHaveBeenCalledWith({ id: base.id, foto: null })
    expect(props.alterarStatusOcorrencia).not.toHaveBeenCalled()
  })

  it('um chamado resolvido só pode ser reaberto', () => {
    renderizar({ ...base, status: 'resolvido' })
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByRole('button', { name: 'Reabrir chamado' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Marcar como resolvido/ })).toBeNull()
  })

  it('avisa quando o filtro não encontra nada', () => {
    renderizar(base, { ocorrenciasFiltradasComGut: [] })
    expect(screen.getByText('Nenhum chamado encontrado para este filtro.')).toBeTruthy()
  })
})
