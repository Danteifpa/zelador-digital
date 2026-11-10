/**
 * Cartão "Visão Geral" com os 3 indicadores: Total, Resolvidos e Pendentes.
 */
export default function StatsOverview({ total, resolvidos, pendentes }) {
  const indicadores = [
    { rotulo: 'Total', valor: total },
    { rotulo: 'Resolvidos', valor: resolvidos },
    { rotulo: 'Pendentes', valor: pendentes }
  ]

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-blue-600 via-sky-600 to-emerald-500 p-3.5 text-white shadow-md relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-sky-100 font-bold">Monitoramento Cívico</span>
          <h1 className="text-xl font-black mt-0.5">Visão Geral</h1>
        </div>
        <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg shadow-inner">
          📍
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {indicadores.map(({ rotulo, valor }) => (
          <div key={rotulo} className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
            <span className="text-2xl font-bold block leading-none">{valor}</span>
            <span className="text-xs font-semibold text-sky-100 mt-1 block">{rotulo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
