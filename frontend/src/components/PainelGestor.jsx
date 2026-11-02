import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ThumbsUp, 
  Camera, 
  RefreshCw, 
  Navigation,
  Download,
  FileSpreadsheet
} from 'lucide-react';

export default function PainelGestor() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [atualizandoId, setAtualizandoId] = useState(null);
  
  const fileInputRef = useRef(null);
  const [ocorrenciaSelecionadaParaFoto, setOcorrenciaSelecionadaParaFoto] = useState(null);

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
        .order('total_apoios', { ascending: false });

      if (error) throw error;
      setOcorrencias(data || []);
    } catch (err) {
      console.error('Erro ao carregar triagem:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarOcorrencias();
  }, []);

  const alterarStatus = async (id, novoStatus, fotoResolucaoUrl = null) => {
    try {
      setAtualizandoId(id);
      const payload = { status: novoStatus };
      if (fotoResolucaoUrl) payload.foto_resolucao_url = fotoResolucaoUrl;

      const { error } = await supabase
        .from('ocorrencias')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      setOcorrencias((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: novoStatus, ...(fotoResolucaoUrl ? { foto_resolucao_url: fotoResolucaoUrl } : {}) } : item
        )
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setAtualizandoId(null);
    }
  };

  const uploadFotoResolucao = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !ocorrenciaSelecionadaParaFoto) return;

    try {
      setAtualizandoId(ocorrenciaSelecionadaParaFoto);
      const extensao = file.name ? file.name.split('.').pop() : 'jpg';
      const nomeUnico = `resolucoes/${Date.now()}_${Math.random().toString(36).substring(7)}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(nomeUnico, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(nomeUnico);

      await alterarStatus(ocorrenciaSelecionadaParaFoto, 'resolvido', publicData.publicUrl);
    } catch (err) {
      console.error('Falha ao enviar foto da resolução:', err);
    } finally {
      setOcorrenciaSelecionadaParaFoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Gerador direto de planilha CSV para ofícios e relatórios
  const exportarCSV = () => {
    if (ocorrencias.length === 0) return;

    const cabecalho = ['ID', 'Data', 'Categoria', 'Detalhes', 'Status', 'Apoios', 'Latitude', 'Longitude', 'Link Google Maps', 'Foto'];
    const linhas = ocorrencias.map((item) => {
      const coords = extrairCoordenadas(item.localizacao);
      const dataFormatada = new Date(item.created_at).toLocaleString('pt-BR');
      const lat = coords ? coords.lat : '';
      const lng = coords ? coords.lng : '';
      const linkMaps = coords ? `https://www.google.com/maps?q=${lat},${lng}` : '';

      return [
        `"${item.id}"`,
        `"${dataFormatada}"`,
        `"${item.categoria}"`,
        `"${(item.descricao || '').replace(/"/g, '""')}"`,
        `"${item.status}"`,
        item.total_apoios || 0,
        lat,
        lng,
        `"${linkMaps}"`,
        `"${item.foto_url || ''}"`
      ].join(';');
    });

    const conteudoCSV = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\n');
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_zelador_digital_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totais = {
    total: ocorrencias.length,
    pendente: ocorrencias.filter(i => i.status === 'pendente').length,
    em_analise: ocorrencias.filter(i => i.status === 'em_analise').length,
    resolvido: ocorrencias.filter(i => i.status === 'resolvido').length,
  };

  const itensFiltrados = ocorrencias.filter((item) => {
    if (filtroStatus === 'todos') return true;
    return item.status === filtroStatus;
  });

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-10">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Triagem e Gestão</h2>
          <p className="text-xs text-gray-500">Mapeamento comunitário consolidado</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm text-xs font-semibold flex items-center gap-1 active:scale-95 transition"
            title="Baixar Relatório CSV para Ofício"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Relatório</span>
          </button>
          <button
            onClick={carregarOcorrencias}
            className="p-2 text-gray-500 hover:text-blue-600 active:scale-95 transition bg-white border border-gray-200 rounded-xl"
            title="Recarregar"
          >
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center shadow-xs">
          <span className="block text-base font-bold text-gray-800">{totais.total}</span>
          <span className="text-[10px] text-gray-500 font-medium">Total</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-blue-100 text-center shadow-xs">
          <span className="block text-base font-bold text-blue-600">{totais.pendente}</span>
          <span className="text-[10px] text-blue-600 font-medium">Pendentes</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-amber-100 text-center shadow-xs">
          <span className="block text-base font-bold text-amber-600">{totais.em_analise}</span>
          <span className="text-[10px] text-amber-600 font-medium">Análise</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-center shadow-xs">
          <span className="block text-base font-bold text-emerald-600">{totais.resolvido}</span>
          <span className="text-[10px] text-emerald-600 font-medium">Resolvidos</span>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['todos', 'pendente', 'em_analise', 'resolvido'].map((status) => (
          <button
            key={status}
            onClick={() => setFiltroStatus(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition ${
              filtroStatus === status
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status === 'todos' ? 'Todos' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={uploadFotoResolucao}
      />

      {carregando ? (
        <div className="py-12 text-center text-xs text-gray-400">A carregar ocorrências...</div>
      ) : itensFiltrados.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-700">Nenhum registo nesta categoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {itensFiltrados.map((item) => {
            const coords = extrairCoordenadas(item.localizacao);
            const rotaUrl = coords ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}` : null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3"
              >
                <div className="flex gap-3">
                  {item.foto_url ? (
                    <img
                      src={item.foto_url}
                      alt="Evidência"
                      className="w-20 h-20 rounded-xl object-cover border border-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-400 text-xs">
                      Sem Foto
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-800 truncate">
                        {item.categoria}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                        <ThumbsUp size={11} /> {item.total_apoios || 0}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {item.descricao || 'Sem descrição.'}
                    </p>

                    <div className="mt-1.5 flex items-center gap-2">
                      {rotaUrl && (
                        <a
                          href={rotaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:underline"
                        >
                          <Navigation size={12} />
                          <span>Abrir Rota</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Operacional */}
                <div className="pt-2 border-t border-gray-50 flex items-center gap-2">
                  <button
                    onClick={() => alterarStatus(item.id, 'em_analise')}
                    disabled={atualizandoId === item.id || item.status === 'em_analise'}
                    className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-800 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1"
                  >
                    <Clock size={13} />
                    <span>Em Análise</span>
                  </button>

                  <button
                    onClick={() => {
                      setOcorrenciaSelecionadaParaFoto(item.id);
                      fileInputRef.current?.click();
                    }}
                    disabled={atualizandoId === item.id}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 text-emerald-800 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1"
                  >
                    <Camera size={13} />
                    <span>Concluir c/ Foto</span>
                  </button>

                  {item.status !== 'resolvido' && (
                    <button
                      onClick={() => alterarStatus(item.id, 'resolvido')}
                      disabled={atualizandoId === item.id}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition"
                      title="Concluir sem foto"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}