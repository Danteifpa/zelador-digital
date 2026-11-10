import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_RESOLVIDOS = ['resolvido', 'concluido']
const RAIO_RECURRENCIA_METROS = 500

function eResolvida(item) {
  return STATUS_RESOLVIDOS.includes(item.status)
}

function distanciaMetros(a, b) {
  if ([a.latitude, a.longitude, b.latitude, b.longitude].some((value) => typeof value !== 'number')) return Infinity
  const raioTerra = 6371000
  const latitudeA = (a.latitude * Math.PI) / 180
  const latitudeB = (b.latitude * Math.PI) / 180
  const deltaLatitude = ((b.latitude - a.latitude) * Math.PI) / 180
  const deltaLongitude = ((b.longitude - a.longitude) * Math.PI) / 180
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2
  return 2 * raioTerra * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function formatarData(data, incluirHora = false) {
  if (!data) return 'Não informado'
  return new Date(data).toLocaleString('pt-BR', incluirHora ? undefined : { dateStyle: 'short' })
}

function escapeCsv(valor) {
  return `"${String(valor ?? '').replaceAll('"', '""')}"`
}

export default function PainelGestor({ ocorrencias = [], onAtualizarDados }) {
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem('gestao_autenticada') === 'true')
  const [pinEntrada, setPinEntrada] = useState('')
  const [erroPin, setErroPin] = useState(false)
  const [tentativasPin, setTentativasPin] = useState(0)
  const [bloqueadoAte, setBloqueadoAte] = useState(0)
  const [agora, setAgora] = useState(() => Date.now())
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [termoBusca, setTermoBusca] = useState('')
  const [itemEdicao, setItemEdicao] = useState(null)
  const [itemExclusao, setItemExclusao] = useState(null)
  const [mostrarOficio, setMostrarOficio] = useState(false)
  const [selecionadasOficio, setSelecionadasOficio] = useState([])
  const [carregandoAcao, setCarregandoAcao] = useState(false)

  // PIN de acesso para o gestor comunitário
  const PIN_MESTRE = '2026'
  const bloqueioAtivo = bloqueadoAte > agora
  const segundosBloqueio = Math.max(0, Math.ceil((bloqueadoAte - agora) / 1000))

  useEffect(() => {
    if (!bloqueioAtivo) return undefined
    const timer = window.setInterval(() => setAgora(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [bloqueioAtivo])

  const verificarAcesso = (e) => {
    e.preventDefault()
    if (bloqueioAtivo) return
    const tentativasAtuais = bloqueadoAte ? 0 : tentativasPin
    if (bloqueadoAte) setBloqueadoAte(0)

    if (pinEntrada === PIN_MESTRE) {
      setAutenticado(true)
      sessionStorage.setItem('gestao_autenticada', 'true')
      setErroPin(false)
      setTentativasPin(0)
      setPinEntrada('')
    } else {
      const novasTentativas = tentativasAtuais + 1
      setTentativasPin(novasTentativas)
      setPinEntrada('')
      setErroPin(true)
      if (novasTentativas >= 3) {
        setBloqueadoAte(Date.now() + 60 * 1000)
      }
    }
  }

  const encerrarSessao = () => {
    sessionStorage.removeItem('gestao_autenticada')
    setAutenticado(false)
    setPinEntrada('')
    setErroPin(false)
    setTentativasPin(0)
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

  const eliminarOcorrencia = async () => {
    if (!itemExclusao) return
    setCarregandoAcao(true)
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .delete()
        .eq('id', itemExclusao.id)

      if (error) throw error
      setItemExclusao(null)
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

  const metricas = useMemo(() => {
    const resolvidas = ocorrencias.filter(eResolvida).length
    const emAnalise = ocorrencias.filter((item) => item.status === 'em analise').length
    const pendentes = ocorrencias.filter((item) => !item.status || item.status === 'pendente').length
    const resolvidasComData = ocorrencias.filter((item) => eResolvida(item) && item.created_at && (item.resolved_at || item.updated_at))
    const tempoMedioDias = resolvidasComData.length
      ? resolvidasComData.reduce((total, item) => {
          const dataResolucao = item.resolved_at || item.updated_at
          return total + Math.max(0, new Date(dataResolucao) - new Date(item.created_at)) / 86400000
        }, 0) / resolvidasComData.length
      : null
    const registrosComCoordenadas = ocorrencias.filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
    const recorrentes = registrosComCoordenadas.filter((item, index, lista) =>
      lista.some((outro, outroIndex) => index !== outroIndex && distanciaMetros(item, outro) <= RAIO_RECURRENCIA_METROS)
    ).length
    return {
      total: ocorrencias.length,
      pendentes,
      emAnalise,
      resolvidas,
      percentualResolucao: ocorrencias.length ? Math.round((resolvidas / ocorrencias.length) * 100) : 0,
      tempoMedioDias,
      indiceRecorrencia: registrosComCoordenadas.length ? Math.round((recorrentes / registrosComCoordenadas.length) * 100) : 0,
      resolvidasComData: resolvidasComData.length
    }
  }, [ocorrencias])

  const analiseCategorias = useMemo(() => {
    const contagem = ocorrencias.reduce((resultado, item) => {
      const categoria = item.categoria || 'Não classificado'
      resultado[categoria] = (resultado[categoria] || 0) + 1
      return resultado
    }, {})
    return Object.entries(contagem).sort(([, a], [, b]) => b - a)
  }, [ocorrencias])

  const analiseTemporal = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return Array.from({ length: 4 }, (_, indice) => {
      const inicio = new Date(hoje)
      inicio.setDate(hoje.getDate() - (3 - indice) * 7 - 6)
      const fim = new Date(hoje)
      fim.setDate(hoje.getDate() - (3 - indice) * 7 + 1)
      const quantidade = ocorrencias.filter((item) => {
        const data = new Date(item.created_at)
        return data >= inicio && data < fim
      }).length
      return { label: `${inicio.getDate().toString().padStart(2, '0')}/${(inicio.getMonth() + 1).toString().padStart(2, '0')}`, quantidade }
    })
  }, [ocorrencias])

  const pendentes = useMemo(() => ocorrencias.filter((item) => !eResolvida(item)), [ocorrencias])
  const pendentesSelecionadas = pendentes.filter((item) => selecionadasOficio.includes(item.id))
  const maxCategoria = Math.max(1, ...analiseCategorias.map(([, quantidade]) => quantidade))
  const maxTemporal = Math.max(1, ...analiseTemporal.map((item) => item.quantidade))

  const alternarSelecaoOficio = (id) => {
    setSelecionadasOficio((atuais) => atuais.includes(id) ? atuais.filter((itemId) => itemId !== id) : [...atuais, id])
  }

  const exportarCsv = () => {
    const colunas = ['id', 'categoria', 'status', 'descricao', 'latitude', 'longitude', 'created_at', 'updated_at']
    const linhas = ocorrencias.map((item) => colunas.map((coluna) => escapeCsv(item[coluna])).join(','))
    const csv = `\uFEFF${colunas.join(',')}\n${linhas.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `zelador-digital-ocorrencias-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const abrirOficio = () => {
    setSelecionadasOficio((atuais) => atuais.filter((id) => pendentes.some((item) => item.id === id)))
    setMostrarOficio(true)
  }

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
            disabled={bloqueioAtivo}
            className="w-full text-center tracking-widest text-lg font-black py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          />

          {bloqueioAtivo ? (
            <p className="text-xs text-rose-600 font-bold">
              Muitas tentativas. Novo acesso disponível em {segundosBloqueio}s.
            </p>
          ) : erroPin && (
            <p className="text-xs text-rose-600 font-bold">
              PIN incorreto. Tentativa {tentativasPin} de 3.
            </p>
          )}

          <button
            type="submit"
            disabled={bloqueioAtivo}
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
          onClick={encerrarSessao}
          className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          Encerrar Sessão 🔒
        </button>
      </div>

      {/* Métricas */}
      <section className="bg-slate-900 rounded-3xl p-3.5 text-white shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total Geral', value: metricas.total, tone: 'text-white' },
            { label: 'Pendentes', value: metricas.pendentes, tone: 'text-amber-300' },
            { label: 'Em Análise', value: metricas.emAnalise, tone: 'text-sky-300' },
            { label: 'Resolvidas', value: metricas.resolvidas, tone: 'text-emerald-300' }
          ].map((metrica) => (
            <div key={metrica.label} className="rounded-2xl bg-slate-800/80 border border-slate-700 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{metrica.label}</p>
              <p className={`text-xl font-black mt-1 ${metrica.tone}`}>{metrica.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
            <span>Taxa de resolução</span>
            <span>{metricas.percentualResolucao}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden" aria-label={`${metricas.percentualResolucao}% de resolução`}>
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${metricas.percentualResolucao}%` }} />
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={abrirOficio}
          className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3 py-2.5 transition-colors cursor-pointer"
        >
          Gerar Ofício de Reivindicação Comunitária
        </button>
        <button
          type="button"
          onClick={exportarCsv}
          className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black px-4 py-2.5 transition-colors cursor-pointer"
        >
          Exportar Base CSV
        </button>
      </div>

      {/* Indicadores técnicos e visualizações */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-black">Tempo médio de resolução</p>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {metricas.tempoMedioDias === null ? '—' : `${metricas.tempoMedioDias.toFixed(1)} dias`}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {metricas.resolvidasComData ? `Baseado em ${metricas.resolvidasComData} registros com data de resolução.` : 'Requer resolved_at ou updated_at nas resolvidas.'}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-black">Índice de recorrência</p>
          <p className="text-2xl font-black text-amber-600 mt-2">{metricas.indiceRecorrencia}%</p>
          <p className="text-[10px] text-slate-500 mt-1">Registros em concentração de até {RAIO_RECURRENCIA_METROS} m de outro ponto.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-black">Taxa de eficácia</p>
          <p className="text-2xl font-black text-emerald-600 mt-2">{metricas.percentualResolucao}%</p>
          <p className="text-[10px] text-slate-500 mt-1">Demandas resolvidas sobre o total registrado.</p>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="bg-slate-900 rounded-3xl p-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black">Distribuição por categoria</h3>
            <span className="text-[10px] text-slate-400">Pareto</span>
          </div>
          <div className="space-y-3">
            {analiseCategorias.length === 0 ? (
              <p className="text-xs text-slate-400">Sem dados categorizados.</p>
            ) : analiseCategorias.map(([categoria, quantidade]) => (
              <div key={categoria}>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="capitalize text-slate-300">{categoria}</span>
                  <span className="text-slate-400">{quantidade}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(quantidade / maxCategoria) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-slate-800">Frequência temporal</h3>
            <span className="text-[10px] text-slate-400">Últimas 4 semanas</span>
          </div>
          <svg viewBox="0 0 320 130" className="w-full h-36" role="img" aria-label="Ocorrências nas últimas quatro semanas">
            <line x1="20" y1="105" x2="305" y2="105" stroke="#cbd5e1" strokeWidth="1" />
            <polyline
              fill="none"
              stroke="#4f46e5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={analiseTemporal.map((item, index) => `${30 + index * 90},${105 - (item.quantidade / maxTemporal) * 80}`).join(' ')}
            />
            {analiseTemporal.map((item, index) => (
              <g key={item.label}>
                <circle cx={30 + index * 90} cy={105 - (item.quantidade / maxTemporal) * 80} r="4" fill="#4f46e5" />
                <text x={30 + index * 90} y="122" textAnchor="middle" fontSize="9" fill="#64748b">{item.label}</text>
                <text x={30 + index * 90} y={95 - (item.quantidade / maxTemporal) * 80} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#334155">{item.quantidade}</text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      {pendentes.length > 0 && (
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
                <span className="text-[11px] text-slate-200"><strong className="capitalize">{item.categoria || 'Não classificado'}</strong> — {item.descricao || 'Sem descrição'}</span>
              </label>
            ))}
          </div>
        </section>
      )}

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
          {[
            ['todos', 'Todos'],
            ['pendente', 'Pendente'],
            ['em analise', 'Em Análise'],
            ['resolvido', 'Resolvido']
          ].map(([status, label]) => (
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
              {label}
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

      {itemExclusao && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 px-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirmar-exclusao-titulo">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 text-white shadow-2xl">
            <h2 id="confirmar-exclusao-titulo" className="text-base font-black">Excluir ocorrência?</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Esta ação removerá permanentemente este registo do Supabase e não pode ser desfeita.
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
      )}

      {mostrarOficio && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-oficio">
          <style>{`@media print { body * { visibility: hidden !important; } .oficio-impressao, .oficio-impressao * { visibility: visible !important; } .oficio-impressao { position: absolute !important; left: 0; top: 0; width: 100%; } }`}</style>
          <div className="oficio-impressao mx-auto max-w-[210mm] bg-white text-slate-900 shadow-2xl print:shadow-none">
            <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white print:hidden">
              <h2 className="text-sm font-black">Pré-visualização do ofício</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold hover:bg-indigo-700 cursor-pointer">Imprimir / PDF</button>
                <button type="button" onClick={() => setMostrarOficio(false)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-800 cursor-pointer">Fechar</button>
              </div>
            </div>
            <article className="min-h-[297mm] p-[16mm] text-[11px] leading-relaxed">
              <header className="border-b-2 border-slate-900 pb-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.2em]">Zelador Digital</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider">Plataforma comunitária de monitoramento urbano</p>
                <h1 id="titulo-oficio" className="mt-5 text-base font-black uppercase">Ofício de Reivindicação Comunitária</h1>
                <p className="mt-2 text-right">Ananindeua - PA, {formatarData(new Date().toISOString())}</p>
              </header>

              <div className="mt-6 space-y-3">
                <p><strong>Às autoridades, órgãos públicos e concessionárias competentes,</strong></p>
                <p>
                  A comunidade de Ananindeua - PA, por meio do Zelador Digital, encaminha o presente ofício para solicitar providências imediatas quanto às demandas de zeladoria urbana listadas abaixo. Os registros foram coletados e georreferenciados por moradores, compondo uma base técnica de acompanhamento do território.
                </p>
                <p>
                  Considerando o histórico de ocorrências levantado e a necessidade de preservar a segurança, a mobilidade e a qualidade de vida da população, solicitamos vistoria, resposta formal e programação de atendimento pelos órgãos ou concessionárias responsáveis.
                </p>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-400 px-2 py-1 text-left">Nº</th>
                      <th className="border border-slate-400 px-2 py-1 text-left">Tipo</th>
                      <th className="border border-slate-400 px-2 py-1 text-left">Endereço / referência aproximada</th>
                      <th className="border border-slate-400 px-2 py-1 text-left">Coordenadas decimais</th>
                      <th className="border border-slate-400 px-2 py-1 text-left">Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentesSelecionadas.length === 0 ? (
                      <tr><td colSpan="5" className="border border-slate-400 px-2 py-4 text-center">Nenhuma demanda pendente selecionada.</td></tr>
                    ) : pendentesSelecionadas.map((item, index) => (
                      <tr key={item.id}>
                        <td className="border border-slate-400 px-2 py-1">{index + 1}</td>
                        <td className="border border-slate-400 px-2 py-1 capitalize">{item.categoria || 'Não classificado'}</td>
                        <td className="border border-slate-400 px-2 py-1">{item.endereco || item.morada || item.bairro || 'Área georreferenciada da comunidade'}</td>
                        <td className="border border-slate-400 px-2 py-1 font-mono">{item.latitude != null && item.longitude != null ? `${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}` : 'Não informado'}</td>
                        <td className="border border-slate-400 px-2 py-1">{formatarData(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-6">
                Sem mais para o momento, aguardamos o encaminhamento das medidas cabíveis e a comunicação do cronograma de atendimento, reafirmando o compromisso da comunidade com a transparência e o monitoramento responsável dos serviços públicos.
              </p>

              <div className="mt-20 grid grid-cols-2 gap-10 text-center">
                <div className="border-t border-slate-700 pt-2">Comissão de moradores</div>
                <div className="border-t border-slate-700 pt-2">Dante Dias Monteiro<br /><span className="text-[9px]">Desenvolvedor do Zelador Digital</span></div>
              </div>
            </article>
          </div>
        </div>
      )}
    </div>
  )
}