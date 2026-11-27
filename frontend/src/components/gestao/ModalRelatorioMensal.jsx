import { useMemo, useState } from 'react'
import { formatarData } from '../../lib/gestao'
import { formatarDias } from '../../lib/transparencia'
import { mesesDisponiveis, nomeDoMes, relatorioDoMes } from '../../lib/relatorioMensal'

const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`)

function Tabela({ titulo, linhas, chave, rotulo }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="border-b border-slate-400 pb-1 text-xs font-black uppercase">{titulo}</h2>
      <table className="mt-2 w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-slate-100">
            {[rotulo, 'Registrados', 'Resolvidos', 'Abertos', 'Atrasados', 'Taxa de resolução', 'No prazo', 'Mediana até resolver'].map((c) => (
              <th key={c} className="border border-slate-400 px-1.5 py-1 text-left">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l[chave]}>
              <td className="border border-slate-400 px-1.5 py-1 font-bold">{l.nome || l[chave]}</td>
              <td className="border border-slate-400 px-1.5 py-1">{l.registrados}</td>
              <td className="border border-slate-400 px-1.5 py-1">{l.resolvidos}</td>
              <td className="border border-slate-400 px-1.5 py-1">{l.abertos}</td>
              <td className="border border-slate-400 px-1.5 py-1">{l.atrasados}</td>
              <td className="border border-slate-400 px-1.5 py-1">{pct(l.taxaResolucao)}</td>
              <td className="border border-slate-400 px-1.5 py-1">{pct(l.noPrazo)}</td>
              <td className="border border-slate-400 px-1.5 py-1">{formatarDias(l.medianaDias)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/** Relatório do mês em A4: números gerais, por órgão e por bairro. */
export default function ModalRelatorioMensal({ ocorrencias, nomeApp, onFechar }) {
  const meses = useMemo(() => mesesDisponiveis(ocorrencias), [ocorrencias])
  const hoje = new Date()
  const [escolha, setEscolha] = useState(() => (meses[0] ? `${meses[0].ano}-${meses[0].mes}` : `${hoje.getFullYear()}-${hoje.getMonth()}`))
  const [ano, mes] = escolha.split('-').map(Number)
  const r = useMemo(() => relatorioDoMes(ocorrencias, ano, mes), [ocorrencias, ano, mes])
  const g = r.geral

  const cartoes = [
    ['Registrados no mês', g.registrados],
    ['Resolvidos no mês', g.resolvidosNoMes],
    ['Taxa de resolução', pct(g.taxaResolucao)],
    ['Resolvidos no prazo', pct(g.noPrazo)],
    ['Mediana até resolver', formatarDias(g.medianaDias)],
    ['Reincidência (500 m)', pct(g.reincidencia)]
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-relatorio">
      <style>{`@media print { body * { visibility: hidden !important; } .relatorio-impressao, .relatorio-impressao * { visibility: visible !important; } .relatorio-impressao { position: absolute !important; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="mx-auto max-w-[210mm] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900 p-3 text-white print:hidden">
          <label className="text-xs font-bold">
            Mês{' '}
            <select value={escolha} onChange={(e) => setEscolha(e.target.value)} className="ml-1 rounded-lg bg-slate-800 border border-slate-600 px-2 py-1 text-xs">
              {(meses.length ? meses : [{ ano: hoje.getFullYear(), mes: hoje.getMonth() }]).map((m) => (
                <option key={`${m.ano}-${m.mes}`} value={`${m.ano}-${m.mes}`}>{nomeDoMes(m.ano, m.mes)}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold hover:bg-indigo-700 cursor-pointer">Imprimir / PDF</button>
            <button type="button" onClick={onFechar} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-800 cursor-pointer">Fechar</button>
          </div>
        </div>

        <article className="relatorio-impressao bg-white p-[12mm] text-[11px] text-slate-900 shadow-2xl print:shadow-none">
          <header className="border-b-2 border-slate-900 pb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{nomeApp}</p>
            <h1 id="titulo-relatorio" className="mt-1 text-base font-black uppercase">Relatório mensal de zeladoria — {r.titulo}</h1>
            <p className="text-[10px]">Gerado em {formatarData(new Date().toISOString(), true)} · chamados registrados no mês</p>
          </header>

          <dl className="mt-4 grid grid-cols-3 gap-2">
            {cartoes.map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-lg border border-slate-300 p-2">
                <dt className="text-[9px] uppercase text-slate-500">{rotulo}</dt>
                <dd className="text-lg font-black">{valor}</dd>
              </div>
            ))}
          </dl>

          {g.registrados === 0 ? (
            <p className="mt-6 text-center">Nenhum chamado registrado neste mês.</p>
          ) : (
            <>
              <Tabela titulo="Por órgão" linhas={r.porOrgao} chave="orgao" rotulo="Órgão" />
              <Tabela titulo="Por bairro" linhas={r.porBairro} chave="bairro" rotulo="Bairro" />
            </>
          )}

          <p className="mt-5 text-[9px] text-slate-500">
            "No prazo" considera o prazo de atendimento de cada órgão. Reincidência: chamados a até 500 m de outro do mesmo mês.
          </p>
        </article>
      </div>
    </div>
  )
}
