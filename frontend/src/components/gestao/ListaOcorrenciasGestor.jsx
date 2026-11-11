import { corCriticidade, eResolvida, etapaStatus, formatarData, protocoloCivico, rotuloCriticidade } from '../../lib/gestao'
import { ESTADOS, normalizarEstado, rotuloDoEstado } from '../../lib/status'
import Spinner from './Spinner'
import { rotuloDaCategoria } from '../../lib/categorias'
import { textoConfirmacoes } from '../../lib/apoios'

/** Lista priorizada com tramitação, despacho e ações de estado. */
export default function ListaOcorrenciasGestor({ acaoEmAndamento, alterarStatusOcorrencia, carregandoAcao, confirmarResolucao, despachoPorId, fotoResolucaoPorId, itemResolucao, ocorrenciasFiltradasComGut, salvarDespacho, setDespachoPorId, setFotoResolucaoPorId, setItemEdicao, setItemExclusao, setItemResolucao, setTramitacaoAberta, tramitacaoAberta }) {
  return (
    <>
    {/* Lista de Ocorrências com Ações Diretas */}
    <div className="space-y-3">
      {ocorrenciasFiltradasComGut.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-400">
          Nenhum registro encontrado para este filtro.
        </div>
      ) : (
        ocorrenciasFiltradasComGut.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{protocoloCivico(item.id)}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-black text-slate-800">
                    {rotuloDaCategoria(item.categoria)}
                  </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTADOS[normalizarEstado(item.status)].classeEtiqueta}`}>
                  {rotuloDoEstado(item.status)}
                </span>
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: corCriticidade(item.gut.pontuacao) }}
                  title={`GUT ${item.gut.pontuacao}: G${item.gut.gravidade} × U${item.gut.urgencia} × T${item.gut.tendencia}`}
                >
                  {rotuloCriticidade(item.gut.pontuacao)}
                </span>
                {textoConfirmacoes(item.total_apoios) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    👥 {textoConfirmacoes(item.total_apoios)}
                  </span>
                )}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}
              </span>
            </div>

            {item.foto_url && (
              <img
                src={item.foto_url}
                alt="Registro"
                className="w-full h-32 object-cover rounded-xl border border-slate-100"
              />
            )}

            {eResolvida(item) && item.foto_url && item.foto_resolucao && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-emerald-800">Auditoria fotográfica</span>
                  <span className="rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-black text-white">
                    Comprovado por Auditoria Visual
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <figure>
                    <img src={item.foto_url} alt="Antes: registro inicial" className="h-28 w-full rounded-xl object-cover border border-emerald-200" />
                    <figcaption className="mt-1 text-[9px] font-bold text-emerald-900">Antes (Registro Inicial)</figcaption>
                  </figure>
                  <figure>
                    <img src={item.foto_resolucao} alt="Depois: intervenção concluída" className="h-28 w-full rounded-xl object-cover border border-emerald-200" />
                    <figcaption className="mt-1 text-[9px] font-bold text-emerald-900">Depois (Intervenção Concluída)</figcaption>
                  </figure>
                </div>
              </div>
            )}

            {itemResolucao?.id === item.id && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3">
                <p className="text-[11px] font-black text-indigo-900">📸 Anexar Foto da Resolução (Depois)</p>
                <p className="mt-1 text-[10px] text-indigo-700">Opcional. A imagem será armazenada no bucket de ocorrências.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoResolucaoPorId((atuais) => ({ ...atuais, [item.id]: e.target.files?.[0] || null }))}
                  className="mt-2 block w-full rounded-xl border border-indigo-200 bg-white p-2 text-[10px] text-slate-700"
                />
                {fotoResolucaoPorId[item.id] && (
                  <p className="mt-1 truncate text-[10px] text-indigo-700">{fotoResolucaoPorId[item.id].name}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setItemResolucao(null)}
                    className="rounded-xl border border-indigo-200 px-3 py-2 text-[10px] font-bold text-indigo-800 hover:bg-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={carregandoAcao}
                    onClick={confirmarResolucao}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                  >
                    {acaoEmAndamento === `status-${item.id}` && <Spinner />}
                    {acaoEmAndamento === `status-${item.id}` ? 'A registrar...' : 'Confirmar Resolvido'}
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              {item.descricao || 'Sem descrição registrada.'}
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Tramitação</span>
                <span className="text-[10px] font-bold text-slate-500">{item.updated_at ? `Atualizado em ${formatarData(item.updated_at)}` : 'Sem despacho registrado'}</span>
              </div>
              <div className="mt-3 flex items-start">
                {[
                  ['Registrada', item.created_at ? formatarData(item.created_at) : 'Data não informada'],
                  ['Em Análise / Oficiada', item.updated_at ? formatarData(item.updated_at) : 'Aguardando tramitação'],
                  ['Resolvida', eResolvida(item) ? formatarData(item.updated_at || item.created_at) : 'Pendente']
                ].map(([titulo, data], index) => {
                  const etapaAtual = etapaStatus(item)
                  const concluida = index + 1 <= etapaAtual
                  return (
                    <div key={titulo} className="flex flex-1 items-start">
                      <div className="flex min-w-0 flex-col items-center text-center">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                          concluida ? 'bg-slate-800 text-white' : 'border border-slate-300 bg-white text-slate-400'
                        }`}>
                          {concluida ? '✓' : index + 1}
                        </span>
                        <span className="mt-1 text-[9px] font-black text-slate-600">{titulo}</span>
                        <span className="mt-0.5 text-[9px] text-slate-400">{data}</span>
                      </div>
                      {index < 2 && <span className={`mt-3 h-0.5 flex-1 ${index + 1 < etapaAtual ? 'bg-slate-800' : 'bg-slate-200'}`} />}
                    </div>
                  )
                })}
              </div>
              {item.observacoes && (
                <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] leading-relaxed text-slate-600">
                  <strong>Despacho:</strong> {item.observacoes}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setTramitacaoAberta(tramitacaoAberta === item.id ? null : item.id)
                  setDespachoPorId((atuais) => ({ ...atuais, [item.id]: atuais[item.id] ?? item.observacoes ?? '' }))
                }}
                className="mt-3 text-[10px] font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                📋 {tramitacaoAberta === item.id ? 'Fechar Tramitação / Despacho' : 'Adicionar Tramitação / Despacho'}
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
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                  >
                    {acaoEmAndamento === `despacho-${item.id}` && <Spinner />}
                    {acaoEmAndamento === `despacho-${item.id}` ? 'Salvando...' : 'Salvar Despacho'}
                  </button>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={carregandoAcao}
                onClick={() => alterarStatusOcorrencia(item.id, 'pendente')}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
              >
                {acaoEmAndamento === `status-${item.id}` && <Spinner />} Pendente
              </button>
              <button
                type="button"
                disabled={carregandoAcao}
                onClick={() => alterarStatusOcorrencia(item.id, 'em_analise')}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
              >
                {acaoEmAndamento === `status-${item.id}` && <Spinner />} Em Análise
              </button>
              <button
                type="button"
                disabled={carregandoAcao}
                onClick={() => {
                  setItemResolucao({ id: item.id, foto: null })
                  setFotoResolucaoPorId((atuais) => ({ ...atuais, [item.id]: null }))
                }}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                ✓ Resolvido
              </button>
              <button
                type="button"
                onClick={() => setItemEdicao({ ...item, status: normalizarEstado(item.status) })}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
              >
                ✏️ Editar
              </button>
              <button
                type="button"
                disabled={carregandoAcao}
                onClick={() => setItemExclusao(item)}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                🗑️ Excluir
              </button>
            </div>

          </div>
        ))
      )}
    </div>
    </>
  )
}
