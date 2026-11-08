import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Centro territorial de Ananindeua
const CENTRO_COMUNITARIO = {
  latitude: -1.365000,
  longitude: -48.375000,
  raioMetros: 18000,
  nome: 'Ananindeua'
}

// Criação segura de ícones
const criarIcone = (emoji, bgCor) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${bgCor};
        width: 34px;
        height: 34px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.25);
        border: 2px solid white;
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  })
}

const ICONES = {
  lixo: criarIcone('🗑️', '#f59e0b'),
  iluminacao: criarIcone('💡', '#6366f1'),
  buraco: criarIcone('🕳️', '#ea580c'),
  esgoto: criarIcone('💧', '#0284c7'),
  padrao: criarIcone('📍', '#2563eb')
}

function AjustarVisualizacao({ centro, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (map) {
      try {
        map.setView(centro, zoom)
      } catch (e) {
        console.warn(e)
      }
    }
  }, [centro, zoom, map])
  return null
}

export default function MapaOcorrencias({ ocorrencias = [] }) {
  const [montado, setMontado] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todas')
  const [modoVisualizacao, setModoVisualizacao] = useState('pontos')
  const [posicaoGps, setPosicaoGps] = useState(null)
  const [obtendoGps, setObtendoGps] = useState(false)

  useEffect(() => {
    setMontado(true)
    obterGpsUsuario()
  }, [])

  const obterGpsUsuario = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    setObtendoGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosicaoGps([pos.coords.latitude, pos.coords.longitude])
        setObtendoGps(false)
      },
      () => setObtendoGps(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const pontosValidos = useMemo(() => {
    if (!Array.isArray(ocorrencias)) return []
    return ocorrencias.filter((item) => {
      const lat = parseFloat(item?.latitude)
      const lng = parseFloat(item?.longitude)
      const valido = !isNaN(lat) && isFinite(lat) && !isNaN(lng) && isFinite(lng)
      const tipo = filtroTipo === 'todas' || item?.categoria === filtroTipo
      return valido && tipo
    })
  }, [ocorrencias, filtroTipo])

  const centro = [CENTRO_COMUNITARIO.latitude, CENTRO_COMUNITARIO.longitude]

  if (!montado) {
    return (
      <div className="h-[400px] rounded-3xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-bold">
        A carregar mapa... 🗺️
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barra de ferramentas do mapa */}
      <div className="space-y-2.5">
        <div className="flex items-center">
          <div className="bg-slate-100 p-1 rounded-full flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setModoVisualizacao('pontos')}
              className={`min-h-10 px-4 rounded-full text-xs font-black transition-all cursor-pointer ${
                modoVisualizacao === 'pontos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              📍 Pontos
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao('calor')}
              className={`min-h-10 px-4 rounded-full text-xs font-black transition-all cursor-pointer ${
                modoVisualizacao === 'calor' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              🔥 Calor
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFiltroTipo('todas')}
            className={`min-h-10 px-3 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              filtroTipo === 'todas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Todos ({ocorrencias.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('lixo')}
            className={`min-h-10 px-3 rounded-xl text-[11px] font-bold shrink-0 cursor-pointer ${
              filtroTipo === 'lixo' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            🗑️ Lixo
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('iluminacao')}
            className={`min-h-10 px-3 rounded-xl text-[11px] font-bold shrink-0 cursor-pointer ${
              filtroTipo === 'iluminacao' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            💡 Postes
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('buraco')}
            className={`min-h-10 px-3 rounded-xl text-[11px] font-bold shrink-0 cursor-pointer ${
              filtroTipo === 'buraco' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            🕳️ Buracos
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('esgoto')}
            className={`min-h-10 px-3 rounded-xl text-[11px] font-bold shrink-0 cursor-pointer ${
              filtroTipo === 'esgoto' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            💧 Esgoto
          </button>
        </div>
      </div>

      {/* Caixa do Mapa Leaflet */}
      <div className="mapa-ocorrencias relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm h-[65vh] min-h-[420px] max-h-[600px] bg-slate-100">
        <MapContainer
          center={centro}
          zoom={11}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <AjustarVisualizacao centro={centro} zoom={11} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Círculo Territorial Comunitário (18 km) */}
          <Circle
            center={centro}
            radius={CENTRO_COMUNITARIO.raioMetros}
            pathOptions={{
              color: '#0284c7',
              fillColor: '#38bdf8',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '6, 6'
            }}
          />

          {posicaoGps && (
            <Marker position={posicaoGps} icon={criarIcone('📍', '#10b981')}>
              <Popup>
                <div className="text-center font-sans p-1 text-xs font-bold text-emerald-800">
                  Localização Atual
                </div>
              </Popup>
            </Marker>
          )}

          {modoVisualizacao === 'pontos' &&
            pontosValidos.map((item) => {
              const lat = parseFloat(item.latitude)
              const lng = parseFloat(item.longitude)
              const icone = ICONES[item.categoria] || ICONES.padrao

              return (
                <Marker key={item.id} position={[lat, lng]} icon={icone}>
                  <Popup>
                    <div className="p-1 space-y-2 font-sans max-w-[190px]">
                      {item.foto_url && (
                        <img
                          src={item.foto_url}
                          alt="Registo"
                          className="w-full h-20 object-cover rounded-xl border border-slate-200"
                        />
                      )}
                      <div>
                        <span className="text-xs font-black capitalize text-slate-800 block">
                          {item.categoria}
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                          {item.descricao || 'Sem descrição.'}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

          {modoVisualizacao === 'calor' &&
            pontosValidos.map((item) => {
              const lat = parseFloat(item.latitude)
              const lng = parseFloat(item.longitude)
              return (
                <Circle
                  key={`calor-${item.id}`}
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

        <button
          type="button"
          onClick={obterGpsUsuario}
          disabled={obtendoGps}
          className="absolute top-3 right-3 z-[1000] w-12 h-12 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 flex items-center justify-center text-lg font-bold shadow-lg transition-all hover:bg-white active:scale-95 disabled:cursor-wait"
          title="Recentralizar na minha posição"
          aria-label="Recentralizar na minha posição"
        >
          {obtendoGps ? '⏳' : '🎯'}
        </button>

      </div>
    </div>
  )
}