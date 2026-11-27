import { useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MARCA } from '../../lib/marca'

/**
 * Cartão no Painel para ativar a verificação em duas etapas (app autenticador, TOTP).
 * Depois de ativada, a senha sozinha não abre mais o Painel (ver migração mfa_gestores).
 */
export default function SegurancaConta() {
  const [ativo, setAtivo] = useState(null)
  const [cadastro, setCadastro] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (vivo) setAtivo(Boolean(data?.totp?.some((f) => f.status === 'verified')))
    })
    return () => {
      vivo = false
    }
  }, [])

  const comecar = async () => {
    setOcupado(true)
    setErro(null)
    // Remove tentativas anteriores não concluídas (senão o Supabase recusa um novo cadastro).
    const { data: fatores } = await supabase.auth.mfa.listFactors()
    for (const f of fatores?.all || []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `${MARCA.nome} ${new Date().toLocaleDateString('pt-BR')}` })
    setOcupado(false)
    if (error) {
      setErro('Não foi possível começar agora. Tente novamente em instantes.')
      return
    }
    setCadastro({ id: data.id, qr: data.totp.qr_code, segredo: data.totp.secret })
  }

  const confirmar = async (e) => {
    e.preventDefault()
    if (codigo.length !== 6 || !cadastro) return
    setOcupado(true)
    setErro(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: cadastro.id, code: codigo })
    setOcupado(false)
    if (error) {
      setErro('Código incorreto. Confira o app autenticador e tente de novo.')
      setCodigo('')
      return
    }
    setCadastro(null)
    setAtivo(true)
  }

  if (ativo === null) return null

  if (ativo) {
    return (
      <section className="flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
        <ShieldCheck size={22} className="shrink-0 text-emerald-600" aria-hidden="true" />
        <p className="text-xs text-emerald-900">
          <strong>Verificação em duas etapas ativa.</strong> Para entrar no Painel é preciso a senha e o código do app autenticador.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldAlert size={22} className="shrink-0 text-amber-600" aria-hidden="true" />
        <div className="text-xs text-amber-900">
          <p className="font-black">Proteja o acesso ao Painel</p>
          <p className="mt-0.5">Com a verificação em duas etapas, quem descobrir sua senha ainda precisa do seu celular para entrar.</p>
        </div>
      </div>

      {!cadastro ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={comecar}
          className="w-full min-h-11 rounded-2xl bg-amber-500 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
        >
          {ocupado ? 'Preparando...' : 'Ativar verificação em duas etapas'}
        </button>
      ) : (
        <form onSubmit={confirmar} className="space-y-3 rounded-2xl bg-white p-3">
          <p className="text-xs text-slate-700">
            1. Abra um app autenticador (Google Authenticator, Microsoft Authenticator ou Authy) e leia este QR Code:
          </p>
          <img src={cadastro.qr} alt="QR Code para o app autenticador" className="mx-auto h-44 w-44" />
          <p className="text-[11px] text-slate-500 break-all">
            Sem câmera? Digite a chave no app: <span className="font-mono font-bold text-slate-800 select-all">{cadastro.segredo}</span>
          </p>
          <p className="text-xs text-slate-700">2. Digite o código de 6 dígitos que o app mostrar:</p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label="Código de 6 dígitos"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full min-h-12 text-center text-xl font-black tracking-[0.4em] bg-slate-50 border border-slate-200 rounded-xl"
          />
          <button
            type="submit"
            disabled={ocupado || codigo.length !== 6}
            className="w-full min-h-11 rounded-2xl bg-slate-900 text-sm font-black text-white disabled:opacity-50 cursor-pointer"
          >
            {ocupado ? 'Confirmando...' : 'Confirmar e ativar'}
          </button>
        </form>
      )}
      {erro && <p role="alert" className="text-xs font-bold text-rose-700">{erro}</p>}
    </section>
  )
}
