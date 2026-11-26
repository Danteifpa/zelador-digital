import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ModalRelatorioMensal from './ModalRelatorioMensal'

describe('relatório mensal', () => {
  it('abre no mês mais recente com as tabelas por órgão e bairro', () => {
    const ocorrencias = [
      { id: '1', categoria: 'lixo', status: 'resolvido', created_at: '2026-11-03T10:00:00', resolvido_em: '2026-11-05T10:00:00', bairro: 'Paar' },
      { id: '2', categoria: 'buraco', status: 'pendente', created_at: '2026-10-10T10:00:00', bairro: 'Centro' }
    ]
    render(<ModalRelatorioMensal ocorrencias={ocorrencias} nomeApp="App de teste" onFechar={vi.fn()} />)
    expect(screen.getByText(/novembro de 2026/, { selector: 'h1' })).toBeTruthy()
    expect(screen.getByText('Limpeza urbana')).toBeTruthy()
    expect(screen.getByText('Paar')).toBeTruthy()
    expect(screen.getByText('App de teste')).toBeTruthy()
  })
})
