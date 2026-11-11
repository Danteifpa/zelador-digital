import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { CENTRO_ANANINDEUA, corCriticidade, formatarData, rotuloCriticidade } from '../../lib/gestao'
import { rotuloDoEstado } from '../../lib/status'
import { rotuloDaCategoria } from '../../lib/categorias'

function AjustarMapa({ centro, zoom }) {
  const mapa = useMap()
  useEffect(() => {
    mapa.setView(centro, zoom)
  }, [centro, mapa, zoom])
  return null
}

/** Mapa de focos críticos coloridos pela pontuação GUT. */
export default function MapaFocosCriticos({ ocorrenciasComGut }) {
  return (
    <>
    <section className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
        <div>
          <h3 className="text-xs font-black">Onde estão os chamados</h3>
          <p className="text-[10px] text-slate-400 mt-1">Quanto maior o círculo, mais urgente.</p>
        </div>
        <div className="flex gap-2 text-[9px] font-bold">
          <span className="text-rose-300">● Crítica</span>
          <span className="text-amber-300">● Atenção</span>
          <span className="text-emerald-300">● Rotina</span>
        </div>
      </div>
      <div className="h-[65vh] min-h-[420px] max-h-[600px] overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
        <MapContainer center={CENTRO_ANANINDEUA} zoom={11} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
          <AjustarMapa centro={CENTRO_ANANINDEUA} zoom={11} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {ocorrenciasComGut
            .filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
            .map((item) => {
              const cor = corCriticidade(item.gut.pontuacao)
              return (
                <CircleMarker
                  key={item.id}
                  center={[Number(item.latitude), Number(item.longitude)]}
                  radius={6 + (item.gut.pontuacao / 125) * 14}
                  pathOptions={{ color: cor, fillColor: cor, fillOpacity: 0.65, weight: 2 }}
                >
                  <Popup>
                    <div className="min-w-36 text-xs">
                      <strong className="block">{rotuloDaCategoria(item.categoria)}</strong>
                      <span className="block mt-1">GUT: {item.gut.pontuacao} — {rotuloCriticidade(item.gut.pontuacao)}</span>
                      <span className="block">Data: {formatarData(item.created_at)}</span>
                      <span className="block">Bairro: {item.bairro || item.endereco || item.morada || 'Não informado'}</span>
                      <span className="block">Status: {rotuloDoEstado(item.status)}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
        </MapContainer>
      </div>
    </section>
    </>
  )
}
