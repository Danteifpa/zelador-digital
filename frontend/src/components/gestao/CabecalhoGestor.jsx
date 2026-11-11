/** Topo do painel (email do gestor, sair) e seletor Lista/Mapa. */
export default function CabecalhoGestor({ abaPainel, sair, sessao, setAbaPainel }) {
  return (
    <>
    {/* Topo do Gestor */}
    <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-3xl shadow-sm">
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Administração Comunitária</span>
        <h2 className="text-base font-black">Gestão de Ocorrências</h2>
        <p className="text-[11px] text-slate-400 truncate">{sessao.user?.email}</p>
      </div>
      <button
        type="button"
        onClick={sair}
        className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
      >
        Encerrar Sessão 🔒
      </button>
    </div>

    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-200 p-1">
      {[
        ['lista', '📋 Lista Priorizada'],
        ['mapa', '🗺️ Mapa de Focos Críticos']
      ].map(([aba, rotulo]) => (
        <button
          key={aba}
          type="button"
          onClick={() => setAbaPainel(aba)}
          className={`rounded-xl px-3 py-2.5 text-[11px] font-black transition-colors cursor-pointer ${
            abaPainel === aba ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
    </>
  )
}
