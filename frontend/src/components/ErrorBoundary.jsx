import { Component } from 'react'

/**
 * Impede que um erro de renderização deixe o ecrã em branco.
 *
 * - Sem `fallback`: mostra um cartão "Não foi possível mostrar esta secção" com "Tentar de novo".
 * - `fallback` pode ser um elemento ou uma função `({ erro, tentarDeNovo }) => elemento`.
 * - `ecraInteiro`: versão para a raiz da aplicação, com botão "Recarregar".
 * - `chaveReset`: quando muda (por exemplo a aba ativa), o erro é limpo automaticamente.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
    this.tentarDeNovo = this.tentarDeNovo.bind(this)
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    console.error(`[ErrorBoundary${this.props.nome ? `: ${this.props.nome}` : ''}]`, erro, info?.componentStack)
  }

  componentDidUpdate(propsAnteriores) {
    if (this.state.erro && propsAnteriores.chaveReset !== this.props.chaveReset) {
      this.setState({ erro: null })
    }
  }

  tentarDeNovo() {
    this.setState({ erro: null })
  }

  render() {
    const { erro } = this.state
    if (!erro) return this.props.children

    const { fallback, ecraInteiro } = this.props
    if (typeof fallback === 'function') return fallback({ erro, tentarDeNovo: this.tentarDeNovo })
    if (fallback) return fallback

    if (ecraInteiro) {
      return (
        <div role="alert" className="min-h-dvh flex items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl border border-slate-200">
            <h1 className="text-lg font-black text-slate-800">O Zelador Digital encontrou um erro</h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Os registros salvos no celular não se perderam. Recarregue o aplicativo para continuar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 w-full min-h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black cursor-pointer"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return (
      <div role="alert" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="text-sm font-black text-amber-900">Não foi possível mostrar esta seção.</p>
        <p className="mt-1 text-xs text-amber-800">O resto do aplicativo continua funcionando.</p>
        <button
          type="button"
          onClick={this.tentarDeNovo}
          className="mt-3 min-h-11 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 text-sm font-black text-white cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    )
  }
}
