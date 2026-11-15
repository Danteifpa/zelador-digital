import { useEffect, useMemo, useState } from 'react'
import { Bug } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/** Erros que aconteceram no celular dos moradores nos últimos 30 dias, agrupados. */
export default function ErrosDoApp() {
  const [erros, setErros] = useState(null)
  const [aberto, setAberto] = useState(null)

  useEffect(() => {
    let ativo = true
    const desde = new Date(Date.now() - 30 * 86400000).toISOString()
    supabase
      .from('erros_app')
      .select('criado_em,mensagem,pilha,rota,versao,navegador')
      .gte('criado_em', desde)
      .order('criado_em', { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (ativo) setErros(error ? [] : data || [])
      })
    return () => {
      ativo = false
    }
  }, [])

  const grupos = useMemo(() => {
    const porMensagem = new Map()
    for (const erro of erros || []) {
      const grupo = porMensagem.get(erro.mensagem) || { ...erro, vezes: 0, ultimo: erro.criado_em }
      grupo.vezes += 1
      porMensagem.set(erro.mensagem, grupo)
    }
    return [...porMensagem.values()].sort((a, b) => b.vezes - a.vezes)
  }, [erros])

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
        <Bug size={16} className="text-rose-600" aria-hidden="true" />
        Erros do app (30 dias)
      </h3>
      {erros === null && <p className="text-xs text-slate-500">Carregando...</p>}
      {erros !== null && grupos.length === 0 && (
        <p className="text-xs text-emerald-700 font-bold">Nenhum erro registrado. Tudo funcionando.</p>
      )}
      <ul className="space-y-2">
        {grupos.map((grupo) => (
          <li key={grupo.mensagem} className="rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setAberto(aberto === grupo.mensagem ? null : grupo.mensagem)}
              className="w-full p-3 text-left cursor-pointer"
              aria-expanded={aberto === grupo.mensagem}
            >
              <span className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
                <span>{grupo.vezes}× · último em {new Date(grupo.ultimo).toLocaleString('pt-BR')}</span>
                <span>v{grupo.versao || '?'}</span>
              </span>
              <span className="mt-1 block break-words text-xs font-bold text-slate-800">{grupo.mensagem}</span>
            </button>
            {aberto === grupo.mensagem && (
              <div className="border-t border-slate-100 p-3 space-y-1 text-[11px] text-slate-600">
                <p><strong>Tela:</strong> {grupo.rota || '—'}</p>
                <p className="break-words"><strong>Navegador:</strong> {grupo.navegador || '—'}</p>
                {grupo.pilha && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-[10px]">{grupo.pilha}</pre>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
