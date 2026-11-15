import { ShieldAlert } from 'lucide-react'

/** Orientação antes da foto: o registro é público, então nada de pessoas nem placas. */
export default function AvisoFoto({ grande = false }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 font-semibold text-amber-900 ${grande ? 'p-3 text-sm' : 'px-3 py-2 text-xs'}`}
    >
      <ShieldAlert size={grande ? 20 : 16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span>
        Fotografe <strong>o problema</strong>, não pessoas nem placas de carro. A foto fica visível para todos no mapa.
      </span>
    </p>
  )
}
