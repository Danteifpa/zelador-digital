import { MARCA } from '../lib/marca'

/**
 * Topo da tela inicial: uma placa de rua com o nome da cidade e, logo abaixo,
 * os três números da comunidade (registros, resolvidos e em aberto).
 */
export default function StatsOverview({ total, resolvidos, pendentes }) {
  const numeros = [
    { rotulo: 'registros', valor: total, cor: 'text-asfalto' },
    { rotulo: 'resolvidos', valor: resolvidos, cor: 'text-mangueira' },
    { rotulo: 'em aberto', valor: pendentes, cor: 'text-asfalto' }
  ]

  return (
    <section aria-labelledby="titulo-cidade">
      <div className="rounded-md bg-placa p-1.5 shadow-[0_2px_0_#163e7e]">
        <div className="rounded-[3px] border-2 border-white/90 px-4 pt-2.5 pb-3 text-white">
          <p className="text-[11px] font-semibold text-white/80">Você está cuidando de</p>
          <h1 id="titulo-cidade" className="font-marca text-[1.75rem] leading-tight font-extrabold tracking-tight">
            {MARCA.cidade}
            <span className="ml-2 align-middle text-sm font-semibold text-white/75">{MARCA.uf}</span>
          </h1>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 divide-x divide-asfalto/15">
        {numeros.map(({ rotulo, valor, cor }) => (
          // dt antes de dd (regra do HTML); a ordem visual inverte para o número ficar em cima.
          <div key={rotulo} className="flex flex-col-reverse px-3 first:pl-1">
            <dt className="mt-1 text-xs font-semibold text-slate-600">{rotulo}</dt>
            <dd className={`font-marca text-2xl font-extrabold leading-none ${cor}`}>{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
