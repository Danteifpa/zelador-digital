import { NOTIFICACOES_PADRAO } from '../lib/conteudoApp'
import { feedbackSensorial } from '../lib/feedbackSensorial'

export default function ModalNotificacoes({ marcarNotificacaoComoLida, marcarTodasNotificacoesComoLidas, notificacoesLidas, notificacoesNaoLidas, setMostrarNotificacoes }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🔔</span>
            <h3 className="font-black text-slate-800 text-sm">Novidades do app</h3>
          </div>
          <div className="flex items-center space-x-2">
            {notificacoesNaoLidas > 0 && (
              <button
                onClick={marcarTodasNotificacoesComoLidas}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Marcar lidas
              </button>
            )}
            <button
              onClick={() => {
                feedbackSensorial.toqueSuave()
                setMostrarNotificacoes(false)
              }}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm hover:bg-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {NOTIFICACOES_PADRAO.map((item) => {
            const lida = notificacoesLidas.includes(item.id)
            return (
              <div
                key={item.id}
                onClick={() => marcarNotificacaoComoLida(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  lida
                    ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                    : 'bg-blue-50/40 border-blue-200 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl shrink-0 p-1">{item.icone}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold ${!lida ? 'text-blue-950 font-black' : 'text-slate-700'}`}>
                        {item.titulo}
                      </h4>
                      {!lida && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                      {item.mensagem}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                      {item.data}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
