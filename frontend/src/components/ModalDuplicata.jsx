import { TriangleAlert } from 'lucide-react'
import { protocoloCivico } from '../lib/protocolo'
import BotaoApoio from './BotaoApoio'

export default function ModalDuplicata({ duplicataEncontrada, handleSubmit, registrarApoio, setDuplicataEncontrada, setMostrarReportModal }) {
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4"><TriangleAlert size={24} strokeWidth={2.25} aria-hidden="true" /></div>
        <h2 className="text-base font-black text-slate-900">Alguém já registrou este problema aqui</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Existe um chamado em aberto a menos de 50 m (Protocolo {protocoloCivico(duplicataEncontrada.id)}
          {duplicataEncontrada.descricao ? `: “${duplicataEncontrada.descricao}”` : ''}). Confirmar o registro existente ajuda mais do que criar outro igual.
        </p>
        <div className="mt-4">
          <BotaoApoio
            destaque
            ocorrencia={duplicataEncontrada}
            onApoiado={(total, mensagem) => {
              if (registrarApoio(duplicataEncontrada.id, total, mensagem)) {
                setDuplicataEncontrada(null)
                setMostrarReportModal(false)
              }
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDuplicataEncontrada(null)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => {
              setDuplicataEncontrada(null)
              handleSubmit({ preventDefault: () => {} }, true)
            }}
            className="rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-black text-white hover:bg-amber-700 cursor-pointer"
          >
            Registrar mesmo assim
          </button>
        </div>
      </div>
    </div>
  )
}
