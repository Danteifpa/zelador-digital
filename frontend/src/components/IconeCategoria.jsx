import { Construction, Droplets, Footprints, Lightbulb, MapPin, TrafficCone, Trash2, TreeDeciduous, Waves } from 'lucide-react'

// Um ícone e uma cor por tipo de problema (os mesmos do mapa: lib/iconesSvg.js).
const ICONES = {
  lixo: { Icone: Trash2, cor: 'text-amber-600', fundo: 'bg-amber-50 border-amber-200' },
  iluminacao: { Icone: Lightbulb, cor: 'text-indigo-600', fundo: 'bg-indigo-50 border-indigo-200' },
  buraco: { Icone: Construction, cor: 'text-orange-600', fundo: 'bg-orange-50 border-orange-200' },
  esgoto: { Icone: Droplets, cor: 'text-sky-600', fundo: 'bg-sky-50 border-sky-200' },
  alagamento: { Icone: Waves, cor: 'text-teal-600', fundo: 'bg-teal-50 border-teal-200' },
  arvore: { Icone: TreeDeciduous, cor: 'text-green-600', fundo: 'bg-green-50 border-green-200' },
  calcada: { Icone: Footprints, cor: 'text-violet-600', fundo: 'bg-violet-50 border-violet-200' },
  sinalizacao: { Icone: TrafficCone, cor: 'text-rose-600', fundo: 'bg-rose-50 border-rose-200' },
  outro: { Icone: MapPin, cor: 'text-slate-600', fundo: 'bg-slate-100 border-slate-200' }
}

function dadosDoIcone(categoria) {
  return ICONES[String(categoria ?? '').trim().toLowerCase()] || ICONES.outro
}

/**
 * Ícone do tipo de problema.
 * - `colorido`: usa a cor do tipo (senão herda a cor do texto, ex.: botão selecionado em branco).
 * - `selo`: desenha dentro de um quadrado arredondado com fundo claro da mesma cor.
 */
export default function IconeCategoria({ categoria, size = 24, colorido = true, selo = false, className = '' }) {
  const { Icone, cor, fundo } = dadosDoIcone(categoria)
  const icone = <Icone size={size} strokeWidth={2.1} aria-hidden="true" className={`${colorido ? cor : ''} ${selo ? '' : className}`} />
  if (!selo) return icone
  return (
    <span className={`inline-flex items-center justify-center rounded-xl border ${fundo} ${className}`} aria-hidden="true">
      {icone}
    </span>
  )
}
