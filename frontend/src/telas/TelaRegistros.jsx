import IconeCategoria from '../components/IconeCategoria'
import { textoConfirmacoes } from '../lib/apoios'
import { CATEGORIAS, rotuloDaCategoria } from '../lib/categorias'
import { feedbackSensorial } from '../lib/feedbackSensorial'
import { CENTRO_COMUNITARIO, calcularDistanciaKm } from '../lib/geo'
import { formatarKm } from '../lib/gestao'
import { classeEtiquetaDoEstado, rotuloDoEstado } from '../lib/status'
import { RefreshCw, Search, Users } from 'lucide-react'

export default function TelaRegistros({ TAMANHO_PAGINA_LISTA, buscaTexto, carregandoRegistos, carregarRegistos, chaveFiltrosLista, filtroCategoria, filtroStatus, limiteLista, registos, registosFiltrados, registosVisiveis, setBuscaTexto, setFiltroCategoria, setFiltroStatus, setOcorrenciaSelecionada, setPaginaLista, totalPendentes, totalResolvidos }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-asfalto">Registros da comunidade</h2>
          <p className="text-xs text-slate-600">
            Mostrando {registosFiltrados.length} de {registos.length}
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
          className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-asfalto/15 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
        />
        <Search size={15} className="absolute left-3 top-2.5 text-slate-500" aria-hidden="true" />
        {buscaTexto && (
          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setBuscaTexto('')
            }}
            aria-label="Limpar busca"
            className="absolute right-3 top-2.5 text-slate-500 hover:text-asfalto text-xs font-bold cursor-pointer"
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
              ? 'bg-asfalto text-white'
              : 'bg-white border border-asfalto/15 text-slate-600 hover:bg-calcada'
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
              ? 'bg-amber-700 text-white'
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
              ? 'bg-mangueira text-white'
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
              : 'bg-white border border-asfalto/10 text-slate-600 hover:bg-calcada'
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
                : 'bg-white border border-asfalto/10 text-slate-600 hover:bg-calcada'
            }`}
          >
            <IconeCategoria categoria={cat.id} size={14} colorido={filtroCategoria !== cat.id} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {carregandoRegistos ? (
        <div className="py-16 text-center text-xs text-slate-600">Carregando registros...</div>
      ) : registosFiltrados.length === 0 ? (
        <div className="rounded-3xl border border-asfalto/10 bg-white py-12 text-center text-xs text-slate-600 space-y-1">
          <p className="font-bold text-asfalto">Nenhum registro com estes filtros.</p>
          <p className="text-[11px]">Limpe a busca ou escolha outro filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="rounded-3xl border border-asfalto/10 bg-white divide-y divide-asfalto/10 overflow-hidden">
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
              <li key={reg.id}>
              <button
                type="button"
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  setOcorrenciaSelecionada(reg)
                }}
                className="w-full p-3.5 flex justify-between items-start gap-3 text-left hover:bg-calcada/70 transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-placa"
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-asfalto">
                      {rotuloDaCategoria(reg.categoria)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${classeEtiquetaDoEstado(reg.status)}`}>
                      {rotuloDoEstado(reg.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">{reg.descricao}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    <span className="text-[10px] text-slate-500">
                      {reg.created_at ? new Date(reg.created_at).toLocaleDateString('pt-BR') : ''}
                    </span>
                    {distPonto !== null && (
                      <span className="text-[10px] text-slate-500">
                        {formatarKm(distPonto)} do centro
                      </span>
                    )}
                    {textoConfirmacoes(reg.total_apoios) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700"><Users size={12} aria-hidden="true" /> {textoConfirmacoes(reg.total_apoios)}</span>
                    )}
                  </div>
                </div>

                {reg.foto_url && (
                  <img src={reg.foto_url} alt="" loading="lazy" decoding="async" width="56" height="56" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200" />
                )}
              </button>
              </li>
            )
          })}
          </ul>
          {registosFiltrados.length > limiteLista && (
            <button
              type="button"
              onClick={() => setPaginaLista({ chave: chaveFiltrosLista, limite: limiteLista + TAMANHO_PAGINA_LISTA })}
              className="w-full min-h-12 rounded-2xl border border-asfalto/10 bg-white hover:bg-calcada text-sm font-bold text-blue-700 cursor-pointer"
            >
              Mostrar mais ({registosFiltrados.length - limiteLista} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
