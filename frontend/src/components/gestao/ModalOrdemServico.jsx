import { useMemo, useState } from 'react'
import { formatarData, protocoloCivico } from '../../lib/gestao'
import { rotuloDaCategoria } from '../../lib/categorias'
import { nomeDoOrgao, orgaoDoChamado } from '../../lib/orgaos'
import { rotuloDoPrazo, situacaoDoPrazo } from '../../lib/prazos'
import { itensDaOrdem, linkDoMapa, numeroDaOrdem, textoDaOrdem } from '../../lib/ordemServico'

/**
 * Ordem de serviço para a equipe de campo: escolhe os chamados, imprime ou manda no WhatsApp.
 * `chamados` são os chamados abertos que estão na lista filtrada do painel.
 */
export default function ModalOrdemServico({ chamados, orgao, onFechar }) {
  const [numero] = useState(() => numeroDaOrdem())
  const [equipe, setEquipe] = useState('')
  const candidatos = useMemo(() => itensDaOrdem(chamados), [chamados])
  const [marcados, setMarcados] = useState(() => new Set(candidatos.map((i) => i.id)))
  const itens = candidatos.filter((i) => marcados.has(i.id))

  const alternar = (id) => setMarcados((atual) => {
    const novo = new Set(atual)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    return novo
  })

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(textoDaOrdem(itens, { numero, equipe }))}`

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-os">
      <style>{`@media print { body * { visibility: hidden !important; } .os-impressao, .os-impressao * { visibility: visible !important; } .os-impressao { position: absolute !important; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="mx-auto max-w-[210mm] space-y-3">
        <div className="rounded-2xl bg-slate-900 p-4 text-white space-y-3 print:hidden">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-black">Ordem de serviço {numero}</h2>
            <button type="button" onClick={onFechar} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-800 cursor-pointer">Fechar</button>
          </div>
          <label className="block text-[11px] font-bold text-slate-300">
            Equipe (opcional)
            <input value={equipe} onChange={(e) => setEquipe(e.target.value)} placeholder="Ex.: Equipe 2 — Iluminação"
              className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white" />
          </label>
          <fieldset className="max-h-56 overflow-y-auto rounded-xl border border-slate-700 p-2 space-y-1">
            <legend className="px-1 text-[11px] font-bold text-slate-300">Chamados ({itens.length} de {candidatos.length})</legend>
            {candidatos.length === 0 && <p className="text-xs text-slate-400">Nenhum chamado aberto no filtro atual.</p>}
            {candidatos.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-[11px]">
                <input type="checkbox" checked={marcados.has(item.id)} onChange={() => alternar(item.id)} />
                <span className="truncate">{rotuloDaCategoria(item.categoria)} · {item.bairro || 'sem bairro'} · {protocoloCivico(item.id)}</span>
              </label>
            ))}
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!itens.length} onClick={() => window.print()} className="min-h-11 rounded-xl bg-indigo-600 text-xs font-black hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
              Imprimir / PDF
            </button>
            <a href={itens.length ? whatsapp : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!itens.length}
              className={`min-h-11 inline-flex items-center justify-center rounded-xl bg-emerald-600 text-xs font-black hover:bg-emerald-700 ${itens.length ? '' : 'pointer-events-none opacity-50'}`}>
              Mandar no WhatsApp
            </a>
          </div>
        </div>

        <article className="os-impressao bg-white p-[12mm] text-[11px] text-slate-900 shadow-2xl print:shadow-none">
          <header className="flex items-end justify-between border-b-2 border-slate-900 pb-3">
            <div>
              <h1 id="titulo-os" className="text-base font-black uppercase">Ordem de serviço</h1>
              <p className="text-[10px]">{orgao && orgao !== 'todos' ? nomeDoOrgao(orgao) : 'Todos os órgãos'}{equipe ? ` · ${equipe}` : ''}</p>
            </div>
            <div className="text-right text-[10px]">
              <p className="font-black">{numero}</p>
              <p>Emitida em {formatarData(new Date().toISOString(), true)}</p>
            </div>
          </header>
          <table className="mt-4 w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 px-1.5 py-1 text-left">Nº</th>
                <th className="border border-slate-400 px-1.5 py-1 text-left">Chamado</th>
                <th className="border border-slate-400 px-1.5 py-1 text-left">Local</th>
                <th className="border border-slate-400 px-1.5 py-1 text-left">Prazo</th>
                <th className="border border-slate-400 px-1.5 py-1 text-left">Feito? / Obs.</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, i) => {
                const prazo = situacaoDoPrazo(item)
                const mapa = linkDoMapa(item)
                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="border border-slate-400 px-1.5 py-1 align-top">{i + 1}</td>
                    <td className="border border-slate-400 px-1.5 py-1 align-top">
                      <strong>{rotuloDaCategoria(item.categoria)}</strong><br />{protocoloCivico(item.id)}<br />
                      {nomeDoOrgao(orgaoDoChamado(item))}
                      {item.descricao && <><br /><em>{String(item.descricao).slice(0, 140)}</em></>}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-1 align-top">
                      {item.bairro || 'Bairro não identificado'}
                      {mapa && <><br /><span className="font-mono">{Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</span></>}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-1 align-top">{rotuloDoPrazo(prazo) || `${prazo.prazoDias} dias`}</td>
                    <td className="border border-slate-400 px-1.5 py-1 align-top w-[28%]">☐ Feito&nbsp;&nbsp;☐ Não deu</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-4 text-[10px]">Ao terminar cada item, fotografe o local e mande a foto do depois ao gestor.</p>
          <div className="mt-12 grid grid-cols-2 gap-10 text-center text-[10px]">
            <div className="border-t border-slate-700 pt-1">Responsável da equipe</div>
            <div className="border-t border-slate-700 pt-1">Gestor</div>
          </div>
        </article>
      </div>
    </div>
  )
}
