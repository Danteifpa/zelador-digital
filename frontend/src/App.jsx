import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import PainelGestor from './components/PainelGestor'
import MapaOcorrencias from './components/MapaOcorrencias'

const CATEGORIAS = [
  { id: 'lixo', label: 'Lixo / Entulho', icon: '🗑️', border: 'border-amber-400', activeBg: 'bg-amber-500 text-white', fala: 'Selecionado: Lixo e Entulho' },
  { id: 'iluminacao', label: 'Poste Apagado', icon: '💡', border: 'border-indigo-400', activeBg: 'bg-indigo-600 text-white', fala: 'Selecionado: Iluminação ou Poste Apagado' },
  { id: 'buraco', label: 'Buraco na Rua', icon: '🕳️', border: 'border-orange-500', activeBg: 'bg-orange-600 text-white', fala: 'Selecionado: Buraco na Rua e Vias' },
  { id: 'esgoto', label: 'Esgoto / Água', icon: '💧', border: 'border-sky-400', activeBg: 'bg-sky-600 text-white', fala: 'Selecionado: Vazamento de Água ou Esgoto' }
]

export default function App() {
  const [modo, setModo] = useState('normal') // 'normal' ou 'facil'
  const [abaAtiva, setAbaAtiva] = useState('reportar')
  const [mostrarBanner, setMostrarBanner] = useState(true)
  const [categoria, setCategoria] = useState('buraco')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [localizacao, setLocalizacao] = useState(null)
  const [capturandoGps, setCapturandoGps] = useState(false)
  const [pontoReferencia, setPontoReferencia] = useState('')
  const [gravandoVoz, setGravandoVoz] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [registos, setRegistos] = useState([])
  const [carregandoRegistos, setCarregandoRegistos] = useState(false)

  useEffect(() => {
    const modoSalvo = localStorage.getItem('zelador_modo_interface')
    if (modoSalvo) setModo(modoSalvo)
    obterLocalizacaoAtual()
  }, [])

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
      alert('Seu navegador não suporta reconhecimento de voz.')
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

      recognition.onerror = () => {
        setGravandoVoz(false)
      }

      recognition.onend = () => {
        setGravandoVoz(false)
      }

      recognition.start()
    } catch (e) {
      console.warn('Erro voz:', e)
      setGravandoVoz(false)
    }
  }

  useEffect(() => {
    if (abaAtiva === 'registos' || abaAtiva === 'mapa') {
      carregarRegistos()
    }
  }, [abaAtiva])

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
      if (modo === 'facil') {
        falarTexto('Fotografia adicionada.')
      }
    }
  }

  const removerFoto = () => {
    setFoto(null)
    setFotoPreview(null)
  }

  const selecionarCategoria = (cat) => {
    setCategoria(cat.id)
    if (modo === 'facil') {
      falarTexto(cat.fala)
    }
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
      setAbaAtiva('registos')
    } catch (err) {
      console.error('Erro de envio:', err)
      alert(`Falha no registo: ${err.message || 'Erro de comunicação'}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans ${modo === 'facil' ? 'bg-amber-50/30 text-slate-900' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header com Identidade Visual */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setAbaAtiva('reportar')}
            className="flex items-center space-x-2 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-sm group-hover:scale-105 transition-transform">
              🏙️
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className={`font-black text-blue-600 tracking-tight leading-none ${modo === 'facil' ? 'text-2xl' : 'text-xl'}`}>Zelador</span>
                <span className={`font-light text-slate-700 tracking-tight leading-none ${modo === 'facil' ? 'text-2xl' : 'text-xl'}`}>Digital</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Comunidade & Cidadania</span>
            </div>
          </button>

          <div className="flex items-center space-x-2">
            {/* Seletor de Modo */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-200/60">
              <button
                type="button"
                onClick={() => alternarModo('normal')}
                className={`px-2.5 py-1 rounded-lg transition-all ${modo === 'normal' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => alternarModo('facil')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${modo === 'facil' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span>🔊</span>
                <span>Fácil</span>
              </button>
            </div>

            <button
              onClick={() => setAbaAtiva('gestao')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                abaAtiva === 'gestao'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
              }`}
            >
              <span>⚙️ Gestão</span>
            </button>
          </div>
        </div>

        {/* Abas Principais de Navegação */}
        <div className="max-w-4xl mx-auto px-4 flex border-t border-slate-100 bg-white">
          <button
            onClick={() => setAbaAtiva('reportar')}
            className={`flex-1 py-3 text-center font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
              modo === 'facil' ? 'text-sm' : 'text-xs'
            } ${
              abaAtiva === 'reportar'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>➕</span>
            <span>Reportar</span>
          </button>

          <button
            onClick={() => setAbaAtiva('mapa')}
            className={`flex-1 py-3 text-center font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
              modo === 'facil' ? 'text-sm' : 'text-xs'
            } ${
              abaAtiva === 'mapa'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🗺️</span>
            <span>Mapa</span>
          </button>

          <button
            onClick={() => setAbaAtiva('registos')}
            className={`flex-1 py-3 text-center font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
              modo === 'facil' ? 'text-sm' : 'text-xs'
            } ${
              abaAtiva === 'registos'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📋</span>
            <span>Registos</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-4xl w-full mx-auto px-4 py-5 flex-1 space-y-4">
        {abaAtiva === 'reportar' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Banner Discreto de Apresentação Territorial */}
            {mostrarBanner && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🌱</span>
                  <div>
                    <h3 className="text-xs font-black text-blue-950 uppercase tracking-wide">Plataforma Cívica Independente</h3>
                    <p className="text-[11.5px] text-blue-800/90 leading-snug mt-0.5">
                      Identifique e mapeie demandas do seu setor para documentação comunitária.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarBanner(false)}
                  className="text-blue-400 hover:text-blue-700 p-1 rounded-lg text-sm"
                  title="Fechar introdução"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Banner Acessibilidade / Modo Fácil */}
            {modo === 'facil' && (
              <div className="bg-amber-100/80 border border-amber-300 rounded-2xl p-3 flex items-center justify-between text-amber-900 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🔊</span>
                  <span className="text-xs font-bold">Modo Fácil: Botões ampliados e leitura ativa de voz</span>
                </div>
                <button
                  type="button"
                  onClick={() => falarTexto('Selecione o problema, anexe a foto, verifique a localização e aperte no botão azul Enviar Registo.')}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs"
                >
                  Ouvir Ajuda
                </button>
              </div>
            )}

            {/* BLOCO 1: Tipologia do Problema */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                  <label className={`font-black text-slate-800 uppercase tracking-wide ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                    Tipo da Ocorrência
                  </label>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Selecione uma opção</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {CATEGORIAS.map((cat) => {
                  const ativo = categoria === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selecionarCategoria(cat)}
                      className={`rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        modo === 'facil' ? 'p-6' : 'p-4'
                      } ${
                        ativo
                          ? `${cat.activeBg} ${cat.border} shadow-sm ring-2 ring-blue-500/20 scale-[1.01]`
                          : `bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100`
                      }`}
                    >
                      <span className={modo === 'facil' ? 'text-4xl mb-2' : 'text-2xl mb-1'}>{cat.icon}</span>
                      <span className={`font-bold ${modo === 'facil' ? 'text-base' : 'text-xs'}`}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* BLOCO 2: Evidências e Georreferenciamento */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                  <label className={`font-black text-slate-800 uppercase tracking-wide ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                    Comprovativo & Coordenadas
                  </label>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Evidência em campo</span>
              </div>

              {/* Upload de Fotografia */}
              <div>
                {fotoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                    <img src={fotoPreview} alt="Evidência" className={`w-full object-cover ${modo === 'facil' ? 'h-64' : 'h-48'}`} />
                    <button
                      type="button"
                      onClick={removerFoto}
                      className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all cursor-pointer"
                    >
                      ✕ Trocar Fotografia
                    </button>
                  </div>
                ) : (
                  <label className={`border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50/80 transition-all ${modo === 'facil' ? 'p-8' : 'p-6'}`}>
                    <span className={modo === 'facil' ? 'text-4xl mb-2' : 'text-3xl mb-1'}>📸</span>
                    <span className={`font-bold text-slate-700 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                      Tirar foto no local ou carregar
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">Formatos suportados: JPG, PNG, WEBP</span>
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

              {/* Card de GPS com indicador de status */}
              <div className={`rounded-2xl border flex items-center justify-between transition-colors ${
                localizacao ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
              } ${modo === 'facil' ? 'p-5' : 'p-4'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    localizacao ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    📍
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className={`font-bold text-slate-900 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                        {localizacao
                          ? 'Localização capturada com precisão'
                          : capturandoGps
                          ? 'A obter sinal de satélite...'
                          : 'GPS pronto para captura'}
                      </p>
                      {localizacao && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {localizacao
                        ? `Lat: ${localizacao.latitude.toFixed(5)}, Long: ${localizacao.longitude.toFixed(5)}`
                        : 'Toque em Atualizar para sincronizar a posição exata'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={obterLocalizacaoAtual}
                  disabled={capturandoGps}
                  className={`font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-2xs cursor-pointer ${
                    modo === 'facil' ? 'px-4 py-2.5 text-xs' : 'px-3 py-2 text-xs'
                  }`}
                >
                  {capturandoGps ? 'A capturar...' : '🔄 Atualizar'}
                </button>
              </div>
            </div>

            {/* BLOCO 3: Detalhes e Envio */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">3</span>
                  <label className={`font-black text-slate-800 uppercase tracking-wide ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                    Referência & Confirmação
                  </label>
                </div>
                <button
                  type="button"
                  onClick={alternarReconhecimentoVoz}
                  className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    gravandoVoz
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <span>🎤</span>
                  <span>{gravandoVoz ? 'A ouvir...' : 'Ditar por voz'}</span>
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Ex.: Em frente à praça, próximo ao canal ou poste sem número..."
                  value={pontoReferencia}
                  onChange={(e) => setPontoReferencia(e.target.value)}
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all ${
                    modo === 'facil' ? 'px-4 py-3.5 text-sm' : 'px-4 py-3 text-xs'
                  }`}
                />
              </div>

              {/* Botão de Envio Principal */}
              <button
                type="submit"
                disabled={enviando}
                className={`w-full rounded-2xl font-black uppercase tracking-wider text-white shadow-md transition-all ${
                  modo === 'facil' ? 'py-5 text-base' : 'py-4 text-xs'
                } ${
                  enviando
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
                }`}
              >
                {enviando ? 'A enviar registo... 🚀' : 'Enviar Registo 🚀'}
              </button>
            </div>
          </form>
        )}

        {/* Aba Mapa com componente completo e Mapa de Calor */}
        {abaAtiva === 'mapa' && (
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
            <MapaOcorrencias ocorrencias={registos} onRecarregar={carregarRegistos} />
          </div>
        )}

        {/* Aba Registos */}
        {abaAtiva === 'registos' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Ocorrências Comunitárias</h2>
                <p className="text-xs text-slate-400 mt-0.5">Acompanhamento transparente das demandas</p>
              </div>
              <button
                onClick={carregarRegistos}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                🔄 Atualizar
              </button>
            </div>

            {carregandoRegistos ? (
              <div className="py-16 text-center text-xs text-slate-400">A carregar ocorrências...</div>
            ) : registos.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">Nenhuma ocorrência registada.</div>
            ) : (
              <div className="space-y-3">
                {registos.map((reg) => (
                  <div key={reg.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex justify-between items-start gap-4 hover:border-slate-300 transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs capitalize text-slate-800">{reg.categoria}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                          {reg.status || 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{reg.descricao}</p>
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

        {/* Aba Gestão */}
        {abaAtiva === 'gestao' && <PainelGestor />}
      </main>

      {/* Rodapé Oficial do Projeto */}
      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200/80 bg-white">
        <p className="font-bold text-slate-600">Zelador Digital © 2026 — Plataforma de Gestão Comunitária</p>
        <p className="text-[11px] mt-0.5">
          Idealizado, projetado e desenvolvido por <strong className="text-slate-600">Dante Dias Monteiro</strong>
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Iniciativa civil independente para mapeamento urbano, saneamento e zeladoria social.
        </p>
      </footer>
    </div>
  )
}