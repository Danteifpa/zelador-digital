import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { supabase } from './lib/supabase'
import PainelGestor from './components/PainelGestor'
import MapaOcorrencias from './components/MapaOcorrencias'
import ModalQRCode from './components/ModalQRCode'
import { solicitarPermissaoNotificacoes } from './lib/notifications'
import useNetworkStatus from './lib/useNetworkStatus'
import { otimizarImagem } from './lib/imageOptimizer'
import Header from './components/Header'
import RegisterButton from './components/RegisterButton'
import StatsOverview from './components/StatsOverview'
import CommunityAlert from './components/CommunityAlert'

// Coordenadas centrais comunitárias (Ananindeua)
const CENTRO_COMUNITARIO = {
  latitude: -1.365000,
  longitude: -48.375000,
  raioMaximoKm: 18.0,
  nome: 'Ananindeua'
}

const CATEGORIAS = [
  { id: 'lixo', label: 'Lixo / Entulho', icon: '🗑️', border: 'border-amber-400', activeBg: 'bg-amber-500 text-white', fala: 'Selecionado: Lixo e Entulho' },
  { id: 'iluminacao', label: 'Poste Apagado', icon: '💡', border: 'border-indigo-400', activeBg: 'bg-indigo-600 text-white', fala: 'Selecionado: Iluminação ou Poste Apagado' },
  { id: 'buraco', label: 'Buraco na Rua', icon: '🕳️', border: 'border-orange-500', activeBg: 'bg-orange-600 text-white', fala: 'Selecionado: Buraco na Rua e Vias' },
  { id: 'esgoto', label: 'Esgoto / Água', icon: '💧', border: 'border-sky-400', activeBg: 'bg-sky-600 text-white', fala: 'Selecionado: Vazamento de Água ou Esgoto' }
]

const FILA_OFFLINE_KEY = 'fila_ocorrencias_offline'

function protocoloCivico(id) {
  return `ZD-${String(id).slice(0, 6).toUpperCase()}`
}

function statusResolvido(status) {
  return status === 'resolvido' || status === 'concluido'
}

function etapaProtocolo(status) {
  if (statusResolvido(status)) return 3
  if (status === 'em analise' || status === 'oficiada') return 2
  return 1
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
    titulo: 'Registo Rápido & Georreferenciado',
    descricao: 'Tire uma fotografia em campo e deixe que o satélite GPS marque com precisão o ponto exato da ocorrência territorial.',
    icone: '📸',
    gradiente: 'from-sky-600 to-blue-600'
  },
  {
    titulo: 'Transparência & Acompanhamento',
    descricao: 'Consulte os dados no mapa térmico e siga a linha do tempo desde a submissão até à intervenção concluída.',
    icone: '🗺️',
    gradiente: 'from-emerald-600 to-teal-600'
  }
]

