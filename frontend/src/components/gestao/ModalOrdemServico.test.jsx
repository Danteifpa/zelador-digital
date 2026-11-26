import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ModalOrdemServico from './ModalOrdemServico'

const chamados = [
  { id: 'aaaaaa-1', categoria: 'lixo', status: 'pendente', created_at: '2026-11-20T12:00:00Z', bairro: 'Icuí-Guajará', latitude: -1.36, longitude: -48.37, gut: { pontuacao: 40 } },
  { id: 'bbbbbb-2', categoria: 'buraco', status: 'pendente', created_at: '2026-11-25T12:00:00Z', bairro: 'Centro', latitude: -1.37, longitude: -48.38, gut: { pontuacao: 20 } }
]

describe('ordem de serviço', () => {
  it('lista os chamados, deixa desmarcar e monta o link do WhatsApp', () => {
    const onFechar = vi.fn()
    render(<ModalOrdemServico chamados={chamados} orgao="todos" onFechar={onFechar} />)
    expect(screen.getByText('Chamados (2 de 2)')).toBeTruthy()
    const whatsapp = () => decodeURIComponent(screen.getByText('Mandar no WhatsApp').getAttribute('href'))
    expect(whatsapp()).toContain('Icuí-Guajará')
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    expect(screen.getByText('Chamados (1 de 2)')).toBeTruthy()
    fireEvent.click(screen.getByText('Fechar'))
    expect(onFechar).toHaveBeenCalled()
  })
})
