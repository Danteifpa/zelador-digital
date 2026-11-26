import { useEffect, useMemo, useState } from 'react'
import { Scale, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calcularEquidade, formatarPercentual } from '../lib/equidade'
import { formatarDias } from '../lib/transparencia'

/**
 * Painel de Equidade: o atendimento chega igual a todos os bairros?
 * Usa a view pública dados_abertos (só bairro, estado e datas) e faz a conta no aparelho.
 */
export default function PainelEquidade() {
  const [linhas, setLinhas] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    supabase
      .from('dados_abertos')
      .select('bairro,status,registrado_em,resolvido_em')
      .limit(10000)
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setErro('Não foi possível carregar o Painel de Equidade agora.')
        else setLinhas(data || [])
      })
    return () => {
      ativo = false
    }
  }, [])

  const eq = useMemo(() => (linhas ? calcularEquidade(linhas) : null), [linhas])
  const media = eq?.cidade.percentual

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 space-y-3" aria-labelledby="titulo-equidade">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-700">
          <Scale size={14} aria-hidden="true" /> Painel de Equidade
        </p>
        <h3 id="titulo-equidade" className="mt-1 text-sm font-black text-slate-800">
          O atendimento chega igual a todos os bairros?
        </h3>
        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
          Dos problemas registrados há pelo menos {eq?.prazoDias ?? 7} dias, quantos foram resolvidos em até{' '}
          {eq?.prazoDias ?? 7} dias.
        </p>
      </div>

      {erro && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700" role="alert">{erro}</p>}
      {!eq && !erro && <p className="p-4 text-center text-xs text-slate-500">Calculando...</p>}

      {eq && (
        <>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[10px] font-bold text-slate-500">Cidade, no prazo</dt>
              <dd className="text-xl font-black text-slate-900">{formatarPercentual(media)}</dd>
              <dd className="text-[10px] text-slate-500">{eq.cidade.elegiveis} registro(s) contados</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[10px] font-bold text-slate-500">Diferença entre bairros</dt>
              <dd className="text-xl font-black text-slate-900">
                {eq.diferenca ? `${Math.round(eq.diferenca.pontos)} pontos` : '—'}
              </dd>
              <dd className="text-[10px] text-slate-500">
                {eq.diferenca ? 'entre o mais e o menos atendido' : 'precisa de 2 bairros com dados'}
              </dd>
            </div>
          </dl>

          {eq.diferenca && eq.diferenca.pontos >= 20 && (
            <p className="flex items-start gap-1.5 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {eq.diferenca.pior.bairro} tem {formatarPercentual(eq.diferenca.pior.percentual)} resolvido no prazo; {eq.diferenca.melhor.bairro},{' '}
              {formatarPercentual(eq.diferenca.melhor.percentual)}.
            </p>
          )}

          {eq.bairros.length === 0 ? (
            <p className="text-xs text-slate-500">
              Ainda não há bairros com {eq.minimoRegistros} ou mais registros antigos o bastante para comparar.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {eq.bairros.map((b) => (
                <li key={b.bairro}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-black text-slate-800">{b.bairro}</span>
                    <span className={`text-xs font-black ${b.abaixoDaMedia ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatarPercentual(b.percentual)} no prazo
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                    <div
                      className={`h-2 rounded-full ${b.abaixoDaMedia ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(2, b.percentual)}%` }}
                    />
                    {media !== null && (
                      <div className="absolute -top-0.5 h-3 w-0.5 rounded bg-slate-700" style={{ left: `${media}%` }} />
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-500">
                    <span>{b.elegiveis} registro(s)</span>
                    <span>{b.medianaDias === null ? 'Nenhum resolvido ainda' : `Resolve em ${formatarDias(b.medianaDias)} (mediana)`}</span>
                    {b.abertosMais30 > 0 && <span className="font-bold text-rose-600">{b.abertosMais30} esperando há +30 dias</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Linha escura = média da cidade. Âmbar = abaixo da média. Bairros com menos de {eq.minimoRegistros} registros ficam de
            fora{eq.foraDaComparacao > 0 ? ` (${eq.foraDaComparacao} agora)` : ''}. Conta só o que foi registrado no app.
          </p>
        </>
      )}
    </section>
  )
}
