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
  const [abaAtiva, setAbaAtiva] = useState('inicio') // 'inicio', 'reportar', 'mapa', 'registos', 'gestao'
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
    carregarRegistos()
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

  // Métricas calculadas para os cartões superiores
  const totalRegistos = registos.length
  const totalResolvidos = registos.filter((r) => r.status === 'resolvido' || r.status === 'concluido').length
  const totalPendentes = registos.filter((r) => r.status !== 'resolvido' && r.status !== 'concluido').length

  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans ${modo === 'facil' ? 'bg-amber-50/30 text-slate-900' : 'bg-slate-100/70 text-slate-800'}`}>
      {/* Topo / Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setAbaAtiva('inicio')}
            className="flex items-center space-x-2 text-left focus:outline-none cursor-pointer"
          >
            <span className={`font-black text-blue-600 tracking-tight ${modo === 'facil' ? 'text-3xl' : 'text-2xl'}`}>Zelador</span>
            <span className={`font-light text-slate-500 ${modo === 'facil' ? 'text-3xl' : 'text-2xl'}`}>Digital</span>
          </button>

          <div className="flex items-center space-x-2">
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold border border-slate-200/60">
              <button
                type="button"
                onClick={() => alternarModo('normal')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${modo === 'normal' ? 'bg-white text-blue-600 shadow-2xs font-extrabold' : 'text-slate-600'}`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => alternarModo('facil')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${modo === 'facil' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'text-slate-600'}`}
              >
                <span>🔊</span>
                <span>Fácil</span>
              </button>
            </div>

            <button
              onClick={() => setAbaAtiva('gestao')}
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

      {/* Conteúdo Central */}
      <main className="max-w-md w-full mx-auto px-4 py-4 flex-1">
        {/* TELA INICIAL (ESTILO CITY SERVICES REPORTING) */}
        {abaAtiva === 'inicio' && (
          <div className="space-y-4">
            {/* Cartão Superior com Gradiente e Contadores */}
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-sky-600 to-emerald-500 p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-xs uppercase tracking-wider text-sky-100 font-bold">Plataforma Comunitária</span>
                  <h1 className="text-2xl font-black mt-0.5">Visão Geral</h1>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
                  📍
                </div>
              </div>

              {/* 3 Blocos de Métricas */}
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

            {/* Ações Rápidas (Quick Actions) */}
            <div className="space-y-3">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">Ações Rápidas</h2>

              {/* Botão de Destaque para Criar Registo */}
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
                    <span className="text-xs text-blue-100">Reporte buracos, iluminação ou lixo</span>
                  </div>
                </div>
                <span className="text-2xl">📸</span>
              </button>

              {/* Grid com Cartões de Navegação */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAbaAtiva('registos')}
                  className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 border border-emerald-100">
                    📋
                  </div>
                  <span className="text-xs font-black text-slate-800">Registos</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Histórico territorial</span>
                </button>

                <button
                  onClick={() => setAbaAtiva('mapa')}
                  className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-3xl p-4 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl mb-3 border border-sky-100">
                    🗺️
                  </div>
                  <span className="text-xs font-black text-slate-800">Ver Mapa</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Mapa e calor térmico</span>
                </button>
              </div>

              {/* Atalho para o Painel de Gestão */}
              <button
                onClick={() => setAbaAtiva('gestao')}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between text-left transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg">
                    ⚙️
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Painel Administrativo</span>
                    <span className="text-[10px] text-slate-400">Acesso restrito via PIN</span>
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-xs">Aceder →</span>
              </button>
            </div>
          </div>
        )}

        {/* TELA DE REPORTAR */}
        {abaAtiva === 'reportar' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAbaAtiva('inicio')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              ← Voltar ao Início
            </button>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
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

              {/* 1. Categorias */}
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

              {/* 2. Fotografia */}
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

              {/* 3. GPS */}
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
                        : 'Clique em Atualizar para capturar'}
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

              {/* 4. Ponto de Referência com microfone */}
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

              {/* Botão Enviar */}
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
          </div>
        )}

        {/* TELA DE MAPA */}
        {abaAtiva === 'mapa' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAbaAtiva('inicio')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              ← Voltar ao Início
            </button>
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
              <MapaOcorrencias ocorrencias={registos} onRecarregar={carregarRegistos} />
            </div>
          </div>
        )}

        {/* TELA DE REGISTOS */}
        {abaAtiva === 'registos' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAbaAtiva('inicio')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              ← Voltar ao Início
            </button>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">Ocorrências Comunitárias</h2>
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
                    <div key={reg.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs flex justify-between items-start gap-3">
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
          </div>
        )}

        {/* TELA DE GESTÃO */}
        {abaAtiva === 'gestao' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAbaAtiva('inicio')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              ← Voltar ao Início
            </button>
            <PainelGestor />
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="text-center py-5 text-xs text-slate-400 border-t border-slate-200 bg-white">
        <p className="font-bold text-slate-600">Zelador Digital © 2026 — Gestão Comunitária</p>
        <p className="text-[11px] mt-0.5">
          Desenvolvido por <strong className="text-slate-600">Dante Dias Monteiro</strong>
        </p>
      </footer>
    </div>
  )
}