import { ESTADOS, ORDEM_ESTADOS } from '../../lib/status'

/** Busca, filtros de estado e ordenação por prioridade GUT. */
export default function FiltrosGestao({ filtroStatus, ordenarPorGut, setFiltroStatus, setOrdenarPorGut, setTermoBusca, termoBusca }) {
  return (
    <>
    {/* Busca e Filtros */}
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Filtrar por descrição ou categoria..."
        value={termoBusca}
        onChange={(e) => setTermoBusca(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
      />

      <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
        {[['todos', 'Todos'], ...ORDEM_ESTADOS.map((estado) => [estado, ESTADOS[estado].rotulo])].map(([status, label]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFiltroStatus(status)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all shrink-0 cursor-pointer ${
              filtroStatus === status
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOrdenarPorGut((atual) => !atual)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
            ordenarPorGut ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {ordenarPorGut ? 'GUT: maior primeiro' : 'Ordenar por GUT'}
        </button>
      </div>
    </div>
    </>
  )
}
