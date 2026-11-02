import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle2, AlertCircle, ThumbsUp, MapPin, RefreshCw } from 'lucide-react';

export default function HistoricoRegistos() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [apoiosLocais, setApoiosLocais] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('zd_apoios') || '[]');
    } catch {
      return [];
    }
  });

  const carregarHistorico = async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('ocorrencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOcorrencias(data || []);
    } catch (err) {
      console.error('Erro ao buscar registos:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
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

  const formatarData = (dataIso) => {
    if (!dataIso) return '';
    const d = new Date(dataIso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pendente').toLowerCase();
    if (s === 'resolvido' || s === 'concluido') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
          <CheckCircle2 size={12} /> Resolvido
        </span>
      );
    }
    if (s === 'em_analise' || s === 'em analise') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
          <Clock size={12} /> Em Análise
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
        <AlertCircle size={12} /> Pendente
      </span>
    );
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Minhas Demandas</h2>
          <p className="text-xs text-gray-500">Histórico de relatos da comunidade</p>
        </div>
        <button
          onClick={carregarHistorico}
          className="p-2 text-gray-500 hover:text-blue-600 active:scale-95 transition"
          title="Atualizar lista"
        >
          <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
        </button>
      </div>

      {carregando ? (
        <div className="py-12 text-center text-xs text-gray-400">
          A carregar registos...
        </div>
      ) : ocorrencias.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-700">Nenhum registo encontrado</p>
          <p className="text-xs text-gray-400 mt-1">
            As suas denúncias enviadas surgirão aqui com o acompanhamento do estado.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ocorrencias.map((item) => {
            const jaApoiou = apoiosLocais.includes(item.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-3.5 items-start"
              >
                {item.foto_url ? (
                  <img
                    src={item.foto_url}
                    alt="Evidência"
                    className="w-20 h-20 rounded-xl object-cover border border-gray-100 shrink-0 bg-gray-50"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                    <MapPin size={24} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 truncate">
                      {item.categoria}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
                    {item.descricao || 'Sem descrição adicional.'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-50">
                    <span>{formatarData(item.created_at)}</span>
                    <button
                      onClick={() => apoiarOcorrencia(item.id)}
                      disabled={jaApoiou}
                      className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg transition ${
                        jaApoiou
                          ? 'bg-blue-50 text-blue-600 border border-blue-200 cursor-default'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600 active:scale-95'
                      }`}
                    >
                      <ThumbsUp size={12} />
                      <span>{item.total_apoios || 0} {jaApoiou ? '(Apoiado)' : 'Apoiar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}