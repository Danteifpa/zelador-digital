import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Coordenadas centrais comunitárias (Residencial Novo Cristo, Icuí - Ananindeua)
const CENTRO_COMUNITARIO = {
  latitude: -1.345000,
  longitude: -48.415000,
  raioMetros: 3500,
  nome: 'Residencial Novo Cristo / Icuí'
}

// Configuração de ícones customizados seguros
const criarIconeCustomizado = (emoji, bgCor) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${bgCor};
        width: 36px;
        height: 36px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        border: 2px solid white;
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  })
}

const ICONES_CATEGORIA = {
  lixo: criarIconeCustomizado('🗑️', '#f59e0b'),
  iluminacao: criarIconeCustomizado('💡', '#6366f1'),
  buraco: criarIconeCustomizado('🕳️', '#ea580c'),
  esgoto: criarIconeCustomizado('💧', '#0284c7'),
  default: criarIconeCustomizado('📍', '#2563eb')
}

function RecarregarVisaoMapa({ centro, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (map) {
      try {
        map.setView(centro, zoom)
      } catch (e) {
        console.warn('Erro ao ajustar visão do mapa:', e)
      }
    }
  }, [centro, zoom, map])
  return null
}

export default function MapaOcorrencias({ ocorrencias = [], onRecarregar }) {
  const [montado, setMontado] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todas')
  const [modoVisualizacao, setModoVisualizacao] = useState('pontos')
  const [posicaoGpsUsuario, setPosicaoGpsUsuario] = useState(null)
  const [carregandoGps, setCarregandoGps] = useState(false)

  // Evita crash de hidratação ou renderização prematura no telemóvel
  useEffect(() => {
    setMontado(true)
    rastrearLocalizacaoAtual()
  }, [])

  const rastrearLocalizacaoAtual = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    setCarregandoGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosicaoGpsUsuario([pos.coords.latitude, pos.coords.longitude])
        setCarregandoGps(false)
      },
      (err) => {
        console.warn('Erro GPS no mapa:', err.message)
        setCarregandoGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const dadosGeorreferenciados = useMemo(() => {
    if (!Array.isArray(ocorrencias)) return []
    return ocorrencias.filter((item) => {
      const temLat = typeof item?.latitude === 'number' || (!isNaN(parseFloat(item?.latitude)) && isFinite(item?.latitude))
      const temLng = typeof item?.longitude === 'number' || (!isNaN(parseFloat(item?.longitude)) && isFinite(item?.longitude))
      const bateuTipo = filtroTipo === 'todas' || item?.categoria === filtroTipo
      return temLat && temLng && bateuTipo
    })
  }, [ocorrencias, filtroTipo])

  const centroMapa = [CENTRO_COMUNITARIO.latitude, CENTRO_COMUNITARIO.longitude]

  if (!montado) {
    return (
      <div className="h-[420px] rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold animate-pulse">
        A inicializar mapa comunitário... 🗺️
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barra de Controles */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center shrink-0 border border-slate-200">
          <button
            type="button"
            onClick={() => setModoVisualizacao('pontos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              modoVisualizacao === 'pontos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📍 Pontos
          </button>
          <button
            type="button"
            onClick={() => setModoVisualizacao('calor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              modoVisualizacao === 'calor'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔥 Calor
          </button>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={rastrearLocalizacaoAtual}
            disabled={carregandoGps}
            className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-sm font-bold shadow-2xs transition-colors cursor-pointer"
            title="A minha localização"
          >
            {carregandoGps ? '⏳' : '🎯'}
          </button>

          {onRecarregar && (
            <button
              type="button"
              onClick={onRecarregar}
              className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-sm font-bold shadow-2xs transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* Seletor de Categorias */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFiltroTipo('todas')}
          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
            filtroTipo === 'todas'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todas ({ocorrencias.length})
        </button>
        <button
          type="button"
          onClick={() => setFiltroTipo('lixo')}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
            filtroTipo === 'lixo'
              ? 'bg-amber-500 text-white shadow-2xs'
              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          🗑️ Lixo
        </button>
        <button
          type="button"
          onClick={() => setFiltroTipo('iluminacao')}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
            filtroTipo === 'iluminacao'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          💡 Postes
        </button>
        <button
          type="button"
          onClick={() => setFiltroTipo('buraco')}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
            filtroTipo === 'buraco'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
          }`}
        >
          🕳️ Buracos
        </button>
        <button
          type="button"
          onClick={() => setFiltroTipo('esgoto')}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
            filtroTipo === 'esgoto'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
          }`}
        >
          💧 Esgoto
        </button>
      </div>

      {/* Caixa do Mapa Leaflet */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm h-[420px] bg-slate-100">
        <MapContainer
          center={centroMapa}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <RecarregarVisaoMapa centro={centroMapa} zoom={14} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Círculo do raio territorial de 3.5 km */}
          <Circle
            center={centroMapa}
            radius={CENTRO_COMUNITARIO.raioMetros}
            pathOptions={{
              color: '#0284c7',
              fillColor: '#38bdf8',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '6, 6'
            }}
          />

          {posicaoGpsUsuario && (
            <Marker
              position={posicaoGpsUsuario}
              icon={criarIconeCustomizado('📍', '#10b981')}
            >
              <Popup>
                <div className="text-center font-sans p-1">
                  <span className="text-xs font-black text-emerald-800 block">Localização Atual</span>
                </div>
              </Popup>
            </Marker>
          )}

          {modoVisualizacao === 'pontos' &&
            dadosGeorreferenciados.map((item) => {
              const lat = parseFloat(item.latitude)
              const lng = parseFloat(item.longitude)
              const icone = ICONES_CATEGORIA[item.categoria] || ICONES_CATEGORIA.default

              return (
                <Marker key={item.id} position={[lat, lng]} icon={icone}>
                  <Popup>
                    <div className="p-1 space-y-2 font-sans max-w-[200px]">
                      {item.foto_url && (
                        <img
                          src={item.foto_url}
                          alt="Foto"
                          className="w-full h-24 object-cover rounded-xl border border-slate-200"
                        />
                      )}
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-black capitalize text-slate-800">
                            {item.categoria}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.status === 'resolvido' || item.status === 'concluido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status || 'Pendente'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {item.descricao || 'Sem descrição.'}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

          {modoVisualizacao === 'calor' &&
            dadosGeorreferenciados.map((item) => {
              const lat = parseFloat(item.latitude)
              const lng = parseFloat(item.longitude)
              return (
                <Circle
                  key={`heat-${item.id}`}
                  center={[lat, lng]}
                  radius={120}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#f97316',
                    fillOpacity: 0.45,
                    weight: 0
                  }}
                />
              )
            })}
        </MapContainer>

        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200/90 shadow-md flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
            <span className="font-bold text-slate-700 truncate">
              {CENTRO_COMUNITARIO.nome} (3,5 km)
            </span>
          </div>
          <span className="font-black text-blue-600 shrink-0">
            {dadosGeorreferenciados.length} pontos
          </span>
        </div>
      </div>
    </div>
  )
}