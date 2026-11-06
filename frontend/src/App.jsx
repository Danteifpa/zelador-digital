import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './lib/supabase'
import PainelGestor from './components/PainelGestor'
import MapaOcorrencias from './components/MapaOcorrencias'

const CATEGORIAS = [
  { id: 'lixo', label: 'Lixo / Entulho', icon: '🗑️', border: 'border-amber-400', activeBg: 'bg-amber-500 text-white', fala: 'Selecionado: Lixo e Entulho' },
  { id: 'iluminacao', label: 'Poste Apagado', icon: '💡', border: 'border-indigo-400', activeBg: 'bg-indigo-600 text-white', fala: 'Selecionado: Iluminação ou Poste Apagado' },
  { id: 'buraco', label: 'Buraco na Rua', icon: '🕳️', border: 'border-orange-500', activeBg: 'bg-orange-600 text-white', fala: 'Selecionado: Buraco na Rua e Vias' },
  { id: 'esgoto', label: 'Esgoto / Água', icon: '💧', border: 'border-sky-400', activeBg: 'bg-sky-600 text-white', fala: 'Selecionado: Vazamento de Água ou Esgoto' }
]

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

export default function App() {
  const [modo, setModo] = useState('normal')
  const [abaAtiva, setAbaAtiva] = useState('inicio')
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false)
  const [etapaOnboarding, setEtapaOnboarding] = useState(0)

  const [categoria, setCategoria] = useState('buraco')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [localizacao, setLocalizacao] = useState(null)
  const [capturandoGps, setCapturandoGps] = useState(false)
  const [pontoReferencia, setPontoReferencia] = useState('')
  const [gravandoVoz, setGravandoVoz] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Filtros da aba de registos
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [buscaTexto, setBuscaTexto] = useState('')

  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null)
  const [registos, setRegistos] = useState([])
  const [carregandoRegistos, setCarregandoRegistos] = useState(false)

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

  const concluirOnboarding = () => {
    localStorage.setItem('zelador_onboarding_concluido', 'true')
    setMostrarOnboarding(false)
  }

  const alternarModo = (novoModo) => {
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('O seu navegador não suporta reconhecimento de voz.')
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
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada no navegador.')
      return
    }

    setCapturandoGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalizacao({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        })
        setCapturandoGps(false)
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

  const handleFotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFoto(file)
      setFotoPreview(URL.createObjectURL(file))
      if (modo === 'facil') falarTexto('Fotografia adicionada.')
    }
  }

  const removerFoto = () => {
    setFoto(null)
    setFotoPreview(null)
  }

  const selecionarCategoria = (cat) => {
    setCategoria(cat.id)
    if (modo === 'facil') falarTexto(cat.fala)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!localizacao) {
      alert('Capture a localização antes de enviar o registo.')
      if (modo === 'facil') falarTexto('Capture a localização primeiro.')
      return
    }

    try {
      setEnviando(true)
      let urlFotoPublica = null

      if (foto) {
        const fileExt = foto.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `ocorrencias/${fileName}`

        const uploadResult = await supabase.storage.from('ocorrencias').upload(filePath, foto)
        if (uploadResult.error) {
          throw new Error(`Erro ao enviar foto: ${uploadResult.error.message}`)
        }

        const { data: publicData } = supabase.storage.from('ocorrencias').getPublicUrl(filePath)
        urlFotoPublica = publicData?.publicUrl || null
      }

      const pontoWKT = `POINT(${localizacao.longitude} ${localizacao.latitude})`

      const { error: insertError } = await supabase.from('ocorrencias').insert([
        {
          categoria: categoria,
          descricao: pontoReferencia.trim() || 'Ocorrência registada pela comunidade',
          foto_url: urlFotoPublica,
          localizacao: pontoWKT,
          status: 'pendente'
        }
      ])

      if (insertError) throw new Error(insertError.message)

      if (modo === 'facil') {
        falarTexto('Registo enviado com sucesso! Muito obrigado.')
      }
      alert('Registo enviado com sucesso!')
      setPontoReferencia('')
      setFoto(null)
      setFotoPreview(null)
      carregarRegistos()
      setAbaAtiva('registos')
    } catch (err) {
      console.error('Erro de envio:', err)
      alert(`Falha no registo: ${err.message || 'Erro de comunicação'}`)
    } finally {
      setEnviando(false)
    }
  }

  // Filtragem dinâmica de registos
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

  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans pb-20 ${modo === 'facil' ? 'bg-amber-50/30 text-slate-900' : 'bg-slate-100/70 text-slate-800'}`}>
      {/* ONBOARDING */}
      {mostrarOnboarding && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col justify-between text-center space-y-6 relative border border-slate-100">
            <div className="flex justify-end w-full">
              <button
                onClick={concluirOnboarding}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
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
                  onClick={() => setEtapaOnboarding((prev) => prev + 1)}
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

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => { setAbaAtiva('inicio'); setOcorrenciaSelecionada(null); }}
            className="flex items-center space-x-2 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white text-base shadow-2xs">
              🏙️
            </div>
            <div>
              <span className={`font-black text-blue-600 tracking-tight leading-none ${modo === 'facil' ? 'text-2xl' : 'text-xl'}`}>Zelador</span>
              <span className={`font-light text-slate-600 tracking-tight leading-none ${modo === 'facil' ? 'text-2xl' : 'text-xl'}`}>Digital</span>
            </div>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setEtapaOnboarding(0); setMostrarOnboarding(true); }}
              className="p-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
              title="Apresentação do Projeto"
            >
              💡
            </button>

            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold border border-slate-200/60">
              <button
                type="button"
                onClick={() => alternarModo('normal')}
                className={`px-2 py-1 rounded-lg transition-all ${modo === 'normal' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-600'}`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => alternarModo('facil')}
                className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${modo === 'facil' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'text-slate-600'}`}
              >
                <span>🔊</span>
                <span>Fácil</span>
              </button>
            </div>

            <button
              onClick={() => { setAbaAtiva('gestao'); setOcorrenciaSelecionada(null); }}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                abaAtiva === 'gestao'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
              }`}
              title="Painel Gestor"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto px-4 py-4 flex-1">
        {/* DETALHE MODAL */}
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
                <button
                  onClick={() => setOcorrenciaSelecionada(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm hover:bg-slate-200"
                >
                  ✕
                </button>
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
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-sky-600 to-emerald-500 p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-sky-100 font-bold">Monitoramento Cívico</span>
                  <h1 className="text-2xl font-black mt-0.5">Visão Geral</h1>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
                  📍
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
                  <span className="text-2xl font-black block leading-none">{totalRegistos}</span>
                  <span className="text-[10px] font-semibold text-sky-100 mt-1 block">Total</span>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
                  <span className="text-2xl font-black block leading-none">{totalResolvidos}</span>
                  <span className="text-[10px] font-semibold text-sky-100 mt-1 block">Resolvidos</span>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
                  <span className="text-2xl font-black block leading-none">{totalPendentes}</span>
                  <span className="text-[10px] font-semibold text-sky-100 mt-1 block">Pendentes</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">Ações Rápidas</h2>

              <button
                onClick={() => setAbaAtiva('reportar')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                    ➕
                  </div>
                  <div className="text-left">
                    <span className="text-base font-black block">Registar Nova Ocorrência</span>
                    <span className="text-xs text-blue-100">Buraco, poste apagado, lixo ou esgoto</span>
                  </div>
                </div>
                <span className="text-2xl">📸</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAbaAtiva('registos')}
                  className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 border border-emerald-100">
                    📋
                  </div>
                  <span className="text-xs font-black text-slate-800">Registos</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Histórico e estados</span>
                </button>

                <button
                  onClick={() => setAbaAtiva('mapa')}
                  className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl mb-3 border border-sky-100">
                    🗺️
                  </div>
                  <span className="text-xs font-black text-slate-800">Ver Mapa</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Pontos e calor térmico</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. REPORTAR */}
        {abaAtiva === 'reportar' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-800">Novo Registo Territorial</h2>
              <span className="text-[11px] text-slate-400">Etapa Única</span>
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
                  className="text-xs bg-amber-500 text-white font-bold px-2.5 py-1 rounded-xl shadow-2xs"
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

              {fotoPreview ? (
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
                  <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG ou WEBP</span>
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

            <div className={`rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between ${modo === 'facil' ? 'p-4' : 'p-3.5'}`}>
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">📍</span>
                <div>
                  <p className={`font-bold text-slate-800 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                    {localizacao ? 'Localização capturada!' : capturandoGps ? 'A obter GPS...' : 'GPS pendente'}
                  </p>
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
              >
                {capturandoGps ? 'A obter...' : '🔄'}
              </button>
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
              disabled={enviando}
              className={`w-full rounded-2xl font-black uppercase tracking-wider text-white shadow-md transition-all ${
                modo === 'facil' ? 'py-5 text-base' : 'py-3.5 text-xs'
              } ${
                enviando ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
              }`}
            >
              {enviando ? 'A enviar registo... 🚀' : 'Enviar Registo 🚀'}
            </button>
          </form>
        )}

        {/* 3. MAPA */}
        {abaAtiva === 'mapa' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
            <MapaOcorrencias ocorrencias={registos} onRecarregar={carregarRegistos} />
          </div>
        )}

        {/* 4. REGISTOS COM FILTROS E BUSCA */}
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
                onClick={carregarRegistos}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                🔄 Atualizar
              </button>
            </div>

            {/* Campo de Busca Rápida */}
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
                  onClick={() => setBuscaTexto('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros em Chips: Status */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFiltroStatus('todos')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  filtroStatus === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroStatus('pendente')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  filtroStatus === 'pendente'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Pendentes ({totalPendentes})
              </button>
              <button
                onClick={() => setFiltroStatus('resolvido')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  filtroStatus === 'resolvido'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Resolvidos ({totalResolvidos})
              </button>
            </div>

            {/* Filtros em Chips: Categoria */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFiltroCategoria('todas')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
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
                  onClick={() => setFiltroCategoria(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
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

            {/* Listagem com os resultados filtrados */}
            {carregandoRegistos ? (
              <div className="py-16 text-center text-xs text-slate-400">A carregar ocorrências...</div>
            ) : registosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <p className="font-bold">Nenhum registo encontrado com estes filtros.</p>
                <p className="text-[11px]">Tente limpar a pesquisa ou selecionar outro filtro.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {registosFiltrados.map((reg) => (
                  <div
                    key={reg.id}
                    onClick={() => setOcorrenciaSelecionada(reg)}
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
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {reg.created_at ? new Date(reg.created_at).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>

                    {reg.foto_url && (
                      <img src={reg.foto_url} alt="Comprovativo" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. GESTÃO */}
        {abaAtiva === 'gestao' && <PainelGestor />}
      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => { setAbaAtiva('inicio'); setOcorrenciaSelecionada(null); }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'inicio' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">🏠</span>
            <span className="text-[10px] font-bold">Início</span>
          </button>

          <button
            onClick={() => { setAbaAtiva('mapa'); setOcorrenciaSelecionada(null); }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'mapa' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">🗺️</span>
            <span className="text-[10px] font-bold">Mapa</span>
          </button>

          <button
            onClick={() => { setAbaAtiva('reportar'); setOcorrenciaSelecionada(null); }}
            className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl shadow-md -mt-5 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer border-4 border-white"
            title="Criar Ocorrência"
          >
            ➕
          </button>

          <button
            onClick={() => { setAbaAtiva('registos'); setOcorrenciaSelecionada(null); }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'registos' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">📋</span>
            <span className="text-[10px] font-bold">Registos</span>
          </button>

          <button
            onClick={() => { setAbaAtiva('gestao'); setOcorrenciaSelecionada(null); }}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
              abaAtiva === 'gestao' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span className="text-[10px] font-bold">Gestão</span>
          </button>
        </div>
      </nav>
    </div>
  )
}