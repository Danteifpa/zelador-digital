/** Confirmação antes de excluir uma ocorrência. */
export default function ModalExclusao({ carregandoAcao, eliminarOcorrencia, setItemExclusao }) {
  return (
    <>
    <div className="fixed inset-0 z-50 bg-slate-950/70 px-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirmar-exclusao-titulo">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 text-white shadow-2xl">
        <h2 id="confirmar-exclusao-titulo" className="text-base font-black">Excluir ocorrência?</h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Esta ação removerá permanentemente este registro do Supabase e não pode ser desfeita.
        </p>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => setItemExclusao(null)}
            className="flex-1 rounded-xl border border-slate-600 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={carregandoAcao}
            onClick={eliminarOcorrencia}
            className="flex-1 rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
          >
            {carregandoAcao ? 'A excluir...' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
