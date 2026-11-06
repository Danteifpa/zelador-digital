import React, { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'

// Cores e ícones padronizados por categoria
const CORES_CATEGORIAS = {
  lixo: { bg: '#f59e0b', text: '#fff', label: 'Lixo / Entulho', icon: '🗑️' },
  iluminacao: { bg: '#6366f1', text: '#fff', label: 'Poste Apagado', icon: '💡' },
  buraco: { bg: '#ea580c', text: '#fff', label: 'Buraco na Rua', icon: '🕳️' },
  esgoto: { bg: '#0284c7', text: '#fff', label: 'Esgoto / Água', icon: '💧' }
}

export default function MapaOcorrencias({ ocorrencias = [], onRecarregar }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const heatLayerRef = useRef(null)

  const [modoVisualizacao, setModoVisualizacao] = useState('pontos') // 'pontos' ou 'calor'
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [pontoSelecionado, setPontoSelecionado] = useState(null)

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapRef.current) return

    // Centro inicial: Novo Cristo / Icuí, Ananindeua
    const mapa = L.map(mapRef.current, {
      zoomControl: false
    }).setView([-1.345, -48.415], 14)

    L.control.zoom({ position: 'topright' }).addTo(mapa)

    // Camada CartoDB Positron (estilo limpo e moderno)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap © CARTO'
    }).addTo(mapa)

    markersLayerRef.current = L.layerGroup().addTo(mapa)
    mapInstanceRef.current = mapa

    return () => {
      mapa.remove()
    }
  }, [])

  // Atualização dos Marcadores e da Camada Térmica (Heatmap)
  useEffect(() => {
    const mapa = mapInstanceRef.current
    if (!mapa || !markersLayerRef.current) return

    // Limpa camadas existentes
    markersLayerRef.current.clearLayers()
    if (heatLayerRef.current) {
      mapa.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    const ocorrenciasValidas = ocorrencias.filter(
      (o) =>
        o.latitude &&
        o.longitude &&
        (categoriaFiltro === 'todas' || o.categoria === categoriaFiltro)
    )

    if (modoVisualizacao === 'pontos') {
      ocorrenciasValidas.forEach((item) => {
        const config = CORES_CATEGORIAS[item.categoria] || {
          bg: '#475569',
          text: '#fff',
          icon: '📍'
        }

        // Marcador HTML moderno personalizado
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              background-color: ${config.bg};
              width: 34px;
              height: 34px;
              border-radius: 12px;
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 15px;
              cursor: pointer;
              transition: transform 0.15s ease;
            ">
              ${config.icon}
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        })

        const marker = L.marker([item.latitude, item.longitude], { icon: customIcon })

        marker.on('click', () => {
          setPontoSelecionado(item)
          mapa.panTo([item.latitude, item.longitude])
        })

        markersLayerRef.current.addLayer(marker)
      })
    } else if (modoVisualizacao === 'calor') {
      const pontosCalor = ocorrenciasValidas.map((item) => [
        item.latitude,
        item.longitude,
        0.8 // intensidade térmica
      ])

      if (L.heatLayer && pontosCalor.length > 0) {
        heatLayerRef.current = L.heatLayer(pontosCalor, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: { 0.4: '#38bdf8', 0.65: '#facc15', 1.0: '#ef4444' }
        }).addTo(mapa)
      }
    }

    // Ajusta o foco do mapa para os pontos registados
    if (ocorrenciasValidas.length > 0) {
      const grupo = L.featureGroup(
        ocorrenciasValidas.map((o) => L.marker([o.latitude, o.longitude]))
      )
      mapa.fitBounds(grupo.getBounds().pad(0.15), { maxZoom: 16 })
    }
  }, [ocorrencias, modoVisualizacao, categoriaFiltro])

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
      {/* Container do Mapa Leaflet */}
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Camada Flutuante Superior: Alternador de Visualização e Filtros */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col space-y-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          {/* Alternador Pontos / Calor */}
          <div className="bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-md border border-slate-200 flex text-xs font-bold">
            <button
              onClick={() => setModoVisualizacao('pontos')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                modoVisualizacao === 'pontos'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📍 Pontos
            </button>
            <button
              onClick={() => setModoVisualizacao('calor')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                modoVisualizacao === 'calor'
                  ? 'bg-rose-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔥 Calor
            </button>
          </div>

          {/* Botão de Atualização Manual */}
          {onRecarregar && (
            <button
              onClick={onRecarregar}
              className="bg-white/90 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-700 hover:bg-white cursor-pointer"
              title="Recarregar pontos"
            >
              🔄
            </button>
          )}
        </div>

        {/* Chips de Tipologia */}
        <div className="flex space-x-1 overflow-x-auto pb-1 pointer-events-auto">
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 transition-all shadow-2xs cursor-pointer ${
              categoriaFiltro === 'todas'
                ? 'bg-slate-900 text-white'
                : 'bg-white/90 backdrop-blur-md text-slate-600 border border-slate-200'
            }`}
          >
            Todas
          </button>
          {Object.entries(CORES_CATEGORIAS).map(([catId, item]) => (
            <button
              key={catId}
              onClick={() => setCategoriaFiltro(catId)}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all shadow-2xs flex items-center gap-1 cursor-pointer ${
                categoriaFiltro === catId
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cartão Flutuante Inferior (Bottom Sheet Card) ao Selecionar um Marcador */}
      {pontoSelecionado && (
        <div className="absolute bottom-3 left-3 right-3 z-10 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg text-white font-black shadow-xs shrink-0"
                  style={{
                    backgroundColor:
                      CORES_CATEGORIAS[pontoSelecionado.categoria]?.bg || '#475569'
                  }}
                >
                  {CORES_CATEGORIAS[pontoSelecionado.categoria]?.icon || '📍'}
                </div>
                <div>
                  <h4 className="font-black text-xs capitalize text-slate-800 leading-tight">
                    {CORES_CATEGORIAS[pontoSelecionado.categoria]?.label ||
                      pontoSelecionado.categoria}
                  </h4>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {pontoSelecionado.created_at
                      ? new Date(pontoSelecionado.created_at).toLocaleDateString('pt-BR')
                      : 'Data registada'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setPontoSelecionado(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {pontoSelecionado.descricao || 'Sem descrição registada.'}
            </p>

            {pontoSelecionado.foto_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 h-28 w-full bg-slate-100">
                <img
                  src={pontoSelecionado.foto_url}
                  alt="Registo no mapa"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${pontoSelecionado.latitude},${pontoSelecionado.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl text-center block shadow-2xs transition-all"
            >
              Abrir Rota no Google Maps ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}