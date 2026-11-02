import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { ThumbsUp, Clock, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapaOcorrencias() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [apoiosLocais, setApoiosLocais] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('zd_apoios') || '[]');
    } catch {
      return [];
    }
  });

  const centroPadrao = [-1.3653, -48.3742];

  const extrairCoordenadas = (geom) => {
    if (!geom) return null;
    if (typeof geom === 'string' && geom.startsWith('POINT(')) {
      const coords = geom.replace('POINT(', '').replace(')', '').trim().split(' ');
      const lng = parseFloat(coords[0]);
      const lat = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    if (geom.coordinates && Array.isArray(geom.coordinates)) {
      return [geom.coordinates[1], geom.coordinates[0]];
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
      console.error('Erro ao carregar mapa:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarOcorrencias();
  }, []);

  const apoiarOcorrencia = async (id) => {
    if (apoiosLocais.includes(id)) return;

    try {
      const { data, error } = await supabase.rpc('incrementar_apoio', { ocorrencia_id: id });
      if (error) throw error;

      const novoTotal = data;
      setOcorrencias((prev) =>
        prev.map((item) => (item.id === id ? { ...item, total_apoios: novoTotal } : item))
      );

      const novosApoios = [...apoiosLocais, id];
      setApoiosLocais(novosApoios);
      localStorage.setItem('zd_apoios', JSON.stringify(novosApoios));
    } catch (err) {
      console.error('Erro ao registar apoio:', err);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] rounded-2xl overflow-hidden shadow-sm border border-gray-200">
      <div className="absolute top-3 right-3 z-[1000] flex gap-2">
        <button
          onClick={carregarOcorrencias}
          className="bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-md border border-gray-200 text-gray-700 hover:text-blue-600 active:scale-95 transition"
          title="Atualizar Ocorrências"
        >
          <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
        </button>
      </div>

      <MapContainer center={centroPadrao} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {ocorrencias.map((item) => {
          const pos = extrairCoordenadas(item.localizacao);
          if (!pos) return null;

          const jaApoiou = apoiosLocais.includes(item.id);

          return (
            <Marker key={item.id} position={pos}>
              <Popup className="custom-popup">
                <div className="w-56 p-1 text-gray-800">
                  {item.foto_url && (
                    <img
                      src={item.foto_url}
                      alt="Evidência"
                      className="w-full h-28 object-cover rounded-lg mb-2 border border-gray-100"
                    />
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      {item.categoria}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-3 mb-2.5">
                    {item.descricao || 'Sem descrição.'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[11px] text-gray-500 font-medium">
                      {item.total_apoios || 0} apoios
                    </span>
                    <button
                      onClick={() => apoiarOcorrencia(item.id)}
                      disabled={jaApoiou}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                        jaApoiou
                          ? 'bg-blue-50 text-blue-600 border border-blue-200 cursor-default'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                      }`}
                    >
                      <ThumbsUp size={13} />
                      <span>{jaApoiou ? 'Apoiado' : 'Apoiar'}</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}