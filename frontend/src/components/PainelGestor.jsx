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
  iluminacao: 'Iluminação Pública',
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
  const [autenticado, setAutenticado] = useState(true)

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

  const eliminarRegisto = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este registo da base?')) return

    try {
      const { error } = await supabase.from('ocorrencias').delete().eq('id', id)
      if (error) throw error
      setOcorrencias((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      alert('Erro ao eliminar ocorrência: ' + err.message)
    }
  }

  const gerarOficio = (item) => {
    const textoOficio = `OFÍCIO COMUNITÁRIO - ZELADOR DIGITAL
Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}
Localidade: Novo Cristo / Icuí, Ananindeua - PA

Assunto: Reivindicação Comunitária - ${ROTULOS_CATEGORIAS[item.categoria] || item.categoria}
Identificador da Demanda: #${item.id}

Prezados(as) Senhores(as),

Vimos por meio deste documento registrar oficialmente a ocorrência cadastrada pelos moradores:
- Tipo: ${ROTULOS_CATEGORIAS[item.categoria] || item.categoria}
- Descrição / Ponto de Referência: ${item.descricao || 'Conforme relatório fotográfico georreferenciado'}
- Coordenadas de Localização: ${item.latitude ? `${item.latitude}, ${item.longitude}` : 'Não mapeadas'}
- Apoios Comunitários Recebidos: ${item.apoios || 0} moradores

Solicitamos providências e inclusão no cronograma de zeladoria urbana municipal.

Atenciosamente,
Iniciativa Comunitária Zelador Digital`

    const janela = window.open('', '_blank')
    janela.document.write(`<pre style="font-family: monospace; white-space: pre-wrap; padding: 24px;">${textoOficio}</pre>`)
    janela.document.close()
    janela.print()
  }

  // Filtragem
  const filtradas = ocorrencias.filter((item) => {
    const atendeCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria
    const atendeStatus = filtroStatus === 'todos' || item.status === filtroStatus
    return atendeCategoria && atendeStatus
  })

  // Agregações analíticas
  const total = ocorrencias.length
  const resolvidos = ocorrencias.filter((o) => o.status === 'resolvido').length
  const pendentes = ocorrencias.filter((o) => o.status === 'pendente' || !o.status).length
  const emAnalise = ocorrencias.filter((o) => o.status === 'em_analise').length
  const taxaResolucao = total > 0 ? ((resolvidos / total) * 100).toFixed(1) : 0

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

    const cabecalho = ['ID', 'Categoria', 'Descricao', 'Latitude', 'Longitude', 'Status', 'Apoios', 'Data_Hora']
    const linhas = filtradas.map((o) => [
      o.id,
      `"${o.categoria || ''}"`,
      `"${(o.descricao || '').replace(/"/g, '""')}"`,
      o.latitude || '',
      o.longitude || '',
      o.status || 'pendente',
      o.apoios || 0,
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

  const imprimirDossie = () => {
    window.print()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 print:p-0 print:space-y-4 print:max-w-full">
      {/* Cabeçalho do Dossiê para Impressão */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Zelador Digital Comunitário
            </h1>
            <p className="text-xs text-slate-600">
              Dossiê Diagnóstico Territorial de Infraestrutura Urbana e Saneamento
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p>Data do Dossiê: {new Date().toLocaleDateString('pt-BR')}</p>
            <p>Idealizado e desenvolvido por Dante Dias Monteiro</p>
          </div>
        </div>
      </div>

      {/* Barra de Ações Superior */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">Painel de Gestão e Moderação</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Autenticado
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de demandas comunitárias, dossiê em PDF, ofícios formais e diagnóstico urbano.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={carregarDados}
            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Atualizar lista de ocorrências"
          >
            🔄
          </button>
          <button
            onClick={imprimirDossie}
            className="px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center space-x-1.5"
          >
            <span>🖨️ Dossiê PDF</span>
          </button>
          <button
            onClick={exportarCSV}
            className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
          >
            <span>📥 Exportar CSV (SIG)</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Total de Registros</p>
          <p className="text-3xl font-black text-slate-800 mt-1 print:text-lg">{total}</p>
          <span className="text-[11px] text-slate-500 print:text-[9px]">Amostragem no bairro</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Pendentes / Análise</p>
          <p className="text-3xl font-black text-amber-600 mt-1 print:text-lg">{pendentes + emAnalise}</p>
          <span className="text-[11px] text-amber-600 font-medium print:text-[9px]">Aguardando intervenção</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Demandas Resolvidas</p>
          <p className="text-3xl font-black text-emerald-600 mt-1 print:text-lg">{resolvidos}</p>
          <span className="text-[11px] text-emerald-600 font-medium print:text-[9px]">Pontos solucionados</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">Taxa de Eficácia</p>
          <p className="text-3xl font-black text-blue-600 mt-1 print:text-lg">{taxaResolucao}%</p>
          <span className="text-[11px] text-blue-600 font-medium print:text-[9px]">Resolução de demandas</span>
        </div>
      </div>

      {/* Gráficos Estatísticos (Visíveis no ecrã) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {/* Gráfico 1: Concentração */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Concentração por Tipologia Urbana</h3>
          <p className="text-xs text-slate-500 mb-4">Volume total identificado pela comunidade</p>
          <div className="h-60 w-full">
            {dadosGraficoCategorias.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sem registros para análise estatística.
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

        {/* Gráfico 2: Ciclo de Resolução */}
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
                    formatter={(val) => [`${val} demandas`, 'Total']}
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
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
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

      {/* Lista de Demandas Estilo Cartão com Botão de Ofício e Maps */}
      {carregando ? (
        <div className="py-16 text-center text-sm text-slate-500">A carregar ocorrências...</div>
      ) : filtradas.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">Nenhuma ocorrência encontrada.</div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition-all print:border-slate-300 print:p-3"
            >
              <div className="flex items-start space-x-3.5">
                {item.foto_url ? (
                  <img
                    src={item.foto_url}
                    alt="Comprovativo"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                    📍
                  </div>
                )}

                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-slate-800">
                      {ROTULOS_CATEGORIAS[item.categoria] || item.categoria}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      • {item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 max-w-md">
                    {item.descricao || 'Sem descrição detalhada'}
                  </p>

                  <div className="flex items-center space-x-3 mt-2 text-[11px]">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                      👍 {item.apoios || 0} apoios
                    </span>

                    {item.latitude && item.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center space-x-0.5 print:text-slate-700"
                      >
                        <span>📍 Ver no Maps</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">Sem GPS</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controles de Ação do Gestor */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 print:hidden">
                <button
                  onClick={() => gerarOficio(item)}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all flex items-center space-x-1"
                >
                  <span>📄 Ofício</span>
                </button>

                <select
                  value={item.status || 'pendente'}
                  onChange={(e) => atualizarStatus(item.id, e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="resolvido">Resolvido</option>
                </select>

                <button
                  onClick={() => eliminarRegisto(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  title="Eliminar registo"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rodapé da Aplicação */}
      <div className="pt-8 text-center text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-600">
          Zelador Digital © 2026 — Plataforma de Gestão Comunitária
        </p>
        <p className="text-[11px]">
          Idealizado, projetado e desenvolvido por <span className="font-bold text-slate-700">Dante Dias Monteiro</span>
        </p>
        <p className="text-[10px] text-slate-400">
          Iniciativa civil independente para mapeamento urbano, saneamento e zeladoria social.
        </p>
      </div>
    </div>
  )
}
