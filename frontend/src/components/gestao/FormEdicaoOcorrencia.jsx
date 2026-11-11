import { ESTADOS, ORDEM_ESTADOS, normalizarEstado } from '../../lib/status'

/** Formulário para editar descrição, categoria e estado de uma ocorrência. */
export default function FormEdicaoOcorrencia({ carregandoAcao, itemEdicao, salvarEdicao, setItemEdicao }) {
  return (
    <>
    <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-amber-900">Editar registro #{itemEdicao.id}</span>
        <button
          type="button"
          onClick={() => setItemEdicao(null)}
          className="text-amber-800 text-xs font-bold hover:underline cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={salvarEdicao} className="space-y-3">
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Categoria:</label>
          <select
            value={itemEdicao.categoria}
            onChange={(e) => setItemEdicao({ ...itemEdicao, categoria: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="lixo">🗑️ Lixo Irregular</option>
            <option value="iluminacao">💡 Iluminação Pública</option>
            <option value="buraco">🕳️ Buraco / Pavimentação</option>
            <option value="esgoto">💧 Esgoto / Drenagem</option>
            <option value="outro">📍 Outro</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Descrição:</label>
          <textarea
            rows={3}
            value={itemEdicao.descricao}
            onChange={(e) => setItemEdicao({ ...itemEdicao, descricao: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Estado:</label>
          <select
            value={normalizarEstado(itemEdicao.status)}
            onChange={(e) => setItemEdicao({ ...itemEdicao, status: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {ORDEM_ESTADOS.map((estado) => (
              <option key={estado} value={estado}>{ESTADOS[estado].rotulo}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={carregandoAcao}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
        >
          {carregandoAcao ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
    </>
  )
}
