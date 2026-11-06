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

  // Recupera o modo salvo
  useEffect(() => {
    const modoSalvo = localStorage.getItem('zelador_modo_interface')
    if (modoSalvo) setModo(modoSalvo)
    obterLocalizacaoAtual()
  }, [])

  const alternarModo = (novoModo) => {
    setModo(novoModo)
    localStorage.setItem('zelador_modo_interface', novoModo)
    if (novoModo === 'facil') {
      falarTexto('Modo fácil ativado. Botões ampliados e leitura em áudio.')
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

      // WKT PostGIS geometry
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`font-black text-blue-600 tracking-tight ${modo === 'facil' ? 'text-3xl' : 'text-2xl'}`}>Zelador</span>
            <span className={`font-light text-slate-500 ${modo === 'facil' ? 'text-3xl' : 'text-2xl'}`}>Digital</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Seletor Modo Fácil / Normal */}
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => alternarModo('normal')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${modo === 'normal' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => alternarModo('facil')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${modo === 'facil' ? 'bg-amber-500 text-white shadow-xs font-black' : 'text-slate-600'}`}
              >
                <span>🔊</span>
                <span>Fácil</span>
              </button>
            </div>

            <button
              onClick={() => setAbaAtiva('gestao')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                abaAtiva === 'gestao'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>⚙️ Gestão</span>
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="max-w-4xl mx-auto px-4 flex border-t border-slate-100">
          <button
            onClick={() => setAbaAtiva('reportar')}
            className={`flex-1 py-3 text-center font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
              modo === 'facil' ? 'text-sm' : 'text-xs'
            } ${
              abaAtiva === 'reportar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>📋</span>
            <span>Registos</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1">
        {abaAtiva === 'reportar' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            {modo === 'facil' && (
              <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-3 flex items-center justify-between text-amber-900">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🔊</span>
                  <span className="text-xs font-bold">Modo Fácil: Botões ampliados e áudio ativo</span>
                </div>
                <button
                  type="button"
                  onClick={() => falarTexto('Escolha o problema, tire a foto e clique no botão enviar no final.')}
                  className="text-xs bg-amber-500 text-white font-bold px-2.5 py-1 rounded-xl shadow-2xs"
                >
                  Ouvir Ajuda
                </button>
              </div>
            )}

            {/* Categorias */}
            <div>
              <label className={`block font-black text-slate-600 uppercase tracking-wider mb-3 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                1. Selecione a Categoria:
              </label>
              <div className="grid grid-cols-2 gap-3">
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
                          ? `${cat.activeBg} ${cat.border} shadow-sm scale-[1.01]`
                          : `bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100`
                      }`}
                    >
                      <span className={modo === 'facil' ? 'text-4xl mb-2' : 'text-2xl mb-1'}>{cat.icon}</span>
                      <span className={`font-bold ${modo === 'facil' ? 'text-base' : 'text-xs'}`}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fotografia */}
            <div>
              <label className={`block font-black text-slate-600 uppercase tracking-wider mb-2 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                2. Tire uma fotografia do local:
              </label>

              {fotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={fotoPreview} alt="Visualização" className={`w-full object-cover ${modo === 'facil' ? 'h-64' : 'h-52'}`} />
                  <button
                    type="button"
                    onClick={removerFoto}
                    className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all"
                  >
                    ✕ Trocar Fotografia
                  </button>
                </div>
              ) : (
                <label className={`border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-all ${modo === 'facil' ? 'p-8' : 'p-6'}`}>
                  <span className={modo === 'facil' ? 'text-4xl mb-2' : 'text-3xl mb-1'}>📸</span>
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

            {/* GPS */}
            <div className={`rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between ${modo === 'facil' ? 'p-5' : 'p-4'}`}>
              <div className="flex items-center space-x-3">
                <span className={modo === 'facil' ? 'text-3xl' : 'text-2xl'}>📍</span>
                <div>
                  <p className={`font-bold text-slate-800 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                    {localizacao
                      ? 'Localização exata capturada!'
                      : capturandoGps
                      ? 'A obter GPS...'
                      : 'GPS pendente'}
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
                className={`font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-2xs ${modo === 'facil' ? 'px-4 py-2.5 text-xs' : 'px-3 py-2 text-xs'}`}
              >
                {capturandoGps ? 'A capturar...' : '🔄 Atualizar'}
              </button>
            </div>

            {/* Ponto de Referência com microfone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block font-black text-slate-600 uppercase tracking-wider ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                  Ponto de Referência (Opcional):
                </label>
                <button
                  type="button"
                  onClick={alternarReconhecimentoVoz}
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
                    gravandoVoz
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <span>🎤</span>
                  <span>{gravandoVoz ? 'A ouvir...' : 'Falar por voz'}</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Ex.: Em frente à mercearia, perto da praça..."
                value={pontoReferencia}
                onChange={(e) => setPontoReferencia(e.target.value)}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all ${
                  modo === 'facil' ? 'px-4 py-3.5 text-sm' : 'px-4 py-3 text-xs'
                }`}
              />
            </div>

            {/* Botão Enviar */}
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
              <h2 className="text-base font-bold text-slate-800">Ocorrências Comunitárias</h2>
              <button
                onClick={carregarRegistos}
                className="text-xs text-blue-600 font-bold hover:underline"
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
                  <div key={reg.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex justify-between items-start gap-4">
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

      {/* Footer */}
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