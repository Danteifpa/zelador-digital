import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts'

// Senha mestra configurada para a moderação comunitária
const PIN_GESTOR = '2026'

const CORES_CATEGORIAS = {
  lixo: '#f59e0b',
  iluminacao: '#6366f1',
  buraco: '#ea580c',
  esgoto: '#0284c7'
}

const normalizarCategoria = (cat) => {
  if (!cat) return 'outros'
  const c = cat.toLowerCase()
  if (c.includes('lixo') || c.includes('entulho')) return 'lixo'
  if (c.includes('ilumina') || c.includes('poste') || c.includes('luz')) return 'iluminacao'
  if (c.includes('buraco') || c.includes('via') || c.includes('asfalto')) return 'buraco'
  if (c.includes('esgoto') || c.includes('agua') || c.includes('vazamento')) return 'esgoto'
  return 'outros'
}

const CONFIG_CATEGORIAS = {
  lixo: {
    nome: 'Lixo / Entulho',
    icone: '🗑️',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    borda: 'border-l-amber-500'
  },
  iluminacao: {
    nome: 'Iluminação Pública',
    icone: '💡',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borda: 'border-l-indigo-500'
  },
  buraco: {
    nome: 'Vias / Buracos',
    icone: '🕳️',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    borda: 'border-l-orange-500'
  },
  esgoto: {
    nome: 'Esgoto / Água',
    icone: '💧',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    borda: 'border-l-sky-500'
  },
  outros: {
    nome: 'Outros',
    icone: '📍',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    borda: 'border-l-slate-400'
  }
}

