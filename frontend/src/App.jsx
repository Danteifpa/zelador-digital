import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { Search } from 'lucide-react'
import { supabase } from './lib/supabase'
import lazyComRecarga from './lib/lazyComRecarga'
import { ativarAvisosDoProtocolo, concluirAvisosPendentes, concluirAvisosForaDaFila, avisosAtivosPara, MENSAGENS_AVISOS } from './lib/push'
import { pedirEnvioEmSegundoPlano, aoEnviarEmSegundoPlano } from './lib/envioSegundoPlano'
import useNetworkStatus from './lib/useNetworkStatus'
import { otimizarImagem } from './lib/imageOptimizer'
import Header from './components/Header'
import RegisterButton from './components/RegisterButton'
import StatsOverview from './components/StatsOverview'
import CommunityAlert from './components/CommunityAlert'
import ReportModal from './components/ReportModal'
import ErrorBoundary from './components/ErrorBoundary'
import AvisoAtualizacao from './components/AvisoAtualizacao'
import BotaoAvisos from './components/BotaoAvisos'
import BotaoApoio from './components/BotaoApoio'
import { textoConfirmacoes, MENSAGENS_APOIO } from './lib/apoios'
import { lerFila, adicionarAFila, atualizarItemNaFila, removerDaFila, FilaCheiaError } from './lib/filaOffline'
import { lerCache, gravarCache, pedirArmazenamentoPersistente } from './lib/armazenamento'
import { gerarIdOcorrencia, ehUuid, protocoloCivico } from './lib/protocolo'
import { estaResolvido, etapaDoEstado, rotuloDoEstado, classeEtiquetaDoEstado, VALORES_EM_ABERTO } from './lib/status'
import { CATEGORIAS, rotuloDaCategoria } from './lib/categorias'

// Módulos pesados (Leaflet, Painel de Gestão, gerador de QR Code) só são descarregados quando
// o utilizador os abre: quem só regista ocorrências não paga esse peso no 3G/4G.
const PainelGestor = lazyComRecarga(() => import('./components/PainelGestor'))
const MapaOcorrencias = lazyComRecarga(() => import('./components/MapaOcorrencias'))
const ModalQRCode = lazyComRecarga(() => import('./components/ModalQRCode'))

const TAMANHO_PAGINA_LISTA = 20

function CarregandoSecao({ texto = 'Carregando...' }) {
  return (
    <div role="status" className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 animate-pulse">
      {texto}
    </div>
  )
}

// Coordenadas centrais comunitárias (Ananindeua)
const CENTRO_COMUNITARIO = {
  latitude: -1.365000,
  longitude: -48.375000,
  raioMaximoKm: 18.0,
  nome: 'Ananindeua'
}

function distanciaMetros(a, b) {
  if (![a.latitude, a.longitude, b.latitude, b.longitude].every((valor) => Number.isFinite(Number(valor)))) return Infinity
  const raioTerra = 6371000
  const latitudeA = (Number(a.latitude) * Math.PI) / 180
  const latitudeB = (Number(b.latitude) * Math.PI) / 180
  const deltaLatitude = ((Number(b.latitude) - Number(a.latitude)) * Math.PI) / 180
  const deltaLongitude = ((Number(b.longitude) - Number(a.longitude)) * Math.PI) / 180
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2
  return 2 * raioTerra * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

const ETAPAS_ONBOARDING = [
  {
    titulo: 'Voz Ativa no Seu Bairro',
    descricao: 'O Zelador Digital é uma plataforma comunitária independente para identificar, documentar e transformar a zeladoria urbana.',
    icone: '🏙️',
    gradiente: 'from-blue-600 to-indigo-600'
  },
  {
    titulo: 'Registro Rápido & Georreferenciado',
    descricao: 'Tire uma fotografia em campo e deixe que o satélite GPS marque com precisão o ponto exato da ocorrência territorial.',
    icone: '📸',
    gradiente: 'from-sky-600 to-blue-600'
  },
  {
    titulo: 'Transparência & Acompanhamento',
    descricao: 'Consulte os dados no mapa térmico e siga a linha do tempo desde o envio até a intervenção concluída.',
    icone: '🗺️',
    gradiente: 'from-emerald-600 to-teal-600'
  }
]

const NOTIFICACOES_PADRAO = [
  {
    id: 1,
    titulo: 'Ação de Limpeza Comunitária',
    mensagem: 'Próximo sábado haverá mutirão voluntário de coleta de entulho nos pontos críticos identificados no mapa.',
    tipo: 'comunidade',
    icone: '🧹',
    data: 'Hoje, 09:30'
  },
  {
    id: 2,
    titulo: 'Manutenção de Iluminação Pública',
    mensagem: 'Registros de postes apagados no setor leste foram compilados para vistoria e troca das lâmpadas.',
    tipo: 'servicos',
    icone: '💡',
    data: 'Ontem, 16:45'
  },
  {
    id: 3,
    titulo: 'Modo Offline Ativado',
    mensagem: 'Agora você pode registrar ocorrências mesmo sem sinal 4G/5G. O envio acontece assim que a conexão voltar.',
    tipo: 'sistema',
    icone: '📱',
    data: 'Há 2 dias'
  }
]

// Fórmula Haversine para cálculo de distância em km
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Feedback Háptico e Sons Sintetizados via Web Audio API
const feedbackSensorial = {
  vibrar: (padrao = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(padrao)
      } catch (e) {
        console.warn('Vibração indisponível:', e)
      }
    }
  },
  ctx: null,
  tocarTom: function (frequencia = 440, duracao = 0.08, tipo = 'sine') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      // Um único AudioContext reutilizado (criar um por toque esgota o limite do navegador e gasta memória).
      if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioCtx()
      const ctx = this.ctx
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = tipo
      osc.frequency.setValueAtTime(frequencia, ctx.currentTime)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracao)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duracao)
    } catch (e) {
      console.warn('Áudio sintético indisponível:', e)
    }
  },
  toqueSuave: function () {
    this.vibrar(12)
    this.tocarTom(520, 0.05)
  },
  gpsSucesso: function () {
    this.vibrar([30, 40, 30])
    this.tocarTom(660, 0.08)
    setTimeout(() => this.tocarTom(880, 0.1), 80)
  },
  envioSucesso: function () {
    this.vibrar([50, 70, 120])
    this.tocarTom(587, 0.08)
    setTimeout(() => this.tocarTom(880, 0.14), 90)
  },
  alertaErro: function () {
    this.vibrar(150)
    this.tocarTom(220, 0.15, 'triangle')
  }
}

// Extração EXIF de coordenadas GPS
function extrairGpsExif(arquivo) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = function (e) {
      const buffer = e.target.result
      const dataView = new DataView(buffer)

      if (dataView.getUint16(0, false) !== 0xffd8) return resolve(null)

      let offset = 2
      const length = dataView.byteLength

      while (offset < length) {
        if (dataView.getUint8(offset) !== 0xff) return resolve(null)
        const marker = dataView.getUint8(offset + 1)

        if (marker === 0xe1) {
          const exifOffset = offset + 4
          if (dataView.getUint32(exifOffset, false) === 0x45786966) {
            return resolve(analisarTiffGps(dataView, exifOffset + 6))
          }
        }
        offset += 2 + dataView.getUint16(offset + 2, false)
      }
      resolve(null)
    }
    reader.onerror = () => resolve(null)
    reader.readAsArrayBuffer(arquivo.slice(0, 131072))
  })
}

function analisarTiffGps(view, tiffOffset) {
  try {
    const isLittleEndian = view.getUint16(tiffOffset, false) === 0x4949
    const firstIFDOffset = view.getUint32(tiffOffset + 4, isLittleEndian)
    const numEntries = view.getUint16(tiffOffset + firstIFDOffset, isLittleEndian)

    let gpsInfoOffset = null

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = tiffOffset + firstIFDOffset + 2 + i * 12
      const tag = view.getUint16(entryOffset, isLittleEndian)
      if (tag === 0x8825) {
        gpsInfoOffset = view.getUint32(entryOffset + 8, isLittleEndian)
        break
      }
    }

    if (!gpsInfoOffset) return null

    const gpsEntries = view.getUint16(tiffOffset + gpsInfoOffset, isLittleEndian)
    let lat = null, latRef = 'N', lng = null, lngRef = 'W'

    for (let i = 0; i < gpsEntries; i++) {
      const entryOffset = tiffOffset + gpsInfoOffset + 2 + i * 12
      const tag = view.getUint16(entryOffset, isLittleEndian)

      if (tag === 1) latRef = String.fromCharCode(view.getUint8(entryOffset + 8))
      if (tag === 2) lat = lerRacionaisGps(view, tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian), isLittleEndian)
      if (tag === 3) lngRef = String.fromCharCode(view.getUint8(entryOffset + 8))
      if (tag === 4) lng = lerRacionaisGps(view, tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian), isLittleEndian)
    }

    if (lat !== null && lng !== null) {
      let finalLat = lat[0] + lat[1] / 60 + lat[2] / 3600
      let finalLng = lng[0] + lng[1] / 60 + lng[2] / 3600
      if (latRef === 'S') finalLat = -finalLat
      if (lngRef === 'W') finalLng = -finalLng
      return { latitude: finalLat, longitude: finalLng }
    }
  } catch {
    console.warn('Metadados EXIF GPS não encontrados')
  }
  return null
}

