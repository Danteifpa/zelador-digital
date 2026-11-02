import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Download, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  RefreshCw, 
  ThumbsUp,
  MapPin
} from 'lucide-react';

export default function PainelGestor() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  // Extrai latitude e longitude de formatos GeoJSON ou WKT
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
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarOcorrencias();
  }, []);

  const atualizarStatus = async (id, novoStatus) => {
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;

      setOcorrencias((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: novoStatus } : item))
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Falha ao atualizar status da ocorrência.');
    }
  };

  const excluirOcorrencia = async (id, fotoUrl) => {
    const confirmar = window.confirm(
      'Tem certeza que deseja excluir esta denúncia permanentemente? Essa ação não pode ser desfeita.'
    );
    if (!confirmar) return;

    try {
      // 1. Apaga a imagem do Storage caso exista
      if (fotoUrl) {
        try {
          const partesUrl = fotoUrl.split('/evidencias/');
          if (partesUrl.length > 1) {
            const nomeArquivo = partesUrl[1].split('?')[0];
            await supabase.storage.from('evidencias').remove([nomeArquivo]);
          }
        } catch (storageErr) {
          console.warn('Aviso: imagem não encontrada no Storage ou já removida:', storageErr);
        }
      }

      // 2. Apaga o registro da tabela
      const { error } = await supabase
        .from('ocorrencias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 3. Atualiza o estado da lista localmente
      setOcorrencias((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Erro ao excluir ocorrência:', err);
      alert('Não foi possível excluir o registro. Verifique as permissões no Supabase.');
    }
  };

  const exportarCSV = () => {
    if (ocorrencias.length === 0) {
      alert('Nenhum registro disponível para exportação.');
      return;
    }

    const cabecalho = ['ID', 'Data/Hora', 'Categoria', 'Status', 'Apoios', 'Latitude', 'Longitude', 'Descricao', 'Foto_URL'];
    
    const linhas = ocorrencias.map((item) => {
      const coords = extrairCoordenadas(item.localizacao);
      const lat = coords ? coords.lat : '';
      const lng = coords ? coords.lng : '';
      const dataFormatada = new Date(item.created_at).toLocaleString('pt-BR');
      const descLimpa = `"${(item.descricao || '').replace(/"/g, '""')}"`;
      
      return [
        item.id,
        `"${dataFormatada}"`,
        `"${item.categoria || ''}"`,
        `"${item.status || ''}"`,
        item.total_apoios || 0,
        lat,
        lng,
        descLimpa,
        `"${item.foto_url || ''}"`
      ].join(';');
    });

    const conteudoCSV = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\n');
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_zelador_digital_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtros combinados
  const ocorrenciasFiltradas = ocorrencias.filter((item) => {
    const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
    const matchCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria;
    return matchStatus && matchCategoria;
  });

  // Métricas
  const totalRegistros = ocorrencias.length;
  const totalPendentes = ocorrencias.filter((i) => i.status === 'pendente').length;
  const totalResolvidos = ocorrencias.filter((i) => i.status === 'resolvido').length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho e Métricas Rápidas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Painel de Gestão e Moderação</h2>
          <p className="text-xs text-gray-500 mt-1">
            Controle de demandas comunitárias, relatórios para ofícios e moderação de conteúdo.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={carregarOcorrencias}
            className="p-2.5 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportarCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Total de Registros</span>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalRegistros}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Pendentes / Em Análise</span>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{totalPendentes}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium">Demandas Resolvidas</span>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{totalResolvidos}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <Filter size={15} />
          <span>Filtrar Exibição:</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_analise">Em Análise</option>
            <option value="resolvido">Resolvido</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="Lixo / Entulho">Lixo / Entulho</option>
            <option value="Iluminação Pública">Iluminação Pública</option>
            <option value="Buraco na via / Pavimentação">Buraco / Pavimentação</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
      </div>

      {/* Listagem de Ocorrências */}
      {carregando ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-500 text-sm">
          Carregando dados da comunidade...
        </div>
      ) : ocorrenciasFiltradas.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-500 text-sm">
          Nenhuma ocorrência encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {ocorrenciasFiltradas.map((item) => {
            const coords = extrairCoordenadas(item.localizacao);
            const linkMaps = coords 
              ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
              : null;

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
              >
                {/* Imagem + Informações Principais */}
                <div className="flex gap-4 items-center">
                  {item.foto_url ? (
                    <img
                      src={item.foto_url}
                      alt="Evidência"
                      className="w-16 h-16 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0 text-center px-1">
                      Sem Foto
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{item.categoria}</span>
                      <span className="text-[10px] text-gray-400">
                        • {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-1 max-w-md line-clamp-2">
                      {item.descricao || 'Sem descrição detalhada.'}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp size={12} className="text-blue-600" />
                        {item.total_apoios || 0} apoios
                      </span>

                      {coords && (
                        <a
                          href={linkMaps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <MapPin size={12} />
                          <span>Ver no Maps</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Moderação e Ações de Status */}
                <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                  <select
                    value={item.status || 'pendente'}
                    onChange={(e) => atualizarStatus(item.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-700 outline-none"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_analise">Em Análise</option>
                    <option value="resolvido">Resolvido</option>
                  </select>

                  <button
                    onClick={() => excluirOcorrencia(item.id, item.foto_url)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Excluir permanentemente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}