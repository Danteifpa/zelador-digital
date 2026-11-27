import { BarChart3, ClipboardList, Map as IconeMapa } from 'lucide-react'

/** Topo do painel (conta do gestor, sair) e abas Chamados / Mapa / Relatórios. */
const ABAS_PAINEL = [
  ['lista', ClipboardList, 'Chamados'],
  ['mapa', IconeMapa, 'Mapa'],
  ['relatorios', BarChart3, 'Relatórios']
]

export default function CabecalhoGestor({ abaPainel, sair, sessao, setAbaPainel }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-l-4 border-placa bg-white px-4 py-3 rounded-3xl border-y border-r border-y-asfalto/10 border-r-asfalto/10">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-asfalto">Painel de Gestão</h2>
          <p className="text-[11px] text-slate-600 truncate">{sessao.user?.email}</p>
        </div>
        <button
          type="button"
          onClick={sair}
          className="shrink-0 bg-white hover:bg-calcada text-xs text-asfalto font-bold px-3 py-2 rounded-xl border border-asfalto/20 transition-colors cursor-pointer"
        >
          Sair
        </button>
      </div>

      <div role="tablist" aria-label="Seções do painel" className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200 p-1">
        {ABAS_PAINEL.map(([aba, Icone, rotulo]) => (
          <button
            key={aba}
            type="button"
            role="tab"
            aria-selected={abaPainel === aba}
            onClick={() => setAbaPainel(aba)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-black transition-colors cursor-pointer ${
              abaPainel === aba ? 'bg-placa text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Icone size={16} strokeWidth={2.25} aria-hidden="true" />
            {rotulo}
          </button>
        ))}
      </div>
    </>
  )
}
