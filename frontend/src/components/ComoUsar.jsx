import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Share2, Volume2 } from 'lucide-react'
import { PASSOS_COMO_USAR, textoDoPasso } from '../lib/comoUsar'
import { feedbackSensorial } from '../lib/feedbackSensorial'

const URL_TUTORIAL = 'https://zeladordigital.vercel.app/?aba=ajuda'

/**
 * Mini tutorial "Como usar": um passo por tela, com botão de ouvir.
 * onIr(destino) leva para a ação do passo; onVoltar volta ao início.
 */
export default function ComoUsar({ onVoltar, onIr, falarTexto, modoFacil = false }) {
  const [indice, setIndice] = useState(0)
  const passo = PASSOS_COMO_USAR[indice]
  const total = PASSOS_COMO_USAR.length

  // No Modo Fácil cada passo é lido automaticamente.
  useEffect(() => {
    if (modoFacil && falarTexto) falarTexto(textoDoPasso(passo, indice))
  }, [indice, modoFacil, falarTexto, passo])

  const ir = (delta) => {
    feedbackSensorial.toqueSuave()
    setIndice((atual) => Math.min(total - 1, Math.max(0, atual + delta)))
  }

  const compartilhar = async () => {
    const texto = 'Aprenda a usar o Zelador Digital, o app para registrar problemas da sua rua em Ananindeua:'
    try {
      if (navigator.share) await navigator.share({ title: 'Como usar o Zelador Digital', text: texto, url: URL_TUTORIAL })
      else {
        await navigator.clipboard.writeText(`${texto} ${URL_TUTORIAL}`)
        falarTexto?.('Link copiado.')
      }
    } catch {
      /* cancelado */
    }
  }

  const base = modoFacil ? 'text-base' : 'text-sm'

  return (
    <div className="flex flex-col gap-3 px-2.5 py-2 max-w-lg mx-auto w-full" aria-label="Como usar o Zelador Digital">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
          <ArrowLeft size={16} aria-hidden="true" /> Início
        </button>
        <button type="button" onClick={compartilhar} className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 cursor-pointer">
          <Share2 size={15} aria-hidden="true" /> Compartilhar tutorial
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm" aria-live="polite">
        <div className={`bg-gradient-to-br ${passo.cor} p-6 text-white`}>
          <p className="text-[11px] font-black uppercase tracking-wider text-white/80">Como usar · passo {indice + 1} de {total}</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl" aria-hidden="true">{passo.icone}</span>
            <h2 className={`font-black leading-tight ${modoFacil ? 'text-2xl' : 'text-xl'}`}>{passo.titulo}</h2>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className={`${base} text-slate-700 leading-relaxed`}>{passo.resumo}</p>
          <p className={`${base} rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2 font-semibold text-slate-600`}>💡 {passo.dica}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => falarTexto?.(textoDoPasso(passo, indice))}
              className="min-h-11 inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <Volume2 size={18} aria-hidden="true" /> Ouvir este passo
            </button>
            {passo.acao && onIr && (
              <button
                type="button"
                onClick={() => {
                  feedbackSensorial.toqueSuave()
                  onIr(passo.acao.destino)
                }}
                className="min-h-11 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 cursor-pointer"
              >
                {passo.acao.rotulo} →
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={indice === 0}
          onClick={() => ir(-1)}
          className="min-h-12 flex-1 inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-300 bg-white text-sm font-black text-slate-700 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft size={18} aria-hidden="true" /> Anterior
        </button>
        <ol className="flex gap-1.5" aria-label="Passos">
          {PASSOS_COMO_USAR.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                aria-label={`Passo ${i + 1}`}
                aria-current={i === indice ? 'step' : undefined}
                onClick={() => setIndice(i)}
                className={`block h-2.5 rounded-full transition-all cursor-pointer ${i === indice ? 'w-6 bg-blue-600' : 'w-2.5 bg-slate-300'}`}
              />
            </li>
          ))}
        </ol>
        {indice < total - 1 ? (
          <button type="button" onClick={() => ir(1)} className="min-h-12 flex-1 inline-flex items-center justify-center gap-1 rounded-2xl bg-slate-900 text-sm font-black text-white cursor-pointer">
            Próximo <ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={onVoltar} className="min-h-12 flex-1 rounded-2xl bg-emerald-600 text-sm font-black text-white cursor-pointer">
            Concluir ✓
          </button>
        )}
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-black text-slate-800">Ver todos os passos em uma lista</summary>
        <ol className="mt-3 space-y-2">
          {PASSOS_COMO_USAR.map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => setIndice(i)} className={`w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50 cursor-pointer ${base}`}>
                <span className="mr-2" aria-hidden="true">{p.icone}</span>
                <span className="font-bold text-slate-800">{i + 1}. {p.titulo}</span>
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}
