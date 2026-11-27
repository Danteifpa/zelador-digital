import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import FormEdicaoOcorrencia from './FormEdicaoOcorrencia'

const item = { id: '83803783-78f0-494c-97ff-3a79d97e5d8e', categoria: 'buraco', descricao: 'Rua A', status: 'pendente' }

function renderizar(itemEdicao = item) {
  const setItemEdicao = vi.fn()
  render(<FormEdicaoOcorrencia carregandoAcao={false} itemEdicao={itemEdicao} salvarEdicao={vi.fn()} setItemEdicao={setItemEdicao} />)
  return setItemEdicao
}

describe('edição do chamado', () => {
  it('mostra o órgão atual e encaminha para outro', () => {
    const setItemEdicao = renderizar()
    const campo = screen.getByLabelText(/Órgão responsável/)
    expect(campo.value).toBe('vias')
    fireEvent.change(campo, { target: { value: 'saneamento' } })
    expect(setItemEdicao).toHaveBeenCalledWith({ ...item, orgao: 'saneamento' })
  })

  it('trocar a categoria sugere o órgão da nova categoria', () => {
    const setItemEdicao = renderizar()
    fireEvent.change(screen.getByDisplayValue(/Buraco na Rua/), { target: { value: 'iluminacao' } })
    expect(setItemEdicao).toHaveBeenCalledWith({ ...item, categoria: 'iluminacao', orgao: 'iluminacao' })
  })
})
