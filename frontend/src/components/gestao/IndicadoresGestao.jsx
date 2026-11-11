import { RAIO_RECURRENCIA_METROS } from '../../lib/gestao'

/** Tempo médio de resolução, recorrência, categorias e evolução das últimas 4 semanas. */
export default function IndicadoresGestao({ analiseCategorias, analiseTemporal, maxCategoria, maxTemporal, metricas }) {
  return (
    <>
    {/* Indicadores técnicos e visualizações */}
    <section className="grid gap-3 lg:grid-cols-3">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-black">Tempo médio de resolução</p>
        <p className="text-2xl font-black text-slate-800 mt-2">
          {metricas.tempoMedioDias === null ? '—' : `${metricas.tempoMedioDias.toFixed(1)} dias`}
        </p>
        <p className="text-[10px] text-slate-500 mt-1">
          {metricas.resolvidasComData ? `Baseado em ${metricas.resolvidasComData} registros com data de resolução.` : 'Requer resolved_at ou updated_at nas resolvidas.'}
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-black">Índice de recorrência</p>
        <p className="text-2xl font-black text-amber-600 mt-2">{metricas.indiceRecorrencia}%</p>
        <p className="text-[10px] text-slate-500 mt-1">Registros em concentração de até {RAIO_RECURRENCIA_METROS} m de outro ponto.</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-black">Taxa de eficácia</p>
        <p className="text-2xl font-black text-emerald-600 mt-2">{metricas.percentualResolucao}%</p>
        <p className="text-[10px] text-slate-500 mt-1">Demandas resolvidas sobre o total registrado.</p>
      </div>
    </section>

    <section className="grid gap-3 lg:grid-cols-2">
      <div className="bg-slate-900 rounded-3xl p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black">Distribuição por categoria</h3>
          <span className="text-[10px] text-slate-400">Pareto</span>
        </div>
        <div className="space-y-3">
          {analiseCategorias.length === 0 ? (
            <p className="text-xs text-slate-400">Sem dados categorizados.</p>
          ) : analiseCategorias.map(([categoria, quantidade]) => (
            <div key={categoria}>
              <div className="flex justify-between text-[10px] font-bold mb-1">
                <span className="capitalize text-slate-300">{categoria}</span>
                <span className="text-slate-400">{quantidade}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(quantidade / maxCategoria) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black text-slate-800">Frequência temporal</h3>
          <span className="text-[10px] text-slate-400">Últimas 4 semanas</span>
        </div>
        <svg viewBox="0 0 320 130" className="w-full h-36" role="img" aria-label="Ocorrências nas últimas quatro semanas">
          <line x1="20" y1="105" x2="305" y2="105" stroke="#cbd5e1" strokeWidth="1" />
          <polyline
            fill="none"
            stroke="#4f46e5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={analiseTemporal.map((item, index) => `${30 + index * 90},${105 - (item.quantidade / maxTemporal) * 80}`).join(' ')}
          />
          {analiseTemporal.map((item, index) => (
            <g key={item.label}>
              <circle cx={30 + index * 90} cy={105 - (item.quantidade / maxTemporal) * 80} r="4" fill="#4f46e5" />
              <text x={30 + index * 90} y="122" textAnchor="middle" fontSize="9" fill="#64748b">{item.label}</text>
              <text x={30 + index * 90} y={95 - (item.quantidade / maxTemporal) * 80} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#334155">{item.quantidade}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
    </>
  )
}
