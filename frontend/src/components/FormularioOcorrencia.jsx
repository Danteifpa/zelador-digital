import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, Image as ImageIcon, MapPin, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function SeletorPontoMapa({ posicao, setPosicao }) {
  useMapEvents({
    click(e) {
      setPosicao([e.latlng.lat, e.latlng.lng]);
    },
  });

  return posicao ? (
    <Marker
      position={posicao}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosicao([pos.lat, pos.lng]);
        },
      }}
    />
  ) : null;
}

// Compressão nativa ultra-leve via Canvas do navegador
const comprimirImagemNativa = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const arquivoComprimido = new File([blob], file.name || 'foto.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(arquivoComprimido);
          },
          'image/jpeg',
          0.7
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function FormularioOcorrencia({ onOcorrenciaCriada }) {
  const [categoria, setCategoria] = useState(() => sessionStorage.getItem('zd_cat') || 'buraco');
  const [descricao, setDescricao] = useState(() => sessionStorage.getItem('zd_desc') || '');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [coordenadas, setCoordenadas] = useState(null);
  const [carregandoGps, setCarregandoGps] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [statusEnvio, setStatusEnvio] = useState({ tipo: null, mensagem: '' });

  const cameraInputRef = useRef(null);
  const galeriaInputRef = useRef(null);

  // Guarda rascunho automaticamente contra recarregamentos acidentais da aba
  useEffect(() => {
    sessionStorage.setItem('zd_desc', descricao);
  }, [descricao]);

  useEffect(() => {
    sessionStorage.setItem('zd_cat', categoria);
  }, [categoria]);

  const aoSelecionarFoto = async (e) => {
    const ficheiroOriginal = e.target.files?.[0];
    if (!ficheiroOriginal) return;

    // Gera preview instantâneo
    const previewUrl = URL.createObjectURL(ficheiroOriginal);
    setFotoPreview(previewUrl);

    try {
      const arquivoPronto = await comprimirImagemNativa(ficheiroOriginal);
      setFoto(arquivoPronto);
    } catch {
      setFoto(ficheiroOriginal);
    }
  };

  const removerFoto = () => {
    setFoto(null);
    setFotoPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galeriaInputRef.current) galeriaInputRef.current.value = '';
  };

  const capturarGps = () => {
    setCarregandoGps(true);
    setStatusEnvio({ tipo: null, mensagem: '' });

    if (!navigator.geolocation) {
      setStatusEnvio({ tipo: 'erro', mensagem: 'Geolocalização não suportada no seu navegador.' });
      setCarregandoGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordenadas([pos.coords.latitude, pos.coords.longitude]);
        setCarregandoGps(false);
      },
      (err) => {
        let msg = 'Erro ao obter localização.';
        if (err.code === 1) msg = 'Permissão de localização negada pelo navegador.';
        setStatusEnvio({ tipo: 'erro', mensagem: msg });
        setCarregandoGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const submeter = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStatusEnvio({ tipo: null, mensagem: '' });

    if (!coordenadas) {
      setStatusEnvio({ tipo: 'erro', mensagem: 'Por favor, capture a localização antes de enviar.' });
      return;
    }

    setEnviando(true);

    try {
      let fotoUrl = null;

      // 1. Upload da Foto se existir
      if (foto) {
        const nomeUnico = Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg';
        const caminhoFicheiro = 'ocorrencias/' + nomeUnico;

        const { error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(caminhoFicheiro, foto, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('Falha no upload da foto: ' + uploadError.message);
        }

        const { data: publicData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(caminhoFicheiro);

        fotoUrl = publicData.publicUrl;
      }

      // 2. Formatação da Geometria PostGIS
      const [lat, lng] = coordenadas;
      const pontoGeografico = `POINT(${lng} ${lat})`;

      // 3. Gravação na Tabela
      const { data, error: dbError } = await supabase
        .from('ocorrencias')
        .insert([
          {
            categoria,
            descricao: descricao.trim(),
            foto_url: fotoUrl,
            localizacao: pontoGeografico,
            status: 'pendente',
            total_apoios: 0,
          },
        ])
        .select();

      if (dbError) {
        throw new Error('Erro na base de dados: ' + dbError.message);
      }

      setStatusEnvio({ tipo: 'sucesso', mensagem: 'Denúncia registrada com sucesso!' });
      setDescricao('');
      sessionStorage.removeItem('zd_desc');
      removerFoto();

      if (onOcorrenciaCriada && data?.[0]) {
        setTimeout(() => {
          onOcorrenciaCriada(data[0]);
        }, 1200);
      }
    } catch (err) {
      setStatusEnvio({
        tipo: 'erro',
        mensagem: err.message || 'Erro inesperado ao enviar denúncia.',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📢</span>
        <h2 className="text-lg font-bold text-gray-800">Registrar Ocorrência</h2>
      </div>

      {statusEnvio.tipo && (
        <div
          className={`p-3.5 rounded-xl mb-4 text-sm flex items-start gap-2.5 ${
            statusEnvio.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusEnvio.tipo === 'sucesso' ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
          )}
          <span className="break-words flex-1">{statusEnvio.mensagem}</span>
        </div>
      )}

      <form onSubmit={submeter} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Evidência Fotográfica
          </label>

          {fotoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 h-44 bg-gray-50 flex items-center justify-center">
              <img
                src={fotoPreview}
                alt="Pré-visualização"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removerFoto}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition"
                title="Remover foto"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition bg-gray-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-2 active:scale-95"
              >
                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full">
                  <Camera size={22} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Tirar Foto</span>
                <span className="text-[10px] text-gray-400">Abre a câmara</span>
              </button>

              <button
                type="button"
                onClick={() => galeriaInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition bg-gray-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-2 active:scale-95"
              >
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-full">
                  <ImageIcon size={22} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Ver Galeria</span>
                <span className="text-[10px] text-gray-400">Ficheiros guardados</span>
              </button>
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={aoSelecionarFoto}
            className="hidden"
          />

          <input
            ref={galeriaInputRef}
            type="file"
            accept="image/*"
            onChange={aoSelecionarFoto}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Localização da Demanda
          </label>

          {!coordenadas ? (
            <button
              type="button"
              onClick={capturarGps}
              disabled={carregandoGps}
              className="w-full py-3 px-4 bg-gray-50 border border-gray-300 hover:bg-gray-100 rounded-xl text-gray-700 text-sm font-medium transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {carregandoGps ? (
                <>
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span>Obtendo GPS...</span>
                </>
              ) : (
                <>
                  <MapPin size={16} className="text-blue-600" />
                  <span>Capturar localização atual</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <span>Lat: {coordenadas[0].toFixed(5)}, Lng: {coordenadas[1].toFixed(5)}</span>
                <button
                  type="button"
                  onClick={capturarGps}
                  className="text-blue-600 font-medium hover:underline text-xs"
                >
                  Recapturar
                </button>
              </div>

              <div className="h-44 w-full rounded-xl overflow-hidden border border-gray-200 relative">
                <MapContainer
                  center={coordenadas}
                  zoom={16}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <SeletorPontoMapa posicao={coordenadas} setPosicao={setCoordenadas} />
                </MapContainer>
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                Toque no mapa ou arraste o pino para ajustar a posição.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Tipo de Problema
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-gray-800 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="buraco">🕳️ Buraco na via / Pavimentação</option>
            <option value="lixo">🗑️ Lixo irregular / Entulho</option>
            <option value="iluminacao">💡 Poste sem luz / Iluminação</option>
            <option value="esgoto">💧 Esgoto a céu aberto</option>
            <option value="outro">⚠️ Outro problema urbano</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
            Ponto de referência / Detalhes
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            placeholder="Ex: Em frente ao comércio, próximo ao poste de madeira..."
            className="w-full p-2.5 border border-gray-300 rounded-xl text-gray-800 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-blue-300 text-white font-medium rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-base"
        >
          {enviando ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Enviando denúncia...</span>
            </>
          ) : (
            <span>Enviar Denúncia</span>
          )}
        </button>
      </form>
    </div>
  );
}