import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { ClipboardList, House, LayoutDashboard, Map as IconeMapa, Plus } from 'lucide-react'
import { supabase } from './lib/supabase'
import lazyComRecarga from './lib/lazyComRecarga'
import { ativarAvisosDoProtocolo, concluirAvisosPendentes, concluirAvisosForaDaFila, avisosAtivosPara, MENSAGENS_AVISOS } from './lib/push'
import { pedirEnvioEmSegundoPlano, aoEnviarEmSegundoPlano } from './lib/envioSegundoPlano'
import useNetworkStatus from './lib/useNetworkStatus'
import { otimizarImagem } from './lib/imageOptimizer'
import Header from './components/Header'
import ReportModal from './components/ReportModal'
import ErrorBoundary from './components/ErrorBoundary'
import AvisoAtualizacao from './components/AvisoAtualizacao'
import { MENSAGENS_APOIO } from './lib/apoios'
import { ehLimiteDeRegistros, MENSAGEM_LIMITE_REGISTROS } from './lib/moderacao'
import { protegerFoto } from './lib/privacidadeFoto'
import { lerFila, adicionarAFila, atualizarItemNaFila, removerDaFila, FilaCheiaError } from './lib/filaOffline'
import { lerCache, gravarCache, pedirArmazenamentoPersistente } from './lib/armazenamento'
import { gerarIdOcorrencia, ehUuid, protocoloCivico, caminhoDaFoto } from './lib/protocolo'
import { estaResolvido, rotuloDoEstado, VALORES_EM_ABERTO } from './lib/status'
import { CATEGORIAS, rotuloDaCategoria } from './lib/categorias'
import { CENTRO_COMUNITARIO, distanciaMetros, calcularDistanciaKm } from './lib/geo'
import { feedbackSensorial } from './lib/feedbackSensorial'
import { extrairGpsExif } from './lib/gpsExif'
import { NOTIFICACOES_PADRAO } from './lib/conteudoApp'
import { protocoloDoEndereco, abaDoEndereco } from './lib/endereco'
import TelaRegistros from './telas/TelaRegistros'
import TelaRegistrar from './telas/TelaRegistrar'
import TelaInicio from './telas/TelaInicio'
import ModalDetalheOcorrencia from './components/ModalDetalheOcorrencia'
import Onboarding from './components/Onboarding'
import ModalSucessoEnvio from './components/ModalSucessoEnvio'
import ModalConsultaProtocolo from './components/ModalConsultaProtocolo'
import ModalDuplicata from './components/ModalDuplicata'
import ModalNotificacoes from './components/ModalNotificacoes'
import ModalSobre from './components/ModalSobre'

// Módulos pesados (Leaflet, Painel de Gestão, gerador de QR Code) só são descarregados quando
// o utilizador os abre: quem só regista ocorrências não paga esse peso no 3G/4G.
const PainelGestor = lazyComRecarga(() => import('./components/PainelGestor'))
const MapaOcorrencias = lazyComRecarga(() => import('./components/MapaOcorrencias'))
const ModalQRCode = lazyComRecarga(() => import('./components/ModalQRCode'))
const Transparencia = lazyComRecarga(() => import('./components/Transparencia'))
const ComoUsar = lazyComRecarga(() => import('./components/ComoUsar'))

const TAMANHO_PAGINA_LISTA = 20

function CarregandoSecao({ texto = 'Carregando...' }) {
  return (
    <div role="status" className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 animate-pulse">
      {texto}
    </div>
  )
}

