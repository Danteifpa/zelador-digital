import { Bell, Info } from 'lucide-react'

/**
 * Topo da aplicação: faixas de estado (offline / fila pendente) + barra com título e ações.
 * As faixas e o <header> são os únicos elementos em fluxo antes do <main>,
 * por isso agrupá-los aqui não altera a ordem visual nem o comportamento sticky.
 */
export default function Header({
  estaOnline,
  filaPendente,
  sincronizandoFila,
  onSincronizar,
  notificacoesNaoLidas,
  onIrParaInicio,
  onAbrirNotificacoes,
  onAbrirSobre
}) {
  return (
    <>
      {/* AVISO OFFLINE */}
      {!estaOnline && (
        <div className="bg-amber-500 text-white text-[11px] font-black py-1.5 px-4 text-center tracking-wide sticky top-0 z-50 flex items-center justify-center gap-1.5 shadow-xs">
          <span>⚠️</span>
          <span>Modo Offline Ativo: Registos serão sincronizados quando recuperar rede</span>
        </div>
      )}

      {filaPendente > 0 && estaOnline && (
        <div className="bg-blue-600 text-white text-[11px] font-bold py-1.5 px-4 text-center sticky top-0 z-50 flex items-center justify-between">
          <span>{filaPendente} registo(s) pendente(s) para sincronização</span>
          <button
            onClick={onSincronizar}
            disabled={sincronizandoFila}
            className="bg-white text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase cursor-pointer"
          >
            {sincronizandoFila ? 'A sincronizar...' : 'Sincronizar Agora 🔄'}
          </button>
        </div>
      )}

      {/* TOPO / NAVBAR MINIMALISTA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onIrParaInicio}
            className="text-left focus:outline-none cursor-pointer"
          >
            <div>
              <span className="text-xl font-black text-blue-600 tracking-tight leading-none">Zelador Digital</span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onAbrirNotificacoes}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer"
              title="Avisos e Notificações"
            >
              <Bell size={18} strokeWidth={2.25} />
              {notificacoesNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                  {notificacoesNaoLidas}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onAbrirSobre}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer"
              title="Sobre o desenvolvedor"
              aria-label="Sobre o desenvolvedor"
            >
              <Info size={18} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
