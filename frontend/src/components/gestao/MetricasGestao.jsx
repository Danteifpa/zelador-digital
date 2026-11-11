/**
 * Números principais. Tocar num número mostra os chamados daquele status na aba Chamados.
 */
export default function MetricasGestao({ filtroStatus, metricas, onFiltrar }) {
  const itens = [
    { status: 'todos', label: 'Total', value: metricas.total, tone: 'text-white' },
    { status: 'pendente', label: 'Pendentes', value: metricas.pendentes, tone: 'text-amber-300' },
    { status: 'em_analise', label: 'Em análise', value: metricas.emAnalise, tone: 'text-sky-300' },
    { status: 'resolvido', label: 'Resolvidos', value: metricas.resolvidas, tone: 'text-emerald-300' }
  ]
  return (
    <section className="bg-slate-900 rounded-3xl p-3 text-white shadow-sm">
      <div className="grid grid-cols-4 gap-1.5">
        {itens.map((item) => (
          <button
            key={item.status}
            type="button"
            onClick={() => onFiltrar(item.status)}
            aria-pressed={filtroStatus === item.status}
            className={`rounded-2xl border p-2 text-left transition-colors cursor-pointer ${
              filtroStatus === item.status ? 'bg-slate-700 border-slate-500' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span className={`block text-xl font-black leading-tight ${item.tone}`}>{item.value}</span>
            <span className="block text-[10px] font-bold text-slate-300 leading-tight">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-2.5">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
          <span>Taxa de resolução</span>
          <span>{metricas.percentualResolucao}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden" aria-label={`${metricas.percentualResolucao}% de resolução`}>
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${metricas.percentualResolucao}%` }} />
        </div>
      </div>
    </section>
  )
}
