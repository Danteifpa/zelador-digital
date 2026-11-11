import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

let quebrar = true
function Secao() {
  if (quebrar) throw new Error('falha de teste')
  return <p>Conteúdo da seção</p>
}

const silenciarErros = () => vi.spyOn(console, 'error').mockImplementation(() => {})

describe('ErrorBoundary', () => {
  it('mostra um aviso só na seção que falhou, e o resto continua', () => {
    silenciarErros()
    quebrar = true
    render(
      <>
        <ErrorBoundary nome="mapa">
          <Secao />
        </ErrorBoundary>
        <p>Resto do app</p>
      </>
    )
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível mostrar esta seção.')
    expect(screen.getByText('Resto do app')).toBeTruthy()
  })

  it('volta a mostrar a seção depois de "Tentar novamente"', () => {
    silenciarErros()
    quebrar = true
    render(
      <ErrorBoundary>
        <Secao />
      </ErrorBoundary>
    )
    quebrar = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(screen.getByText('Conteúdo da seção')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('limpa o erro sozinho quando a aba muda (chaveReset)', () => {
    silenciarErros()
    quebrar = true
    const { rerender } = render(
      <ErrorBoundary chaveReset="lista">
        <Secao />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    quebrar = false
    rerender(
      <ErrorBoundary chaveReset="mapa">
        <Secao />
      </ErrorBoundary>
    )
    expect(screen.getByText('Conteúdo da seção')).toBeTruthy()
  })

  it('aceita um fallback próprio com acesso ao erro', () => {
    silenciarErros()
    quebrar = true
    render(
      <ErrorBoundary fallback={({ erro }) => <p>Falhou: {erro.message}</p>}>
        <Secao />
      </ErrorBoundary>
    )
    expect(screen.getByText('Falhou: falha de teste')).toBeTruthy()
  })

  it('na tela inteira, garante ao morador que os registros não se perderam', () => {
    silenciarErros()
    quebrar = true
    render(
      <ErrorBoundary ecraInteiro>
        <Secao />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert').textContent).toContain('Os registros salvos no celular não se perderam')
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy()
  })
})
