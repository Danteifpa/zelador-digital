import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock, Download, FileJson, Landmark, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { baixarArquivo, dadosAbertosParaCsv, dadosAbertosParaGeoJson, formatarDias, ordenarBairros, resumirTransparencia } from '../lib/transparencia'

/**
 * Página pública de transparência: como cada bairro está, e download dos dados abertos.
 * Números vêm das views transparencia_bairros e dados_abertos (sem foto, sem descrição,
 * coordenada arredondada em ~100 m).
 */
export default function Transparencia({ onVoltar }) {
  const [bairros, setBairros] = useState(null)
  const [erro, setErro] = useState('')
  const [ordem, setOrdem] = useState('abertos')
  const [baixando, setBaixando] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase
      .from('transparencia_bairros')
      .select('*')
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) setErro('Não foi possível carregar os números agora. Verifique a internet e tente de novo.')
        else setBairros(data || [])
      })
    return () => {
      ativo = false
    }
  }, [])

  const resumo = useMemo(() => resumirTransparencia(bairros || []), [bairros])
  const lista = useMemo(() => ordenarBairros(bairros || [], ordem), [bairros, ordem])
  const maxAbertos = Math.max(1, ...lista.map((b) => b.abertos))

  const baixar = async (formato) => {
    setBaixando(formato)
    try {
      const { data, error } = await supabase.from('dados_abertos').select('*').order('registrado_em', { ascending: true }).limit(10000)
      if (error) throw error
      const hoje = new Date().toISOString().slice(0, 10)
      if (formato === 'csv') baixarArquivo(dadosAbertosParaCsv(data || []), `zelador-digital-dados-abertos-${hoje}.csv`, 'text/csv;charset=utf-8')
      else baixarArquivo(JSON.stringify(dadosAbertosParaGeoJson(data || [])), `zelador-digital-dados-abertos-${hoje}.geojson`, 'application/geo+json')
    } catch {
      setErro('Não foi possível baixar os dados agora. Tente de novo em instantes.')
    } finally {
      setBaixando(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 px-2.5 py-2 max-w-lg mx-auto w-full">
      <button
        type="button"
        onClick={onVoltar}
        className="self-start inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Início
      </button>

      <section className="rounded-3xl bg-slate-900 p-5 text-white">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-sky-300">
          <Landmark size={14} aria-hidden="true" /> Transparência
        </p>
        <h2 className="mt-1 text-xl font-black leading-tight">Como está cada bairro de Ananindeua</h2>
        <p className="mt-1 text-xs text-slate-300">Números de todos os registros feitos pelos moradores no Zelador Digital.</p>
        {bairros && (
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/10 p-2.5">
              <dt className="text-[10px] font-bold text-slate-300">Em aberto</dt>
              <dd className="text-xl font-black">{resumo.abertos}</dd>
            </div>
            <div className="rounded-2xl bg-white/10 p-2.5">
              <dt className="text-[10px] font-bold text-slate-300">Resolvidos</dt>
              <dd className="text-xl font-black text-emerald-300">{resumo.resolvidos}</dd>
            </div>
            <div className="rounded-2xl bg-white/10 p-2.5">
              <dt className="text-[10px] font-bold text-slate-300">Tempo médio</dt>
              <dd className="text-xl font-black">{formatarDias(resumo.diasMedios)}</dd>
            </div>
          </dl>
        )}
        {resumo.abertosMais30 > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <TriangleAlert size={14} aria-hidden="true" /> {resumo.abertosMais30} problema(s) esperando há mais de 30 dias
          </p>
        )}
      </section>

      {erro && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700" role="alert">{erro}</p>}
      {!bairros && !erro && <p className="p-6 text-center text-xs text-slate-500">Carregando os números...</p>}

      {bairros && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-800">Por bairro</h3>
            <label className="text-[11px] font-bold text-slate-500">
              Ordenar por{' '}
              <select value={ordem} onChange={(e) => setOrdem(e.target.value)} className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">
                <option value="abertos">mais em aberto</option>
                <option value="espera">mais tempo esperando</option>
                <option value="tempo">tempo de resolução</option>
                <option value="nome">nome</option>
              </select>
            </label>
          </div>
          {lista.length === 0 && <p className="text-xs text-slate-500">Ainda não há registros.</p>}
          <ul className="space-y-2.5">
            {lista.map((b) => (
              <li key={b.bairro}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-black text-slate-800">{b.bairro}</span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {b.abertos} em aberto · {b.resolvidos} resolvido(s)
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(b.abertos / maxAbertos) * 100}%` }} />
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><Clock size={11} aria-hidden="true" /> Resolve em {formatarDias(b.dias_medios_resolucao)}</span>
                  {b.abertos_mais_30_dias > 0 && <span className="font-bold text-rose-600">{b.abertos_mais_30_dias} esperando há +30 dias</span>}
                  {b.apoios > 0 && <span>👥 {b.apoios} confirmações de vizinhos</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 space-y-2">
        <h3 className="text-sm font-black text-slate-800">Dados abertos</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Baixe todos os registros para pesquisa, jornalismo ou fiscalização. Sem fotos, sem descrições e com a localização
          arredondada (cerca de 100 m), para proteger quem registrou.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={Boolean(baixando)}
            onClick={() => baixar('csv')}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          >
            <Download size={16} aria-hidden="true" /> {baixando === 'csv' ? 'Baixando...' : 'Planilha (CSV)'}
          </button>
          <button
            type="button"
            disabled={Boolean(baixando)}
            onClick={() => baixar('geojson')}
            className="min-h-11 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-xs font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            <FileJson size={16} aria-hidden="true" /> {baixando === 'geojson' ? 'Baixando...' : 'Mapa (GeoJSON)'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Dados sob licença CC BY 4.0: cite "Zelador Digital". Limites dos bairros © colaboradores do OpenStreetMap (ODbL).
        </p>
      </section>
    </div>
  )
}