function lerRacionaisGps(view, offset, isLittleEndian) {
  const dNum = view.getUint32(offset, isLittleEndian)
  const dDen = view.getUint32(offset + 4, isLittleEndian)
  const mNum = view.getUint32(offset + 8, isLittleEndian)
  const mDen = view.getUint32(offset + 12, isLittleEndian)
  const sNum = view.getUint32(offset + 16, isLittleEndian)
  const sDen = view.getUint32(offset + 20, isLittleEndian)
  return [dNum / (dDen || 1), mNum / (mDen || 1), sNum / (sDen || 1)]
}

// Atalhos do ícone instalado (manifest.json → shortcuts): /?aba=reportar, /?aba=mapa, ...
function protocoloDoEndereco() {
  if (typeof window === 'undefined') return null
  const codigo = new URLSearchParams(window.location.search).get('protocolo')
  return codigo && /^ZD-[0-9A-F]{6}$/i.test(codigo) ? codigo.toUpperCase() : null
}

function abaDoEndereco() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('aba')
}

export default function App() {
  const [modo, setModo] = useState(() => (localStorage.getItem('zelador_modo_interface') === 'facil' ? 'facil' : 'normal'))
  const [abaAtiva, setAbaAtiva] = useState(() => (['mapa', 'registos', 'gestao'].includes(abaDoEndereco()) ? abaDoEndereco() : 'inicio'))
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false)
  const [etapaOnboarding, setEtapaOnboarding] = useState(0)

  // Modal QR Code
  const [mostrarQrCode, setMostrarQrCode] = useState(false)

  // PWA
  const [promptInstalacao, setPromptInstalacao] = useState(null)
  const [pwaInstalado, setPwaInstalado] = useState(false)
  const [bannerPwaIgnorado, setBannerPwaIgnorado] = useState(false)

  // Notificações
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false)
  const [notificacoesLidas, setNotificacoesLidas] = useState([])
  const [modalSobreAberto, setModalSobreAberto] = useState(false)

  // Conectividade
  const estaOnline = useNetworkStatus()
  const [filaOffline, setFilaOffline] = useState([])
  // Data dos dados mostrados quando vieram da cópia guardada no telemóvel (sem rede).
  const [dadosGuardadosEm, setDadosGuardadosEm] = useState(null)
  const [sincronizandoFila, setSincronizandoFila] = useState(false)
  // Trinco síncrono: impede duas sincronizações em paralelo (evento online + botão).
  const sincronizandoRef = useRef(false)
  const sincronizarRef = useRef(null)
  const aoFilaEnviadaRef = useRef(null)

  // Formulário
  const [categoria, setCategoria] = useState('buraco')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const previewUrlRef = useRef(null)
  const [processandoFoto, setProcessandoFoto] = useState(false)
  const [localizacao, setLocalizacao] = useState(null)
  const [origemLocalizacao, setOrigemLocalizacao] = useState('gps')
  const [capturandoGps, setCapturandoGps] = useState(false)
  const [pontoReferencia, setPontoReferencia] = useState('')
  const [gravandoVoz, setGravandoVoz] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [sucessoEnvio, setSucessoEnvio] = useState(null)
  const [mensagemToast, setMensagemToast] = useState(null)

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [buscaTexto, setBuscaTexto] = useState('')
  const [paginaLista, setPaginaLista] = useState({ chave: '', limite: TAMANHO_PAGINA_LISTA })

  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null)
  const [registos, setRegistos] = useState([])
  const [carregandoRegistos, setCarregandoRegistos] = useState(false)
  const [mostrarConsultaProtocolo, setMostrarConsultaProtocolo] = useState(() => Boolean(protocoloDoEndereco()))
  const [protocoloConsulta, setProtocoloConsulta] = useState(() => protocoloDoEndereco() || '')
  const [resultadoProtocolo, setResultadoProtocolo] = useState(null)
  const [consultandoProtocolo, setConsultandoProtocolo] = useState(false)
  const [erroProtocolo, setErroProtocolo] = useState('')
  // Estado dos avisos push por ocorrência: 'ativando' | 'ativado' | 'pendente' | ...
  const [avisos, setAvisos] = useState({})
  const [duplicataEncontrada, setDuplicataEncontrada] = useState(null)
  const [mostrarReportModal, setMostrarReportModal] = useState(() => abaDoEndereco() === 'reportar')
  const [erroGps, setErroGps] = useState(null)

  const imprimirCartazA4 = () => {
    feedbackSensorial.toqueSuave()
    setMostrarQrCode(true)
    window.setTimeout(() => window.print(), 100)
  }

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (isStandalone) setPwaInstalado(true)

    const capturarPrompt = (e) => {
      e.preventDefault()
      setPromptInstalacao(e)
    }

    const appInstalada = () => {
      setPwaInstalado(true)
      setPromptInstalacao(null)
      mostrarAlertaToast('Aplicativo instalado com sucesso no celular!')
    }

    window.addEventListener('beforeinstallprompt', capturarPrompt)
    window.addEventListener('appinstalled', appInstalada)

    return () => {
      window.removeEventListener('beforeinstallprompt', capturarPrompt)
      window.removeEventListener('appinstalled', appInstalada)
    }
  }, [])

  const instalarAplicacaoPWA = async () => {
    feedbackSensorial.toqueSuave()
    if (!promptInstalacao) {
      mostrarAlertaToast('Use a opção "Adicionar à tela inicial" no menu do navegador.')
      return
    }

    promptInstalacao.prompt()
    const { outcome } = await promptInstalacao.userChoice

    if (outcome === 'accepted') {
      setPwaInstalado(true)
      setPromptInstalacao(null)
    }
  }

  useEffect(() => {
    const lidasSalvas = localStorage.getItem('zelador_notificacoes_lidas')
    if (lidasSalvas) {
      try {
        setNotificacoesLidas(JSON.parse(lidasSalvas))
      } catch (e) {
        console.warn('Erro ao carregar notificações lidas:', e)
      }
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      mostrarAlertaToast('Conexão restabelecida! Sincronizando dados...')
      sincronizarRef.current?.()
    }
    const handleOffline = () => {
      mostrarAlertaToast('Sem conexão à internet. Sua ocorrência será salva e enviada automaticamente.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    // Os handlers usam refs/setters estáveis; registar uma única vez.
  }, [])

  // Arranque: lê a fila guardada (IndexedDB) e, se houver rede e registos pendentes, sincroniza
  // sem esperar por um evento "online". Também sincroniza quando o utilizador volta ao app.
  useEffect(() => {
    let temporizador
    pedirArmazenamentoPersistente()
    lerFila()
      .then((fila) => {
        setFilaOffline(fila)
        if (fila.length > 0) pedirEnvioEmSegundoPlano()
        // Registros enviados em segundo plano com o app fechado: ativa os avisos pedidos sem rede.
        if (navigator.onLine) concluirAvisosForaDaFila(fila.map((item) => item.id)).catch(() => {})
        if (navigator.onLine && fila.length > 0) {
          temporizador = window.setTimeout(() => sincronizarRef.current?.(), 2000)
        }
      })
      .catch((erro) => console.error('Não foi possível ler a fila offline:', erro))

    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) sincronizarRef.current?.()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  useEffect(() => {
    const onboardingVisto = localStorage.getItem('zelador_onboarding_concluido')
    if (!onboardingVisto) {
      setMostrarOnboarding(true)
    }

    // O GPS deixa de ser pedido no arranque (pedido de permissão sem contexto e gasto de bateria):
    // é pedido ao abrir o registo (assistente ou aba "Registar").
    carregarRegistos()
  }, [])

  const marcarNotificacaoComoLida = (id) => {
    feedbackSensorial.toqueSuave()
    if (!notificacoesLidas.includes(id)) {
      const atualizadas = [...notificacoesLidas, id]
      setNotificacoesLidas(atualizadas)
      localStorage.setItem('zelador_notificacoes_lidas', JSON.stringify(atualizadas))
    }
  }

  const marcarTodasNotificacoesComoLidas = () => {
    feedbackSensorial.toqueSuave()
    const todosIds = NOTIFICACOES_PADRAO.map((n) => n.id)
    setNotificacoesLidas(todosIds)
    localStorage.setItem('zelador_notificacoes_lidas', JSON.stringify(todosIds))
  }

  const notificacoesNaoLidas = NOTIFICACOES_PADRAO.filter((n) => !notificacoesLidas.includes(n.id)).length

  const mostrarAlertaToast = (texto) => {
    setMensagemToast(texto)
    setTimeout(() => {
      setMensagemToast(null)
    }, 4500)
  }

  const consultarProtocolo = async (e, codigoDireto) => {
    e?.preventDefault()
    const codigo = (codigoDireto ?? protocoloConsulta).trim().toUpperCase().replace(/^PROTOCOLO\s+/, '')
    const prefixo = codigo.replace(/^ZD-/, '')
    if (!prefixo || prefixo.length < 6) {
      setErroProtocolo('Digite um protocolo no formato ZD-XXXXXX.')
      setResultadoProtocolo(null)
      return
    }

    setConsultandoProtocolo(true)
    setErroProtocolo('')
    try {
      let resultado = registos.find((item) => protocoloCivico(item.id) === `ZD-${prefixo.slice(0, 6)}`)
      if (!resultado) {
        // Procura no servidor: devolve só a ocorrência pedida (public.consultar_protocolo).
        const { data, error } = await supabase.rpc('consultar_protocolo', { codigo: `ZD-${prefixo.slice(0, 6)}` })
        if (!error) {
          resultado = data?.[0]
        } else if (['PGRST202', '42883'].includes(error.code)) {
          // Função ainda não criada no Supabase: recorre à procura antiga no cliente.
          const antigo = await supabase
            .from('ocorrencias_georreferenciadas')
            .select('*')
            .limit(1000)
          if (antigo.error) throw antigo.error
          resultado = antigo.data?.find((item) => protocoloCivico(item.id) === `ZD-${prefixo.slice(0, 6)}`)
        } else {
          throw error
        }
      }

      if (!resultado) {
        setErroProtocolo('Nenhuma ocorrência encontrada para esse protocolo.')
        setResultadoProtocolo(null)
      } else {
        setResultadoProtocolo(resultado)
      }
    } catch (err) {
      setErroProtocolo('Não foi possível consultar o protocolo: ' + err.message)
      setResultadoProtocolo(null)
    } finally {
      setConsultandoProtocolo(false)
    }
  }

  // Aberto a partir de um aviso push (/?protocolo=ZD-XXXXXX): mostra logo o andamento.
  useEffect(() => {
    const codigo = protocoloDoEndereco()
    if (!codigo) return undefined
    const temporizador = window.setTimeout(() => consultarProtocolo(null, codigo), 0)
    return () => window.clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Inscreve este celular nos avisos push do protocolo (lib/push.js).
  const ativarAvisos = async (ocorrencia) => {
    if (!ocorrencia?.id) return
    feedbackSensorial.toqueSuave()
    setAvisos((atuais) => ({ ...atuais, [ocorrencia.id]: 'ativando' }))
    let estado
    try {
      estado = await ativarAvisosDoProtocolo(ocorrencia.id, { jaNoServidor: !ocorrencia.pendenteDeEnvio })
    } catch (erro) {
      console.error('Falha ao ativar avisos:', erro)
      estado = 'erro'
    }
    setAvisos((atuais) => ({ ...atuais, [ocorrencia.id]: estado }))
    mostrarAlertaToast(MENSAGENS_AVISOS[estado] || 'Não foi possível ativar os avisos agora. Tente novamente.')
  }

  // Depois de "Também vi este problema": atualiza o total na lista, no detalhe e na consulta.
  const registrarApoio = (id, total, mensagem) => {
    const comTotal = (item) => (item && item.id === id ? { ...item, total_apoios: total } : item)
    setRegistos((atuais) => atuais.map(comTotal))
    setOcorrenciaSelecionada(comTotal)
    setResultadoProtocolo(comTotal)
    if (mensagem) mostrarAlertaToast(mensagem)
    return mensagem === MENSAGENS_APOIO.apoiado || mensagem === MENSAGENS_APOIO.repetido
  }

  const estadoAvisos = (id) => avisos[id] || (id && avisosAtivosPara(id) ? 'ativado' : null)

  const concluirOnboarding = () => {
    feedbackSensorial.toqueSuave()
    localStorage.setItem('zelador_onboarding_concluido', 'true')
    setMostrarOnboarding(false)
  }

  // Modo Fácil: todo o texto e os botões ficam 12,5% maiores (as medidas do Tailwind são em rem).
  useEffect(() => {
    document.documentElement.style.fontSize = modo === 'facil' ? '112.5%' : ''
  }, [modo])

  const alternarModo = (novoModo) => {
    feedbackSensorial.toqueSuave()
    setModo(novoModo)
    localStorage.setItem('zelador_modo_interface', novoModo)
    if (novoModo === 'facil') {
      falarTexto('Modo fácil ativado. Botões ampliados e áudio ativo.')
    } else {
      falarTexto('Modo normal ativado.')
    }
  }

  const falarTexto = (texto) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(texto)
      utterance.lang = 'pt-BR'
      utterance.rate = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  const alternarReconhecimentoVoz = () => {
    feedbackSensorial.toqueSuave()
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      feedbackSensorial.alertaErro()
      mostrarAlertaToast('Reconhecimento de voz não suportado neste navegador.')
      return
    }

    if (gravandoVoz) {
      setGravandoVoz(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => {
        setGravandoVoz(true)
        falarTexto('Fale o ponto de referência.')
      }

      recognition.onresult = (event) => {
        feedbackSensorial.gpsSucesso()
        const textoFalado = event.results[0][0].transcript
        setPontoReferencia((prev) => (prev ? `${prev} ${textoFalado}` : textoFalado))
        setGravandoVoz(false)
      }

      recognition.onerror = () => setGravandoVoz(false)
      recognition.onend = () => setGravandoVoz(false)
      recognition.start()
    } catch (e) {
      console.warn('Erro voz:', e)
      setGravandoVoz(false)
    }
  }

  const carregarRegistos = async () => {
    try {
      setCarregandoRegistos(true)
      const { data, error } = await supabase
        .from('ocorrencias_georreferenciadas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRegistos(data || [])
      setDadosGuardadosEm(null)
      // Guarda uma cópia para a lista e o mapa funcionarem sem internet.
      gravarCache('registos', { dados: data || [], em: new Date().toISOString() }).catch(() => {})
    } catch (err) {
      console.error('Erro ao buscar registros:', err.message)
      try {
        const copia = await lerCache('registos')
        if (copia?.dados) {
          setRegistos(copia.dados)
          setDadosGuardadosEm(copia.em)
        }
      } catch {
        /* sem cópia guardada */
      }
    } finally {
      setCarregandoRegistos(false)
    }
  }

  const obterLocalizacaoAtual = () => {
    feedbackSensorial.toqueSuave()
    if (!navigator.geolocation) {
      feedbackSensorial.alertaErro()
      mostrarAlertaToast('Geolocalização não suportada no seu dispositivo.')
      return
    }

    setCapturandoGps(true)
    setErroGps(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }
        setLocalizacao(coords)
        setOrigemLocalizacao('gps')
        setCapturandoGps(false)
        feedbackSensorial.gpsSucesso()

        const dist = calcularDistanciaKm(
          coords.latitude,
          coords.longitude,
          CENTRO_COMUNITARIO.latitude,
          CENTRO_COMUNITARIO.longitude
        )
        if (dist > CENTRO_COMUNITARIO.raioMaximoKm) {
          mostrarAlertaToast(
            `Aviso: Coordenadas a ${dist.toFixed(1)} km do Residencial Novo Cristo.`
          )
        }

        if (modo === 'facil') {
          falarTexto('Coordenadas capturadas com sucesso.')
        }
      },
      (err) => {
        console.warn('GPS pendente:', err.message)
        setCapturandoGps(false)
        const mensagens = {
          1: 'Permissão de localização negada. Ative a localização para este site nas definições do navegador.',
          2: 'Não foi possível determinar a localização. Vá para um local aberto e tente novamente.',
          3: 'O GPS demorou demasiado a responder. Tente de novo.'
        }
        setErroGps(mensagens[err.code] || 'Não foi possível obter a localização.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleFotoChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        setProcessandoFoto(true)
        feedbackSensorial.toqueSuave()

        const gpsExif = await extrairGpsExif(file)
        if (gpsExif) {
          setLocalizacao(gpsExif)
          setOrigemLocalizacao('exif')
          feedbackSensorial.gpsSucesso()

          const dist = calcularDistanciaKm(
            gpsExif.latitude,
            gpsExif.longitude,
            CENTRO_COMUNITARIO.latitude,
            CENTRO_COMUNITARIO.longitude
          )
          if (dist > CENTRO_COMUNITARIO.raioMaximoKm) {
            mostrarAlertaToast(
              `📍 Foto tirada a ${dist.toFixed(1)} km do setor comunitário.`
            )
          } else {
            mostrarAlertaToast('📍 Localização extraída da fotografia!')
          }

          if (modo === 'facil') falarTexto('Localização da foto identificada.')
        }

        // Compressão única: o ficheiro guardado já é o que será enviado (sem recomprimir no envio).
        const comprimida = await otimizarImagem(file)
        setFoto(comprimida)
        trocarPreview(comprimida)

        if (modo === 'facil' && !gpsExif) falarTexto('Fotografia adicionada e otimizada.')
      } catch (err) {
        console.warn('Falha no processamento da imagem:', err)
        setFoto(file)
        trocarPreview(file)
      } finally {
        setProcessandoFoto(false)
      }
    }
  }

  // Cria o URL de pré-visualização e liberta o anterior (evita acumular fotos em memória).
  const trocarPreview = (arquivo) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = arquivo ? URL.createObjectURL(arquivo) : null
    setFotoPreview(previewUrlRef.current)
  }

  const removerFoto = () => {
    feedbackSensorial.toqueSuave()
    setFoto(null)
    trocarPreview(null)
  }

  const selecionarCategoria = (cat) => {
    feedbackSensorial.toqueSuave()
    setCategoria(cat.id)
    if (modo === 'facil') falarTexto(cat.fala)
  }

  const partilharOcorrencia = async (item) => {
    feedbackSensorial.toqueSuave()
    const categoriaLabel = rotuloDaCategoria(item.categoria)
    const textoPartilha = `📢 *Zelador Digital - Ocorrência Comunitária*\n📍 *Tipo:* ${categoriaLabel}\n📝 *Detalhe:* ${item.descricao || 'Sem descrição'}\n📌 *Status:* ${rotuloDoEstado(item.status)}\n🗺️ *Ver no Mapa:* https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ocorrência: ${categoriaLabel}`,
          text: textoPartilha
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Falha no compartilhamento nativo:', err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(textoPartilha)
        mostrarAlertaToast('Texto da ocorrência copiado para a área de transferência!')
      } catch (e) {
        mostrarAlertaToast('Não foi possível copiar o texto.')
      }
    }
  }

  // Trava compartilhada com o envio em segundo plano (public/sync-sw.js): um envia, o outro espera
  // e depois encontra a fila já vazia. Sem suporte a Web Locks, segue sem trava.
  const sincronizarFilaOffline = () =>
    navigator.locks ? navigator.locks.request('zelador-fila-offline', enviarFilaOffline) : enviarFilaOffline()

  const enviarFilaOffline = async () => {
    if (sincronizandoRef.current) return
    let pendentes
    try {
      pendentes = await lerFila()
    } catch (erro) {
      console.error('Não foi possível ler a fila offline:', erro)
      return
    }
    if (pendentes.length === 0) {
      setFilaOffline([])
      return
    }

    sincronizandoRef.current = true
    setSincronizandoFila(true)
    const sincronizados = []

    try {
      for (const item of pendentes) {
        try {
          let urlFotoPublica = item.fotoUrl || null

          // Envia a foto uma única vez. Se o upload falhar, o item fica na fila (nunca segue sem foto).
          if (!urlFotoPublica && item.foto) {
            const blob = item.foto
            const extensao = blob.type === 'image/webp' ? 'webp' : 'jpg'
            const filePath = `ocorrencias/${Date.now()}_offline_${Math.random().toString(36).substring(2, 7)}.${extensao}`

            const uploadResult = await supabase.storage.from('ocorrencias').upload(filePath, blob, {
              contentType: blob.type || 'image/jpeg'
            })
            if (uploadResult.error) throw uploadResult.error

            const { data: publicData } = supabase.storage.from('ocorrencias').getPublicUrl(filePath)
            urlFotoPublica = publicData?.publicUrl || null
            // Guarda o URL e liberta a foto: uma nova tentativa já não repete o upload.
            await atualizarItemNaFila(item.id, { fotoUrl: urlFotoPublica, foto: null })
          }

          const pontoWKT = `POINT(${item.longitude} ${item.latitude})`
          const { error: insertError } = await supabase.from('ocorrencias').insert([
            {
              ...(ehUuid(item.id) ? { id: item.id } : {}),
              categoria: item.categoria,
              descricao: item.descricao,
              foto_url: urlFotoPublica,
              localizacao: pontoWKT,
              status: 'pendente'
            }
          ])
          // 23505 = chave duplicada: este registo já chegou ao servidor numa tentativa anterior.
          if (insertError && insertError.code !== '23505') throw insertError
          sincronizados.push(item.id)
        } catch (e) {
          console.error('Falha ao sincronizar item offline:', e)
        }
      }
    } finally {
      // Remove só o que foi enviado, relendo a fila: registos guardados entretanto não se perdem.
      try {
        setFilaOffline(await removerDaFila(sincronizados))
      } catch (e) {
        console.error('Falha ao atualizar a fila offline:', e)
      }
      sincronizandoRef.current = false
      setSincronizandoFila(false)
    }

    if (sincronizados.length > 0) {
      carregarRegistos()
      concluirAvisosPendentes(sincronizados).catch((erro) => console.warn('Avisos pendentes:', erro))
    }

    const falhados = pendentes.length - sincronizados.length
    if (falhados === 0) {
      feedbackSensorial.envioSucesso()
      mostrarAlertaToast('Todos os registros offline foram sincronizados com sucesso!')
    } else if (sincronizados.length > 0) {
      mostrarAlertaToast(`${sincronizados.length} registro(s) enviado(s). ${falhados} ficam no celular para nova tentativa.`)
    } else {
      mostrarAlertaToast('Não foi possível enviar os registros pendentes agora. Ficam salvos no celular para nova tentativa.')
    }
    // O que falhou fica com o navegador para tentar de novo, mesmo se o app for fechado.
    if (falhados > 0) pedirEnvioEmSegundoPlano()
  }

  // Mantém o ref apontado para a versão atual da função de sincronização.
  useEffect(() => {
    sincronizarRef.current = sincronizarFilaOffline
    aoFilaEnviadaRef.current = (ids) => {
      lerFila().then(setFilaOffline).catch(() => {})
      carregarRegistos()
      concluirAvisosPendentes(ids).catch((erro) => console.warn('Avisos pendentes:', erro))
      mostrarAlertaToast('Registros feitos sem internet foram enviados.')
    }
  })

  // Mensagens do envio em segundo plano (public/sync-sw.js).
  useEffect(() => {
    return aoEnviarEmSegundoPlano((ids) => aoFilaEnviadaRef.current?.(ids))
  }, [])

  // Insere com o UUID gerado no telemóvel. Se o esquema não aceitar um id vindo do cliente
  // (coluna não-UUID ou identity), repete sem id e usa o id devolvido pelo servidor.
  const inserirOcorrencia = async (registo) => {
    const tentativa = await supabase.from('ocorrencias').insert([registo]).select('id').single()
    if (!tentativa.error) return tentativa.data
    if (['22P02', '428C9', '42703'].includes(tentativa.error.code)) {
      const semId = { ...registo }
      delete semId.id
      const repeticao = await supabase.from('ocorrencias').insert([semId]).select('id').single()
      if (repeticao.error) throw new Error(repeticao.error.message)
      return repeticao.data
    }
    throw new Error(tentativa.error.message)
  }

  const encontrarDuplicata = async () => {
    const { data, error } = await supabase
      .from('ocorrencias_georreferenciadas')
      .select('id,categoria,status,latitude,longitude,descricao,total_apoios,created_at')
      .eq('categoria', categoria)
      .in('status', VALORES_EM_ABERTO)
      .limit(500)

    if (error) throw error
    return (data || []).find((item) => distanciaMetros(localizacao, item) < 50) || null
  }

  const handleSubmit = async (e, ignorarDuplicidade = false) => {
    e.preventDefault()

    if (!localizacao) {
      feedbackSensorial.alertaErro()
      mostrarAlertaToast('Por favor, capture a localização GPS antes de enviar.')
      if (modo === 'facil') falarTexto('Atenção: capture a localização primeiro.')
      return
    }

    const latitudeValida = localizacao.latitude >= -1.45 && localizacao.latitude <= -1.25
    const longitudeValida = localizacao.longitude >= -48.45 && localizacao.longitude <= -48.30
    if (!latitudeValida || !longitudeValida) {
      feedbackSensorial.alertaErro()
      mostrarAlertaToast('A localização capturada está fora da área aproximada de Ananindeua. Confirme o GPS antes de enviar.')
      return
    }

    const idOcorrencia = gerarIdOcorrencia()

    try {
      setEnviando(true)

      if (navigator.onLine && !ignorarDuplicidade) {
        const duplicata = await encontrarDuplicata()
        if (duplicata) {
          setDuplicataEncontrada(duplicata)
          return
        }
      }

      const fotoOtimizada = foto

      if (!navigator.onLine) {
        const itemOffline = {
          id: idOcorrencia,
          categoria,
          descricao: pontoReferencia.trim() || 'Ocorrência registrada offline',
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
          foto: fotoOtimizada || null,
          criadoEm: new Date().toISOString()
        }

        setFilaOffline(await adicionarAFila(itemOffline))
        pedirEnvioEmSegundoPlano()

        feedbackSensorial.envioSucesso()
        const mensagemOffline = 'Sem conexão à internet. Sua ocorrência foi salva e será enviada automaticamente assim que a rede voltar.'
        mostrarAlertaToast(mensagemOffline)
        if (modo === 'facil') falarTexto(mensagemOffline)

        setSucessoEnvio({
          id: itemOffline.id,
          categoria,
          foto_url: fotoPreview,
          descricao: `${pontoReferencia.trim() || 'Ocorrência comunitária'} (Salvo Offline)`,
          pendenteDeEnvio: true,
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
          status: 'pendente'
        })

        setPontoReferencia('')
        setFoto(null)
        setFotoPreview(null)
        return
      }

      let urlFotoPublica = null

      if (fotoOtimizada) {
        const fileExt = fotoOtimizada.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `ocorrencias/${fileName}`

        const uploadResult = await supabase.storage.from('ocorrencias').upload(filePath, fotoOtimizada, {
          contentType: fotoOtimizada.type,
          cacheControl: '3600'
        })
        if (uploadResult.error) {
          throw new Error(`Erro ao enviar foto: ${uploadResult.error.message}`)
        }

        const { data: publicData } = supabase.storage.from('ocorrencias').getPublicUrl(filePath)
        urlFotoPublica = publicData?.publicUrl || null
      }

      const pontoWKT = `POINT(${localizacao.longitude} ${localizacao.latitude})`

      const ocorrenciaCriada = await inserirOcorrencia({
        id: idOcorrencia,
        categoria: categoria,
        descricao: pontoReferencia.trim() || 'Ocorrência registrada pela comunidade',
        foto_url: urlFotoPublica,
        localizacao: pontoWKT,
        status: 'pendente'
      })

      feedbackSensorial.envioSucesso()
      if (modo === 'facil') {
        falarTexto('Registro territorial enviado com sucesso! Muito obrigado.')
      }

      setSucessoEnvio({
        id: ocorrenciaCriada?.id,
        categoria,
        foto_url: urlFotoPublica,
        descricao: pontoReferencia.trim() || 'Ocorrência registrada pela comunidade',
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        status: 'pendente'
      })

      setPontoReferencia('')
      setFoto(null)
      setFotoPreview(null)
      carregarRegistos()
    } catch (err) {
      if (!navigator.onLine || /network|fetch|failed to fetch|offline/i.test(err.message || '')) {
        try {
          const fotoOtimizada = foto
          const itemOffline = {
            id: idOcorrencia,
            categoria,
            descricao: pontoReferencia.trim() || 'Ocorrência registrada pela comunidade',
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            foto: fotoOtimizada || null,
            criadoEm: new Date().toISOString()
          }
          setFilaOffline(await adicionarAFila(itemOffline))
          pedirEnvioEmSegundoPlano()
          const mensagemOffline = 'Sem conexão à internet. Sua ocorrência foi salva e será enviada automaticamente assim que a rede voltar.'
          mostrarAlertaToast(mensagemOffline)
          if (modo === 'facil') falarTexto(mensagemOffline)
          setSucessoEnvio({
            id: itemOffline.id,
            categoria,
            foto_url: fotoPreview,
            descricao: `${itemOffline.descricao} (Salvo Offline)`,
            pendenteDeEnvio: true,
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            status: 'pendente'
          })
          setPontoReferencia('')
          setFoto(null)
          setFotoPreview(null)
          return
        } catch (queueError) {
          console.error('Falha ao salvar ocorrência offline:', queueError)
          if (queueError instanceof FilaCheiaError) {
            feedbackSensorial.alertaErro()
            mostrarAlertaToast(queueError.message)
            return
          }
        }
      }
      feedbackSensorial.alertaErro()
      if (err instanceof FilaCheiaError) {
        mostrarAlertaToast(err.message)
        return
      }
      console.error('Erro de envio:', err)
      mostrarAlertaToast(`Falha no registro: ${err.message || 'Erro de comunicação'}`)
    } finally {
      setEnviando(false)
    }
  }

  const distanciaAtualKm = useMemo(() => {
    if (!localizacao) return null
    return calcularDistanciaKm(
      localizacao.latitude,
      localizacao.longitude,
      CENTRO_COMUNITARIO.latitude,
      CENTRO_COMUNITARIO.longitude
    )
  }, [localizacao])

  const abrirAbaRegistar = () => {
    setAbaAtiva('reportar')
    if (!localizacao && !capturandoGps) obterLocalizacaoAtual()
  }

  const registosFiltrados = useMemo(() => {
    return registos.filter((item) => {
      const bateuCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria
      const isResolvido = estaResolvido(item.status)
      const bateuStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'resolvido' && isResolvido) ||
        (filtroStatus === 'pendente' && !isResolvido)
      const bateuTexto =
        !buscaTexto.trim() ||
        (item.descricao && item.descricao.toLowerCase().includes(buscaTexto.toLowerCase())) ||
        (item.categoria && item.categoria.toLowerCase().includes(buscaTexto.toLowerCase()))

      return bateuCategoria && bateuStatus && bateuTexto
    })
  }, [registos, filtroCategoria, filtroStatus, buscaTexto])

  const chaveFiltrosLista = `${filtroCategoria}|${filtroStatus}|${buscaTexto}`
  const limiteLista = paginaLista.chave === chaveFiltrosLista ? paginaLista.limite : TAMANHO_PAGINA_LISTA
  const registosVisiveis = registosFiltrados.slice(0, limiteLista)

  const totalRegistos = registos.length
  const totalResolvidos = registos.filter((r) => estaResolvido(r.status)).length
  const totalPendentes = registos.length - totalResolvidos
  const taxaResolucao = totalRegistos > 0 ? Math.round((totalResolvidos / totalRegistos) * 100) : 0

  const urlApp = typeof window !== 'undefined' ? window.location.origin : 'https://zeladordigital.vercel.app'
  return (
    <div className={`min-h-dvh flex flex-col justify-between font-sans pb-[calc(5rem+env(safe-area-inset-bottom))] ${modo === 'facil' ? 'bg-amber-50/30 text-slate-900' : 'bg-slate-100/70 text-slate-800'}`}>
      <Header
        estaOnline={estaOnline}
        filaPendente={filaOffline.length}
        sincronizandoFila={sincronizandoFila}
        onSincronizar={sincronizarFilaOffline}
        dadosGuardadosEm={dadosGuardadosEm}
        notificacoesNaoLidas={notificacoesNaoLidas}
        onIrParaInicio={() => {
          feedbackSensorial.toqueSuave()
          setAbaAtiva('inicio')
          setOcorrenciaSelecionada(null)
        }}
        onAbrirNotificacoes={() => {
          feedbackSensorial.toqueSuave()
          setMostrarNotificacoes(true)
        }}
        onAbrirSobre={() => setModalSobreAberto(true)}
        modoFacil={modo === 'facil'}
        onAlternarModoFacil={() => alternarModo(modo === 'facil' ? 'normal' : 'facil')}
      />

      {/* TOAST FLUTUANTE */}
      {mensagemToast && (
        <div className="fixed top-4 left-4 right-4 z-[80] max-w-md mx-auto animate-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700/80 backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <span className="text-amber-400 text-lg">ℹ️</span>
              <p className="text-xs font-semibold leading-snug">{mensagemToast}</p>
            </div>
            <button
              onClick={() => {
                feedbackSensorial.toqueSuave()
                setMensagemToast(null)
              }}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <AvisoAtualizacao />

      {mostrarQrCode && (
        <Suspense fallback={null}>
          <ModalQRCode url={urlApp} onClose={() => setMostrarQrCode(false)} />
        </Suspense>
      )}

      {mostrarReportModal && (
        <ErrorBoundary
          nome="Nova ocorrência"
          fallback={({ tentarDeNovo }) => (
            <div className="fixed inset-0 z-[60] bg-slate-950/75 flex items-center justify-center p-4">
              <div role="alertdialog" aria-modal="true" aria-labelledby="erro-registo-titulo" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
                <h2 id="erro-registo-titulo" className="text-base font-black text-slate-800">O registro encontrou um erro</h2>
                <p className="mt-2 text-sm text-slate-600">Os dados que você já preencheu continuam salvos.</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMostrarReportModal(false)} className="min-h-12 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">Fechar</button>
                  <button type="button" onClick={tentarDeNovo} className="min-h-12 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 cursor-pointer">Tentar novamente</button>
                </div>
              </div>
            </div>
          )}
        >
          <ReportModal
            onFechar={() => {
              feedbackSensorial.toqueSuave()
              setMostrarReportModal(false)
              setSucessoEnvio(null)
            }}
            modo={modo}
            falarTexto={falarTexto}
            estaOnline={estaOnline}
            categorias={CATEGORIAS}
            resultado={sucessoEnvio}
        estadoAvisos={sucessoEnvio ? estadoAvisos(sucessoEnvio.id) : null}
            form={{
              categoria,
              fotoPreview,
              processandoFoto,
              localizacao,
              origemLocalizacao,
              capturandoGps,
              erroGps,
              distanciaKm: distanciaAtualKm,
              raioMaximoKm: CENTRO_COMUNITARIO.raioMaximoKm,
              pontoReferencia,
              gravandoVoz,
              enviando
            }}
            acoes={{
              selecionarCategoria,
              fotoChange: handleFotoChange,
              removerFoto,
              capturarGps: obterLocalizacaoAtual,
              pontoReferenciaChange: setPontoReferencia,
              alternarVoz: alternarReconhecimentoVoz,
              enviar: () => handleSubmit({ preventDefault: () => {} }),
              partilhar: partilharOcorrencia,
          ativarAvisos,
              verRegistos: () => {
                feedbackSensorial.toqueSuave()
                setMostrarReportModal(false)
                setSucessoEnvio(null)
                setAbaAtiva('registos')
              }
            }}
          />
        </ErrorBoundary>
      )}

      {/* MODAL DE NOTIFICAÇÕES */}
      {mostrarNotificacoes && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🔔</span>
                <h3 className="font-black text-slate-800 text-sm">Avisos & Comunicados</h3>
              </div>
              <div className="flex items-center space-x-2">
                {notificacoesNaoLidas > 0 && (
                  <button
                    onClick={marcarTodasNotificacoesComoLidas}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Marcar lidas
                  </button>
                )}
                <button
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setMostrarNotificacoes(false)
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm hover:bg-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {NOTIFICACOES_PADRAO.map((item) => {
                const lida = notificacoesLidas.includes(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => marcarNotificacaoComoLida(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      lida
                        ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                        : 'bg-blue-50/40 border-blue-200 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl shrink-0 p-1">{item.icone}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${!lida ? 'text-blue-950 font-black' : 'text-slate-700'}`}>
                            {item.titulo}
                          </h4>
                          {!lida && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                          {item.mensagem}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                          {item.data}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {duplicataEncontrada && (
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl mb-4">⚠️</div>
            <h2 className="text-base font-black text-slate-900">Alguém já registrou este problema aqui</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Existe um chamado em aberto a menos de 50 m (Protocolo {protocoloCivico(duplicataEncontrada.id)}
              {duplicataEncontrada.descricao ? `: “${duplicataEncontrada.descricao}”` : ''}). Confirmar o registro existente ajuda mais do que criar outro igual.
            </p>
            <div className="mt-4">
              <BotaoApoio
                destaque
                ocorrencia={duplicataEncontrada}
                onApoiado={(total, mensagem) => {
                  if (registrarApoio(duplicataEncontrada.id, total, mensagem)) {
                    setDuplicataEncontrada(null)
                    setMostrarReportModal(false)
                  }
                }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDuplicataEncontrada(null)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicataEncontrada(null)
                  handleSubmit({ preventDefault: () => {} }, true)
                }}
                className="rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-black text-white hover:bg-amber-700 cursor-pointer"
              >
                Registrar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO */}
      {mostrarConsultaProtocolo && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Acompanhamento cidadão</span>
                <h2 className="text-lg font-black text-slate-800 mt-1">Consultar Protocolo</h2>
              </div>
              <button type="button" onClick={() => setMostrarConsultaProtocolo(false)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={consultarProtocolo} className="mt-4 flex gap-2">
              <input
                type="text"
                value={protocoloConsulta}
                onChange={(e) => setProtocoloConsulta(e.target.value)}
                placeholder="Ex.: ZD-XXXXXX"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wider focus:border-blue-500 focus:outline-none"
              />
              <button type="submit" disabled={consultandoProtocolo} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer">
                {consultandoProtocolo ? 'Buscando...' : 'Buscar'}
              </button>
            </form>
            {erroProtocolo && <p className="mt-2 text-xs font-bold text-rose-600">{erroProtocolo}</p>}

            {resultadoProtocolo && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-900 p-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">{protocoloCivico(resultadoProtocolo.id)}</p>
                  <h3 className="mt-1 text-base font-black">{rotuloDaCategoria(resultadoProtocolo.categoria)}</h3>
                  <p className="mt-1 text-[11px] text-slate-300">{resultadoProtocolo.bairro || resultadoProtocolo.endereco || resultadoProtocolo.morada || 'Bairro não informado'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Aberta em {resultadoProtocolo.created_at ? new Date(resultadoProtocolo.created_at).toLocaleDateString('pt-BR') : 'data não informada'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start">
                    {['Registrada', 'Em análise', 'Resolvida'].map((titulo, index) => {
                      const atual = etapaDoEstado(resultadoProtocolo.status)
                      const concluida = index + 1 <= atual
                      return (
                        <div key={titulo} className="flex flex-1 items-start">
                          <div className="flex min-w-0 flex-col items-center text-center">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${concluida ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-400'}`}>{concluida ? '✓' : index + 1}</span>
                            <span className="mt-1 text-[9px] font-black text-slate-600">{titulo}</span>
                          </div>
                          {index < 2 && <span className={`mt-3 h-0.5 flex-1 ${index + 1 < atual ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs font-black text-slate-700">Status atual: <span className="text-blue-700">{rotuloDoEstado(resultadoProtocolo.status)}</span></p>
                </div>
                {!estaResolvido(resultadoProtocolo.status) && (
                  <BotaoAvisos estado={estadoAvisos(resultadoProtocolo.id)} onAtivar={() => ativarAvisos(resultadoProtocolo)} />
                )}
                {resultadoProtocolo.observacoes && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                    <strong>Notas e despachos públicos:</strong>
                    <p className="mt-1 leading-relaxed">{resultadoProtocolo.observacoes}</p>
                  </div>
                )}
                {estaResolvido(resultadoProtocolo.status) && resultadoProtocolo.foto_url && resultadoProtocolo.foto_resolucao && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <span className="rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-black text-white">Comprovado por Auditoria Visual</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <img src={resultadoProtocolo.foto_url} alt="Antes: registro inicial" loading="lazy" decoding="async" className="h-28 w-full rounded-xl object-cover" />
                      <img src={resultadoProtocolo.foto_resolucao} alt="Depois: intervenção concluída" loading="lazy" decoding="async" className="h-28 w-full rounded-xl object-cover" />
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[9px] font-bold text-emerald-800"><span>Antes</span><span>Depois</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {sucessoEnvio && !mostrarReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-5 border border-slate-100">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-inner animate-bounce">
              ✓
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Registro Confirmado!</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {estaOnline
                  ? 'Sua ocorrência foi georreferenciada e salva no banco comunitário.'
                  : 'Registro salvo no celular! Será enviado assim que o sinal voltar.'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center space-x-3 text-left">
              {sucessoEnvio.foto_url ? (
                <img
                  src={sucessoEnvio.foto_url}
                  alt="Comprovante"
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
                  📍
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-xs font-black text-slate-800 capitalize block truncate">
                  {rotuloDaCategoria(sucessoEnvio.categoria)}
                </span>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {sucessoEnvio.descricao}
                </p>
              </div>
            </div>
            {sucessoEnvio.id && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Seu protocolo</p>
                <p className="mt-1 text-sm font-black text-blue-900">{protocoloCivico(sucessoEnvio.id)}</p>
              </div>
            )}
            <BotaoAvisos estado={estadoAvisos(sucessoEnvio.id)} onAtivar={() => ativarAvisos(sucessoEnvio)} />

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => partilharOcorrencia(sucessoEnvio)}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>📢</span>
                <span>Compartilhar no WhatsApp / Redes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setSucessoEnvio(null)
                  setAbaAtiva('registos')
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                Acompanhar na Lista de Registros 📋
              </button>
              <button
                type="button"
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setSucessoEnvio(null)
                  abrirAbaRegistar()
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
              >
                Fazer Outro Registro ➕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ONBOARDING */}
      {mostrarOnboarding && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col justify-between text-center space-y-6 relative border border-slate-100">
            <div className="flex justify-end w-full">
              <button
                onClick={concluirOnboarding}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                Pular apresentação ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr ${ETAPAS_ONBOARDING[etapaOnboarding].gradiente} flex items-center justify-center text-4xl shadow-md`}>
                {ETAPAS_ONBOARDING[etapaOnboarding].icone}
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {ETAPAS_ONBOARDING[etapaOnboarding].titulo}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
                  {ETAPAS_ONBOARDING[etapaOnboarding].descricao}
                </p>
              </div>
            </div>

            <div className="flex justify-center items-center space-x-2">
              {ETAPAS_ONBOARDING.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    etapaOnboarding === idx ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="pt-2">
              {etapaOnboarding < ETAPAS_ONBOARDING.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setEtapaOnboarding((prev) => prev + 1)
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99] cursor-pointer"
                >
                  Continuar →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={concluirOnboarding}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99] cursor-pointer"
                >
                  Começar a usar 🚀
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalSobreAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Zelador Digital</span>
                <h2 className="text-lg font-black text-slate-800 mt-1">Sobre o Desenvolvedor</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalSobreAberto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="mt-5 space-y-2">
              <p className="text-base font-black text-slate-800">Dante Dias Monteiro</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Criador e desenvolvedor do Zelador Digital, projeto de iniciativa comunitária independente para mapeamento e acompanhamento de zeladoria urbana em Ananindeua.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalSobreAberto(false)}
              className="w-full mt-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Central */}
      <main className="max-w-md w-full mx-auto px-4 py-4 flex-1">
        {/* MODAL DETALHE COM PARTILHA */}
        {ocorrenciaSelecionada && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📍</span>
                  <h3 className="font-black text-slate-800 text-sm capitalize">
                    {rotuloDaCategoria(ocorrenciaSelecionada.categoria)}
                  </h3>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => partilharOcorrencia(ocorrenciaSelecionada)}
                    className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Compartilhar Ocorrência"
                  >
                    <span>📢</span>
                    <span>Compartilhar</span>
                  </button>
                  <button
                    onClick={() => {
                      feedbackSensorial.toqueSuave()
                      setOcorrenciaSelecionada(null)
                    }}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm hover:bg-slate-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {ocorrenciaSelecionada.foto_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={ocorrenciaSelecionada.foto_url}
                    alt="Comprovante"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Acompanhamento do Chamado</h4>
                
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-1">
                  <div className="relative pl-6">
                    <span className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[8px] text-white">✓</span>
                    <p className="text-xs font-bold text-slate-800">1. Ocorrência Submetida</p>
                    <p className="text-[10px] text-slate-400">
                      {ocorrenciaSelecionada.created_at ? new Date(ocorrenciaSelecionada.created_at).toLocaleString('pt-BR') : 'Data registrada'}
                    </p>
                  </div>

                  <div className="relative pl-6">
                    <span className={`absolute -left-2 top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white ${
                      etapaDoEstado(ocorrenciaSelecionada.status) >= 2
                        ? 'bg-amber-500'
                        : 'bg-slate-300'
                    }`}>
                      {etapaDoEstado(ocorrenciaSelecionada.status) >= 2 ? '✓' : '•'}
                    </span>
                    <p className="text-xs font-bold text-slate-800">2. Em Análise Territorial</p>
                    <p className="text-[10px] text-slate-400">Demandas em triagem comunitária</p>
                  </div>

                  <div className="relative pl-6">
                    <span className={`absolute -left-2 top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white ${
                      estaResolvido(ocorrenciaSelecionada.status)
                        ? 'bg-emerald-600'
                        : 'bg-slate-300'
                    }`}>
                      {estaResolvido(ocorrenciaSelecionada.status) ? '✓' : '•'}
                    </span>
                    <p className="text-xs font-bold text-slate-800">3. Solução Concluída</p>
                    <p className="text-[10px] text-slate-400">Zeladoria executada</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Descrição / Referência</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {ocorrenciaSelecionada.descricao || 'Sem descrição detalhada fornecida.'}
                </p>
              </div>

              {!estaResolvido(ocorrenciaSelecionada.status) && (
                <BotaoApoio
                  key={ocorrenciaSelecionada.id}
                  ocorrencia={ocorrenciaSelecionada}
                  onApoiado={(total, mensagem) => registrarApoio(ocorrenciaSelecionada.id, total, mensagem)}
                />
              )}

              {ocorrenciaSelecionada.latitude && ocorrenciaSelecionada.longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${ocorrenciaSelecionada.latitude},${ocorrenciaSelecionada.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => feedbackSensorial.toqueSuave()}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold text-center block shadow-sm hover:bg-slate-800"
                >
                  Abrir Coordenadas no Google Maps ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* 1. INÍCIO */}
        {abaAtiva === 'inicio' && (
          <div className="flex flex-col gap-3 px-2.5 py-2 max-w-lg mx-auto w-full">
            {!pwaInstalado && !bannerPwaIgnorado && (
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-4 shadow-sm border border-slate-800 relative overflow-hidden">
                <button
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setBannerPwaIgnorado(true)
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-white/10"
                >
                  ✕
                </button>
                <div className="flex items-center space-x-3.5 pr-6">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-xl shrink-0 shadow-md">
                    📲
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-300">Instalar aplicativo</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      Acesse o Zelador Digital diretamente na tela do seu celular sem gastar memória.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-end space-x-2">
                  <button
                    onClick={instalarAplicacaoPWA}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    Instalar Agora 📲
                  </button>
                </div>
              </div>
            )}

            <StatsOverview total={totalRegistos} resolvidos={totalResolvidos} pendentes={totalPendentes} />

            <div>
              <h2 className="mb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Ações Rápidas</h2>

              <RegisterButton
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setSucessoEnvio(null)
                  setMostrarReportModal(true)
                }}
              />

              <div className="grid grid-cols-3 gap-2 mt-2.5">
                <button
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setAbaAtiva('registos')
                  }}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
                >
                  <div className="w-6 h-6 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm mb-2 border border-emerald-100">
                    📋
                  </div>
                  <span className="text-xs font-black text-slate-800">Registros</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Histórico</span>
                </button>

                <button
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setAbaAtiva('mapa')
                  }}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
                >
                  <div className="w-6 h-6 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-sm mb-2 border border-sky-100">
                    🗺️
                  </div>
                  <span className="text-xs font-black text-slate-800">Ver Mapa</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Pontos e calor</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setErroProtocolo('')
                    setResultadoProtocolo(null)
                    setProtocoloConsulta('')
                    setMostrarConsultaProtocolo(true)
                  }}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
                >
                  <div className="w-6 h-6 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 border border-indigo-100">
                    <Search size={14} strokeWidth={2.25} />
                  </div>
                  <span className="text-xs font-black text-slate-800">Consultar</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Protocolo</span>
                </button>
              </div>
            </div>

            <CommunityAlert
              onAbrirQrCode={() => {
                feedbackSensorial.toqueSuave()
                setMostrarQrCode(true)
              }}
              onImprimirCartaz={imprimirCartazA4}
            />
          </div>
        )}

        {/* 2. REPORTAR */}
        {abaAtiva === 'reportar' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800">Novo Registro Territorial</h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${estaOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {estaOnline ? 'Online' : 'Armazenamento Local'}
              </span>
            </div>

            {modo === 'facil' && (
              <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-3 flex items-center justify-between text-amber-900">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🔊</span>
                  <span className="text-xs font-bold">Modo Fácil: Botões ampliados e áudio ativo</span>
                </div>
                <button
                  type="button"
                  onClick={() => falarTexto('Escolha o problema, tire a foto e clique no botão enviar.')}
                  className="text-xs bg-amber-500 text-white font-bold px-2.5 py-1 rounded-xl shadow-2xs cursor-pointer"
                >
                  Ouvir Ajuda
                </button>
              </div>
            )}

            <div>
              <label className={`block font-black text-slate-600 uppercase tracking-wider mb-2.5 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                1. Selecione o Tipo:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIAS.map((cat) => {
                  const ativo = categoria === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selecionarCategoria(cat)}
                      className={`rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        modo === 'facil' ? 'p-5' : 'p-3.5'
                      } ${
                        ativo
                          ? `${cat.activeBg} ${cat.border} shadow-sm scale-[1.01]`
                          : `bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100`
                      }`}
                    >
                      <span className={modo === 'facil' ? 'text-3xl mb-1' : 'text-2xl mb-1'}>{cat.icon}</span>
                      <span className={`font-bold ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className={`block font-black text-slate-600 uppercase tracking-wider mb-2 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                2. Fotografia do Local:
              </label>

              {processandoFoto ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-blue-600 font-bold animate-pulse">
                  Otimizando a foto e lendo a localização... ⚡
                </div>
              ) : fotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={fotoPreview} alt="Visualização" className={`w-full object-cover ${modo === 'facil' ? 'h-64' : 'h-48'}`} />
                  <button
                    type="button"
                    onClick={removerFoto}
                    className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all cursor-pointer"
                  >
                    ✕ Trocar Foto
                  </button>
                </div>
              ) : (
                <label className={`border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-all ${modo === 'facil' ? 'p-7' : 'p-5'}`}>
                  <span className={modo === 'facil' ? 'text-3xl mb-1' : 'text-2xl mb-1'}>📸</span>
                  <span className={`font-bold text-slate-700 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>Tirar foto ou selecionar</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Leitura de GPS EXIF e compressão automática</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Localização e Validação Territorial (Geofencing) */}
            <div className={`rounded-2xl border border-slate-200 bg-slate-50 space-y-2 ${modo === 'facil' ? 'p-4' : 'p-3.5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">{origemLocalizacao === 'exif' ? '📷' : '📍'}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className={`font-bold text-slate-800 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                        {localizacao
                          ? origemLocalizacao === 'exif'
                            ? 'GPS extraído da fotografia!'
                            : 'Localização GPS capturada!'
                          : capturandoGps
                          ? 'Obtendo GPS...'
                          : 'GPS pendente'}
                      </p>
                      {origemLocalizacao === 'exif' && (
                        <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">
                          EXIF
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {localizacao
                        ? `Lat: ${localizacao.latitude.toFixed(5)}, Long: ${localizacao.longitude.toFixed(5)}`
                        : 'Clique para atualizar'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={obterLocalizacaoAtual}
                  disabled={capturandoGps}
                  className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-2xs cursor-pointer"
                  title="Recapturar GPS atual"
                >
                  {capturandoGps ? 'Obtendo...' : '🔄'}
                </button>
              </div>

              {localizacao && distanciaAtualKm !== null && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <span className={distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm ? 'text-emerald-600' : 'text-amber-500'}>
                      {distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm ? '●' : '▲'}
                    </span>
                    <span className="text-slate-600 font-medium">
                      {distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm
                        ? `Área Comunitária (${distanciaAtualKm.toFixed(1)} km do centro)`
                        : `Ponto Externo (${distanciaAtualKm.toFixed(1)} km do bairro)`}
                    </span>
                  </div>
                  <span className={`font-black text-[10px] px-2 py-0.5 rounded-md ${
                    distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm ? 'Dentro do Limite' : 'Fora do Raio'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block font-black text-slate-600 uppercase tracking-wider ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                  Referência (Opcional):
                </label>
                <button
                  type="button"
                  onClick={alternarReconhecimentoVoz}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                    gravandoVoz ? 'bg-rose-600 text-white animate-pulse' : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  <span>🎤</span>
                  <span>{gravandoVoz ? 'Ouvindo...' : 'Por voz'}</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Ex.: Em frente à padaria, perto da praça..."
                value={pontoReferencia}
                onChange={(e) => setPontoReferencia(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={enviando || processandoFoto}
              className={`w-full rounded-2xl font-black uppercase tracking-wider text-white shadow-md transition-all ${
                modo === 'facil' ? 'py-5 text-base' : 'py-3.5 text-xs'
              } ${
                enviando || processandoFoto ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
              }`}
            >
              {enviando ? 'Processando... 🚀' : estaOnline ? 'Enviar Registro 🚀' : 'Salvar no Celular 💾'}
            </button>
          </form>
        )}

        {/* 3. MAPA */}
        {abaAtiva === 'mapa' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
            <ErrorBoundary nome="Mapa" chaveReset={abaAtiva}>
              <Suspense fallback={<CarregandoSecao texto="Carregando o mapa..." />}>
                <MapaOcorrencias ocorrencias={registos} />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* 4. REGISTOS */}
        {abaAtiva === 'registos' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Ocorrências Comunitárias</h2>
                <p className="text-[11px] text-slate-400">
                  Exibindo {registosFiltrados.length} de {registos.length} registros
                </p>
              </div>
              <button
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  carregarRegistos()
                }}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                🔄 Atualizar
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por descrição ou referência..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              {buscaTexto && (
                <button
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setBuscaTexto('')
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setFiltroStatus('todos')
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  filtroStatus === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setFiltroStatus('pendente')
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  filtroStatus === 'pendente'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Pendentes ({totalPendentes})
              </button>
              <button
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setFiltroStatus('resolvido')
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  filtroStatus === 'resolvido'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Resolvidos ({totalResolvidos})
              </button>
            </div>

            <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setFiltroCategoria('todas')
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  filtroCategoria === 'todas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Todas Tipologias
              </button>
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    feedbackSensorial.toqueSuave()
                    setFiltroCategoria(cat.id)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                    filtroCategoria === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {carregandoRegistos ? (
              <div className="py-16 text-center text-xs text-slate-400">Carregando ocorrências...</div>
            ) : registosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <p className="font-bold">Nenhum registro encontrado com estes filtros.</p>
                <p className="text-[11px]">Tente limpar a pesquisa ou selecionar outro filtro.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {registosVisiveis.map((reg) => {
                  const distPonto =
                    reg.latitude && reg.longitude
                      ? calcularDistanciaKm(
                          reg.latitude,
                          reg.longitude,
                          CENTRO_COMUNITARIO.latitude,
                          CENTRO_COMUNITARIO.longitude
                        )
                      : null

                  return (
                    <div
                      key={reg.id}
                      onClick={() => {
                        feedbackSensorial.toqueSuave()
                        setOcorrenciaSelecionada(reg)
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs flex justify-between items-start gap-3 hover:border-blue-400 transition-colors cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs capitalize text-slate-800 group-hover:text-blue-600 transition-colors">
                            {rotuloDaCategoria(reg.categoria)}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${classeEtiquetaDoEstado(reg.status)}`}>
                            {rotuloDoEstado(reg.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">{reg.descricao}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] text-slate-400">
                            {reg.created_at ? new Date(reg.created_at).toLocaleDateString('pt-BR') : ''}
                          </span>
                          {distPonto !== null && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              • {distPonto.toFixed(1)} km do centro
                            </span>
                          )}
                          {textoConfirmacoes(reg.total_apoios) && (
                            <span className="text-[10px] font-bold text-blue-700">👥 {textoConfirmacoes(reg.total_apoios)}</span>
                          )}
                        </div>
                      </div>

                      {reg.foto_url && (
                        <img src={reg.foto_url} alt="Comprovante" loading="lazy" decoding="async" width="56" height="56" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                      )}
                    </div>
                  )
                })}
                {registosFiltrados.length > limiteLista && (
                  <button
                    type="button"
                    onClick={() => setPaginaLista({ chave: chaveFiltrosLista, limite: limiteLista + TAMANHO_PAGINA_LISTA })}
                    className="w-full min-h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-blue-700 cursor-pointer"
                  >
                    Mostrar mais ({registosFiltrados.length - limiteLista} restantes)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. GESTÃO */}
        {abaAtiva === 'gestao' && (
          <ErrorBoundary nome="Gestão" chaveReset={abaAtiva}>
            <Suspense fallback={<CarregandoSecao texto="Carregando o Painel de Gestão..." />}>
              <PainelGestor ocorrencias={registos} onAtualizarDados={carregarRegistos} />
            </Suspense>
          </ErrorBoundary>
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setAbaAtiva('inicio')
              setOcorrenciaSelecionada(null)
            }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'inicio' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">🏠</span>
            <span className="text-[9px] font-bold">Início</span>
          </button>

          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setAbaAtiva('mapa')
              setOcorrenciaSelecionada(null)
            }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'mapa' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">🗺️</span>
            <span className="text-[9px] font-bold">Mapa</span>
          </button>

          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              abrirAbaRegistar()
              setOcorrenciaSelecionada(null)
            }}
            className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-md -mt-5 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer border-4 border-white"
            title="Criar Ocorrência"
          >
            ➕
          </button>

          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setAbaAtiva('registos')
              setOcorrenciaSelecionada(null)
            }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'registos' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">📋</span>
            <span className="text-[9px] font-bold">Registros</span>
          </button>

          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setAbaAtiva('gestao')
              setOcorrenciaSelecionada(null)
            }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'gestao' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span className="text-[9px] font-bold">Gestão</span>
          </button>
        </div>
      </nav>
    </div>
  )
}