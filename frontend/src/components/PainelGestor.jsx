import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function PainelGestor() {
  const [autenticado, setAutenticado] = useState(false)
  const [pin, setPin] = useState('')
  const [erroPin, setErroPin] = useState(false)

  const [ocorrencias, setOcorrencias] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [termoBusca, setTermoBusca] = useState('')
  const [atualizandoId, setAtualizandoId] = useState(null)

  // PIN de acesso local ao painel administrativo
  const PIN_CORRETO = '2026'

  useEffect(() => {
    const authSalva = sessionStorage.getItem('zelador_gestor_auth')
    if (authSalva === 'true') {
      setAutenticado(true)
      carregarOcorrencias()
    }
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    if (pin === PIN_CORRETO) {
      setAutenticado(true)
      setErroPin(false)
      sessionStorage.setItem('zelador_gestor_auth', 'true')
      carregarOcorrencias()
    } else {
      setErroPin(true)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('zelador_gestor_auth')
    setAutenticado(false)
    setPin('')
  }

  const carregarOcorrencias = async () => {
    try {
      setCarregando(true)
      const { data, error } = await supabase
        .from('ocorrencias_georreferenciadas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOcorrencias(data || [])
    } catch (err) {
      console.error('Erro ao carregar chamados no painel:', err.message)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarStatus = async (id, novoStatus) => {
    try {
      setAtualizandoId(id)
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error

      setOcorrencias((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: novoStatus } : item))
      )
    } catch (err) {
      alert(`Erro ao atualizar estado: ${err.message}`)
    } finally {
      setAtualizandoId(null)
    }
  }

  // Exportação formatada para CSV
  const exportarCSV = () => {
    if (ocorrenciasFiltradas.length === 0) {
      alert('Nenhum dado disponível para exportar.')
      return
    }

    const colunas = ['ID', 'Data', 'Categoria', 'Descricao', 'Status', 'Latitude', 'Longitude', 'Foto_URL']
    const linhas = ocorrenciasFiltradas.map((o) => [
      o.id,
      o.created_at ? new Date(o.created_at).toLocaleString('pt-BR') : '',
      `"${o.categoria || ''}"`,
      `"${(o.descricao || '').replace(/"/g, '""')}"`,
      o.status || 'pendente',
      o.latitude || '',
      o.longitude || '',
      `"${o.foto_url || ''}"`
    ])

    const conteudoCSV = [colunas.join(','), ...linhas.map((l) => l.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + conteudoCSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `zelador_digital_relatorio_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const imprimirRelatorio = () => {
    window.print()
  }

  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((item) => {
      const bateuStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'resolvido' && (item.status === 'resolvido' || item.status === 'concluido')) ||
        (filtroStatus === 'pendente' && item.status !== 'resolvido' && item.status !== 'concluido')

      const bateuCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria

      const bateuTexto =
        !termoBusca.trim() ||
        (item.descricao && item.descricao.toLowerCase().includes(termoBusca.toLowerCase())) ||
        (item.categoria && item.categoria.toLowerCase().includes(termoBusca.toLowerCase()))

      return bateuStatus && bateuCategoria && bateuTexto
    })
  }, [ocorrencias, filtroStatus, filtroCategoria, termoBusca])

  // Contadores por categoria
  const contadores = useMemo(() => {
    const total = ocorrencias.length
    const lixo = ocorrencias.filter((o) => o.categoria === 'lixo').length
    const iluminacao = ocorrencias.filter((o) => o.categoria === 'iluminacao').length
    const buraco = ocorrencias.filter((o) => o.categoria === 'buraco').length
    const esgoto = ocorrencias.filter((o) => o.categoria === 'esgoto').length
    return { total, lixo, iluminacao, buraco, esgoto }
  }, [ocorrencias])

  if (!autenticado) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-sm mx-auto text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl mx-auto shadow-sm">
          🔒
        </div>
        <div>
          <h2 className="text-base font-black text-slate-800">Painel de Gestão Territorial</h2>
          <p className="text-xs text-slate-500 mt-1">Acesso administrativo restrito à triagem de chamados.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            maxLength={4}
            placeholder="Digite o PIN (ex: 2026)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full text-center tracking-widest text-lg font-black py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          {erroPin && (
            <p className="text-xs text-rose-600 font-bold">PIN incorreto. Tente novamente.</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Entrar no Painel →
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
      {/* Cabeçalho do Painel */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">⚙️</span>
            <h2 className="text-base font-black text-slate-800">Gestão de Ocorrências</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Triagem, auditoria e atualização de status</p>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-rose-600 font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50"
        >
          Sair
        </button>
      </div>

      {/* Cartões Rápidos de Demanda por Tipologia */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
          <span className="text-lg block">🗑️</span>
          <span className="text-sm font-black text-amber-800 leading-none">{contadores.lixo}</span>
          <span className="text-[9px] font-bold text-amber-600 block mt-0.5">Lixo</span>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-2.5">
          <span className="text-lg block">💡</span>
          <span className="text-sm font-black text-indigo-800 leading-none">{contadores.iluminacao}</span>
          <span className="text-[9px] font-bold text-indigo-600 block mt-0.5">Postes</span>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-2.5">
          <span className="text-lg block">🕳️</span>
          <span className="text-sm font-black text-orange-800 leading-none">{contadores.buraco}</span>
          <span className="text-[9px] font-bold text-orange-600 block mt-0.5">Buracos</span>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-2.5">
          <span className="text-lg block">💧</span>
          <span className="text-sm font-black text-sky-800 leading-none">{contadores.esgoto}</span>
          <span className="text-[9px] font-bold text-sky-600 block mt-0.5">Esgoto</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Pesquisar chamado por descrição..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex space-x-1.5 shrink-0">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-[11px] font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
            >
              <option value="todos">Status: Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="resolvido">Resolvidos</option>
            </select>

            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="text-[11px] font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700"
            >
              <option value="todas">Tipologia: Todas</option>
              <option value="lixo">Lixo</option>
              <option value="iluminacao">Iluminação</option>
              <option value="buraco">Buraco</option>
              <option value="esgoto">Esgoto</option>
            </select>
          </div>

          <div className="flex space-x-1.5 shrink-0">
            <button
              onClick={exportarCSV}
              className="text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs"
            >
              <span>📥</span>
              <span>CSV</span>
            </button>
            <button
              onClick={imprimirRelatorio}
              className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-all border border-slate-200"
            >
              🖨️ PDF
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Gestão e Atualização de Status */}
      {carregando ? (
        <div className="py-16 text-center text-xs text-slate-400">A carregar registos...</div>
      ) : ocorrenciasFiltradas.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 font-bold">Nenhum chamado localizado.</div>
      ) : (
        <div className="space-y-3">
          {ocorrenciasFiltradas.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-xs capitalize text-slate-800">{item.categoria}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{item.id} — {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{item.descricao}</p>
                </div>

                {item.foto_url && (
                  <img
                    src={item.foto_url}
                    alt="Foto do chamado"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                  />
                )}
              </div>

              {/* Botões de Ação para o Gestor */}
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alterar Estado:</span>
                <div className="flex space-x-1.5">
                  <button
                    disabled={atualizandoId === item.id}
                    onClick={() => atualizarStatus(item.id, 'pendente')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                      item.status !== 'resolvido' && item.status !== 'concluido'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Pendente
                  </button>
                  <button
                    disabled={atualizandoId === item.id}
                    onClick={() => atualizarStatus(item.id, 'resolvido')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                      item.status === 'resolvido' || item.status === 'concluido'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Resolvido ✓
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}