export default function App() {
  const [modo, setModo] = useState(() => (localStorage.getItem('zelador_modo_interface') === 'facil' ? 'facil' : 'normal'))
  const [abaAtiva, setAbaAtiva] = useState(() => (['mapa', 'registos', 'gestao', 'transparencia', 'ajuda'].includes(abaDoEndereco()) ? abaDoEndereco() : 'inicio'))
  const [mostrarOnboarding, setMostrarOnboarding] = useState(() => !localStorage.getItem('zelador_onboarding_concluido'))
  const [etapaOnboarding, setEtapaOnboarding] = useState(0)

  // Modal QR Code
  const [mostrarQrCode, setMostrarQrCode] = useState(false)

  // PWA
  const [promptInstalacao, setPromptInstalacao] = useState(null)
  const [pwaInstalado, setPwaInstalado] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || Boolean(window.navigator.standalone)
  )
  const [bannerPwaIgnorado, setBannerPwaIgnorado] = useState(false)

  // Notificações
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false)
  const [notificacoesLidas, setNotificacoesLidas] = useState(() => {
    try {
      const lidas = JSON.parse(localStorage.getItem('zelador_notificacoes_lidas') || '[]')
      return Array.isArray(lidas) ? lidas : []
    } catch (erro) {
      console.warn('Erro ao carregar notificações lidas:', erro)
      return []
    }
  })
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
  const [rostosBorrados, setRostosBorrados] = useState(0)
  const [localizacao, setLocalizacao] = useState(null)
  const [origemLocalizacao, setOrigemLocalizacao] = useState('gps')
  const [capturandoGps, setCapturandoGps] = useState(false)
  const [pontoReferencia, setPontoReferencia] = useState('')
  const [gravandoVoz, setGravandoVoz] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [sucessoEnvio, setSucessoEnvio] = useState(null)
  const [mensagemToast, setMensagemToast] = useState(null)
  const mostrarAlertaToast = (texto) => {
    setMensagemToast(texto)
    setTimeout(() => {
      setMensagemToast(null)
    }, 4500)
  }

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

  // Abre o cartaz e pede a impressão só depois que ele carregou (ModalQRCode, imprimirAoAbrir).
  const [imprimirCartaz, setImprimirCartaz] = useState(false)
  const imprimirCartazA4 = () => {
    feedbackSensorial.toqueSuave()
    setImprimirCartaz(true)
    setMostrarQrCode(true)
  }

  useEffect(() => {
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

  // Modo Fácil: todo o texto e os botões ficam 25% maiores (as medidas do Tailwind são em rem)
  // e a classe "modo-facil" ajusta o que usa px fixo, os contrastes e a barra de baixo (index.css).
  useEffect(() => {
    const raiz = document.documentElement
    raiz.style.fontSize = modo === 'facil' ? '125%' : ''
    raiz.classList.toggle('modo-facil', modo === 'facil')
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

  // Arranque: carrega os registros. O GPS só é pedido ao abrir o registro (assistente ou aba "Registrar"),
  // para não pedir permissão sem contexto nem gastar bateria.
  useEffect(() => {
    const temporizador = window.setTimeout(carregarRegistos, 0)
    return () => window.clearTimeout(temporizador)
  }, [])

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
        // Rostos são borrados no próprio celular antes de a foto existir no app.
        const { arquivo: protegida, rostos } = await protegerFoto(comprimida).catch(() => ({ arquivo: comprimida, rostos: 0 }))
        setFoto(protegida)
        trocarPreview(protegida)
        setRostosBorrados(rostos)
        if (rostos > 0) mostrarAlertaToast(rostos === 1 ? '🙂 Um rosto foi borrado na foto para proteger a pessoa.' : `🙂 ${rostos} rostos foram borrados na foto para proteger as pessoas.`)

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
    setRostosBorrados(0)
  }

  // "Borrar área": placas, números de casa ou rostos que o detector não achou.
  const borrarAreasDaFoto = async (areas) => {
    if (!foto || areas.length === 0) return
    try {
      const { arquivo } = await protegerFoto(foto, { detectar: false, areas })
      setFoto(arquivo)
      trocarPreview(arquivo)
      feedbackSensorial.toqueSuave()
      mostrarAlertaToast('Área borrada. Confira a foto antes de enviar.')
    } catch (erro) {
      console.warn('Falha ao borrar área:', erro)
      mostrarAlertaToast('Não foi possível borrar a área. Tente de novo ou troque a foto.')
    }
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
      } catch {
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
    let barradosPeloLimite = 0

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
          if (ehLimiteDeRegistros(e)) barradosPeloLimite += 1
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
    } else if (barradosPeloLimite > 0) {
      mostrarAlertaToast(`${MENSAGEM_LIMITE_REGISTROS} ${falhados} registro(s) ficam no celular e serão enviados depois.`)
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
        const filePath = caminhoDaFoto(fotoOtimizada.name.split('.').pop())

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
      if (ehLimiteDeRegistros(err)) {
        mostrarAlertaToast(MENSAGEM_LIMITE_REGISTROS)
        if (modo === 'facil') falarTexto(MENSAGEM_LIMITE_REGISTROS)
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

  // Endereço oficial no QR Code e no cartaz, mesmo abrindo por uma prévia ou pelo endereço antigo:
  // um cartaz impresso não pode levar a um endereço que muda.
  const urlApp = 'https://zeladordigital.vercel.app'
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
          <ModalQRCode
            url={urlApp}
            imprimirAoAbrir={imprimirCartaz}
            onClose={() => {
              setMostrarQrCode(false)
              setImprimirCartaz(false)
            }}
          />
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
              rostosBorrados,
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
              borrarAreas: borrarAreasDaFoto,
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
        <ModalNotificacoes marcarNotificacaoComoLida={marcarNotificacaoComoLida} marcarTodasNotificacoesComoLidas={marcarTodasNotificacoesComoLidas} notificacoesLidas={notificacoesLidas} notificacoesNaoLidas={notificacoesNaoLidas} setMostrarNotificacoes={setMostrarNotificacoes} />
      )}

      {duplicataEncontrada && (
        <ModalDuplicata duplicataEncontrada={duplicataEncontrada} handleSubmit={handleSubmit} registrarApoio={registrarApoio} setDuplicataEncontrada={setDuplicataEncontrada} setMostrarReportModal={setMostrarReportModal} />
      )}

      {/* MODAL DE SUCESSO */}
      {mostrarConsultaProtocolo && (
        <ModalConsultaProtocolo ativarAvisos={ativarAvisos} consultandoProtocolo={consultandoProtocolo} consultarProtocolo={consultarProtocolo} erroProtocolo={erroProtocolo} estadoAvisos={estadoAvisos} protocoloConsulta={protocoloConsulta} resultadoProtocolo={resultadoProtocolo} setMostrarConsultaProtocolo={setMostrarConsultaProtocolo} setProtocoloConsulta={setProtocoloConsulta} />
      )}

      {sucessoEnvio && !mostrarReportModal && (
        <ModalSucessoEnvio abrirAbaRegistar={abrirAbaRegistar} ativarAvisos={ativarAvisos} estaOnline={estaOnline} estadoAvisos={estadoAvisos} partilharOcorrencia={partilharOcorrencia} setAbaAtiva={setAbaAtiva} setSucessoEnvio={setSucessoEnvio} sucessoEnvio={sucessoEnvio} />
      )}

      {/* MODAL DE ONBOARDING */}
      {mostrarOnboarding && (
        <Onboarding concluirOnboarding={concluirOnboarding} etapaOnboarding={etapaOnboarding} setEtapaOnboarding={setEtapaOnboarding} abrirComoUsar={() => { concluirOnboarding(); setAbaAtiva('ajuda') }} />
      )}

      {modalSobreAberto && (
        <ModalSobre setModalSobreAberto={setModalSobreAberto} abrirComoUsar={() => { setModalSobreAberto(false); setAbaAtiva('ajuda') }} />
      )}

      {/* Conteúdo Central */}
      <main className={`${abaAtiva === 'gestao' ? 'max-w-md lg:max-w-6xl xl:max-w-7xl' : 'max-w-md'} w-full mx-auto px-4 py-4 flex-1`}>
        {/* MODAL DETALHE COM PARTILHA */}
        {ocorrenciaSelecionada && (
          <ModalDetalheOcorrencia carregarRegistos={carregarRegistos} mostrarAlertaToast={mostrarAlertaToast} ocorrenciaSelecionada={ocorrenciaSelecionada} partilharOcorrencia={partilharOcorrencia} registrarApoio={registrarApoio} setOcorrenciaSelecionada={setOcorrenciaSelecionada} />
        )}

        {/* 1. INÍCIO */}
        {abaAtiva === 'inicio' && (
          <TelaInicio bannerPwaIgnorado={bannerPwaIgnorado} imprimirCartazA4={imprimirCartazA4} instalarAplicacaoPWA={instalarAplicacaoPWA} pwaInstalado={pwaInstalado} setAbaAtiva={setAbaAtiva} setBannerPwaIgnorado={setBannerPwaIgnorado} setErroProtocolo={setErroProtocolo} setImprimirCartaz={setImprimirCartaz} setMostrarConsultaProtocolo={setMostrarConsultaProtocolo} setMostrarQrCode={setMostrarQrCode} setMostrarReportModal={setMostrarReportModal} setProtocoloConsulta={setProtocoloConsulta} setResultadoProtocolo={setResultadoProtocolo} setSucessoEnvio={setSucessoEnvio} totalPendentes={totalPendentes} totalRegistos={totalRegistos} totalResolvidos={totalResolvidos} />
        )}

        {/* 2. REPORTAR */}
        {abaAtiva === 'reportar' && (
          <TelaRegistrar alternarReconhecimentoVoz={alternarReconhecimentoVoz} borrarAreasDaFoto={borrarAreasDaFoto} capturandoGps={capturandoGps} categoria={categoria} distanciaAtualKm={distanciaAtualKm} enviando={enviando} estaOnline={estaOnline} falarTexto={falarTexto} fotoPreview={fotoPreview} gravandoVoz={gravandoVoz} handleFotoChange={handleFotoChange} handleSubmit={handleSubmit} localizacao={localizacao} modo={modo} obterLocalizacaoAtual={obterLocalizacaoAtual} origemLocalizacao={origemLocalizacao} pontoReferencia={pontoReferencia} processandoFoto={processandoFoto} removerFoto={removerFoto} rostosBorrados={rostosBorrados} selecionarCategoria={selecionarCategoria} setPontoReferencia={setPontoReferencia} />
        )}

        {/* 3. MAPA */}
        {abaAtiva === 'ajuda' && (
          <ErrorBoundary nome="Como usar" chaveReset={abaAtiva}>
            <Suspense fallback={<CarregandoSecao texto="Carregando o tutorial..." />}>
              <ComoUsar
                modoFacil={modo === 'facil'}
                falarTexto={falarTexto}
                onVoltar={() => setAbaAtiva('inicio')}
                onIr={(destino) => {
                  if (destino === 'registrar') {
                    setAbaAtiva('inicio')
                    setSucessoEnvio(null)
                    setMostrarReportModal(true)
                  } else if (destino === 'consultar') {
                    setAbaAtiva('inicio')
                    setErroProtocolo('')
                    setResultadoProtocolo(null)
                    setProtocoloConsulta('')
                    setMostrarConsultaProtocolo(true)
                  } else {
                    setAbaAtiva(destino)
                  }
                }}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {abaAtiva === 'transparencia' && (
          <ErrorBoundary nome="Transparência" chaveReset={abaAtiva}>
            <Suspense fallback={<CarregandoSecao texto="Carregando a transparência..." />}>
              <Transparencia onVoltar={() => setAbaAtiva('inicio')} />
            </Suspense>
          </ErrorBoundary>
        )}

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
          <TelaRegistros TAMANHO_PAGINA_LISTA={TAMANHO_PAGINA_LISTA} buscaTexto={buscaTexto} carregandoRegistos={carregandoRegistos} carregarRegistos={carregarRegistos} chaveFiltrosLista={chaveFiltrosLista} filtroCategoria={filtroCategoria} filtroStatus={filtroStatus} limiteLista={limiteLista} registos={registos} registosFiltrados={registosFiltrados} registosVisiveis={registosVisiveis} setBuscaTexto={setBuscaTexto} setFiltroCategoria={setFiltroCategoria} setFiltroStatus={setFiltroStatus} setOcorrenciaSelecionada={setOcorrenciaSelecionada} setPaginaLista={setPaginaLista} totalPendentes={totalPendentes} totalResolvidos={totalResolvidos} />
        )}

        {/* 5. GESTÃO */}
        {abaAtiva === 'gestao' && (
          <ErrorBoundary nome="Gestão" chaveReset={abaAtiva}>
            <Suspense fallback={<CarregandoSecao texto="Carregando o Painel de Gestão..." />}>
              <PainelGestor ocorrencias={registos} onAtualizarDados={carregarRegistos} />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Assinatura discreta do autor */}
        <button
          type="button"
          onClick={() => setModalSobreAberto(true)}
          className="assinatura-autor mx-auto mt-8 mb-2 flex items-center gap-1.5 opacity-60 hover:opacity-90 transition-opacity cursor-pointer"
          aria-label="Sobre o desenvolvedor, Dante Dias Monteiro"
        >
          <img src="/assinatura-dante.png" alt="" width="17" height="20" className="h-5 w-auto" />
          <span className="text-[11px] font-semibold text-slate-700">por Dante Dias Monteiro</span>
        </button>
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <nav className="barra-navegacao fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg pb-[env(safe-area-inset-bottom)]">
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
            <span aria-hidden="true"><House size={22} strokeWidth={2.1} /></span>
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
            <span aria-hidden="true"><IconeMapa size={22} strokeWidth={2.1} /></span>
            <span className="text-[9px] font-bold">Mapa</span>
          </button>

          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              abrirAbaRegistar()
              setOcorrenciaSelecionada(null)
            }}
            className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-md -mt-5 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer border-4 border-white"
            title="Registrar ocorrência"
            aria-label="Registrar ocorrência"
          >
            <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
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
            <span aria-hidden="true"><ClipboardList size={22} strokeWidth={2.1} /></span>
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
            <span aria-hidden="true"><LayoutDashboard size={22} strokeWidth={2.1} /></span>
            <span className="text-[9px] font-bold">Gestão</span>
          </button>
        </div>
      </nav>
    </div>
  )
}