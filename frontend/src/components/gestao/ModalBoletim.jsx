/** Boletim comunitário pronto para copiar e compartilhar. */
export default function ModalBoletim({ boletimCopiado, copiarBoletim, setMostrarBoletim, textoBoletim }) {
  return (
    <>
    <div className="fixed inset-0 z-50 bg-slate-950/80 px-4 py-6 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="titulo-boletim">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="titulo-boletim" className="text-base font-black">Boletim Comunitário</h2>
            <p className="text-[10px] text-slate-400 mt-1">Resumo pronto para compartilhar no WhatsApp.</p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarBoletim(false)}
            className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
          >
            Fechar
          </button>
        </div>
        <pre className="mt-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-200 font-sans">
          {textoBoletim}
        </pre>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={copiarBoletim}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer"
          >
            {boletimCopiado ? '✓ Texto copiado!' : 'Copiar Texto'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