const NOTIFICACOES_PADRAO = [
  {
    id: 1,
    titulo: 'Ação de Limpeza Comunitária',
    mensagem: 'Próximo sábado haverá mutirão voluntário de recolha de entulho nos pontos críticos identificados no mapa.',
    tipo: 'comunidade',
    icone: '🧹',
    data: 'Hoje, 09:30'
  },
  {
    id: 2,
    titulo: 'Manutenção de Iluminação Pública',
    mensagem: 'Registos de postes apagados no setor leste foram compilados para vistoria e troca das lâmpadas.',
    tipo: 'servicos',
    icone: '💡',
    data: 'Ontem, 16:45'
  },
  {
    id: 3,
    titulo: 'Modo Offline Ativado',
    mensagem: 'Agora pode registar ocorrências mesmo sem sinal 4G/5G. O envio acontece assim que restabelecer a ligação.',
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
  tocarTom: (frequencia = 440, duracao = 0.08, tipo = 'sine') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
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

// Compressão móvel via Canvas
const comprimirImagem = (arquivo, maxWidth = 1280, maxHeight = 1280, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(arquivo)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const arquivoComprimido = new File([blob], arquivo.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(arquivoComprimido)
            } else {
              resolve(arquivo)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
}

export default function App() {
  const [modo, setModo] = useState('normal')
  const [abaAtiva, setAbaAtiva] = useState('inicio')
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
  const [sincronizandoFila, setSincronizandoFila] = useState(false)

  // Formulário
  const [categoria, setCategoria] = useState('buraco')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
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

  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null)
  const [registos, setRegistos] = useState([])
  const [carregandoRegistos, setCarregandoRegistos] = useState(false)
  const [mostrarConsultaProtocolo, setMostrarConsultaProtocolo] = useState(false)
  const [protocoloConsulta, setProtocoloConsulta] = useState('')
  const [resultadoProtocolo, setResultadoProtocolo] = useState(null)
  const [consultandoProtocolo, setConsultandoProtocolo] = useState(false)
  const [erroProtocolo, setErroProtocolo] = useState('')
  const [notificacoesAtivadas, setNotificacoesAtivadas] = useState(false)
  const [duplicataEncontrada, setDuplicataEncontrada] = useState(null)

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
      mostrarAlertaToast('Aplicação instalada com sucesso no telemóvel!')
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
      mostrarAlertaToast('Use a opção "Adicionar ao ecrã principal" no menu do navegador.')
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
    const filaSalva = localStorage.getItem(FILA_OFFLINE_KEY) || localStorage.getItem('zelador_fila_offline')
    if (filaSalva) {
      try {
        const fila = JSON.parse(filaSalva)
        setFilaOffline(fila)
        localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(fila))
      } catch (e) {
        console.warn('Erro ao carregar fila offline:', e)
      }
    }

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
      mostrarAlertaToast('Ligação restabelecida! A sincronizar dados...')
      sincronizarFilaOffline()
    }
    const handleOffline = () => {
      mostrarAlertaToast('Sem ligação à internet. A sua ocorrência será guardada e enviada automaticamente.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [filaOffline])

  useEffect(() => {
    const onboardingVisto = localStorage.getItem('zelador_onboarding_concluido')
    if (!onboardingVisto) {
      setMostrarOnboarding(true)
    }

    const modoSalvo = localStorage.getItem('zelador_modo_interface')
    if (modoSalvo) setModo(modoSalvo)

    obterLocalizacaoAtual()
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

  const consultarProtocolo = async (e) => {
    e.preventDefault()
    const codigo = protocoloConsulta.trim().toUpperCase().replace(/^PROTOCOLO\s+/, '')
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
        const { data, error } = await supabase
          .from('ocorrencias')
          .select('id,categoria,created_at,updated_at,status,observacoes,foto_url,foto_resolucao,bairro,endereco,morada,latitude,longitude,descricao')
          .limit(1000)
        if (error) throw error
        resultado = data?.find((item) => protocoloCivico(item.id) === `ZD-${prefixo.slice(0, 6)}`)
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

  const ativarNotificacoes = async () => {
    const permissao = await solicitarPermissaoNotificacoes()
    if (permissao === 'granted') {
      setNotificacoesAtivadas(true)
      mostrarAlertaToast('Notificações ativadas para este dispositivo.')
    } else if (permissao === 'denied') {
      mostrarAlertaToast('Notificações bloqueadas. Altere a permissão nas configurações do navegador.')
    } else {
      mostrarAlertaToast('Este navegador não suporta notificações locais.')
    }
  }

  const concluirOnboarding = () => {
    feedbackSensorial.toqueSuave()
    localStorage.setItem('zelador_onboarding_concluido', 'true')
    setMostrarOnboarding(false)
  }

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
    } catch (err) {
      console.error('Erro ao buscar registos:', err.message)
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
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const arquivoParaBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const base64ParaBlob = async (base64) => {
    const res = await fetch(base64)
    return await res.blob()
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

        const comprimida = await comprimirImagem(file)
        setFoto(comprimida)
        setFotoPreview(URL.createObjectURL(comprimida))

        if (modo === 'facil' && !gpsExif) falarTexto('Fotografia adicionada e otimizada.')
      } catch (err) {
        console.warn('Falha no processamento da imagem:', err)
        setFoto(file)
        setFotoPreview(URL.createObjectURL(file))
      } finally {
        setProcessandoFoto(false)
      }
    }
  }

  const removerFoto = () => {
    feedbackSensorial.toqueSuave()
    setFoto(null)
    setFotoPreview(null)
  }

  const selecionarCategoria = (cat) => {
    feedbackSensorial.toqueSuave()
    setCategoria(cat.id)
    if (modo === 'facil') falarTexto(cat.fala)
  }

  const partilharOcorrencia = async (item) => {
    feedbackSensorial.toqueSuave()
    const categoriaLabel = CATEGORIAS.find((c) => c.id === item.categoria)?.label || item.categoria
    const textoPartilha = `📢 *Zelador Digital - Ocorrência Comunitária*\n📍 *Tipo:* ${categoriaLabel}\n📝 *Detalhe:* ${item.descricao || 'Sem descrição'}\n📌 *Status:* ${item.status || 'Pendente'}\n🗺️ *Ver no Mapa:* https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ocorrência: ${categoriaLabel}`,
          text: textoPartilha
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Falha na partilha nativa:', err)
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

  const sincronizarFilaOffline = async () => {
    const filaAtual = JSON.parse(localStorage.getItem(FILA_OFFLINE_KEY) || '[]')
    if (filaAtual.length === 0 || sincronizandoFila) return

    setSincronizandoFila(true)
    const pendentes = [...filaAtual]
    const filaRestante = []

    for (const item of pendentes) {
      try {
        let urlFotoPublica = null

        if (item.fotoBase64) {
          const blob = await base64ParaBlob(item.fotoBase64)
          const fileName = `${Date.now()}_offline_${Math.random().toString(36).substring(2, 7)}.jpg`
          const filePath = `ocorrencias/${fileName}`

          const uploadResult = await supabase.storage.from('ocorrencias').upload(filePath, blob, {
            contentType: 'image/jpeg'
          })

          if (!uploadResult.error) {
            const { data: publicData } = supabase.storage.from('ocorrencias').getPublicUrl(filePath)
            urlFotoPublica = publicData?.publicUrl || null
          }
        }

        const pontoWKT = `POINT(${item.longitude} ${item.latitude})`
        const { error: insertError } = await supabase.from('ocorrencias').insert([
          {
            categoria: item.categoria,
            descricao: item.descricao,
            foto_url: urlFotoPublica,
            localizacao: pontoWKT,
            status: 'pendente'
          }
        ])
        if (insertError) throw insertError
      } catch (e) {
        console.error('Falha ao sincronizar item offline:', e)
        filaRestante.push(item)
      }
    }

    localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(filaRestante))
    setFilaOffline(filaRestante)
    setSincronizandoFila(false)
    carregarRegistos()

    if (filaRestante.length === 0) {
      feedbackSensorial.envioSucesso()
      mostrarAlertaToast('Todos os registos offline foram sincronizados com sucesso!')
    }
  }

  const encontrarDuplicata = async () => {
    const { data, error } = await supabase
      .from('ocorrencias_georreferenciadas')
      .select('id,categoria,status,latitude,longitude')
      .eq('categoria', categoria)
      .in('status', ['pendente', 'em analise', 'em_analise'])
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

    try {
      setEnviando(true)

      if (navigator.onLine && !ignorarDuplicidade) {
        const duplicata = await encontrarDuplicata()
        if (duplicata) {
          setDuplicataEncontrada(duplicata)
          return
        }
      }

      const fotoOtimizada = foto ? await otimizarImagem(foto) : null

      if (!navigator.onLine) {
        let base64Foto = null
        if (fotoOtimizada) {
          base64Foto = await arquivoParaBase64(fotoOtimizada)
        }

        const itemOffline = {
          id: Date.now(),
          categoria,
          descricao: pontoReferencia.trim() || 'Ocorrência registada offline',
          latitude: localizacao.latitude,
          longitude: localizacao.longitude,
          fotoBase64: base64Foto,
          criadoEm: new Date().toISOString()
        }

        const novaFila = [...filaOffline, itemOffline]
        localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(novaFila))
        setFilaOffline(novaFila)

        feedbackSensorial.envioSucesso()
        const mensagemOffline = 'Sem ligação à internet. A sua ocorrência foi guardada e será enviada automaticamente assim que a rede voltar.'
        mostrarAlertaToast(mensagemOffline)
        if (modo === 'facil') falarTexto(mensagemOffline)

        setSucessoEnvio({
          id: itemOffline.id,
          categoria,
          foto_url: fotoPreview,
          descricao: `${pontoReferencia.trim() || 'Ocorrência comunitária'} (Guardado Offline)`,
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

      const { data: ocorrenciaCriada, error: insertError } = await supabase.from('ocorrencias').insert([
        {
          categoria: categoria,
          descricao: pontoReferencia.trim() || 'Ocorrência registada pela comunidade',
          foto_url: urlFotoPublica,
          localizacao: pontoWKT,
          status: 'pendente'
        }
      ]).select('id').single()

      if (insertError) throw new Error(insertError.message)

      feedbackSensorial.envioSucesso()
      if (modo === 'facil') {
        falarTexto('Registo territorial enviado com sucesso! Muito obrigado.')
      }

      setSucessoEnvio({
        id: ocorrenciaCriada?.id,
        categoria,
        foto_url: urlFotoPublica,
        descricao: pontoReferencia.trim() || 'Ocorrência registada pela comunidade',
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
          const fotoOtimizada = foto ? await otimizarImagem(foto) : null
          const fotoBase64 = fotoOtimizada ? await arquivoParaBase64(fotoOtimizada) : null
          const itemOffline = {
            id: Date.now(),
            categoria,
            descricao: pontoReferencia.trim() || 'Ocorrência registada pela comunidade',
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            fotoBase64,
            criadoEm: new Date().toISOString()
          }
          const filaAtual = JSON.parse(localStorage.getItem(FILA_OFFLINE_KEY) || '[]')
          const novaFila = [...filaAtual, itemOffline]
          localStorage.setItem(FILA_OFFLINE_KEY, JSON.stringify(novaFila))
          setFilaOffline(novaFila)
          const mensagemOffline = 'Sem ligação à internet. A sua ocorrência foi guardada e será enviada automaticamente assim que a rede voltar.'
          mostrarAlertaToast(mensagemOffline)
          if (modo === 'facil') falarTexto(mensagemOffline)
          setSucessoEnvio({
            id: itemOffline.id,
            categoria,
            foto_url: fotoPreview,
            descricao: `${itemOffline.descricao} (Guardado Offline)`,
            latitude: localizacao.latitude,
            longitude: localizacao.longitude,
            status: 'pendente'
          })
          setPontoReferencia('')
          setFoto(null)
          setFotoPreview(null)
          return
        } catch (queueError) {
          console.error('Falha ao guardar ocorrência offline:', queueError)
        }
      }
      feedbackSensorial.alertaErro()
      console.error('Erro de envio:', err)
      mostrarAlertaToast(`Falha no registo: ${err.message || 'Erro de comunicação'}`)
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

  const registosFiltrados = useMemo(() => {
    return registos.filter((item) => {
      const bateuCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria
      const isResolvido = item.status === 'resolvido' || item.status === 'concluido'
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

  const totalRegistos = registos.length
  const totalResolvidos = registos.filter((r) => r.status === 'resolvido' || r.status === 'concluido').length
  const totalPendentes = registos.filter((r) => r.status !== 'resolvido' && r.status !== 'concluido').length
  const taxaResolucao = totalRegistos > 0 ? Math.round((totalResolvidos / totalRegistos) * 100) : 0

  const urlApp = typeof window !== 'undefined' ? window.location.origin : 'https://zelador-digital.vercel.app'
  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans pb-20 ${modo === 'facil' ? 'bg-amber-50/30 text-slate-900' : 'bg-slate-100/70 text-slate-800'}`}>
      <Header
        estaOnline={estaOnline}
        filaPendente={filaOffline.length}
        sincronizandoFila={sincronizandoFila}
        onSincronizar={sincronizarFilaOffline}
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
      />

      {/* TOAST FLUTUANTE */}
      {mensagemToast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-top-4 duration-200">
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

      {mostrarQrCode && <ModalQRCode url={urlApp} onClose={() => setMostrarQrCode(false)} />}

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
            <h2 className="text-base font-black text-slate-900">Chamado semelhante encontrado</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Já existe um chamado em aberto neste local (Protocolo {protocoloCivico(duplicataEncontrada.id)}). Deseja registrar mesmo assim ou retornar?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDuplicataEncontrada(null)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Retornar
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
                {consultandoProtocolo ? 'A buscar...' : 'Buscar'}
              </button>
            </form>
            {erroProtocolo && <p className="mt-2 text-xs font-bold text-rose-600">{erroProtocolo}</p>}

            {resultadoProtocolo && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-900 p-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-300">{protocoloCivico(resultadoProtocolo.id)}</p>
                  <h3 className="mt-1 text-base font-black capitalize">{resultadoProtocolo.categoria || 'Não classificado'}</h3>
                  <p className="mt-1 text-[11px] text-slate-300">{resultadoProtocolo.bairro || resultadoProtocolo.endereco || resultadoProtocolo.morada || 'Bairro não informado'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Aberta em {resultadoProtocolo.created_at ? new Date(resultadoProtocolo.created_at).toLocaleDateString('pt-BR') : 'data não informada'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start">
                    {['Registada', 'Em Análise / Oficiada', 'Resolvida'].map((titulo, index) => {
                      const atual = etapaProtocolo(resultadoProtocolo.status)
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
                  <p className="mt-3 text-xs font-black text-slate-700">Status atual: <span className="capitalize text-blue-700">{resultadoProtocolo.status || 'Pendente'}</span></p>
                </div>
                {resultadoProtocolo.observacoes && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                    <strong>Notas e despachos públicos:</strong>
                    <p className="mt-1 leading-relaxed">{resultadoProtocolo.observacoes}</p>
                  </div>
                )}
                {statusResolvido(resultadoProtocolo.status) && resultadoProtocolo.foto_url && resultadoProtocolo.foto_resolucao && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <span className="rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-black text-white">Comprovado por Auditoria Visual</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <img src={resultadoProtocolo.foto_url} alt="Antes: registro inicial" className="h-28 w-full rounded-xl object-cover" />
                      <img src={resultadoProtocolo.foto_resolucao} alt="Depois: intervenção concluída" className="h-28 w-full rounded-xl object-cover" />
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[9px] font-bold text-emerald-800"><span>Antes</span><span>Depois</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {sucessoEnvio && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-5 border border-slate-100">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-inner animate-bounce">
              ✓
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Registo Confirmado!</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {estaOnline
                  ? 'A sua ocorrência foi georreferenciada e guardada no banco comunitário.'
                  : 'Registo salvo no telemóvel! Será enviado para a rede assim que restabelecer o sinal.'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center space-x-3 text-left">
              {sucessoEnvio.foto_url ? (
                <img
                  src={sucessoEnvio.foto_url}
                  alt="Comprovativo"
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
                  📍
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-xs font-black text-slate-800 capitalize block truncate">
                  {sucessoEnvio.categoria}
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
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-left">
              <p className="text-xs font-black text-indigo-900">🔔 Receba atualizações deste protocolo</p>
              <p className="mt-1 text-[10px] text-indigo-700">Ative as notificações deste dispositivo para acompanhar mudanças de status.</p>
              <button
                type="button"
                onClick={ativarNotificacoes}
                disabled={notificacoesAtivadas}
                className="mt-2 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white hover:bg-indigo-700 disabled:bg-emerald-600 cursor-pointer"
              >
                {notificacoesAtivadas ? '✓ Notificações ativadas' : 'Ativar notificações'}
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => partilharOcorrencia(sucessoEnvio)}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>📢</span>
                <span>Partilhar no WhatsApp / Redes</span>
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
                Acompanhar na Lista de Registos 📋
              </button>
              <button
                type="button"
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setSucessoEnvio(null)
                  setAbaAtiva('reportar')
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
              >
                Fazer Outro Registo ➕
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
                Saltar Apresentação ✕
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
                  Começar a Utilizar 🚀
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
                    {ocorrenciaSelecionada.categoria}
                  </h3>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => partilharOcorrencia(ocorrenciaSelecionada)}
                    className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Partilhar Ocorrência"
                  >
                    <span>📢</span>
                    <span>Partilhar</span>
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
                    alt="Comprovativo"
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
                      {ocorrenciaSelecionada.created_at ? new Date(ocorrenciaSelecionada.created_at).toLocaleString('pt-BR') : 'Data registada'}
                    </p>
                  </div>

                  <div className="relative pl-6">
                    <span className={`absolute -left-2 top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white ${
                      ocorrenciaSelecionada.status === 'em_andamento' || ocorrenciaSelecionada.status === 'resolvido' || ocorrenciaSelecionada.status === 'concluido'
                        ? 'bg-amber-500'
                        : 'bg-slate-300'
                    }`}>
                      {ocorrenciaSelecionada.status === 'em_andamento' || ocorrenciaSelecionada.status === 'resolvido' || ocorrenciaSelecionada.status === 'concluido' ? '✓' : '•'}
                    </span>
                    <p className="text-xs font-bold text-slate-800">2. Em Análise Territorial</p>
                    <p className="text-[10px] text-slate-400">Demandas em triagem comunitária</p>
                  </div>

                  <div className="relative pl-6">
                    <span className={`absolute -left-2 top-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white ${
                      ocorrenciaSelecionada.status === 'resolvido' || ocorrenciaSelecionada.status === 'concluido'
                        ? 'bg-emerald-600'
                        : 'bg-slate-300'
                    }`}>
                      {ocorrenciaSelecionada.status === 'resolvido' || ocorrenciaSelecionada.status === 'concluido' ? '✓' : '•'}
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
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-300">Instalar Aplicação</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      Aceda ao Zelador Digital diretamente no ecrã do seu telemóvel sem gastar memória.
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
                  setAbaAtiva('reportar')
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
                  <span className="text-xs font-black text-slate-800">Registos</span>
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
              <h2 className="text-base font-black text-slate-800">Novo Registo Territorial</h2>
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
                  A otimizar e extrair metadados da fotografia... ⚡
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
                          ? 'A obter GPS...'
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
                  {capturandoGps ? 'A obter...' : '🔄'}
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
                  <span>{gravandoVoz ? 'A ouvir...' : 'Por voz'}</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Ex.: Em frente à mercearia, perto da praça..."
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
              {enviando ? 'A processar... 🚀' : estaOnline ? 'Enviar Registo 🚀' : 'Guardar no Telemóvel 💾'}
            </button>
          </form>
        )}

        {/* 3. MAPA */}
        {abaAtiva === 'mapa' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
            <MapaOcorrencias ocorrencias={registos} />
          </div>
        )}

        {/* 4. REGISTOS */}
        {abaAtiva === 'registos' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Ocorrências Comunitárias</h2>
                <p className="text-[11px] text-slate-400">
                  A exibir {registosFiltrados.length} de {registos.length} registos
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
              <div className="py-16 text-center text-xs text-slate-400">A carregar ocorrências...</div>
            ) : registosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <p className="font-bold">Nenhum registo encontrado com estes filtros.</p>
                <p className="text-[11px]">Tente limpar a pesquisa ou selecionar outro filtro.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {registosFiltrados.map((reg) => {
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
                            {reg.categoria}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            reg.status === 'resolvido' || reg.status === 'concluido'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {reg.status || 'Pendente'}
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
                        </div>
                      </div>

                      {reg.foto_url && (
                        <img src={reg.foto_url} alt="Comprovativo" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. GESTÃO */}
        {abaAtiva === 'gestao' && (
          <PainelGestor ocorrencias={registos} onAtualizarDados={carregarRegistos} />
        )}
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg">
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
              setAbaAtiva('reportar')
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
            <span className="text-[9px] font-bold">Registos</span>
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