const ROTULOS_STATUS = {
  pendente: { nome: 'Pendente', cor: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  em_analise: { nome: 'Em Análise', cor: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  resolvido: { nome: 'Resolvido', cor: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' }
}

export default function PainelGestor() {
  const [autenticado, setAutenticado] = useState(false)
  const [pinEntrada, setPinEntrada] = useState('')
  const [erroPin, setErroPin] = useState(false)

  const [ocorrencias, setOcorrencias] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [fotoModal, setFotoModal] = useState(null)

  // Recupera o estado de sessão já validado nesta aba
  useEffect(() => {
    const authSalva = sessionStorage.getItem('zelador_gestor_autenticado')
    if (authSalva === 'true') {
      setAutenticado(true)
    }
  }, [])

  useEffect(() => {
    if (autenticado) {
      carregarDados()
    }
  }, [autenticado])

  const validarPin = (e) => {
    e.preventDefault()
    if (pinEntrada.trim() === PIN_GESTOR) {
      setAutenticado(true)
      setErroPin(false)
      sessionStorage.setItem('zelador_gestor_autenticado', 'true')
    } else {
      setErroPin(true)
      setPinEntrada('')
    }
  }

  const sairGestao = () => {
    sessionStorage.removeItem('zelador_gestor_autenticado')
    setAutenticado(false)
    setPinEntrada('')
    setErroPin(false)
  }

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const { data, error } = await supabase
        .from('ocorrencias_georreferenciadas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOcorrencias(data || [])
    } catch (err) {
      console.error('Erro ao buscar dados:', err.message)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarStatus = async (id, novoStatus) => {
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error
      setOcorrencias((prev) =>
        prev.map((oc) => (oc.id === id ? { ...oc, status: novoStatus } : oc))
      )
    } catch (err) {
      alert('Erro ao atualizar status: ' + err.message)
    }
  }

  const eliminarRegisto = async (id) => {
    if (!window.confirm('Confirma a eliminação deste ponto territorial?')) return

    try {
      const { error } = await supabase.from('ocorrencias').delete().eq('id', id)
      if (error) throw error
      setOcorrencias((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      alert('Erro ao eliminar ocorrência: ' + err.message)
    }
  }

  const exportarCSV = () => {
    if (ocorrencias.length === 0) {
      alert('Não há dados disponíveis para exportar.')
      return
    }

    const cabecalho = ['ID', 'Categoria', 'Descricao', 'Latitude', 'Longitude', 'Status', 'Data_Hora']
    const linhas = filtradas.map((o) => [
      o.id,
      `"${CONFIG_CATEGORIAS[normalizarCategoria(o.categoria)]?.nome || o.categoria}"`,
      `"${(o.descricao || '').replace(/"/g, '""')}"`,
      o.latitude ?? '',
      o.longitude ?? '',
      o.status || 'pendente',
      o.created_at || ''
    ])

    const csvContent = [cabecalho.join(','), ...linhas.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `dossie_territorial_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const gerarDossieTerritorial = () => {
    window.print()
  }

  // ===================== TELA DE BLOQUEIO POR SENHA (PIN) =====================
  if (!autenticado) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-md text-center space-y-6">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
          🔒
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Acesso Restrito ao Gestor</h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Insira o PIN de moderação para gerir ocorrências e emitir relatórios territoriais.
          </p>
        </div>

        <form onSubmit={validarPin} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              placeholder="Digite o PIN de acesso"
              value={pinEntrada}
              onChange={(e) => {
                setPinEntrada(e.target.value)
                setErroPin(false)
              }}
              className="w-full text-center tracking-widest text-lg font-bold py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
              autoFocus
            />
            {erroPin && (
              <p className="text-xs font-semibold text-rose-600 mt-2">
                PIN incorreto. Tente novamente.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Aceder ao Painel
          </button>
        </form>
      </div>
    )
  }

  // ===================== CONTEÚDO AUTENTICADO =====================
  const filtradas = ocorrencias.filter((item) => {
    const catNormalizada = normalizarCategoria(item.categoria)
    const atendeCategoria = filtroCategoria === 'todas' || catNormalizada === filtroCategoria
    const atendeStatus = filtroStatus === 'todos' || (item.status || 'pendente') === filtroStatus
    return atendeCategoria && atendeStatus
  })

  const total = ocorrencias.length
  const resolvidos = ocorrencias.filter((o) => o.status === 'resolvido').length
  const pendentes = ocorrencias.filter((o) => o.status === 'pendente' || !o.status).length
  const emAnalise = ocorrencias.filter((o) => o.status === 'em_analise').length
  const taxaResolucao = total > 0 ? ((resolvidos / total) * 100).toFixed(1) : 0

  const contagemCategorias = ocorrencias.reduce((acc, curr) => {
    const chave = normalizarCategoria(curr.categoria)
    acc[chave] = (acc[chave] || 0) + 1
    return acc
  }, {})

  const dadosGraficoCategorias = Object.keys(contagemCategorias).map((cat) => ({
    chave: cat,
    nome: CONFIG_CATEGORIAS[cat]?.nome || cat,
    total: contagemCategorias[cat],
    cor: CORES_CATEGORIAS[cat] || '#64748b'
  }))

  const dadosGraficoStatus = [
    { nome: 'Pendentes', valor: pendentes, cor: '#f59e0b' },
    { nome: 'Em Análise', valor: emAnalise, cor: '#3b82f6' },
    { nome: 'Resolvidos', valor: resolvidos, cor: '#10b981' }
  ].filter((item) => item.valor > 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-6 print:p-0 print:space-y-4 print:max-w-full">
      {/* Modal de Zoom de Imagem */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setFotoModal(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white rounded-full p-2 text-sm z-10 transition-all"
            >
              ✕
            </button>
            <img src={fotoModal} alt="Evidência ampliada" className="w-full h-auto max-h-[85vh] object-contain" />
          </div>
        </div>
      )}

      {/* Cabeçalho de Impressão */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Zelador Digital Comunitário
            </h1>
            <p className="text-sm font-semibold text-slate-700">
              Relatório de Diagnóstico Urbano Territorial e Gestão Comunitária
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600 font-mono space-y-0.5">
            <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Projetado por:</strong> Dante Dias Monteiro</p>
            <p><strong>Projeção:</strong> EPSG:4326 (WGS84)</p>
          </div>
        </div>
      </div>

      {/* Barra de Ações Superior */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Painel de Gestão e Moderação</h2>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Sincronizado
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controlo de demandas comunitárias, dossiê em PDF e diagnóstico espacial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={carregarDados}
            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Atualizar dados"
          >
            🔄
          </button>
          <button
            onClick={gerarDossieTerritorial}
            className="px-4 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
          >
            <span>📄 Gerar Dossiê PDF</span>
          </button>
          <button
            onClick={exportarCSV}
            className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
          >
            <span>📥 Exportar CSV (SIG)</span>
          </button>
          <button
            onClick={sairGestao}
            className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all"
            title="Sair da Gestão (Bloquear)"
          >
            🔒
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all print:p-3 print:border-slate-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Total de Registos</p>
          <p className="text-3xl font-black text-slate-800 mt-1 print:text-lg">{total}</p>
          <span className="text-[11px] text-slate-500 print:text-[9px]">Amostragem no setor</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-200 transition-all print:p-3 print:border-slate-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Pendentes / Em Análise</p>
          <p className="text-3xl font-black text-amber-600 mt-1 print:text-lg">{pendentes + emAnalise}</p>
          <span className="text-[11px] text-amber-600 font-medium print:text-[9px]">Pontos ativos</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-200 transition-all print:p-3 print:border-slate-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Demandas Resolvidas</p>
          <p className="text-3xl font-black text-emerald-600 mt-1 print:text-lg">{resolvidos}</p>
          <span className="text-[11px] text-emerald-600 font-medium print:text-[9px]">Pontos solucionados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-200 transition-all print:p-3 print:border-slate-300 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Taxa de Resolução</p>
            <p className="text-3xl font-black text-blue-600 mt-1 print:text-lg">{taxaResolucao}%</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden print:hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Number(taxaResolucao), 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tipologias Urbanas */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 print:border-slate-300 print:p-3 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 print:text-xs">
          Síntese de Tipologias Urbanas Identificadas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          {Object.entries(CONFIG_CATEGORIAS).filter(([k]) => k !== 'outros').map(([chave, cfg]) => {
            const qtd = contagemCategorias[chave] || 0
            const pct = total > 0 ? ((qtd / total) * 100).toFixed(1) : 0
            return (
              <div
                key={chave}
                className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors print:p-2 print:border-slate-300"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm">{cfg.icone}</span>
                  <p className="text-xs font-semibold text-slate-700 print:text-[10px]">{cfg.nome}</p>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-1 print:text-base">{qtd}</p>
                <span className="text-[10px] text-slate-400 font-medium">{pct}% da carga local</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Concentração por Tipologia Urbana</h3>
          <p className="text-xs text-slate-500 mb-4">Volume total identificado pela comunidade</p>
          <div className="h-60 w-full">
            {dadosGraficoCategorias.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem registos para análise estatística.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoCategorias} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nome" type="category" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val} ocorrências`, 'Total']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                    {dadosGraficoCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Ciclo de Resolução das Demandas</h3>
          <p className="text-xs text-slate-500 mb-4">Proporção entre pendências e resoluções</p>
          <div className="h-60 w-full">
            {dadosGraficoStatus.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem dados de status.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGraficoStatus}
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {dadosGraficoStatus.map((entry, index) => (
                      <Cell key={`status-cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`${val} ocorrências`, 'Total']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden shadow-xs">
        <div className="text-xs font-bold text-slate-700">
          <span>🔍 Filtrar Exibição:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="em_analise">Em Análise</option>
            <option value="resolvido">Resolvidos</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="lixo">Lixo / Entulho</option>
            <option value="iluminacao">Iluminação Pública</option>
            <option value="buraco">Vias / Buracos</option>
            <option value="esgoto">Esgoto / Água</option>
          </select>
        </div>
      </div>

      {/* Lista de Registos */}
      {carregando ? (
        <div className="py-16 text-center text-sm text-slate-500">A carregar registos espaciais...</div>
      ) : filtradas.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">Nenhuma ocorrência encontrada.</div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((item) => {
            const catNormal = normalizarCategoria(item.categoria)
            const cfg = CONFIG_CATEGORIAS[catNormal] || CONFIG_CATEGORIAS.outros
            const stCfg = ROTULOS_STATUS[item.status] || ROTULOS_STATUS.pendente

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border border-slate-200/90 border-l-4 ${cfg.borda} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 print:border-slate-300 print:p-3 print:hover:translate-y-0`}
              >
                <div className="flex items-start space-x-3.5">
                  {item.foto_url ? (
                    <button
                      onClick={() => setFotoModal(item.foto_url)}
                      className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-zoom-in"
                      title="Clique para ampliar"
                    >
                      <img
                        src={item.foto_url}
                        alt="Comprovativo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs">🔍</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                      {cfg.icone}
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>
                        <span>{cfg.icone}</span>
                        <span>{cfg.nome}</span>
                      </span>

                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stCfg.cor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`}></span>
                        <span>{stCfg.nome}</span>
                      </span>

                      <span className="text-[11px] text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium mt-1.5 max-w-lg leading-relaxed">
                      {item.descricao || 'Sem descrição registada'}
                    </p>

                    <div className="flex items-center space-x-3 mt-2 text-[11px]">
                      {item.latitude != null && item.longitude != null ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 font-mono text-[10.5px]"
                        >
                          <span>📍</span>
                          <span>{Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">Sem coordenadas GPS</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 print:hidden">
                  <select
                    value={item.status || 'pendente'}
                    onChange={(e) => atualizarStatus(item.id, e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="resolvido">Resolvido</option>
                  </select>

                  <button
                    onClick={() => eliminarRegisto(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Eliminar ocorrência"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nota Técnica de Impressão */}
      <div className="hidden print:block pt-4 border-t border-slate-300 text-[10px] text-slate-600 space-y-1">
        <p>
          <strong>Finalidade Técnica:</strong> Relatório territorial para estudos urbanos e diagnóstico comunitário independente.
        </p>
      </div>
    </div>
  )
}