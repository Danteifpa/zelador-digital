import { Share2 } from 'lucide-react'
import { rotuloDaCategoria } from '../lib/categorias'
import { feedbackSensorial } from '../lib/feedbackSensorial'
import { protocoloCivico } from '../lib/protocolo'
import { estaResolvido, etapaDoEstado } from '../lib/status'
import BotaoApoio from './BotaoApoio'
import DenunciarOcorrencia from './DenunciarOcorrencia'
import IconeCategoria from './IconeCategoria'

export default function ModalDetalheOcorrencia({ carregarRegistos, mostrarAlertaToast, ocorrenciaSelecionada, partilharOcorrencia, registrarApoio, setOcorrenciaSelecionada }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <IconeCategoria categoria={ocorrenciaSelecionada.categoria} size={22} selo className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 text-sm">
                {rotuloDaCategoria(ocorrenciaSelecionada.categoria)}
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                Protocolo <span className="font-black text-slate-700 select-all">{protocoloCivico(ocorrenciaSelecionada.id)}</span>
                {ocorrenciaSelecionada.bairro && <> · {ocorrenciaSelecionada.bairro}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => partilharOcorrencia(ocorrenciaSelecionada)}
              className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Compartilhar registro"
            >
              <Share2 size={14} strokeWidth={2.25} aria-hidden="true" />
              <span>Compartilhar</span>
            </button>
            <button
              onClick={() => {
                feedbackSensorial.toqueSuave()
                setOcorrenciaSelecionada(null)
              }}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm hover:bg-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {ocorrenciaSelecionada.foto_url ? (
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
            <img
              src={ocorrenciaSelecionada.foto_url}
              alt="Comprovante"
              className="w-full h-48 object-cover"
            />
          </div>
        ) : ocorrenciaSelecionada.foto_oculta ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs font-bold text-slate-500">
            Foto oculta após denúncias de moradores. A gestão está revisando.
          </div>
        ) : null}

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-black text-slate-500">Andamento do registro</h4>

          <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-1">
            <div className="relative pl-6">
              <span className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[8px] text-white">✓</span>
              <p className="text-xs font-bold text-slate-800">1. Registrado</p>
              <p className="text-[10px] text-slate-400">
                {ocorrenciaSelecionada.created_at ? new Date(ocorrenciaSelecionada.created_at).toLocaleString('pt-BR') : 'Data registrada'}
              </p>
            </div>

            <div className="relative pl-6">
              <span className={`absolute -left-2 top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white ${
                etapaDoEstado(ocorrenciaSelecionada.status) >= 2
                  ? 'bg-amber-500'
                  : 'bg-slate-300'
              }`}>
                {etapaDoEstado(ocorrenciaSelecionada.status) >= 2 ? '✓' : '•'}
              </span>
              <p className="text-xs font-bold text-slate-800">2. Em análise</p>
              <p className="text-[10px] text-slate-400">A gestão comunitária está avaliando</p>
            </div>

            <div className="relative pl-6">
              <span className={`absolute -left-2 top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white ${
                estaResolvido(ocorrenciaSelecionada.status)
                  ? 'bg-emerald-600'
                  : 'bg-slate-300'
              }`}>
                {estaResolvido(ocorrenciaSelecionada.status) ? '✓' : '•'}
              </span>
              <p className="text-xs font-bold text-slate-800">3. Resolvido</p>
              <p className="text-[10px] text-slate-400">O problema foi resolvido</p>
            </div>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Descrição / ponto de referência</span>
          <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {ocorrenciaSelecionada.descricao || 'Sem descrição detalhada fornecida.'}
          </p>
        </div>

        {!estaResolvido(ocorrenciaSelecionada.status) && (
          <BotaoApoio
            key={ocorrenciaSelecionada.id}
            ocorrencia={ocorrenciaSelecionada}
            onApoiado={(total, mensagem) => registrarApoio(ocorrenciaSelecionada.id, total, mensagem)}
          />
        )}

        {ocorrenciaSelecionada.latitude && ocorrenciaSelecionada.longitude && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${ocorrenciaSelecionada.latitude},${ocorrenciaSelecionada.longitude}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => feedbackSensorial.toqueSuave()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold text-center block shadow-sm hover:bg-slate-800"
          >
            Ver no Google Maps ↗
          </a>
        )}

        <DenunciarOcorrencia
          key={`denuncia-${ocorrenciaSelecionada.id}`}
          ocorrencia={ocorrenciaSelecionada}
          onDenunciado={(resultado, mensagem) => {
            mostrarAlertaToast(mensagem)
            if (resultado?.oculta) carregarRegistos()
          }}
        />
      </div>
    </div>
  )
}
