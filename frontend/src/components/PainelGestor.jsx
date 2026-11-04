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

const ROTULOS_CATEGORIAS = {
  lixo: 'Lixo / Entulho',
  iluminacao: 'Iluminação',
  buraco: 'Vias / Buracos',
  esgoto: 'Esgoto / Água'
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
        .from('ocorrencias')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) throw error
      setOcorrencias(data || [])
    } catch (err) {
      console.error('Erro ao buscar ocorrências:', err.message)
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

  // Filtragem para tabela
  const filtradas = ocorrencias.filter((item) => {
    const atendeCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria
    const atendeStatus = filtroStatus === 'todos' || item.status === filtroStatus
    return atendeCategoria && atendeStatus
  })

  // Agregações analíticas para estudos
  const total = ocorrencias.length
  const resolvidos = ocorrencias.filter((o) => o.status === 'resolvido').length
  const pendentes = ocorrencias.filter((o) => o.status === 'pendente' || !o.status).length
  const emAnalise = ocorrencias.filter((o) => o.status === 'em_analise').length
  const taxaResolucao = total > 0 ? ((resolvidos / total) * 100).toFixed(1) : 0

  // Preparação de dados para o Gráfico de Barras (Categorias)
  const contagemCategorias = ocorrencias.reduce((acc, curr) => {
    const cat = curr.categoria || 'outros'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  const dadosGraficoCategorias = Object.keys(contagemCategorias).map((cat) => ({
    chave: cat,
    nome: ROTULOS_CATEGORIAS[cat] || cat,
    total: contagemCategorias[cat],
    cor: CORES_CATEGORIAS[cat] || '#64748b'
  }))

  // Preparação de dados para o Gráfico Donut (Status)
  const dadosGraficoStatus = [
    { nome: 'Pendentes', valor: pendentes, cor: CORES_STATUS.pendente },
    { nome: 'Em Análise', valor: emAnalise, cor: CORES_STATUS.em_analise },
    { nome: 'Resolvidos', valor: resolvidos, cor: CORES_STATUS.resolvido }
  ].filter((item) => item.valor > 0)

  // Exportação CSV formatada para QGIS / SPSS / Excel
  const exportarCSV = () => {
    if (ocorrencias.length === 0) {
      alert('Não há dados disponíveis para exportar.')
      return
    }

    const cabecalho = ['ID', 'Categoria', 'Descricao', 'Latitude', 'Longitude', 'Status', 'Data_Hora']
    const linhas = filtradas.map((o) => [
      o.id,
      `"${o.categoria || ''}"`,
      `"${(o.descricao || '').replace(/"/g, '""')}"`,
      o.latitude || '',
      o.longitude || '',
      o.status || 'pendente',
      o.criado_em || ''
    ])

    const csvContent = [cabecalho.join(','), ...linhas.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `zelador_diagnostico_urbano_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho do Painel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Painel de Inteligência Comunitária</h2>
          <p className="text-sm text-slate-500">
            Diagnóstico territorial, métricas estatísticas e monitorização urbana em tempo real
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={carregarDados}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            🔄 Recarregar
          </button>
          <button
            onClick={exportarCSV}
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
          >
            <span>📊 Baixar Base (CSV / GIS)</span>
          </button>
        </div>
      </div>

      {/* Cards Quantitativos Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Ocorrências</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{total}</p>
          <span className="text-[11px] text-slate-500">Amostragem territorial</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demandas Abertas</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendentes}</p>
          <span className="text-[11px] text-amber-600 font-medium">Pontos críticos ativos</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pontos Solucionados</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{resolvidos}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Intervenções realizadas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taxa de Resolução</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{taxaResolucao}%</p>
          <span className="text-[11px] text-blue-600 font-medium">Eficácia comunitária</span>
        </div>
      </div>

      {/* Seção Gráfica Analítica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico 1: Ocorrências por Tipologia */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Concentração por Tipologia Urbana</h3>
          <p className="text-xs text-slate-500 mb-4">Volume absoluto de problemas reportados pelos moradores</p>
          
          <div className="h-64 w-full">
            {dadosGraficoCategorias.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem registos para processamento estatístico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoCategorias} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${value} registos`, 'Volume']}
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

        {/* Gráfico 2: Ciclo de Vida da Demanda */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Estado de Resolução das Demandas</h3>
          <p className="text-xs text-slate-500 mb-4">Proporção relativa entre problemas em aberto e concluídos</p>

          <div className="h-64 w-full">
            {dadosGraficoStatus.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem dados de status disponíveis.
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
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {dadosGraficoStatus.map((entry, index) => (
                      <Cell key={`status-cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} ocorrências`, 'Total']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Georreferenciamento e Auditoria */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-800">
            Base de Registos Espaciais ({filtradas.length})
          </h3>

          <div className="flex flex-wrap gap-2">
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

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
            >
              <option value="todos">Todos os Estados</option>
              <option value="pendente">Pendentes</option>
              <option value="em_analise">Em Análise</option>
              <option value="resolvido">Resolvidos</option>
            </select>
          </div>
        </div>

        {carregando ? (
          <div className="py-16 text-center text-sm text-slate-500">A carregar base analítica...</div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">Nenhum registo atende aos filtros definidos.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tipologia</th>
                  <th className="px-4 py-3">Ponto / Descrição</th>
                  <th className="px-4 py-3">Georreferência</th>
                  <th className="px-4 py-3">Data do Registo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Alterar Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold capitalize text-slate-800">
                      {ROTULOS_CATEGORIAS[item.categoria] || item.categoria}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" title={item.descricao}>
                      {item.descricao || 'Sem descrição'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {item.latitude && item.longitude
                        ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                        : 'Não registada'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                    <td className="px-4 py-3 text-right">
                      <select
                        value={item.status || 'pendente'}
                        onChange={(e) => atualizarStatus(item.id, e.target.value)}
                        className="text-[11px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_analise">Em Análise</option>
                        <option value="resolvido">Resolvido</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
