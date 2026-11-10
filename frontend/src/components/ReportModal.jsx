import { useEffect, useId, useRef, useState } from 'react'
import { Camera, Check, ChevronLeft, ChevronRight, Copy, ImagePlus, LocateFixed, Mic, X } from 'lucide-react'
import { protocoloCivico } from '../lib/protocolo'

const PASSOS = [
  { titulo: 'Tipo de problema', curto: 'Tipo', fala: 'Passo 1. Escolha o tipo de problema.' },
  { titulo: 'Fotografia do local', curto: 'Foto', fala: 'Passo 2. Tire uma fotografia do local.' },
  { titulo: 'Localização', curto: 'Local', fala: 'Passo 3. Confirme a localização.' },
  { titulo: 'Rever e enviar', curto: 'Enviar', fala: 'Passo 4. Reveja os dados e envie.' }
]

const SELETOR_FOCAVEIS =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Assistente passo a passo para registar uma nova ocorrência.
 *
 * O estado do formulário vive no App (rascunho mantém-se ao fechar e reabrir);
 * este componente controla apenas o passo atual, o foco e a apresentação.
 */
export default function ReportModal({ onFechar, modo, falarTexto, estaOnline, categorias, form, acoes, resultado }) {
  const [passo, setPasso] = useState(0)
  const [protocoloCopiado, setProtocoloCopiado] = useState(false)
  const dialogoRef = useRef(null)
  const tituloRef = useRef(null)
  const cameraRef = useRef(null)
  const galeriaRef = useRef(null)
  const focoAnteriorRef = useRef(null)
  const idTitulo = useId()
  const idDescricao = useId()

  const facil = modo === 'facil'
  const ultimoPasso = passo === PASSOS.length - 1
  const podeAvancar = passo === 2 ? Boolean(form.localizacao) && !form.capturandoGps : !form.processandoFoto

  // Montado só quando aberto (o passo recomeça sempre em 1): guarda o foco anterior e bloqueia o scroll do fundo.
  useEffect(() => {
    focoAnteriorRef.current = document.activeElement
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowAnterior
      focoAnteriorRef.current?.focus?.()
    }
  }, [])

  // A cada passo (ou ao mostrar o protocolo) o foco vai para o título, para leitores de ecrã.
  useEffect(() => {
    tituloRef.current?.focus()
    if (facil && !resultado) falarTexto(PASSOS[passo].fala)
    // falarTexto muda a cada render do App; só queremos falar quando o passo muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, resultado, facil])

  // No passo da localização, tenta obter o GPS automaticamente se ainda não houver.
  useEffect(() => {
    if (passo === 2 && !form.localizacao && !form.capturandoGps && !form.erroGps) {
      acoes.capturarGps()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo])

  const fechar = () => {
    if (form.enviando) return
    onFechar()
  }

  const aoTeclar = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      fechar()
      return
    }
    if (e.key !== 'Tab' || !dialogoRef.current) return
    const focaveis = [...dialogoRef.current.querySelectorAll(SELETOR_FOCAVEIS)]
    if (focaveis.length === 0) return
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primeiro.focus()
    }
  }

  const aoEscolherFoto = (e) => {
    acoes.fotoChange(e)
    // Permite escolher de novo o mesmo ficheiro (o handler já leu files[0]).
    e.target.value = ''
  }

  const avancar = () => {
    if (!podeAvancar) return
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1))
  }

  const copiarProtocolo = async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo)
      setProtocoloCopiado(true)
    } catch {
      setProtocoloCopiado(false)
    }
  }

  const categoriaAtual = categorias.find((c) => c.id === form.categoria)
  const dentroDoRaio = form.distanciaKm !== null && form.distanciaKm <= form.raioMaximoKm
  const tamanhoBotao = facil ? 'min-h-14 text-base' : 'min-h-12 text-sm'

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) fechar()
      }}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescricao}
        onKeyDown={aoTeclar}
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92dvh]"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <p id={idDescricao} className="text-[11px] font-black uppercase tracking-wider text-blue-600">
              {resultado ? 'Registo concluído' : `Nova ocorrência · Passo ${passo + 1} de ${PASSOS.length}`}
            </p>
            <h2 id={idTitulo} ref={tituloRef} tabIndex={-1} className="text-lg font-black text-slate-800 mt-0.5 focus:outline-none">
              {resultado ? 'Protocolo gerado' : PASSOS[passo].titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={fechar}
            disabled={form.enviando}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
            aria-label="Fechar registo"
          >
            <X size={20} strokeWidth={2.25} />
          </button>
        </div>

        {/* Indicador de passos */}
        {!resultado && (
          <ol className="flex items-center gap-1.5 px-5 pt-3" aria-label="Progresso do registo">
            {PASSOS.map((p, i) => {
              const estado = i < passo ? 'concluido' : i === passo ? 'atual' : 'futuro'
              return (
                <li key={p.curto} className="flex-1" aria-current={estado === 'atual' ? 'step' : undefined}>
                  <span
                    className={`block h-1.5 rounded-full ${estado === 'futuro' ? 'bg-slate-200' : 'bg-blue-600'}`}
                    aria-hidden="true"
                  />
                  <span className={`mt-1 block text-[11px] font-bold ${estado === 'atual' ? 'text-blue-700' : 'text-slate-400'}`}>
                    {p.curto}
                    <span className="sr-only">{estado === 'concluido' ? ' (concluído)' : estado === 'atual' ? ' (atual)' : ''}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {resultado ? (
            <PassoProtocolo
              resultado={resultado}
              estaOnline={estaOnline}
              categoria={categorias.find((c) => c.id === resultado.categoria)}
              copiado={protocoloCopiado}
              onCopiar={copiarProtocolo}
            />
          ) : passo === 0 ? (
            <fieldset>
              <legend className="sr-only">Escolha o tipo de problema</legend>
              <div className="grid grid-cols-2 gap-2.5">
                {categorias.map((cat) => {
                  const ativo = form.categoria === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => acoes.selecionarCategoria(cat)}
                      aria-pressed={ativo}
                      className={`rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${facil ? 'p-5' : 'p-4'} ${
                        ativo ? `${cat.activeBg} ${cat.border} shadow-sm` : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className={facil ? 'text-4xl mb-1' : 'text-3xl mb-1'} aria-hidden="true">{cat.icon}</span>
                      <span className={`font-bold ${facil ? 'text-base' : 'text-sm'}`}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : passo === 1 ? (
            <div className="space-y-3">
              {form.processandoFoto ? (
                <div role="status" className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-blue-600 font-bold animate-pulse">
                  A otimizar a fotografia e a ler o GPS...
                </div>
              ) : form.fotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={form.fotoPreview} alt="Fotografia da ocorrência" className={`w-full object-cover ${facil ? 'h-64' : 'h-56'}`} />
                  <button
                    type="button"
                    onClick={acoes.removerFoto}
                    className="absolute top-3 right-3 min-h-11 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 rounded-full shadow-md cursor-pointer"
                  >
                    Trocar foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 p-8 flex flex-col items-center justify-center gap-2 text-blue-700 cursor-pointer"
                >
                  <Camera size={facil ? 44 : 36} strokeWidth={2} aria-hidden="true" />
                  <span className={`font-black ${facil ? 'text-lg' : 'text-base'}`}>Abrir câmara</span>
                  <span className="text-xs text-slate-500">A localização da foto é lida automaticamente</span>
                </button>
              )}

              {!form.fotoPreview && !form.processandoFoto && (
                <button
                  type="button"
                  onClick={() => galeriaRef.current?.click()}
                  className={`w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center gap-2 cursor-pointer ${tamanhoBotao}`}
                >
                  <ImagePlus size={18} strokeWidth={2.25} aria-hidden="true" />
                  Escolher da galeria
                </button>
              )}

              <p className="text-xs text-slate-500">A fotografia é opcional, mas ajuda muito a resolver o problema.</p>

              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={aoEscolherFoto} className="hidden" tabIndex={-1} aria-hidden="true" />
              <input ref={galeriaRef} type="file" accept="image/*" onChange={aoEscolherFoto} className="hidden" tabIndex={-1} aria-hidden="true" />
            </div>
          ) : passo === 2 ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" role="status" aria-live="polite">
                <p className={`font-bold text-slate-800 ${facil ? 'text-base' : 'text-sm'}`}>
                  {form.capturandoGps
                    ? 'A obter a sua localização...'
                    : form.localizacao
                    ? form.origemLocalizacao === 'exif'
                      ? 'Localização lida da fotografia'
                      : 'Localização GPS capturada'
                    : form.erroGps || 'Localização ainda não capturada'}
                </p>
                {form.localizacao && (
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    {form.localizacao.latitude.toFixed(5)}, {form.localizacao.longitude.toFixed(5)}
                  </p>
                )}
                {form.localizacao && form.distanciaKm !== null && (
                  <p className={`mt-2 text-xs font-bold ${dentroDoRaio ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {dentroDoRaio
                      ? `Dentro da área comunitária (${form.distanciaKm.toFixed(1)} km do centro)`
                      : `Fora da área comunitária (${form.distanciaKm.toFixed(1)} km do centro)`}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={acoes.capturarGps}
                disabled={form.capturandoGps}
                className={`w-full rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer ${tamanhoBotao}`}
              >
                <LocateFixed size={18} strokeWidth={2.25} aria-hidden="true" />
                {form.localizacao ? 'Atualizar localização' : 'Obter localização'}
              </button>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="referencia-ocorrencia" className={`font-bold text-slate-700 ${facil ? 'text-base' : 'text-sm'}`}>
                    Ponto de referência (opcional)
                  </label>
                  <button
                    type="button"
                    onClick={acoes.alternarVoz}
                    aria-pressed={form.gravandoVoz}
                    className={`min-h-10 text-xs font-bold px-3 rounded-xl flex items-center gap-1 cursor-pointer ${
                      form.gravandoVoz ? 'bg-rose-600 text-white animate-pulse' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    <Mic size={14} strokeWidth={2.25} aria-hidden="true" />
                    {form.gravandoVoz ? 'A ouvir...' : 'Ditar'}
                  </button>
                </div>
                <input
                  id="referencia-ocorrencia"
                  type="text"
                  value={form.pontoReferencia}
                  onChange={(e) => acoes.pontoReferenciaChange(e.target.value)}
                  placeholder="Ex.: em frente à mercearia, perto da praça"
                  className="w-full min-h-12 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-slate-800"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <dl className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
                <LinhaResumo rotulo="Tipo" onAlterar={() => setPasso(0)}>
                  {categoriaAtual ? `${categoriaAtual.icon} ${categoriaAtual.label}` : form.categoria}
                </LinhaResumo>
                <LinhaResumo rotulo="Foto" onAlterar={() => setPasso(1)}>
                  {form.fotoPreview ? (
                    <img src={form.fotoPreview} alt="Fotografia anexada" className="h-14 w-14 rounded-xl object-cover border border-slate-200" />
                  ) : (
                    'Sem fotografia'
                  )}
                </LinhaResumo>
                <LinhaResumo rotulo="Local" onAlterar={() => setPasso(2)}>
                  {form.localizacao
                    ? `${form.localizacao.latitude.toFixed(5)}, ${form.localizacao.longitude.toFixed(5)}`
                    : 'Sem localização'}
                  {form.pontoReferencia.trim() && <span className="block text-xs text-slate-500 mt-0.5">{form.pontoReferencia.trim()}</span>}
                </LinhaResumo>
              </dl>
              {!estaOnline && (
                <p className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-800">
                  Está sem internet. O registo fica guardado no telemóvel e é enviado sozinho quando a rede voltar.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex gap-2 px-5 pt-3 border-t border-slate-100 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {resultado ? (
            <>
              <button
                type="button"
                onClick={() => acoes.partilhar(resultado)}
                className={`flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black cursor-pointer ${tamanhoBotao}`}
              >
                Partilhar
              </button>
              <button
                type="button"
                onClick={acoes.verRegistos}
                className={`flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer ${tamanhoBotao}`}
              >
                Acompanhar
              </button>
            </>
          ) : (
            <>
              {passo > 0 && (
                <button
                  type="button"
                  onClick={() => setPasso((p) => p - 1)}
                  disabled={form.enviando}
                  className={`flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 disabled:opacity-50 cursor-pointer ${tamanhoBotao}`}
                >
                  <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                  Voltar
                </button>
              )}
              {ultimoPasso ? (
                <button
                  type="button"
                  onClick={acoes.enviar}
                  disabled={form.enviando || form.processandoFoto || !form.localizacao}
                  className={`flex-1 rounded-2xl font-black uppercase tracking-wider text-white shadow-md ${tamanhoBotao} ${
                    form.enviando || !form.localizacao ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  {form.enviando ? 'A enviar...' : estaOnline ? 'Enviar registo' : 'Guardar no telemóvel'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={avancar}
                  disabled={!podeAvancar}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black disabled:bg-blue-300 disabled:cursor-not-allowed cursor-pointer ${tamanhoBotao}`}
                >
                  {passo === 1 && !form.fotoPreview ? 'Continuar sem foto' : 'Continuar'}
                  <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LinhaResumo({ rotulo, onAlterar, children }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <dt className="text-[11px] font-black uppercase tracking-wider text-slate-400">{rotulo}</dt>
        <dd className="text-sm font-bold text-slate-800 mt-0.5 break-words">{children}</dd>
      </div>
      <button
        type="button"
        onClick={onAlterar}
        className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 cursor-pointer"
        aria-label={`Alterar ${rotulo.toLowerCase()}`}
      >
        Alterar
      </button>
    </div>
  )
}

function PassoProtocolo({ resultado, estaOnline, categoria, copiado, onCopiar }) {
  const codigo = protocoloCivico(resultado.id)
  return (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center" aria-hidden="true">
        <Check size={32} strokeWidth={3} />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">O seu protocolo</p>
        <p className="mt-1 text-3xl font-black tracking-wider text-blue-900" aria-live="polite">{codigo}</p>
        <button
          type="button"
          onClick={() => onCopiar(codigo)}
          className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 cursor-pointer"
        >
          <Copy size={14} strokeWidth={2.25} aria-hidden="true" />
          {copiado ? 'Copiado' : 'Copiar protocolo'}
        </button>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        {estaOnline
          ? 'A ocorrência foi registada. Guarde o protocolo para acompanhar o andamento em "Consultar".'
          : 'Registo guardado no telemóvel. O protocolo já é válido e a ocorrência será enviada quando a rede voltar.'}
      </p>
      {categoria && (
        <p className="text-xs font-bold text-slate-500">
          {categoria.icon} {categoria.label}
        </p>
      )}
    </div>
  )
}
