import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import useSessaoGestor from '../lib/useSessaoGestor'
import LoginGestor from './LoginGestor'
import { normalizarEstado, rotuloDoEstado } from '../lib/status'
import { RAIO_RECURRENCIA_METROS, calcularPontuacaoGUT, dispararAvisoAtualizacao, distanciaMetros, eResolvida, escapeCsv, protocoloCivico } from '../lib/gestao'
import CabecalhoGestor from './gestao/CabecalhoGestor'
import MetricasGestao from './gestao/MetricasGestao'
import IndicadoresGestao from './gestao/IndicadoresGestao'
import SelecaoOficio from './gestao/SelecaoOficio'
import FiltrosGestao from './gestao/FiltrosGestao'
import FormEdicaoOcorrencia from './gestao/FormEdicaoOcorrencia'
import AcoesRelatorios from './gestao/AcoesRelatorios'
import ListaOcorrenciasGestor from './gestao/ListaOcorrenciasGestor'
import MapaFocosCriticos from './gestao/MapaFocosCriticos'
import DetalheSelecionada from './gestao/DetalheSelecionada'
import useTelaGrande from '../lib/useTelaGrande'
import ModalBoletim from './gestao/ModalBoletim'
import ModalExclusao from './gestao/ModalExclusao'
import ModalOficio from './gestao/ModalOficio'
import ModalOrdemServico from './gestao/ModalOrdemServico'
import ModalRelatorioMensal from './gestao/ModalRelatorioMensal'
import ErrosDoApp from './gestao/ErrosDoApp'
import SegurancaConta from './gestao/SegurancaConta'
import ResultadoSus from './gestao/ResultadoSus'
import SegundaEtapaLogin from './gestao/SegundaEtapaLogin'
import { rotuloDaCategoria } from '../lib/categorias'
import { caminhoNoStorage, estaDenunciada } from '../lib/moderacao'
import { filtrarPorOrgao, nomeDoOrgao, orgaoDoChamado } from '../lib/orgaos'
import { estaAtrasado, resumoDosPrazos } from '../lib/prazos'
import { MARCA } from '../lib/marca'

// Sessão fictícia do modo demonstração: gestor geral, sem login.
const SESSAO_DEMO = { sessao: { user: { email: 'demonstracao@exemplo' } }, ehGestor: true, orgaoGestor: null, carregando: false, erroVerificacao: null, precisaCodigo: false }

/**
 * `demo` (opcional) liga o modo demonstração: { atualizar(id, campos), excluir(id), sair() }.
 * Nele nada vai para o banco; as alterações ficam só na memória.
 */
