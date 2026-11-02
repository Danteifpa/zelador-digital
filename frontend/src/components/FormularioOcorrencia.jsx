import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, Image as ImageIcon, MapPin, CheckCircle, AlertTriangle, X, Loader2 } from 'lucide-react';

const SUBCATEGORIAS = {
  'Lixo / Entulho': ['Lixo doméstico acumulado', 'Entulho de construção', 'Poda de árvores', 'Foco crónico'],
  'Iluminação Pública': ['Lâmpada apagada', 'Lâmpada acesa de dia', 'Poste sem fiação', 'Poste danificado'],
  'Buraco na via / Pavimentação': ['Cratera na via', 'Afundamento de pista', 'Bueiro sem tampa / entupido', 'Trecho sem asfalto'],
  'Outros': ['Esgoto a céu aberto', 'Mato alto', 'Invasão irregular']
};

export default function FormularioOcorrencia({ aoSalvarSucesso }) {
  const [categoria, setCategoria] = useState('Lixo / Entulho');
  const [descricao, setDescricao] = useState('');
  const [coordenadas, setCoordenadas] = useState(null);
  const [precisaoGps, setPrecisaoGps] = useState(null);
  const [obtendoGps, setObtendoGps] = useState(false);

  const [fotoBlob, setFotoBlob] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState(false);

  const inputCameraRef = useRef(null);
  const inputGaleriaRef = useRef(null);

  // Compressão no cliente usando HTML5 Canvas (limita a 1280px e 0.75 de qualidade JPEG)
  const comprimirImagem = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const maxDim = 1280;
          let largura = img.width;
          let altura = img.height;

          if (largura > altura && largura > maxDim) {
            altura = Math.round((altura * maxDim) / largura);
            largura = maxDim;
          } else if (altura > maxDim) {
            largura = Math.round((largura * maxDim) / altura);
            altura = maxDim;
          }

          const canvas = document.createElement('canvas');
          canvas.width = largura;
          canvas.height = altura;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, largura, altura);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Falha na compressão da imagem'));
            },
            'image/jpeg',
            0.75
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const processarSelecaoImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErroMsg('Por favor, seleccione apenas ficheiros de imagem (JPG, PNG ou WebP).');
      return;
    }

    try {
      setErroMsg('');
      const blobComprimido = await comprimirImagem(file);
      setFotoBlob(blobComprimido);
      setFotoPreview(URL.createObjectURL(blobComprimido));
    } catch (err) {
      console.error(err);
      setErroMsg('Erro ao preparar e comprimir a fotografia.');
    }
  };

  const removerFoto = () => {
    setFotoBlob(null);
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoPreview(null);
    if (inputCameraRef.current) inputCameraRef.current.value = '';
    if (inputGaleriaRef.current) inputGaleriaRef.current.value = '';
  };

  const capturarLocalizacao = () => {
    if (!navigator.geolocation) {
      setErroMsg('O seu navegador não suporta geolocalização.');
      return;
    }

    setObtendoGps(true);
    setErroMsg('');

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setCoordenadas({
          lat: posicao.coords.latitude,
          lng: posicao.coords.longitude
        });
        setPrecisaoGps(Math.round(posicao.coords.accuracy));
        setObtendoGps(false);
      },
      (erro) => {
        setObtendoGps(false);
        if (erro.code === erro.PERMISSION_DENIED) {
          setErroMsg('Permissão de GPS negada. Por favor, autorize a localização no navegador.');
        } else {
          setErroMsg('Não foi possível obter a sua posição. Tente novamente em local aberto.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const adicionarTagDescricao = (tag) => {
    if (descricao.includes(tag)) return;
    const novaDesc = descricao.trim() ? `${descricao.trim()} - ${tag}` : tag;
    if (novaDesc.length <= 300) {
      setDescricao(novaDesc);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroMsg('');

    if (!coordenadas) {
      setErroMsg('É obrigatório capturar a localização GPS para validar o registo comunitário.');
      return;
    }

    if (descricao.trim().length < 10) {
      setErroMsg('Forneça uma descrição ou ponto de referência com pelo menos 10 caracteres.');
      return;
    }

    setEnviando(true);

    try {
      let fotoUrl = null;

      // 1. Upload da fotografia comprimida para o Supabase Storage
      if (fotoBlob) {
        const nomeArquivo = `evidencia_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(nomeArquivo, fotoBlob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(nomeArquivo);

        fotoUrl = publicData.publicUrl;
      }

      // 2. Gravação da ocorrência com coordenadas PostGIS
      const pontoWKT = `POINT(${coordenadas.lng} ${coordenadas.lat})`;

      const { error: insertError } = await supabase
        .from('ocorrencias')
        .insert([
          {
            categoria,
            descricao: descricao.trim(),
            foto_url: fotoUrl,
            localizacao: pontoWKT,
            status: 'pendente',
            total_apoios: 0
          }
        ]);

      if (insertError) throw insertError;

      setSucessoMsg(true);
      removerFoto();
      setDescricao('');
      setCoordenadas(null);
      setPrecisaoGps(null);

      if (aoSalvarSucesso) aoSalvarSucesso();

      setTimeout(() => setSucessoMsg(false), 5000);
    } catch (err) {
      console.error(err);
      setErroMsg('Erro ao guardar ocorrência. Verifique a sua ligação à internet.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Registar Ocorrência</h2>
        <p className="text-xs text-gray-500">
          Mapeie problemas na comunidade para gerar dados precisos aos órgãos competentes.
        </p>
      </div>

      {erroMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{erroMsg}</span>
        </div>
      )}

      {sucessoMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl">
          <CheckCircle size={16} className="flex-shrink-0" />
          <span>Denúncia registada com sucesso no sistema comunitário!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Gestão de Fotografia */}
        <div>
          <span className="block text-xs font-semibold text-gray-700 mb-1.5">
            Evidência Fotográfica (Opcional)
          </span>

          {fotoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 w-full h-44 bg-gray-50 flex items-center justify-center">
              <img src={fotoPreview} alt="Evidência" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removerFoto}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
                title="Remover fotografia"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => inputCameraRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 text-gray-600 transition"
              >
                <Camera size={22} className="text-blue-600 mb-1" />
                <span className="text-xs font-medium">Tirar Fotografia</span>
              </button>

              <button
                type="button"
                onClick={() => inputGaleriaRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 text-gray-600 transition"
              >
                <ImageIcon size={22} className="text-gray-500 mb-1" />
                <span className="text-xs font-medium">Da Galeria</span>
              </button>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={inputCameraRef}
            onChange={processarSelecaoImagem}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={inputGaleriaRef}
            onChange={processarSelecaoImagem}
            className="hidden"
          />
        </div>

        {/* Localização GPS Obrigatória */}
        <div>
          <span className="block text-xs font-semibold text-gray-700 mb-1.5">
            Localização da Demanda *
          </span>
          <button
            type="button"
            onClick={capturarLocalizacao}
            disabled={obtendoGps}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
              coordenadas
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {obtendoGps ? (
              <>
                <Loader2 size={15} className="animate-spin text-blue-600" />
                <span>A calibrar coordenadas GPS...</span>
              </>
            ) : coordenadas ? (
              <>
                <CheckCircle size={15} className="text-blue-600" />
                <span>
                  Coordenadas Capturadas (Precisão: ~{precisaoGps}m)
                </span>
              </>
            ) : (
              <>
                <MapPin size={15} className="text-gray-500" />
                <span>Capturar Localização Atual</span>
              </>
            )}
          </button>
          {precisaoGps && precisaoGps > 30 && (
            <span className="block text-[11px] text-amber-600 mt-1">
              Aviso: Precisão aproximada ({precisaoGps}m). Em locais fechados o GPS pode ter desvio.
            </span>
          )}
        </div>

        {/* Categoria do Problema */}
        <div>
          <span className="block text-xs font-semibold text-gray-700 mb-1.5">
            Tipo de Problema *
          </span>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Lixo / Entulho">Lixo / Entulho</option>
            <option value="Iluminação Pública">Iluminação Pública</option>
            <option value="Buraco na via / Pavimentação">Buraco na via / Pavimentação</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        {/* Subcategorias Rápidas (Chips de toque rápido) */}
        <div>
          <span className="block text-[11px] font-medium text-gray-500 mb-1.5">
            Classificação rápida (toque para adicionar à descrição):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SUBCATEGORIAS[categoria]?.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => adicionarTagDescricao(tag)}
                className="text-[11px] bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200 transition"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Descrição e Ponto de Referência */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-gray-700">
              Ponto de Referência / Detalhes *
            </span>
            <span className={`text-[11px] ${descricao.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
              {descricao.length}/300
            </span>
          </div>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value.slice(0, 300))}
            placeholder="Ex.: Em frente à mercearia, próximo ao poste de betão..."
            rows={3}
            className="w-full text-xs border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Botão de Envio com Protecção de Carregamento */}
        <button
          type="submit"
          disabled={enviando}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
        >
          {enviando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>A comprimir e registar ocorrência...</span>
            </>
          ) : (
            <span>Enviar Denúncia</span>
          )}
        </button>
      </form>
    </div>
  );
}