import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { supabase } from '../lib/supabase';
import { Flame, MapPin, ThumbsUp, Calendar, ExternalLink } from 'lucide-react';

// Ajuste dos ícones nativos do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Componente auxiliar para renderizar a camada de calor no Leaflet
function CamadaCalor({ pontos }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map || pontos.length === 0) return;

    // Converte os pontos para [lat, lng, intensidade]
    // A intensidade é ponderada pelo número de apoios (base 0.5 + 0.1 por apoio, máx 1.0)
    const dadosCalor = pontos.map((p) => {
      const peso = Math.min(1.0, 0.4 + (p.apoios || 0) * 0.1);
      return [p.lat, p.lng, peso];
    });

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    heatLayerRef.current = L.heatLayer(dadosCalor, {
      radius: 35,
      blur: 22,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.2: '#3b82f6', // azul (frio/poucos registros)
        0.5: '#eab308', // amarelo
        0.7: '#f97316', // laranja
        1.0: '#ef4444'  // vermelho intenso (ponto crítico)
      }
    }).addTo(map);

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, pontos]);

  return null;
}

export default function MapaOcorrencias() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modoExibicao, setModoExibicao] = useState('pinos'); // 'pinos' ou 'calor'
  const [apoiosLocais, setApoiosLocais] = useState([]);

  // Posição central padrão
  const centroPadrao = [-1.3655, -48.3731];

  useEffect(() => {
    try {
      const salvos = JSON.parse(localStorage.getItem('zelador_apoios_dados') || '[]');
      setApoiosLocais(salvos);
    } catch {
      setApoiosLocais([]);
    }
  }, []);

  const extrairCoordenadas = (geom) => {
    if (!geom) return null;
    if (typeof geom === 'string' && geom.startsWith('POINT(')) {
      const coords = geom.replace('POINT(', '').replace(')', '').trim().split(' ');
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    if (geom.coordinates && Array.isArray(geom.coordinates)) {
      return { lat: geom.coordinates[1], lng: geom.coordinates[0] };
    }
    return null;
  };

  const carregarOcorrencias = async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('ocorrencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOcorrencias(data || []);
    } catch (err) {
      console.error('Erro ao carregar dados do mapa:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarOcorrencias();
  }, []);

  const darApoio = async (id) => {
    if (apoiosLocais.includes(id)) return;

    try {
      setOcorrencias((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, total_apoios: (item.total_apoios || 0) + 1 } : item
        )
      );

      const novosApoios = [...apoiosLocais, id];
      setApoiosLocais(novosApoios);
      localStorage.setItem('zelador_apoios_dados', JSON.stringify(novosApoios));

      await supabase.rpc('incrementar_apoio', { ocorrencia_id: id });
    } catch (err) {
      console.error('Falha ao apoiar no mapa:', err);
      carregarOcorrencias();
    }
  };

  // Prepara lista de pontos válidos com coordenadas numéricas
  const pontosValidos = ocorrencias
    .map((item) => {
      const coords = extrairCoordenadas(item.localizacao);
      if (!coords) return null;
      return {
        ...item,
        lat: coords.lat,
        lng: coords.lng,
        apoios: item.total_apoios || 0
      };
    })
    .filter(Boolean);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-12">
      {/* Controles de Topo e Alternância de Camadas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mapeamento Territorial Comunitário</h2>
          <p className="text-xs text-gray-500">
            {pontosValidos.length} pontos georreferenciados identificados em campo.
          </p>
        </div>

        {/* Interruptor Marcadores vs Calor */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModoExibicao('pinos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              modoExibicao === 'pinos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin size={14} />
            <span>Marcadores</span>
          </button>

          <button
            type="button"
            onClick={() => setModoExibicao('calor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              modoExibicao === 'calor'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Flame size={14} />
            <span>Mancha de Calor</span>
          </button>
        </div>
      </div>

      {/* Área do Mapa */}
      <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
        {carregando && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex items-center justify-center text-xs text-gray-600">
            A carregar cartografia territorial...
          </div>
        )}

        <MapContainer
          center={pontosValidos.length > 0 ? [pontosValidos[0].lat, pontosValidos[0].lng] : centroPadrao}
          zoom={14}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Renderização Condicional: Camada de Calor ou Marcadores Individuais */}
          {modoExibicao === 'calor' ? (
            <CamadaCalor pontos={pontosValidos} />
          ) : (
            pontosValidos.map((ponto) => {
              const jaApoiou = apoiosLocais.includes(ponto.id);
              const linkMaps = `https://www.google.com/maps?q=${ponto.lat},${ponto.lng}`;

              return (
                <Marker key={ponto.id} position={[ponto.lat, ponto.lng]}>
                  <Popup className="zelador-popup" maxWidth={280}>
                    <div className="space-y-2 p-1 text-gray-800">
                      {ponto.foto_url && (
                        <div className="w-full h-28 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={ponto.foto_url}
                            alt="Evidência"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-gray-900">{ponto.categoria}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(ponto.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-1 line-clamp-3">
                          {ponto.descricao || 'Sem descrição.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <a
                          href={linkMaps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                        >
                          <ExternalLink size={11} />
                          <span>Google Maps</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => darApoio(ponto.id)}
                          disabled={jaApoiou}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            jaApoiou
                              ? 'bg-blue-50 text-blue-600 border border-blue-200'
                              : 'bg-gray-100 hover:bg-blue-50 text-gray-700'
                          }`}
                        >
                          <ThumbsUp size={11} className={jaApoiou ? 'fill-blue-600' : ''} />
                          <span>{ponto.apoios}</span>
                          <span>{jaApoiou ? 'Apoiado' : 'Apoiar'}</span>
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })
          )}
        </MapContainer>

        {/* Legenda quando em modo mancha de calor */}
        {modoExibicao === 'calor' && (
          <div className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-gray-200 shadow-md text-[11px]">
            <span className="font-bold text-gray-700 block mb-1.5">Intensidade Crítica</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[10px]">Baixa</span>
              <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 via-orange-500 to-red-600"></div>
              <span className="text-gray-500 text-[10px]">Alta</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}