export default function PainelGestor({ ocorrencias = [], onAtualizarDados, demo = null, onDemonstracao }) {
  const sessaoReal = useSessaoGestor()
  const { sessao, ehGestor, orgaoGestor, carregando: aVerificarSessao, erroVerificacao, precisaCodigo, entrar, confirmarCodigo } = demo ? { ...sessaoReal, ...SESSAO_DEMO } : sessaoReal
  const sair = demo ? demo.sair : sessaoReal.sair
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [termoBusca, setTermoBusca] = useState('')
  const [itemEdicao, setItemEdicao] = useState(null)
  const [itemExclusao, setItemExclusao] = useState(null)
  const [mostrarOficio, setMostrarOficio] = useState(false)
  const [selecionadasOficio, setSelecionadasOficio] = useState([])
  const [carregandoAcao, setCarregandoAcao] = useState(false)
  const [abaPainel, setAbaPainel] = useState('lista')
  const [ordenarPorGut, setOrdenarPorGut] = useState(false)
  const [tramitacaoAberta, setTramitacaoAberta] = useState(null)
  const [despachoPorId, setDespachoPorId] = useState({})
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null)
  const [mostrarBoletim, setMostrarBoletim] = useState(false)
  const [boletimCopiado, setBoletimCopiado] = useState(false)
  const [itemResolucao, setItemResolucao] = useState(null)
  const [fotoResolucaoPorId, setFotoResolucaoPorId] = useState({})
  // null = ainda não escolheu: gestor de um órgão abre o painel já filtrado no órgão dele.
  const [escolhaOrgao, setFiltroOrgao] = useState(null)
  const filtroOrgao = escolhaOrgao ?? (orgaoGestor || 'todos')
  const [selecionadaId, setSelecionadaId] = useState(null)
  const [mostrarOrdem, setMostrarOrdem] = useState(false)
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)
  const telaGrande = useTelaGrande()

  // Ao entrar como gestor, recarrega: a vista só mostra fotos ocultas para gestores.
  useEffect(() => {
    if (ehGestor && !demo) onAtualizarDados?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehGestor])

  // Únicos pontos que gravam: no modo demonstração vão para a memória, nunca para o banco.
  const gravar = async (id, campos) => {
    if (demo) return demo.atualizar(id, campos)
    const { error } = await supabase.from('ocorrencias').update(campos).eq('id', id)
    if (error) throw error
  }
  const apagar = async (id) => {
    if (demo) return demo.excluir(id)
    const { error } = await supabase.from('ocorrencias').delete().eq('id', id)
    if (error) throw error
  }
  const recarregar = async () => {
    if (!demo && onAtualizarDados) await onAtualizarDados()
  }

  const revisarFoto = async (item, acao) => {
    setCarregandoAcao(true)
    setAcaoEmAndamento(`denuncia-${item.id}`)
    try {
      const atualizacao = { foto_oculta: false, total_denuncias: 0 }
      if (acao === 'remover') {
        const caminho = demo ? null : caminhoNoStorage(item.foto_url)
        if (caminho) {
          const { error: erroStorage } = await supabase.storage.from('ocorrencias').remove([caminho])
          if (erroStorage) throw erroStorage
        }
        atualizacao.foto_url = null
      }
      await gravar(item.id, atualizacao)
      await recarregar()
    } catch (err) {
      alert('Erro ao revisar a denúncia: ' + err.message)
    } finally {
      setCarregandoAcao(false)
      setAcaoEmAndamento(null)
    }
  }

  const alterarStatusOcorrencia = async (id, novoStatus) => {
    setCarregandoAcao(true)
    setAcaoEmAndamento(`status-${id}`)
    try {
      await gravar(id, { status: novoStatus, updated_at: new Date().toISOString() })
      if (novoStatus === 'resolvido') {
        dispararAvisoAtualizacao('Ocorrência resolvida', 'A atualização foi registrada no painel comunitário.')
      }
      await recarregar()
    } catch (err) {
      alert('Erro ao atualizar estado: ' + err.message)
    } finally {
      setCarregandoAcao(false)
      setAcaoEmAndamento(null)
    }
  }

  const confirmarResolucao = async () => {
    if (!itemResolucao) return
    const { id } = itemResolucao
    const foto = fotoResolucaoPorId[id]
    setCarregandoAcao(true)
    setAcaoEmAndamento(`status-${id}`)
    try {
      let fotoResolucao = null
      if (foto && demo) {
        fotoResolucao = URL.createObjectURL(foto)
      } else if (foto) {
        const extensao = foto.name.split('.').pop()?.toLowerCase() || 'jpg'
        const caminho = `resolucoes/${id}-${Date.now()}.${extensao}`
        const { error: uploadError } = await supabase.storage
          .from('ocorrencias')
          .upload(caminho, foto, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError
        const { data: publicData } = supabase.storage.from('ocorrencias').getPublicUrl(caminho)
        fotoResolucao = publicData.publicUrl
      }

      const atualizacao = {
        status: 'resolvido',
        updated_at: new Date().toISOString()
      }
      // Coluna real na tabela; a vista ocorrencias_georreferenciadas expõe-na como foto_resolucao.
      if (fotoResolucao) atualizacao.foto_resolucao_url = fotoResolucao

      await gravar(id, atualizacao)
      if (fotoResolucao) {
        dispararAvisoAtualizacao('Resolução comprovada', 'A foto da intervenção foi anexada ao protocolo.')
      }
      setItemResolucao(null)
      setFotoResolucaoPorId((atuais) => ({ ...atuais, [id]: null }))
      await recarregar()
    } catch (err) {
      alert('Erro ao registrar resolução: ' + err.message)
    } finally {
      setCarregandoAcao(false)
      setAcaoEmAndamento(null)
    }
  }

  const salvarDespacho = async (item) => {
    setCarregandoAcao(true)
    setAcaoEmAndamento(`despacho-${item.id}`)
    try {
      await gravar(item.id, {
        observacoes: despachoPorId[item.id] ?? item.observacoes ?? '',
        updated_at: new Date().toISOString()
      })
      dispararAvisoAtualizacao('Despacho registrado', 'A tramitação da ocorrência foi atualizada.')
      setTramitacaoAberta(null)
      await recarregar()
    } catch (err) {
      alert('Erro ao salvar despacho: ' + err.message)
    } finally {
      setCarregandoAcao(false)
      setAcaoEmAndamento(null)
    }
  }

  const eliminarOcorrencia = async () => {
    if (!itemExclusao) return
    setCarregandoAcao(true)
    try {
      await apagar(itemExclusao.id)
      setItemExclusao(null)
      await recarregar()
    } catch (err) {
      alert('Erro ao excluir ocorrência: ' + err.message)
    } finally {
      setCarregandoAcao(false)
    }
  }

  const salvarEdicao = async (e) => {
    e.preventDefault()
    if (!itemEdicao) return

    setCarregandoAcao(true)
    try {
      const atualizacao = {
        descricao: itemEdicao.descricao,
        categoria: itemEdicao.categoria,
        status: itemEdicao.status
      }
      // Só envia o órgão quando o gestor encaminhou para outro.
      const original = ocorrencias.find((item) => item.id === itemEdicao.id)
      if (itemEdicao.orgao && itemEdicao.orgao !== orgaoDoChamado(original)) atualizacao.orgao = itemEdicao.orgao
      await gravar(itemEdicao.id, atualizacao)
      setItemEdicao(null)
      await recarregar()
    } catch (err) {
      alert('Erro ao salvar alterações: ' + err.message)
    } finally {
      setCarregandoAcao(false)
    }
  }

  const ocorrenciasComGut = useMemo(() => ocorrencias.map((item) => ({
    ...item,
    gut: calcularPontuacaoGUT(item, ocorrencias, new Date())
  })), [ocorrencias])

  const ocorrenciasFiltradasComGut = useMemo(() => {
    const filtradas = filtrarPorOrgao(ocorrenciasComGut, filtroOrgao).filter((item) => {
      const bateuStatus = filtroStatus === 'todos'
        || (filtroStatus === 'denunciados' ? estaDenunciada(item)
          : filtroStatus === 'atrasados' ? estaAtrasado(item)
          : normalizarEstado(item.status) === filtroStatus)
      const busca = termoBusca.toLowerCase()
      const bateuTexto =
        (item.descricao || '').toLowerCase().includes(busca) ||
        (item.categoria || '').toLowerCase().includes(busca) ||
        rotuloDaCategoria(item.categoria).toLowerCase().includes(busca) ||
        protocoloCivico(item.id).toLowerCase().includes(busca) ||
        (item.id || '').toString().includes(busca)
      return bateuStatus && bateuTexto
    })
    if (!ordenarPorGut) return filtradas
    return [...filtradas].sort((a, b) => b.gut.pontuacao - a.gut.pontuacao)
  }, [ocorrenciasComGut, filtroStatus, filtroOrgao, termoBusca, ordenarPorGut])

  const metricas = useMemo(() => {
    const resolvidas = ocorrencias.filter(eResolvida).length
    const emAnalise = ocorrencias.filter((item) => normalizarEstado(item.status) === 'em_analise').length
    const pendentes = ocorrencias.filter((item) => normalizarEstado(item.status) === 'pendente').length
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
  const totalDenunciados = useMemo(() => ocorrencias.filter(estaDenunciada).length, [ocorrencias])
  const prazos = useMemo(() => resumoDosPrazos(filtrarPorOrgao(ocorrencias, filtroOrgao)), [ocorrencias, filtroOrgao])
  const pendentesSelecionadas = pendentes.filter((item) => selecionadasOficio.includes(item.id))
  const resolvidasAuditadas = ocorrencias.filter((item) => eResolvida(item) && item.foto_url && item.foto_resolucao)
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

  const exportarGeoJson = () => {
    const features = ocorrencias
      .filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
      .map((item) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(item.longitude), Number(item.latitude)]
        },
        properties: {
          id: item.id,
          categoria: item.categoria || 'Não classificado',
          status: rotuloDoEstado(item.status),
          bairro: item.bairro || item.endereco || item.morada || null,
          data: item.created_at || null
        }
      }))
    const geoJson = {
      type: 'FeatureCollection',
      features
    }
    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/geo+json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'zelador-digital-dados.geojson'
    link.click()
    URL.revokeObjectURL(url)
  }

  const textoBoletim = useMemo(() => {
    const focosPorBairro = ocorrenciasComGut
      .filter((item) => item.gut.pontuacao >= 30)
      .reduce((resultado, item) => {
        const bairro = item.bairro || item.endereco || item.morada || 'Área não identificada'
        resultado[bairro] = (resultado[bairro] || 0) + 1
        return resultado
      }, {})
    const bairrosCriticos = Object.entries(focosPorBairro)
      .sort(([, quantidadeA], [, quantidadeB]) => quantidadeB - quantidadeA)
      .slice(0, 5)
    const categoriasPrincipais = analiseCategorias.slice(0, 3)
    const linhasCategorias = categoriasPrincipais.length
      ? categoriasPrincipais.map(([categoria, quantidade], index) => `${index + 1}. ${rotuloDaCategoria(categoria)}: ${quantidade}`).join('\n')
      : 'Nenhuma categoria registrada.'
    const linhasBairros = bairrosCriticos.length
      ? bairrosCriticos.map(([bairro, quantidade], index) => `${index + 1}. ${bairro}: ${quantidade} foco(s) GUT`).join('\n')
      : 'Nenhum foco crítico identificado.'

    return [
      `📢 Boletim Mensal de Zeladoria Urbana - ${MARCA.cidade}`,
      '',
      `📊 Total de chamados levantados pela população: ${metricas.total}`,
      `✅ Taxa de resolução atual: ${metricas.percentualResolucao}%`,
      '',
      '🏷️ Principais categorias de problemas:',
      linhasCategorias,
      '',
      '📍 Bairros com maior número de focos críticos:',
      linhasBairros,
      '',
      MARCA.prefeitura ? `${MARCA.nome} · ${MARCA.prefeitura}` : `Iniciativa cívica independente via ${MARCA.nome}`
    ].join('\n')
  }, [analiseCategorias, ocorrenciasComGut, metricas])

  const copiarBoletim = async () => {
    try {
      await navigator.clipboard.writeText(textoBoletim)
      setBoletimCopiado(true)
      window.setTimeout(() => setBoletimCopiado(false), 2500)
    } catch (err) {
      alert('Não foi possível copiar o boletim: ' + err.message)
    }
  }

  const abrirOficio = () => {
    setSelecionadasOficio((atuais) => atuais.filter((id) => pendentes.some((item) => item.id === id)))
    setMostrarOficio(true)
  }

  // Acesso: sessão do Supabase Auth + confirmação no servidor (public.eh_gestor)
  if (aVerificarSessao) {
    return (
      <div role="status" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-sm mx-auto my-6 text-center text-sm font-bold text-slate-500">
        Verificando o acesso...
      </div>
    )
  }

  if (!sessao) {
    return <LoginGestor onEntrar={entrar} onDemonstracao={onDemonstracao} />
  }

  if (precisaCodigo) {
    return <SegundaEtapaLogin onConfirmar={confirmarCodigo} onSair={sair} />
  }

  if (!ehGestor) {
    return (
      <div role="alert" className="bg-white rounded-3xl p-6 border border-amber-200 shadow-sm max-w-sm mx-auto my-6 text-center">
        <h2 className="text-lg font-black text-slate-800">Sem acesso de gestor</h2>
        <p className="text-sm text-slate-600 mt-2">
          {erroVerificacao || `A conta ${sessao.user?.email || ''} entrou, mas não está registrada como gestora.`}
        </p>
        <button
          type="button"
          onClick={sair}
          className="mt-5 w-full min-h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black cursor-pointer"
        >
          Sair e usar outra conta
        </button>
      </div>
    )
  }

  const filtrarPorStatus = (status) => {
    setFiltroStatus(status)
    setAbaPainel('lista')
  }

  return (
    <div className="space-y-3 pb-8">
      {demo && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <span><strong>Demonstração</strong> com chamados fictícios. Pode mexer à vontade: nada é salvo e nada chega ao banco.</span>
          <button type="button" onClick={demo.sair} className="rounded-xl bg-amber-600 px-3 py-1.5 font-black text-white hover:bg-amber-700 cursor-pointer">
            Sair da demonstração
          </button>
        </div>
      )}
      <CabecalhoGestor abaPainel={abaPainel} sair={sair} sessao={sessao} setAbaPainel={setAbaPainel} />
      <MetricasGestao filtroStatus={abaPainel === 'lista' ? filtroStatus : null} metricas={metricas} onFiltrar={filtrarPorStatus} />

      {abaPainel === 'lista' && (
        <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
          <div className="space-y-3 min-w-0">
            {(prazos.atrasados > 0 || prazos.venceLogo > 0) && (
              <div role="status" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <strong>⏰ Prazos{filtroOrgao !== 'todos' ? ` · ${nomeDoOrgao(filtroOrgao)}` : ''}:</strong>{' '}
                {prazos.atrasados} chamado(s) atrasado(s)
                {prazos.venceLogo > 0 && ` e ${prazos.venceLogo} vencendo em até 2 dias`}.
                {prazos.atrasados > 0 && (
                  <button type="button" onClick={() => setFiltroStatus('atrasados')} className="ml-1 font-black underline cursor-pointer">
                    Ver atrasados
                  </button>
                )}
              </div>
            )}
            <FiltrosGestao filtroOrgao={filtroOrgao} orgaoGestor={orgaoGestor} setFiltroOrgao={setFiltroOrgao} totalAtrasados={prazos.atrasados} totalDenunciados={totalDenunciados} filtroStatus={filtroStatus} ordenarPorGut={ordenarPorGut} setFiltroStatus={setFiltroStatus} setOrdenarPorGut={setOrdenarPorGut} setTermoBusca={setTermoBusca} termoBusca={termoBusca} />
            <button
              type="button"
              onClick={() => setMostrarOrdem(true)}
              className="w-full min-h-11 rounded-2xl border border-slate-300 bg-white text-xs font-black text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              📋 Ordem de serviço para a equipe ({ocorrenciasFiltradasComGut.filter((item) => !eResolvida(item)).length} abertos no filtro)
            </button>
            {itemEdicao && <FormEdicaoOcorrencia carregandoAcao={carregandoAcao} itemEdicao={itemEdicao} salvarEdicao={salvarEdicao} setItemEdicao={setItemEdicao} />}
            <ListaOcorrenciasGestor selecionadaId={selecionadaId} onSelecionar={setSelecionadaId} revisarFoto={revisarFoto} acaoEmAndamento={acaoEmAndamento} alterarStatusOcorrencia={alterarStatusOcorrencia} carregandoAcao={carregandoAcao} confirmarResolucao={confirmarResolucao} despachoPorId={despachoPorId} fotoResolucaoPorId={fotoResolucaoPorId} itemResolucao={itemResolucao} ocorrenciasFiltradasComGut={ocorrenciasFiltradasComGut} salvarDespacho={salvarDespacho} setDespachoPorId={setDespachoPorId} setFotoResolucaoPorId={setFotoResolucaoPorId} setItemEdicao={setItemEdicao} setItemExclusao={setItemExclusao} setItemResolucao={setItemResolucao} setTramitacaoAberta={setTramitacaoAberta} tramitacaoAberta={tramitacaoAberta} />
          </div>
          {telaGrande && (
            <aside className="space-y-3 lg:sticky lg:top-20 min-w-0" aria-label="Mapa e detalhes">
              <MapaFocosCriticos compacto ocorrenciasComGut={ocorrenciasFiltradasComGut} selecionadaId={selecionadaId} onSelecionar={setSelecionadaId} />
              <DetalheSelecionada item={ocorrenciasFiltradasComGut.find((i) => i.id === selecionadaId)} carregandoAcao={carregandoAcao} alterarStatusOcorrencia={alterarStatusOcorrencia} />
            </aside>
          )}
        </div>
      )}

      {abaPainel === 'mapa' && <MapaFocosCriticos ocorrenciasComGut={ocorrenciasComGut} />}

      {abaPainel === 'relatorios' && (
        <>
          <AcoesRelatorios
            abrirOficio={abrirOficio}
            abrirRelatorioMensal={() => setMostrarRelatorio(true)}
            abrirBoletim={() => {
              setBoletimCopiado(false)
              setMostrarBoletim(true)
            }}
            exportarCsv={exportarCsv}
            exportarGeoJson={exportarGeoJson}
          />
          {pendentes.length > 0 && <SelecaoOficio alternarSelecaoOficio={alternarSelecaoOficio} pendentes={pendentes} selecionadasOficio={selecionadasOficio} setSelecionadasOficio={setSelecionadasOficio} />}
          <IndicadoresGestao analiseCategorias={analiseCategorias} analiseTemporal={analiseTemporal} maxCategoria={maxCategoria} maxTemporal={maxTemporal} metricas={metricas} />
          {!demo && (
            <>
              <ResultadoSus />
              <SegurancaConta />
              <ErrosDoApp />
            </>
          )}
        </>
      )}

      {mostrarBoletim && <ModalBoletim boletimCopiado={boletimCopiado} copiarBoletim={copiarBoletim} setMostrarBoletim={setMostrarBoletim} textoBoletim={textoBoletim} />}
      {itemExclusao && <ModalExclusao carregandoAcao={carregandoAcao} eliminarOcorrencia={eliminarOcorrencia} itemExclusao={itemExclusao} setItemExclusao={setItemExclusao} />}
      {mostrarRelatorio && <ModalRelatorioMensal ocorrencias={ocorrencias} nomeApp={MARCA.prefeitura ? `${MARCA.nome} · ${MARCA.prefeitura}` : MARCA.nome} onFechar={() => setMostrarRelatorio(false)} />}
      {mostrarOrdem && (
        <ModalOrdemServico
          chamados={ocorrenciasFiltradasComGut.filter((item) => !eResolvida(item))}
          orgao={filtroOrgao}
          onFechar={() => setMostrarOrdem(false)}
        />
      )}
      {mostrarOficio && <ModalOficio pendentesSelecionadas={pendentesSelecionadas} resolvidasAuditadas={resolvidasAuditadas} setMostrarOficio={setMostrarOficio} />}
    </div>
  )
}
