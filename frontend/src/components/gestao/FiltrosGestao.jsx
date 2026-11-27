import { ESTADOS, ORDEM_ESTADOS } from '../../lib/status'
import { ORGAOS, nomeDoOrgao } from '../../lib/orgaos'

/** Busca, filtros de órgão e de estado e ordenação por prioridade GUT. */
export default function FiltrosGestao({ filtroOrgao = 'todos', orgaoGestor = null, setFiltroOrgao = () => {}, totalAtrasados = 0, totalDenunciados = 0, filtroStatus, ordenarPorGut, setFiltroStatus, setOrdenarPorGut, setTermoBusca, termoBusca }) {
  return (
    <>
    {/* Busca e Filtros */}
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Buscar por protocolo, descrição ou tipo..."
        value={termoBusca}
        onChange={(e) => setTermoBusca(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
      />

      <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
        Órgão
        <select
          value={filtroOrgao}
          onChange={(e) => setFiltroOrgao(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
        >
          <option value="todos">Todos os órgãos</option>
          {ORGAOS.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}{o.id === orgaoGestor ? ' (seu órgão)' : ''}</option>
          ))}
        </select>
      </label>
      {orgaoGestor && (
        <p className="text-[10px] text-slate-500">
          Você é gestor de <strong>{nomeDoOrgao(orgaoGestor)}</strong>: pode ver todos os chamados, mas só altera os do seu órgão.
        </p>
      )}

      <div className="flex space-x-1.5 overflow-x-auto sem-barra-rolagem pb-1 text-xs">
        {[['todos', 'Todos'], ...ORDEM_ESTADOS.map((estado) => [estado, ESTADOS[estado].rotulo])].map(([status, label]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFiltroStatus(status)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              filtroStatus === status
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
        {totalAtrasados > 0 && (
          <button
            type="button"
            onClick={() => setFiltroStatus('atrasados')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              filtroStatus === 'atrasados'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
            }`}
          >
            ⏰ Atrasados ({totalAtrasados})
          </button>
        )}
        {totalDenunciados > 0 && (
          <button
            type="button"
            onClick={() => setFiltroStatus('denunciados')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              filtroStatus === 'denunciados'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
            }`}
          >
            🚩 Denunciados ({totalDenunciados})
          </button>
        )}
        <button
          type="button"
          onClick={() => setOrdenarPorGut((atual) => !atual)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
            ordenarPorGut ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {ordenarPorGut ? '🔥 Mais urgentes primeiro' : '↕ Ordenar por urgência'}
        </button>
      </div>
    </div>
    </>
  )
}
