import IconeCategoria from '../components/IconeCategoria'
import { textoConfirmacoes } from '../lib/apoios'
import { CATEGORIAS, rotuloDaCategoria } from '../lib/categorias'
import { feedbackSensorial } from '../lib/feedbackSensorial'
import { CENTRO_COMUNITARIO, calcularDistanciaKm } from '../lib/geo'
import { formatarKm } from '../lib/gestao'
import { classeEtiquetaDoEstado, rotuloDoEstado } from '../lib/status'
import { RefreshCw } from 'lucide-react'

export default function TelaRegistros({ TAMANHO_PAGINA_LISTA, buscaTexto, carregandoRegistos, carregarRegistos, chaveFiltrosLista, filtroCategoria, filtroStatus, limiteLista, registos, registosFiltrados, registosVisiveis, setBuscaTexto, setFiltroCategoria, setFiltroStatus, setOcorrenciaSelecionada, setPaginaLista, totalPendentes, totalResolvidos }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Ocorrências Comunitárias</h2>
          <p className="text-[11px] text-slate-400">
            Exibindo {registosFiltrados.length} de {registos.length} registros
          </p>
        </div>
        <button
          onClick={() => {
            feedbackSensorial.toqueSuave()
            carregarRegistos()
          }}
          className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
        >
          <span className="inline-flex items-center gap-1"><RefreshCw size={13} strokeWidth={2.5} aria-hidden="true" />Atualizar</span>
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por descrição ou referência..."
          value={buscaTexto}
          onChange={(e) => setBuscaTexto(e.target.value)}
          className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
        />
        <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        {buscaTexto && (
          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setBuscaTexto('')
            }}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex space-x-1.5 overflow-x-auto sem-barra-rolagem pb-1 text-xs">
        <button
          onClick={() => {
            feedbackSensorial.toqueSuave()
            setFiltroStatus('todos')
          }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
            filtroStatus === 'todos'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => {
            feedbackSensorial.toqueSuave()
            setFiltroStatus('pendente')
          }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
            filtroStatus === 'pendente'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          Pendentes ({totalPendentes})
        </button>
        <button
          onClick={() => {
            feedbackSensorial.toqueSuave()
            setFiltroStatus('resolvido')
          }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
            filtroStatus === 'resolvido'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          Resolvidos ({totalResolvidos})
        </button>
      </div>

      <div className="flex space-x-1.5 overflow-x-auto sem-barra-rolagem pb-1 text-xs">
        <button
          onClick={() => {
            feedbackSensorial.toqueSuave()
            setFiltroCategoria('todas')
          }}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
            filtroCategoria === 'todas'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Todos os tipos
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setFiltroCategoria(cat.id)
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
              filtroCategoria === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <IconeCategoria categoria={cat.id} size={14} colorido={filtroCategoria !== cat.id} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {carregandoRegistos ? (
        <div className="py-16 text-center text-xs text-slate-400">Carregando ocorrências...</div>
      ) : registosFiltrados.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 space-y-1">
          <p className="font-bold">Nenhum registro encontrado com estes filtros.</p>
          <p className="text-[11px]">Tente limpar a pesquisa ou selecionar outro filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registosVisiveis.map((reg) => {
            const distPonto =
              reg.latitude && reg.longitude
                ? calcularDistanciaKm(
                    reg.latitude,
                    reg.longitude,
                    CENTRO_COMUNITARIO.latitude,
                    CENTRO_COMUNITARIO.longitude
                  )
                : null

            return (
              <div
                key={reg.id}
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setOcorrenciaSelecionada(reg)
                }}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs flex justify-between items-start gap-3 hover:border-blue-400 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors">
                      {rotuloDaCategoria(reg.categoria)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${classeEtiquetaDoEstado(reg.status)}`}>
                      {rotuloDoEstado(reg.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">{reg.descricao}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] text-slate-500">
                      {reg.created_at ? new Date(reg.created_at).toLocaleDateString('pt-BR') : ''}
                    </span>
                    {distPonto !== null && (
                      <span className="text-[10px] text-slate-500">
                        • {formatarKm(distPonto)} do centro
                      </span>
                    )}
                    {textoConfirmacoes(reg.total_apoios) && (
                      <span className="text-[10px] font-bold text-blue-700">👥 {textoConfirmacoes(reg.total_apoios)}</span>
                    )}
                  </div>
                </div>

                {reg.foto_url && (
                  <img src={reg.foto_url} alt="Comprovante" loading="lazy" decoding="async" width="56" height="56" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                )}
              </div>
            )
          })}
          {registosFiltrados.length > limiteLista && (
            <button
              type="button"
              onClick={() => setPaginaLista({ chave: chaveFiltrosLista, limite: limiteLista + TAMANHO_PAGINA_LISTA })}
              className="w-full min-h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-blue-700 cursor-pointer"
            >
              Mostrar mais ({registosFiltrados.length - limiteLista} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
