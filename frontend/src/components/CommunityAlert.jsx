import { Printer, QrCode } from 'lucide-react'
import { MARCA } from '../lib/marca'

/**
 * Divulgação na comunidade: abrir o QR Code ou imprimir o cartaz A4.
 */
export default function CommunityAlert({ onAbrirQrCode, onImprimirCartaz }) {
  return (
    <section className="w-full rounded-2xl border border-asfalto/10 bg-white p-3">
      <h2 className="text-sm font-bold text-asfalto">Chame a vizinhança</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
        Quanto mais gente registra, mais {MARCA.cidade} vê o que falta. Mostre o QR Code ou cole o cartaz.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onAbrirQrCode}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-placa py-2 px-3 text-xs font-bold text-white transition-colors hover:bg-placa-escura cursor-pointer"
        >
          <QrCode size={15} strokeWidth={2.25} aria-hidden="true" />
          Abrir QR Code
        </button>
        <button
          type="button"
          onClick={onImprimirCartaz}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-asfalto/15 bg-calcada py-2 px-3 text-xs font-bold text-asfalto transition-colors hover:bg-slate-200 cursor-pointer"
        >
          <Printer size={15} strokeWidth={2.25} aria-hidden="true" />
          Imprimir cartaz A4
        </button>
      </div>
    </section>
  )
}
