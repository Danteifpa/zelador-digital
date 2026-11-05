import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import PainelGestor from './components/PainelGestor'

const CATEGORIAS = [
  { id: 'lixo', label: 'Lixo / Entulho', icon: '🗑️', border: 'border-amber-400', activeBg: 'bg-amber-500 text-white' },
  { id: 'iluminacao', label: 'Poste Apagado', icon: '💡', border: 'border-indigo-400', activeBg: 'bg-indigo-600 text-white' },
  { id: 'buraco', label: 'Buraco na Rua', icon: '🕳️', border: 'border-orange-500', activeBg: 'bg-orange-600 text-white' },
  { id: 'esgoto', label: 'Esgoto / Água', icon: '💧', border: 'border-sky-400', activeBg: 'bg-sky-600 text-white' }
]

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('reportar')
  const [categoria, setCategoria] = useState('buraco')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [localizacao, setLocalizacao] = useState(null)
  const [capturandoGps, setCapturandoGps] = useState(false)
  const [pontoReferencia, setPontoReferencia] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Ocorrências para exibição rápida no separador Registos
  const [registos, setRegistos] = useState([])
  const [carregandoRegistos, setCarregandoRegistos] = useState(false)

  useEffect(() => {
    obterLocalizacaoAtual()
  }, [])

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
      alert('Geolocalização não é suportada pelo seu navegador.')
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
      },
      (err) => {
        console.warn('Erro ao obter GPS:', err.message)
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
    }
  }

  const removerFoto = () => {
    setFoto(null)
    setFotoPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!localizacao) {
      alert('Por favor, capture a localização antes de enviar o registo.')
      return
    }

    try {
      setEnviando(true)
      let urlFotoPublica = null

      // 1. Upload da Foto para o Storage se houver arquivo
      if (foto) {
        const fileExt = foto.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `ocorrencias/${fileName}`

        // Tenta enviar para o bucket 'ocorrencias' (ou 'fotos' caso configurado)
        let uploadResult = await supabase.storage.from('ocorrencias').upload(filePath, foto)

        if (uploadResult.error) {
          uploadResult = await supabase.storage.from('fotos').upload(filePath, foto)
        }

        if (uploadResult.error) {
          throw new Error(`Erro ao enviar fotografia: ${uploadResult.error.message}`)
        }

        const bucketUsado = uploadResult.data?.fullPath?.split('/')[0] || 'ocorrencias'
        const { data: publicData } = supabase.storage.from(bucketUsado).getPublicUrl(filePath)
        urlFotoPublica = publicData?.publicUrl || null
      }

      // 2. Formatar o Ponto em WKT para a coluna PostGIS 'localizacao'
      const pontoWKT = `POINT(${localizacao.longitude} ${localizacao.latitude})`

      // 3. Inserir na tabela 'ocorrencias' respeitando as colunas existentes
      const { error: insertError } = await supabase.from('ocorrencias').insert([
        {
          categoria: categoria,
          descricao: pontoReferencia.trim() || 'Ocorrência registada pela comunidade',
          foto_url: urlFotoPublica,
          localizacao: pontoWKT,
          status: 'pendente'
        }
      ])

      if (insertError) {
        throw new Error(insertError.message || JSON.stringify(insertError))
      }

      alert('Registo enviado com sucesso!')
      // Limpeza do formulário
      setPontoReferencia('')
      setFoto(null)
      setFotoPreview(null)
      setAbaAtiva('registos')
    } catch (err) {
      console.error('Falha detalhada ao enviar ocorrência:', err)
      alert(`Falha no registo: ${err.message || 'Erro desconhecido'}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
      {/* Topo / Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black text-blue-600 tracking-tight">Zelador</span>
            <span className="text-2xl font-light text-slate-500">Digital</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => alert('Zelador Digital Comunitário: Sistema cívico colaborativo para identificação e acompanhamento territorial de demandas urbanas.')}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              title="Sobre o projeto"
            >
              ℹ️
            </button>
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

        {/* Abas Principais */}
        <div className="max-w-4xl mx-auto px-4 flex border-t border-slate-100">
          <button
            onClick={() => setAbaAtiva('reportar')}
            className={`flex-1 py-3 text-center text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
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
            className={`flex-1 py-3 text-center text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
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
            className={`flex-1 py-3 text-center text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
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

      {/* Conteúdo Principal */}
      <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1">
        {abaAtiva === 'reportar' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            {/* 1. Seleção de Categoria */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                1. Selecione a Categoria:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIAS.map((cat) => {
                  const ativo = categoria === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoria(cat.id)}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                        ativo
                          ? `${cat.activeBg} ${cat.border} shadow-sm scale-[1.01]`
                          : `bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100`
                      }`}
                    >
                      <span className="text-2xl mb-1">{cat.icon}</span>
                      <span className="text-xs font-bold">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Captura da Fotografia */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                2. Fotografia do Local:
              </label>

              {fotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={fotoPreview} alt="Visualização" className="w-full h-52 object-cover" />
                  <button
                    type="button"
                    onClick={removerFoto}
                    className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all"
                  >
                    ✕ Trocar Fotografia
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-all">
                  <span className="text-3xl mb-1">📸</span>
                  <span className="text-xs font-bold text-slate-700">Tirar foto ou selecionar da galeria</span>
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

            {/* 3. Localização GPS */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {localizacao
                      ? 'Localização capturada com sucesso!'
                      : capturandoGps
                      ? 'A obter coordenadas GPS...'
                      : 'GPS pendente'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {localizacao
                      ? `Lat: ${localizacao.latitude.toFixed(5)}, Long: ${localizacao.longitude.toFixed(5)}`
                      : 'Clique no botão ao lado para capturar'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={obterLocalizacaoAtual}
                disabled={capturandoGps}
                className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-2xs"
              >
                {capturandoGps ? 'A capturar...' : '🔄 Atualizar'}
              </button>
            </div>

            {/* 4. Ponto de Referência */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Ponto de Referência (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex.: Próximo ao canal, em frente à mercearia..."
                value={pontoReferencia}
                onChange={(e) => setPontoReferencia(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 transition-all"
              />
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={enviando}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider text-white shadow-md transition-all ${
                enviando
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
              }`}
            >
              {enviando ? 'A enviar registo... 🚀' : 'Enviar Registo 🚀'}
            </button>
          </form>
        )}

        {abaAtiva === 'mapa' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Mapa Georreferenciado</h2>
              <span className="text-xs text-slate-500">{registos.length} pontos identificados</span>
            </div>

            {registos.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Nenhum ponto territorial encontrado no momento.
              </div>
            ) : (
              <div className="space-y-2">
                {registos.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 capitalize">{item.categoria}</p>
                      <p className="text-slate-500 text-[11px]">{item.descricao}</p>
                    </div>
                    {item.latitude && item.longitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 font-mono text-[11px] underline"
                      >
                        Abrir no Google Maps ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

        {abaAtiva === 'gestao' && <PainelGestor />}
      </main>

      {/* Rodapé Global */}
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