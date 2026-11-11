/** Documentos e exportações da gestão (aba Relatórios). */
export default function AcoesRelatorios({ abrirOficio, abrirBoletim, exportarCsv, exportarGeoJson }) {
  const acoes = [
    { icone: '📄', titulo: 'Ofício', detalhe: 'Reivindicação ao poder público', onClick: abrirOficio, destaque: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600' },
    { icone: '📢', titulo: 'Boletim', detalhe: 'Resumo para a comunidade', onClick: abrirBoletim, destaque: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' },
    { icone: '📊', titulo: 'Planilha', detalhe: 'Exportar CSV', onClick: exportarCsv },
    { icone: '🗺️', titulo: 'Dados do mapa', detalhe: 'Exportar GeoJSON', onClick: exportarGeoJson }
  ]
  return (
    <section aria-label="Documentos e exportações" className="grid grid-cols-2 gap-2">
      {acoes.map((acao) => (
        <button
          key={acao.titulo}
          type="button"
          onClick={acao.onClick}
          className={`rounded-2xl border p-3 text-left transition-colors cursor-pointer ${
            acao.destaque || 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <span className="text-lg" aria-hidden="true">{acao.icone}</span>
          <span className="mt-1 block text-sm font-black">{acao.titulo}</span>
          <span className={`block text-[11px] ${acao.destaque ? 'text-white/80' : 'text-slate-500'}`}>{acao.detalhe}</span>
        </button>
      ))}
    </section>
  )
}
