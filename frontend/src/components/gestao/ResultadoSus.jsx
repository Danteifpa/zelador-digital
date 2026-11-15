import { useEffect, useMemo, useState } from 'react'
import { MessageSquareHeart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { AFIRMACOES_SUS, classificarSus } from '../../lib/pesquisaSus'

/** Resultado do questionário SUS para a gestão (e para o relatório acadêmico). */
export default function ResultadoSus() {
  const [linhas, setLinhas] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase
      .from('pesquisa_sus')
      .select('criado_em,respostas,pontuacao,comentario')
      .order('criado_em', { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (ativo) setLinhas(error ? [] : data || [])
      })
    return () => {
      ativo = false
    }
  }, [])

  const resumo = useMemo(() => {
    if (!linhas?.length) return null
    const pontos = linhas.map((l) => Number(l.pontuacao)).sort((a, b) => a - b)
    const media = pontos.reduce((t, p) => t + p, 0) / pontos.length
    const mediana = pontos.length % 2 ? pontos[(pontos.length - 1) / 2] : (pontos[pontos.length / 2 - 1] + pontos[pontos.length / 2]) / 2
    const mediaPorItem = AFIRMACOES_SUS.map((_, i) => linhas.reduce((t, l) => t + l.respostas[i], 0) / linhas.length)
    return { n: linhas.length, media, mediana, mediaPorItem, comentarios: linhas.filter((l) => l.comentario).slice(0, 10) }
  }, [linhas])

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
        <MessageSquareHeart size={16} className="text-violet-600" aria-hidden="true" />
        Usabilidade (questionário SUS)
      </h3>
      {linhas === null && <p className="text-xs text-slate-500">Carregando...</p>}
      {linhas !== null && !resumo && <p className="text-xs text-slate-500">Ainda não há respostas. O convite aparece para o morador depois de um registro.</p>}
      {resumo && (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-violet-50 p-2.5">
              <dt className="text-[10px] font-bold text-violet-700">Média</dt>
              <dd className="text-xl font-black text-violet-900">{resumo.media.toFixed(1)}</dd>
            </div>
            <div className="rounded-2xl bg-violet-50 p-2.5">
              <dt className="text-[10px] font-bold text-violet-700">Avaliação</dt>
              <dd className="text-sm font-black text-violet-900 pt-1">{classificarSus(resumo.media)}</dd>
            </div>
            <div className="rounded-2xl bg-violet-50 p-2.5">
              <dt className="text-[10px] font-bold text-violet-700">Respostas</dt>
              <dd className="text-xl font-black text-violet-900">{resumo.n}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-slate-500">Mediana {resumo.mediana.toFixed(1)}. Acima de 68 já é melhor que a média dos sistemas avaliados com o SUS.</p>
          <details className="text-xs text-slate-700">
            <summary className="cursor-pointer font-bold">Média por pergunta (1 a 5)</summary>
            <ol className="mt-2 space-y-1">
              {AFIRMACOES_SUS.map((frase, i) => (
                <li key={frase} className="flex justify-between gap-2">
                  <span>{i + 1}. {frase}</span>
                  <span className="font-black">{resumo.mediaPorItem[i].toFixed(1)}</span>
                </li>
              ))}
            </ol>
          </details>
          {resumo.comentarios.length > 0 && (
            <details className="text-xs text-slate-700">
              <summary className="cursor-pointer font-bold">Sugestões dos moradores ({resumo.comentarios.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {resumo.comentarios.map((c) => (
                  <li key={c.criado_em} className="rounded-xl bg-slate-50 p-2">“{c.comentario}”</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}
