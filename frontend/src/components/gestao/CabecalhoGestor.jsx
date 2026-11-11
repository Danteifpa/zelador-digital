/** Topo do painel (conta do gestor, sair) e abas Chamados / Mapa / Relatórios. */
const ABAS_PAINEL = [
  ['lista', '📋', 'Chamados'],
  ['mapa', '🗺️', 'Mapa'],
  ['relatorios', '📊', 'Relatórios']
]

export default function CabecalhoGestor({ abaPainel, sair, sessao, setAbaPainel }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 bg-slate-900 text-white px-4 py-3 rounded-3xl shadow-sm">
        <div className="min-w-0">
          <h2 className="text-base font-black">Painel de Gestão</h2>
          <p className="text-[11px] text-slate-400 truncate">{sessao.user?.email}</p>
        </div>
        <button
          type="button"
          onClick={sair}
          className="shrink-0 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          Sair
        </button>
      </div>

      <div role="tablist" aria-label="Seções do painel" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200 p-1">
        {ABAS_PAINEL.map(([aba, icone, rotulo]) => (
          <button
            key={aba}
            type="button"
            role="tab"
            aria-selected={abaPainel === aba}
            onClick={() => setAbaPainel(aba)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-black transition-colors cursor-pointer ${
              abaPainel === aba ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <span aria-hidden="true">{icone}</span>
            {rotulo}
          </button>
        ))}
      </div>
    </>
  )
}
