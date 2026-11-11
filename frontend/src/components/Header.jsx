import { Accessibility, Bell, Info } from 'lucide-react'

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
  dadosGuardadosEm,
  notificacoesNaoLidas,
  onIrParaInicio,
  onAbrirNotificacoes,
  onAbrirSobre,
  modoFacil,
  onAlternarModoFacil
}) {
  return (
    <>
      {/* AVISO OFFLINE */}
      {!estaOnline && (
        <div className="bg-amber-500 text-white text-[11px] font-black py-1.5 px-4 text-center tracking-wide sticky top-0 z-50 flex items-center justify-center gap-1.5 shadow-xs">
          <span>⚠️</span>
          <span>Modo offline: os registros serão sincronizados quando a internet voltar</span>
        </div>
      )}

      {dadosGuardadosEm && (
        <div role="status" className="bg-slate-800 text-slate-100 text-[11px] font-bold py-1.5 px-4 text-center">
          Mostrando dados salvos no celular em{' '}
          {new Date(dadosGuardadosEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {filaPendente > 0 && estaOnline && (
        <div className="bg-blue-600 text-white text-[11px] font-bold py-1.5 px-4 text-center sticky top-0 z-50 flex items-center justify-between">
          <span>{filaPendente} registro(s) pendente(s) para sincronização</span>
          <button
            onClick={onSincronizar}
            disabled={sincronizandoFila}
            className="bg-white text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase cursor-pointer"
          >
            {sincronizandoFila ? 'Sincronizando...' : 'Sincronizar Agora 🔄'}
          </button>
        </div>
      )}

      {/* TOPO / NAVBAR MINIMALISTA */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs pt-[env(safe-area-inset-top)]">
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
              type="button"
              role="switch"
              aria-checked={modoFacil}
              onClick={onAlternarModoFacil}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                modoFacil ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={modoFacil ? 'Modo Fácil ligado (toque para desligar)' : 'Modo Fácil: letras maiores e leitura em voz alta'}
              aria-label="Modo Fácil: letras maiores e leitura em voz alta"
            >
              <Accessibility size={20} strokeWidth={2.25} />
            </button>
            <button
              onClick={onAbrirNotificacoes}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer"
              title="Avisos e Notificações"
              aria-label="Avisos e notificações"
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
