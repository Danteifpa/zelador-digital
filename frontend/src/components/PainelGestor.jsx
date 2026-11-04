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

const ROTULOS_CATEGORIAS = {
  lixo: 'Lixo / Entulho',
  iluminacao: 'Iluminação Pública',
  buraco: 'Vias / Buracos',
  esgoto: 'Esgoto / Água',
  outros: 'Outros'
}

const CORES_STATUS = {
  pendente: '#f59e0b',
  em_analise: '#3b82f6',
  resolvido: '#10b981'
}

const ROTULOS_STATUS = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  resolvido: 'Resolvido'
}

export default function PainelGestor() {
  const [ocorrencias, setOcorrencias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  useEffect(() => {
    carregarDados()
  }, [])

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
      console.error('Erro ao buscar dados georreferenciados:', err.message)
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
    if (!window.confirm('Confirma a eliminação deste ponto georreferenciado?')) return

    try {
      const { error } = await supabase.from('ocorrencias').delete().eq('id', id)
      if (error) throw error
      setOcorrencias((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      alert('Erro ao eliminar ocorrência: ' + err.message)
    }
  }

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
    nome: ROTULOS_CATEGORIAS[cat] || cat,
    total: contagemCategorias[cat],
    cor: CORES_CATEGORIAS[cat] || '#64748b'
  }))

  const dadosGraficoStatus = [
    { nome: 'Pendentes', valor: pendentes, cor: CORES_STATUS.pendente },
    { nome: 'Em Análise', valor: emAnalise, cor: CORES_STATUS.em_analise },
    { nome: 'Resolvidos', valor: resolvidos, cor: CORES_STATUS.resolvido }
  ].filter((item) => item.valor > 0)

  const exportarCSV = () => {
    if (ocorrencias.length === 0) {
      alert('Não há dados disponíveis para exportar.')
      return
    }

    const cabecalho = ['ID', 'Categoria', 'Descricao', 'Latitude', 'Longitude', 'Status', 'Data_Hora']
    const linhas = filtradas.map((o) => [
      o.id,
      `"${ROTULOS_CATEGORIAS[normalizarCategoria(o.categoria)] || o.categoria}"`,
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-6 print:p-0 print:space-y-4 print:max-w-full">
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
            <p className="text-xs text-slate-500">
              Recorte Espacial: Residencial Novo Cristo / Icuí — Ananindeua, Pará
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600 font-mono space-y-0.5">
            <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Projetado por:</strong> Dante Dias Monteiro</p>
            <p><strong>Projeção:</strong> EPSG:4326 (WGS84)</p>
          </div>
        </div>
      </div>

      {/* Cabeçalho Normal em Ecrã */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">Painel de Gestão e Moderação</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Autenticado
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controlo de ocorrências comunitárias, emissão de dossiê territorial em PDF e exportação espacial.
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
            <span>📥 Exportar CSV (SIG / QGIS)</span>
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3 print:border-slate-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Total de Registos</p>
          <p className="text-3xl font-black text-slate-800 mt-1 print:text-lg">{total}</p>
          <span className="text-[11px] text-slate-500 print:text-[9px]">Amostragem no setor</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3 print:border-slate-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Pendentes / Em Análise</p>
          <p className="text-3xl font-black text-amber-600 mt-1 print:text-lg">{pendentes + emAnalise}</p>
          <span className="text-[11px] text-amber-600 font-medium print:text-[9px]">Pontos ativos</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3 print:border-slate-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Demandas Resolvidas</p>
          <p className="text-3xl font-black text-emerald-600 mt-1 print:text-lg">{resolvidos}</p>
          <span className="text-[11px] text-emerald-600 font-medium print:text-[9px]">Pontos solucionados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3 print:border-slate-300">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Taxa de Resolução</p>
          <p className="text-3xl font-black text-blue-600 mt-1 print:text-lg">{taxaResolucao}%</p>
          <span className="text-[11px] text-blue-600 font-medium print:text-[9px]">Eficácia das ações</span>
        </div>
      </div>

      {/* Quadro de Tipologias Urbanas */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 print:border-slate-300 print:p-3 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 print:text-xs">
          Síntese de Tipologias Urbanas Identificadas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
          {Object.entries(ROTULOS_CATEGORIAS).filter(([k]) => k !== 'outros').map(([chave, label]) => {
            const qtd = contagemCategorias[chave] || 0
            const pct = total > 0 ? ((qtd / total) * 100).toFixed(1) : 0
            return (
              <div key={chave} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 print:p-2 print:border-slate-300">
                <p className="text-xs font-semibold text-slate-600 print:text-[10px]">{label}</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5 print:text-base">{qtd}</p>
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

      {/* Filtros de Exibição */}
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

      {/* Tabela de Registos */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs print:rounded-xl print:border-slate-300">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between print:p-2.5">
          <h3 className="text-sm font-bold text-slate-800 print:text-xs">
            Inventário de Registos Espaciais ({filtradas.length})
          </h3>
          <span className="text-xs text-slate-400 print:text-[10px]">Base Territorial</span>
        </div>

        {carregando ? (
          <div className="py-16 text-center text-sm text-slate-500">A carregar registos...</div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">Nenhuma ocorrência encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 print:text-[10px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 print:bg-slate-100 print:text-[9px]">
                <tr>
                  <th className="px-4 py-3 print:px-2 print:py-1.5">Tipologia</th>
                  <th className="px-4 py-3 print:px-2 print:py-1.5">Descrição / Ponto</th>
                  <th className="px-4 py-3 print:px-2 print:py-1.5">Coordenadas</th>
                  <th className="px-4 py-3 print:px-2 print:py-1.5">Registo</th>
                  <th className="px-4 py-3 print:px-2 print:py-1.5">Estado</th>
                  <th className="px-4 py-3 text-right print:hidden">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {filtradas.map((item) => {
                  const catNormal = normalizarCategoria(item.categoria)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 print:px-2 print:py-1.5">
                        {ROTULOS_CATEGORIAS[catNormal] || item.categoria}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate print:max-w-none print:whitespace-normal print:px-2 print:py-1.5">
                        {item.descricao || 'Sem descrição'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 print:px-2 print:py-1.5 print:text-[9px]">
                        {item.latitude != null && item.longitude != null
                          ? `${Number(item.latitude).toFixed(5)}, ${Number(item.longitude).toFixed(5)}`
                          : 'Sem GPS'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 print:px-2 print:py-1.5 print:text-[9px]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3 print:px-2 print:py-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider print:border print:border-slate-400 print:bg-transparent print:text-slate-800 ${
                            item.status === 'resolvido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'em_analise'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ROTULOS_STATUS[item.status] || 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right print:hidden">
                        <div className="flex items-center justify-end space-x-1.5">
                          <select
                            value={item.status || 'pendente'}
                            onChange={(e) => atualizarStatus(item.id, e.target.value)}
                            className="text-[11px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="em_analise">Em Análise</option>
                            <option value="resolvido">Resolvido</option>
                          </select>
                          <button
                            onClick={() => eliminarRegisto(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota de Impressão */}
      <div className="hidden print:block pt-4 border-t border-slate-300 text-[10px] text-slate-600 space-y-1">
        <p>
          <strong>Finalidade Técnica:</strong> Relatório territorial para estudos urbanos e diagnóstico comunitário independente.
        </p>
      </div>
    </div>
  )
}
