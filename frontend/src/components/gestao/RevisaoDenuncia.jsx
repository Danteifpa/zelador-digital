import { useEffect, useState } from 'react'
import { Flag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MOTIVOS_DENUNCIA } from '../../lib/moderacao'
import Spinner from './Spinner'

const ROTULO_MOTIVO = Object.fromEntries(MOTIVOS_DENUNCIA.map((m) => [m.valor, m.rotulo]))

/** Quadro de revisão de um registro denunciado: motivos e as decisões do gestor. */
export default function RevisaoDenuncia({ item, acaoEmAndamento, carregandoAcao, revisarFoto }) {
  const [motivos, setMotivos] = useState(null)
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)

  useEffect(() => {
    let ativo = true
    supabase
      .from('denuncias')
      .select('motivo')
      .eq('ocorrencia_id', item.id)
      .then(({ data, error }) => {
        if (!ativo || error) return
        const contagem = (data || []).reduce((acc, { motivo }) => ({ ...acc, [motivo]: (acc[motivo] || 0) + 1 }), {})
        setMotivos(Object.entries(contagem).sort(([, a], [, b]) => b - a))
      })
    return () => {
      ativo = false
    }
  }, [item.id, item.total_denuncias])

  const emAndamento = acaoEmAndamento === `denuncia-${item.id}`

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-black text-rose-800">
        <Flag size={14} aria-hidden="true" />
        {item.total_denuncias} denúncia(s) de moradores
        {item.foto_oculta && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">foto oculta no app</span>}
      </p>
      {motivos?.length > 0 && (
        <ul className="text-[11px] text-rose-900 space-y-0.5">
          {motivos.map(([motivo, quantidade]) => (
            <li key={motivo}>• {ROTULO_MOTIVO[motivo] || motivo}: {quantidade}</li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-rose-900/80">
        Se a foto mostra só o problema, mantenha. Se mostra pessoas, placas ou algo impróprio, remova a foto: o chamado continua.
      </p>
      {confirmarRemocao ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setConfirmarRemocao(false)}
            className="min-h-10 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={carregandoAcao}
            onClick={() => revisarFoto(item, 'remover')}
            className="min-h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
          >
            {emAndamento && <Spinner />}
            Apagar foto de vez
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={carregandoAcao}
            onClick={() => revisarFoto(item, 'manter')}
            className="min-h-10 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white text-xs font-black text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 cursor-pointer"
          >
            {emAndamento && <Spinner />}
            Manter foto
          </button>
          <button
            type="button"
            disabled={carregandoAcao || !item.foto_url}
            onClick={() => setConfirmarRemocao(true)}
            className="min-h-10 rounded-xl border border-rose-300 bg-white text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
          >
            Remover foto
          </button>
        </div>
      )}
    </div>
  )
}
