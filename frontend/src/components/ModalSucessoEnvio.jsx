import { MapPin, Share2 } from 'lucide-react'
import { rotuloDaCategoria } from '../lib/categorias'
import { feedbackSensorial } from '../lib/feedbackSensorial'
import { protocoloCivico } from '../lib/protocolo'
import BotaoAvisos from './BotaoAvisos'

export default function ModalSucessoEnvio({ abrirAbaRegistar, ativarAvisos, estaOnline, estadoAvisos, partilharOcorrencia, setAbaAtiva, setSucessoEnvio, sucessoEnvio }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-5 border border-slate-100">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-inner animate-bounce">
          ✓
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900">Registro enviado</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {estaOnline
              ? 'Sua ocorrência foi georreferenciada e salva no banco comunitário.'
              : 'Registro salvo no celular! Será enviado assim que o sinal voltar.'}
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center space-x-3 text-left">
          {sucessoEnvio.foto_url ? (
            <img
              src={sucessoEnvio.foto_url}
              alt="Comprovante"
              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <MapPin size={22} strokeWidth={2.25} aria-hidden="true" />
            </div>
          )}
          <div className="overflow-hidden">
            <span className="text-xs font-black text-slate-800 block truncate">
              {rotuloDaCategoria(sucessoEnvio.categoria)}
            </span>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {sucessoEnvio.descricao}
            </p>
          </div>
        </div>
        {sucessoEnvio.id && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-left">
            <p className="text-[10px] font-black text-blue-600">Seu protocolo</p>
            <p className="mt-1 text-sm font-black text-blue-900">{protocoloCivico(sucessoEnvio.id)}</p>
          </div>
        )}
        <BotaoAvisos estado={estadoAvisos(sucessoEnvio.id)} onAtivar={() => ativarAvisos(sucessoEnvio)} />

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => partilharOcorrencia(sucessoEnvio)}
            className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 size={15} strokeWidth={2.25} aria-hidden="true" />
            <span>Compartilhar no WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setSucessoEnvio(null)
              setAbaAtiva('registos')
            }}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            Ver nos registros
          </button>
          <button
            type="button"
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setSucessoEnvio(null)
              abrirAbaRegistar()
            }}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
          >
            Registrar outro problema
          </button>
        </div>
      </div>
    </div>
  )
}
