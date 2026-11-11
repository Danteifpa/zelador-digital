/** Números principais e ações de exportação (CSV, GeoJSON, boletim, ofício). */
export default function MetricasGestao({ abrirOficio, exportarCsv, exportarGeoJson, metricas, setBoletimCopiado, setMostrarBoletim }) {
  return (
    <>
    {/* Métricas */}
    <section className="bg-slate-900 rounded-3xl p-3.5 text-white shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total Geral', value: metricas.total, tone: 'text-white' },
          { label: 'Pendentes', value: metricas.pendentes, tone: 'text-amber-300' },
          { label: 'Em Análise', value: metricas.emAnalise, tone: 'text-sky-300' },
          { label: 'Resolvidas', value: metricas.resolvidas, tone: 'text-emerald-300' }
        ].map((metrica) => (
          <div key={metrica.label} className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{metrica.label}</p>
            <p className={`text-xl font-black mt-1 ${metrica.tone}`}>{metrica.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
          <span>Taxa de resolução</span>
          <span>{metricas.percentualResolucao}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden" aria-label={`${metricas.percentualResolucao}% de resolução`}>
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${metricas.percentualResolucao}%` }} />
        </div>
      </div>
    </section>

    <div className="flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        onClick={abrirOficio}
        className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3 py-2.5 transition-colors cursor-pointer"
      >
        Gerar Ofício de Reivindicação Comunitária
      </button>
      <button
        type="button"
        onClick={exportarCsv}
        className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black px-4 py-2.5 transition-colors cursor-pointer"
      >
        Exportar Base CSV
      </button>
      <button
        type="button"
        onClick={exportarGeoJson}
        className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black px-4 py-2.5 transition-colors cursor-pointer"
      >
        Exportar GeoJSON
      </button>
      <button
        type="button"
        onClick={() => {
          setBoletimCopiado(false)
          setMostrarBoletim(true)
        }}
        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 transition-colors cursor-pointer"
      >
        Gerar Boletim Comunitário
      </button>
    </div>
    </>
  )
}
