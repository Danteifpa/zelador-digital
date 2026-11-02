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
  MapPin, 
  Lock, 
  LogOut, 
  KeyRound, 
  FileText, 
  Copy, 
  Printer, 
  X 
} from 'lucide-react';

const CHAVE_GESTOR = 'zelador##2026';

export default function PainelGestor() {
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [erroSenha, setErroSenha] = useState(false);

  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  const [ocorrenciaOficio, setOcorrenciaOficio] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const authSessao = sessionStorage.getItem('zelador_gestor_auth');
    if (authSessao === 'true') {
      setAutenticado(true);
      carregarOcorrencias();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (senhaInput.trim() === CHAVE_GESTOR) {
      sessionStorage.setItem('zelador_gestor_auth', 'true');
      setAutenticado(true);
      setErroSenha(false);
      carregarOcorrencias();
    } else {
      setErroSenha(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('zelador_gestor_auth');
    setAutenticado(false);
    setSenhaInput('');
  };

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
      'Tem certeza de que deseja excluir esta denúncia permanentemente?'
    );
    if (!confirmar) return;

    try {
      if (fotoUrl) {
        try {
          const partesUrl = fotoUrl.split('/evidencias/');
          if (partesUrl.length > 1) {
            const nomeArquivo = partesUrl[1].split('?')[0];
            await supabase.storage.from('evidencias').remove([nomeArquivo]);
          }
        } catch (storageErr) {
          console.warn('Aviso ao remover foto do Storage:', storageErr);
        }
      }

      const { error } = await supabase
        .from('ocorrencias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOcorrencias((prev) => prev.filter((item) => item.id !== id));
      if (ocorrenciaOficio?.id === id) setOcorrenciaOficio(null);
    } catch (err) {
      console.error('Erro ao excluir ocorrência:', err);
      alert('Não foi possível excluir o registro.');
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

  const gerarTextoOficio = (item) => {
    if (!item) return '';
    const coords = extrairCoordenadas(item.localizacao);
    const dataCriacao = new Date(item.created_at).toLocaleDateString('pt-BR');
    const coordenadasTexto = coords ? `${coords.lat}, ${coords.lng}` : 'Não especificadas';
    const linkMaps = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : 'N/A';

    return `OFÍCIO COMUNITÁRIO Nº ____/2026

Ao Ilustríssimo(a) Senhor(a) Secretário(a) / Gestor(a) Responsável
Setor de Manutenção Urbana e Infraestrutura

Assunto: Requerimento Comunitário de Providências Urgentes - ${item.categoria.toUpperCase()}

Prezado(a) Senhor(a),

Por intermédio da presente manifestação de interesse público, a comunidade vem respeitosamente à presença de V. Sa. relatar uma ocorrência de infraestrutura urbana identificada e georreferenciada pelo sistema participativo "Zelador Digital", demandando vistorias e providências corretivas no local indicado.

DADOS TÉCNICOS DA OCORRÊNCIA:
-----------------------------------------------------------------------------
- Identificador do Registro: #${item.id.slice(0, 8)}
- Classificação: ${item.categoria}
- Data de Registro: ${dataCriacao}
- Nível de Mobilização: ${item.total_apoios || 0} manifestações/apoios de moradores
- Coordenadas Geográficas (GPS): ${coordenadasTexto}
- Rota / Localização no Mapa: ${linkMaps}
- Detalhamento e Referência: ${item.descricao || 'Conforme vistoria in loco.'}
- Evidência Fotográfica: ${item.foto_url || 'Sem registro fotográfico em anexo.'}
-----------------------------------------------------------------------------

Considerando que a situação acima descrita acarreta transtornos diretos à saúde coletiva, segurança viária e mobilidade dos moradores e transeuntes da localidade, solicitamos a inclusão prioritária do presente ponto no cronograma de manutenções e reparos deste órgão.

Certos da costumeira atenção e do compromisso com o bem-estar da coletividade, subscrevemo-nos atenciosamente.


_________________________________________________________
Comissão Comunitária de Monitoramento Urbano
Zelador Digital - Gestão Participativa`;
  };

  const copiarOficio = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  if (!autenticado) {
    return (
      <div className="w-full max-w-sm mx-auto my-12 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={24} />
        </div>
        
        <h2 className="text-lg font-bold text-gray-900">Acesso Restrito ao Gestor</h2>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Área destinada à liderança comunitária para moderação e relatórios.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative text-left">
            <span className="text-[11px] font-semibold text-gray-600 block mb-1">Senha de Acesso</span>
            <div className="relative">
              <input
                type="password"
                value={senhaInput}
                onChange={(e) => {
                  setSenhaInput(e.target.value);
                  setErroSenha(false);
                }}
                placeholder="Digite a senha..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
              <KeyRound size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            {erroSenha && (
              <span className="text-[11px] text-red-500 mt-1 block">
                Senha incorreta. Verifique e tente novamente.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            Acessar Painel
          </button>
        </form>
      </div>
    );
  }

  const ocorrenciasFiltradas = ocorrencias.filter((item) => {
    const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
    const matchCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria;
    return matchStatus && matchCategoria;
  });

  const totalRegistros = ocorrencias.length;
  const totalPendentes = ocorrencias.filter((i) => i.status === 'pendente').length;
  const totalResolvidos = ocorrencias.filter((i) => i.status === 'resolvido').length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Painel de Gestão e Moderação</h2>
            <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium nao-imprimir">
              Autenticado
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Controle de demandas comunitárias, dossiê em PDF, ofícios formais e moderação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto nao-imprimir">
          <button
            onClick={carregarOcorrencias}
            className="p-2.5 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl border border-gray-300 transition shadow-sm"
            title="Imprimir ou Salvar Dossiê em PDF"
          >
            <Printer size={15} />
            <span>Dossiê PDF</span>
          </button>
          
          <button
            onClick={exportarCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition"
            title="Sair do painel"
          >
            <LogOut size={16} />
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
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between nao-imprimir">
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

      {/* Listagem */}
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
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        <ThumbsUp size={11} className="text-blue-600" />
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

                <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 nao-imprimir">
                  <button
                    onClick={() => setOcorrenciaOficio(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition border border-blue-200"
                    title="Gerar Ofício Formal"
                  >
                    <FileText size={14} />
                    <span>Ofício</span>
                  </button>

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

      {/* Modal de Exibição do Ofício */}
      {ocorrenciaOficio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 nao-imprimir">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Minuta de Ofício Técnico Comunitário
                </h3>
              </div>
              <button
                onClick={() => setOcorrenciaOficio(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-gray-900 text-gray-100 text-xs font-mono rounded-lg m-4 whitespace-pre-wrap leading-relaxed select-all">
              {gerarTextoOficio(ocorrenciaOficio)}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                {copiado ? 'Texto copiado com sucesso!' : 'Clique para copiar e colar no Word ou Docs.'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={() => copiarOficio(gerarTextoOficio(ocorrenciaOficio))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  <Copy size={14} />
                  <span>{copiado ? 'Copiado!' : 'Copiar Texto Completo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}