import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

/** Pede o código de 6 dígitos do app autenticador depois da senha. */
export default function SegundaEtapaLogin({ onConfirmar, onSair }) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState(null)
  const [verificando, setVerificando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (verificando || codigo.length !== 6) return
    setVerificando(true)
    setErro(null)
    const mensagem = await onConfirmar(codigo)
    setVerificando(false)
    if (mensagem) {
      setErro(mensagem)
      setCodigo('')
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-sm mx-auto my-6 text-center">
      <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
        <ShieldCheck size={28} />
      </div>
      <h2 className="text-lg font-black text-slate-800">Verificação em duas etapas</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">Digite o código de 6 dígitos que aparece no seu app autenticador.</p>
      <form onSubmit={enviar} className="space-y-3">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label="Código de 6 dígitos"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full min-h-14 text-center text-2xl font-black tracking-[0.5em] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        {erro && <p role="alert" className="text-sm text-rose-600 font-bold">{erro}</p>}
        <button
          type="submit"
          disabled={verificando || codigo.length !== 6}
          className="w-full min-h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black rounded-xl text-sm cursor-pointer"
        >
          {verificando ? 'Verificando...' : 'Confirmar'}
        </button>
        <button type="button" onClick={onSair} className="w-full py-2 text-xs font-bold text-slate-500 cursor-pointer">
          Sair e entrar com outra conta
        </button>
      </form>
    </div>
  )
}
