import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PainelGestor({ ocorrencias = [], onAtualizarDados }) {
  const [autenticado, setAutenticado] = useState(false)
  const [pinEntrada, setPinEntrada] = useState('')
  const [erroPin, setErroPin] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [termoBusca, setTermoBusca] = useState('')
  const [itemEdicao, setItemEdicao] = useState(null)
  const [carregandoAcao, setCarregandoAcao] = useState(false)

  // PIN de acesso para o gestor comunitário
  const PIN_MESTRE = '2026'

  const verificarAcesso = (e) => {
    e.preventDefault()
    if (pinEntrada === PIN_MESTRE) {
      setAutenticado(true)
      setErroPin(false)
    } else {
      setErroPin(true)
      setPinEntrada('')
    }
  }

  const alterarStatusOcorrencia = async (id, novoStatus) => {
    setCarregandoAcao(true)
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error
      if (onAtualizarDados) await onAtualizarDados()
    } catch (err) {
      alert('Erro ao atualizar estado: ' + err.message)
    } finally {
      setCarregandoAcao(false)
    }
  }

  const eliminarOcorrencia = async (id) => {
    const confirmar = window.confirm('Deseja realmente eliminar permanentemente este registo?')
    if (!confirmar) return

    setCarregandoAcao(true)
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .delete()
        .eq('id', id)

      if (error) throw error
      if (onAtualizarDados) await onAtualizarDados()
    } catch (err) {
      alert('Erro ao eliminar ocorrência: ' + err.message)
    } finally {
      setCarregandoAcao(false)
    }
  }

  const salvarEdicao = async (e) => {
    e.preventDefault()
    if (!itemEdicao) return

    setCarregandoAcao(true)
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({
          descricao: itemEdicao.descricao,
          categoria: itemEdicao.categoria,
          status: itemEdicao.status
        })
        .eq('id', itemEdicao.id)

      if (error) throw error
      setItemEdicao(null)
      if (onAtualizarDados) await onAtualizarDados()
    } catch (err) {
      alert('Erro ao guardar alterações: ' + err.message)
    } finally {
      setCarregandoAcao(false)
    }
  }

  const ocorrenciasFiltradas = ocorrencias.filter((item) => {
    const bateuStatus = filtroStatus === 'todos' || item.status === filtroStatus
    const busca = termoBusca.toLowerCase()
    const bateuTexto =
      (item.descricao || '').toLowerCase().includes(busca) ||
      (item.categoria || '').toLowerCase().includes(busca) ||
      (item.id || '').toString().includes(busca)
    return bateuStatus && bateuTexto
  })

  // Ecrã de Bloqueio por PIN
  if (!autenticado) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-sm mx-auto my-6 text-center">
        <div className="w-14 h-14 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
          🔐
        </div>
        <h2 className="text-lg font-black text-slate-800">Painel de Gestão</h2>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          Introduza o PIN de acesso para gerir, editar e eliminar ocorrências comunitárias.
        </p>

        <form onSubmit={verificarAcesso} className="space-y-4">
          <input
            type="password"
            maxLength={6}
            placeholder="PIN de acesso (Padrão: 2026)"
            value={pinEntrada}
            onChange={(e) => setPinEntrada(e.target.value)}
            className="w-full text-center tracking-widest text-lg font-black py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          />

          {erroPin && (
            <p className="text-xs text-rose-600 font-bold">
              PIN incorreto. Tente novamente.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
          >
            Aceder ao Painel
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Topo do Gestor */}
      <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-3xl shadow-sm">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Administração Comunitária</span>
          <h2 className="text-base font-black">Gestão de Ocorrências</h2>
        </div>
        <button
          type="button"
          onClick={() => setAutenticado(false)}
          className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          Bloquear 🔒
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Filtrar por descrição ou categoria..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
        />

        <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
          {['todos', 'pendente', 'em analise', 'resolvido'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFiltroStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all shrink-0 cursor-pointer ${
                filtroStatus === status
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Formulário de Edição */}
      {itemEdicao && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900">Editar Registo #{itemEdicao.id}</span>
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
                value={itemEdicao.status || 'pendente'}
                onChange={(e) => setItemEdicao({ ...itemEdicao, status: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="pendente">Pendente</option>
                <option value="em analise">Em Análise</option>
                <option value="resolvido">Resolvido</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={carregandoAcao}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
            >
              {carregandoAcao ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de Ocorrências com Ações Diretas */}
      <div className="space-y-3">
        {ocorrenciasFiltradas.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-400">
            Nenhum registo encontrado para este filtro.
          </div>
        ) : (
          ocorrenciasFiltradas.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black capitalize text-slate-800">
                    {item.categoria}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    item.status === 'resolvido'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'em analise'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.status || 'Pendente'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>

              {item.foto_url && (
                <img
                  src={item.foto_url}
                  alt="Registo"
                  className="w-full h-32 object-cover rounded-xl border border-slate-100"
                />
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                {item.descricao || 'Sem descrição registada.'}
              </p>

              {/* Botões de Ação */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={carregandoAcao}
                  onClick={() => alterarStatusOcorrencia(item.id, 'pendente')}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                >
                  Pendente
                </button>
                <button
                  type="button"
                  disabled={carregandoAcao}
                  onClick={() => alterarStatusOcorrencia(item.id, 'em analise')}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                >
                  Em Análise
                </button>
                <button
                  type="button"
                  disabled={carregandoAcao}
                  onClick={() => alterarStatusOcorrencia(item.id, 'resolvido')}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                >
                  ✓ Resolvido
                </button>
                <button
                  type="button"
                  onClick={() => setItemEdicao({ ...item, status: item.status || 'pendente' })}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  disabled={carregandoAcao}
                  onClick={() => eliminarOcorrencia(item.id)}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}