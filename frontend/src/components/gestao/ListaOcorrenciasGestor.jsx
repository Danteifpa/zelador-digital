import { useState } from 'react'
import { corCriticidade, eResolvida, etapaStatus, formatarData, protocoloCivico, rotuloCriticidade } from '../../lib/gestao'
import { ESTADOS, normalizarEstado, rotuloDoEstado } from '../../lib/status'
import Spinner from './Spinner'
import { iconeDaCategoria, rotuloDaCategoria } from '../../lib/categorias'
import { textoConfirmacoes } from '../../lib/apoios'

// O que o gestor pode fazer a partir de cada status (o status atual não vira botão).
const PROXIMOS_PASSOS = {
  pendente: [
    { status: 'em_analise', rotulo: 'Colocar em análise', classe: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600' },
    { status: 'resolvido', rotulo: '✓ Marcar como resolvido', classe: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' }
  ],
  em_analise: [
    { status: 'resolvido', rotulo: '✓ Marcar como resolvido', classe: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' },
    { status: 'pendente', rotulo: 'Voltar para pendente', classe: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300' }
  ],
  resolvido: [
    { status: 'pendente', rotulo: 'Reabrir chamado', classe: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300' }
  ]
}

const ETAPAS = ['Registrado', 'Em análise', 'Resolvido']

/** Lista priorizada: uma linha por chamado; tocar abre fotos, tramitação e ações. */
export default function ListaOcorrenciasGestor({ acaoEmAndamento, alterarStatusOcorrencia, carregandoAcao, confirmarResolucao, despachoPorId, fotoResolucaoPorId, itemResolucao, ocorrenciasFiltradasComGut, salvarDespacho, setDespachoPorId, setFotoResolucaoPorId, setItemEdicao, setItemExclusao, setItemResolucao, setTramitacaoAberta, tramitacaoAberta }) {
  const [aberto, setAberto] = useState(null)

  if (ocorrenciasFiltradasComGut.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-500">
        Nenhum chamado encontrado para este filtro.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {ocorrenciasFiltradasComGut.map((item) => {
        const status = normalizarEstado(item.status)
        const expandido = aberto === item.id || itemResolucao?.id === item.id || tramitacaoAberta === item.id
        const emAndamento = acaoEmAndamento === `status-${item.id}`
        const etapaAtual = etapaStatus(item)

        return (
          <li key={item.id} className={`bg-white rounded-2xl border shadow-2xs overflow-hidden ${expandido ? 'border-blue-300' : 'border-slate-200'}`}>
            {/* Linha resumida */}
            <button
              type="button"
              onClick={() => setAberto(expandido ? null : item.id)}
              aria-expanded={expandido}
              className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {item.foto_url ? (
                <img src={item.foto_url} alt="" loading="lazy" className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0" />
              ) : (
                <span className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
                  {iconeDaCategoria(item.categoria)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{protocoloCivico(item.id)}</span>
                  <span className="text-[10px] text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}</span>
                </span>
                <span className="block text-sm font-black text-slate-800 truncate">{rotuloDaCategoria(item.categoria)}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTADOS[status].classeEtiqueta}`}>
                    {rotuloDoEstado(item.status)}
                  </span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: corCriticidade(item.gut.pontuacao) }}
                    title={`Prioridade GUT ${item.gut.pontuacao}: gravidade ${item.gut.gravidade} × urgência ${item.gut.urgencia} × tendência ${item.gut.tendencia}`}
                  >
                    {rotuloCriticidade(item.gut.pontuacao)}
                  </span>
                  {textoConfirmacoes(item.total_apoios) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      👥 {item.total_apoios}
                    </span>
                  )}
                </span>
                {!expandido && item.descricao && <span className="mt-1 block text-xs text-slate-500 truncate">{item.descricao}</span>}
              </span>
              <span className={`text-slate-400 text-xs mt-5 transition-transform ${expandido ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
            </button>

            {expandido && (
              <div className="border-t border-slate-100 p-3 space-y-3">
                {eResolvida(item) && item.foto_url && item.foto_resolucao ? (
                  <div className="grid grid-cols-2 gap-2">
                    <figure>
                      <img src={item.foto_url} alt="Antes" className="h-32 w-full rounded-xl object-cover border border-slate-200" />
                      <figcaption className="mt-1 text-[10px] font-bold text-slate-600">Antes</figcaption>
                    </figure>
                    <figure>
                      <img src={item.foto_resolucao} alt="Depois" className="h-32 w-full rounded-xl object-cover border border-emerald-200" />
                      <figcaption className="mt-1 text-[10px] font-bold text-emerald-700">Depois (resolvido)</figcaption>
                    </figure>
                  </div>
                ) : (
                  item.foto_url && <img src={item.foto_url} alt="Foto do chamado" className="w-full h-44 object-cover rounded-xl border border-slate-100" />
                )}

                <p className="text-sm text-slate-700 leading-relaxed">{item.descricao || 'Sem descrição registrada.'}</p>
                {textoConfirmacoes(item.total_apoios) && (
                  <p className="text-xs font-bold text-blue-700">👥 {textoConfirmacoes(item.total_apoios)} este problema.</p>
                )}

                {/* Andamento */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start">
                    {ETAPAS.map((titulo, index) => {
                      const concluida = index + 1 <= etapaAtual
                      const data =
                        index === 0 ? formatarData(item.created_at)
                          : index === 1 ? (etapaAtual >= 2 && item.updated_at ? formatarData(item.updated_at) : '—')
                            : (eResolvida(item) ? formatarData(item.updated_at || item.created_at) : '—')
                      return (
                        <div key={titulo} className="flex flex-1 items-start">
                          <div className="flex min-w-0 flex-col items-center text-center">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                              concluida ? 'bg-slate-800 text-white' : 'border border-slate-300 bg-white text-slate-400'
                            }`}>
                              {concluida ? '✓' : index + 1}
                            </span>
                            <span className="mt-1 text-[10px] font-black text-slate-700">{titulo}</span>
                            <span className="text-[10px] text-slate-500">{data}</span>
                          </div>
                          {index < 2 && <span className={`mt-3 h-0.5 flex-1 ${index + 1 < etapaAtual ? 'bg-slate-800' : 'bg-slate-200'}`} />}
                        </div>
                      )
                    })}
                  </div>
                  {item.observacoes && (
                    <p className="mt-3 border-t border-slate-200 pt-2 text-xs leading-relaxed text-slate-700">
                      <strong>Despacho:</strong> {item.observacoes}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setTramitacaoAberta(tramitacaoAberta === item.id ? null : item.id)
                      setDespachoPorId((atuais) => ({ ...atuais, [item.id]: atuais[item.id] ?? item.observacoes ?? '' }))
                    }}
                    className="mt-2 text-xs font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    📋 {tramitacaoAberta === item.id ? 'Fechar despacho' : item.observacoes ? 'Editar despacho' : 'Escrever despacho'}
                  </button>
                  {tramitacaoAberta === item.id && (
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={3}
                        value={despachoPorId[item.id] ?? ''}
                        onChange={(e) => setDespachoPorId((atuais) => ({ ...atuais, [item.id]: e.target.value }))}
                        placeholder="Órgão oficiado, protocolo externo ou observações da vistoria..."
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={carregandoAcao}
                        onClick={() => salvarDespacho(item)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                      >
                        {acaoEmAndamento === `despacho-${item.id}` && <Spinner />}
                        {acaoEmAndamento === `despacho-${item.id}` ? 'Salvando...' : 'Salvar despacho'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Resolver com foto do "depois" */}
                {itemResolucao?.id === item.id && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <p className="text-xs font-black text-emerald-900">📸 Foto da solução (opcional)</p>
                    <p className="mt-0.5 text-[11px] text-emerald-800">O morador verá o antes e o depois.</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFotoResolucaoPorId((atuais) => ({ ...atuais, [item.id]: e.target.files?.[0] || null }))}
                      className="mt-2 block w-full rounded-xl border border-emerald-200 bg-white p-2 text-[11px] text-slate-700"
                    />
                    {fotoResolucaoPorId[item.id] && <p className="mt-1 truncate text-[11px] text-emerald-800">{fotoResolucaoPorId[item.id].name}</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setItemResolucao(null)}
                        className="min-h-10 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-emerald-900 hover:bg-emerald-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={carregandoAcao}
                        onClick={confirmarResolucao}
                        className="min-h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                      >
                        {emAndamento && <Spinner />}
                        {emAndamento ? 'Registrando...' : 'Confirmar resolvido'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Próximo passo: o status atual não vira botão */}
                {itemResolucao?.id !== item.id && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-bold text-slate-500">
                      Status atual: <span className="text-slate-800">{rotuloDoEstado(item.status)}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PROXIMOS_PASSOS[status].map((passo) => (
                        <button
                          key={passo.status}
                          type="button"
                          disabled={carregandoAcao}
                          onClick={() => {
                            if (passo.status === 'resolvido') {
                              setItemResolucao({ id: item.id, foto: null })
                              setFotoResolucaoPorId((atuais) => ({ ...atuais, [item.id]: null }))
                            } else {
                              alterarStatusOcorrencia(item.id, passo.status)
                            }
                          }}
                          className={`min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-black transition-colors disabled:opacity-60 cursor-pointer ${passo.classe} ${
                            PROXIMOS_PASSOS[status].length === 1 ? 'col-span-2' : ''
                          }`}
                        >
                          {emAndamento && passo.status !== 'resolvido' && <Spinner />}
                          {passo.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações de manutenção, separadas das ações do dia a dia */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setItemEdicao({ ...item, status })}
                    className="min-h-9 px-2 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    ✏️ Editar dados
                  </button>
                  <button
                    type="button"
                    disabled={carregandoAcao}
                    onClick={() => setItemExclusao(item)}
                    className="min-h-9 px-2 text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Excluir chamado
                  </button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
