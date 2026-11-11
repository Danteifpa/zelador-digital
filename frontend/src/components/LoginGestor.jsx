import { useState } from 'react'

/**
 * Ecrã de entrada do Painel de Gestão (email + senha do Supabase Auth).
 * As contas são criadas pelo administrador no painel do Supabase; não há registo público.
 */
export default function LoginGestor({ onEntrar }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [aEntrar, setAEntrar] = useState(false)

  const submeter = async (e) => {
    e.preventDefault()
    if (aEntrar) return
    setAEntrar(true)
    setErro(null)
    const mensagemErro = await onEntrar(email, senha)
    setAEntrar(false)
    if (mensagemErro) {
      setErro(mensagemErro)
      setSenha('')
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-sm mx-auto my-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4" aria-hidden="true">
          🔐
        </div>
        <h2 className="text-lg font-black text-slate-800">Painel de Gestão</h2>
        <p className="text-sm text-slate-500 mt-1 mb-5">Acesso reservado aos gestores comunitários.</p>
      </div>

      <form onSubmit={submeter} className="space-y-3" noValidate>
        <div>
          <label htmlFor="gestor-email" className="block text-sm font-bold text-slate-700 mb-1">Email</label>
          <input
            id="gestor-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="gestor-senha" className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
          <input
            id="gestor-senha"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full min-h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {erro && (
          <p role="alert" className="text-sm text-rose-600 font-bold">{erro}</p>
        )}

        <button
          type="submit"
          disabled={aEntrar || !email.trim() || !senha}
          className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm transition-all shadow-sm cursor-pointer"
        >
          {aEntrar ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-xs text-slate-500 text-center">
          A sessão fica salva neste aparelho. Esqueceu a senha? Peça ao administrador para redefini-la no Supabase.
        </p>
      </form>
    </div>
  )
}
