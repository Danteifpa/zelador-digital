import { rotuloDaCategoria } from '../../lib/categorias'

/** Escolha das demandas pendentes que entram no ofício. */
export default function SelecaoOficio({ alternarSelecaoOficio, pendentes, selecionadasOficio, setSelecionadasOficio }) {
  return (
    <>
    <section className="bg-slate-800 rounded-3xl p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-xs font-black">Demandas para o ofício</h3>
          <p className="text-[10px] text-slate-400 mt-1">Selecione os registros pendentes que serão enumerados.</p>
        </div>
        <button
          type="button"
          onClick={() => setSelecionadasOficio(selecionadasOficio.length === pendentes.length ? [] : pendentes.map((item) => item.id))}
          className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 cursor-pointer"
        >
          {selecionadasOficio.length === pendentes.length ? 'Limpar seleção' : 'Selecionar todas'}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto">
        {pendentes.map((item) => (
          <label key={item.id} className="flex items-start gap-2 rounded-xl bg-slate-900/70 p-2.5 cursor-pointer">
            <input type="checkbox" checked={selecionadasOficio.includes(item.id)} onChange={() => alternarSelecaoOficio(item.id)} className="mt-0.5 accent-indigo-500" />
            <span className="text-[11px] text-slate-200"><strong>{rotuloDaCategoria(item.categoria)}</strong> — {item.descricao || 'Sem descrição'}</span>
          </label>
        ))}
      </div>
    </section>
    </>
  )
}
