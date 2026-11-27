import { CalendarDays, FileSpreadsheet, FileText, Map as IconeMapa, Megaphone } from 'lucide-react'

/** Documentos e exportações da gestão (aba Relatórios). */
export default function AcoesRelatorios({ abrirOficio, abrirBoletim, abrirRelatorioMensal, exportarCsv, exportarGeoJson }) {
  const acoes = [
    { Icone: CalendarDays, titulo: 'Relatório mensal', detalhe: 'Números do mês por órgão e bairro', onClick: abrirRelatorioMensal, destaque: 'bg-placa hover:bg-placa-escura text-white border-placa' },
    { Icone: FileText, titulo: 'Ofício', detalhe: 'Reivindicação ao poder público', onClick: abrirOficio, destaque: 'bg-asfalto hover:bg-slate-800 text-white border-asfalto' },
    { Icone: Megaphone, titulo: 'Boletim', detalhe: 'Resumo para a comunidade', onClick: abrirBoletim, destaque: 'bg-mangueira hover:bg-emerald-900 text-white border-mangueira' },
    { Icone: FileSpreadsheet, titulo: 'Planilha', detalhe: 'Exportar CSV', onClick: exportarCsv },
    { Icone: IconeMapa, titulo: 'Dados do mapa', detalhe: 'Exportar GeoJSON', onClick: exportarGeoJson }
  ]
  return (
    <section aria-label="Documentos e exportações" className="grid grid-cols-2 gap-2 [&>button:first-child]:col-span-2">
      {acoes.map((acao) => (
        <button
          key={acao.titulo}
          type="button"
          onClick={acao.onClick}
          className={`rounded-2xl border p-3 text-left transition-colors cursor-pointer ${
            acao.destaque || 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <acao.Icone size={20} strokeWidth={2.25} aria-hidden="true" />
          <span className="mt-1.5 block text-sm font-black">{acao.titulo}</span>
          <span className={`block text-[11px] ${acao.destaque ? 'text-white/80' : 'text-slate-500'}`}>{acao.detalhe}</span>
        </button>
      ))}
    </section>
  )
}
