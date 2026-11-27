import { rotuloDaCategoria } from '../lib/categorias'
import { protocoloCivico } from '../lib/protocolo'
import { estaResolvido, etapaDoEstado, rotuloDoEstado } from '../lib/status'
import BotaoAvisos from './BotaoAvisos'

export default function ModalConsultaProtocolo({ ativarAvisos, consultandoProtocolo, consultarProtocolo, erroProtocolo, estadoAvisos, protocoloConsulta, resultadoProtocolo, setMostrarConsultaProtocolo, setProtocoloConsulta }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-black text-blue-600">Acompanhamento cidadão</span>
            <h2 className="text-lg font-black text-slate-800 mt-1">Consultar protocolo</h2>
          </div>
          <button type="button" onClick={() => setMostrarConsultaProtocolo(false)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
        </div>
        <form onSubmit={consultarProtocolo} className="mt-4 flex gap-2">
          <input
            type="text"
            value={protocoloConsulta}
            onChange={(e) => setProtocoloConsulta(e.target.value)}
            placeholder="Ex.: ZD-XXXXXX"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wider focus:border-blue-500 focus:outline-none"
          />
          <button type="submit" disabled={consultandoProtocolo} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer">
            {consultandoProtocolo ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
        {erroProtocolo && <p className="mt-2 text-xs font-bold text-rose-600">{erroProtocolo}</p>}

        {resultadoProtocolo && (
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-[10px] font-black text-blue-300">{protocoloCivico(resultadoProtocolo.id)}</p>
              <h3 className="mt-1 text-base font-black">{rotuloDaCategoria(resultadoProtocolo.categoria)}</h3>
              <p className="mt-1 text-[11px] text-slate-300">{resultadoProtocolo.bairro || resultadoProtocolo.endereco || resultadoProtocolo.morada || 'Bairro não informado'}</p>
              <p className="mt-1 text-[10px] text-slate-400">Aberta em {resultadoProtocolo.created_at ? new Date(resultadoProtocolo.created_at).toLocaleDateString('pt-BR') : 'data não informada'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start">
                {['Registrada', 'Em análise', 'Resolvida'].map((titulo, index) => {
                  const atual = etapaDoEstado(resultadoProtocolo.status)
                  const concluida = index + 1 <= atual
                  return (
                    <div key={titulo} className="flex flex-1 items-start">
                      <div className="flex min-w-0 flex-col items-center text-center">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${concluida ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-400'}`}>{concluida ? '✓' : index + 1}</span>
                        <span className="mt-1 text-[9px] font-black text-slate-600">{titulo}</span>
                      </div>
                      {index < 2 && <span className={`mt-3 h-0.5 flex-1 ${index + 1 < atual ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-xs font-black text-slate-700">Status atual: <span className="text-blue-700">{rotuloDoEstado(resultadoProtocolo.status)}</span></p>
            </div>
            {!estaResolvido(resultadoProtocolo.status) && (
              <BotaoAvisos estado={estadoAvisos(resultadoProtocolo.id)} onAtivar={() => ativarAvisos(resultadoProtocolo)} />
            )}
            {resultadoProtocolo.observacoes && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                <strong>Notas e despachos públicos:</strong>
                <p className="mt-1 leading-relaxed">{resultadoProtocolo.observacoes}</p>
              </div>
            )}
            {estaResolvido(resultadoProtocolo.status) && resultadoProtocolo.foto_url && resultadoProtocolo.foto_resolucao && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <span className="rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-black text-white">Foto de antes e depois</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <img src={resultadoProtocolo.foto_url} alt="Antes: registro inicial" loading="lazy" decoding="async" className="h-28 w-full rounded-xl object-cover" />
                  <img src={resultadoProtocolo.foto_resolucao} alt="Depois: intervenção concluída" loading="lazy" decoding="async" className="h-28 w-full rounded-xl object-cover" />
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[9px] font-bold text-emerald-800"><span>Antes</span><span>Depois</span></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
