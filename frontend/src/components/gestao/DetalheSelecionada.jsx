import { corCriticidade, formatarData, protocoloCivico, rotuloCriticidade } from '../../lib/gestao'
import { normalizarEstado, rotuloDoEstado } from '../../lib/status'
import { rotuloDaCategoria } from '../../lib/categorias'

const ACOES = {
  pendente: [['em_analise', 'Colocar em análise'], ['resolvido', 'Marcar como resolvido']],
  em_analise: [['resolvido', 'Marcar como resolvido'], ['pendente', 'Voltar para pendente']],
  resolvido: [['pendente', 'Reabrir chamado']]
}

/** Painel lateral do desktop: detalhes da ocorrência escolhida na lista. */
export default function DetalheSelecionada({ item, carregandoAcao, alterarStatusOcorrencia }) {
  if (!item) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-center text-xs font-bold text-slate-500">
        Escolha um chamado na lista para ver os detalhes e o ponto no mapa.
      </div>
    )
  }
  const status = normalizarEstado(item.status)
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Detalhes do chamado selecionado">
      <div className="flex items-start gap-3">
        {item.foto_url && <img src={item.foto_url} alt="" className="h-20 w-20 shrink-0 rounded-2xl border border-slate-100 object-cover" />}
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-800">{rotuloDaCategoria(item.categoria)}</h3>
          <p className="text-[11px] font-bold text-slate-500">{protocoloCivico(item.id)} · {formatarData(item.created_at)}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-700">{rotuloDoEstado(item.status)}</p>
          <p className="text-[11px] font-black" style={{ color: corCriticidade(item.gut.pontuacao) }}>
            GUT {item.gut.pontuacao} — {rotuloCriticidade(item.gut.pontuacao)}
          </p>
        </div>
      </div>
      {item.descricao && <p className="mt-3 text-xs text-slate-700 break-words">{item.descricao}</p>}
      <p className="mt-2 text-[11px] text-slate-500">Local: {item.bairro || item.endereco || item.morada || 'Não informado'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(ACOES[status] || []).map(([novo, rotulo]) => (
          <button
            key={novo}
            type="button"
            disabled={carregandoAcao}
            onClick={() => alterarStatusOcorrencia(item.id, novo)}
            className="min-h-10 rounded-xl border border-slate-300 bg-slate-900 px-3 text-[11px] font-black text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            {rotulo}
          </button>
        ))}
      </div>
    </article>
  )
}
