import { QrCode } from 'lucide-react'

/**
 * Cartão inferior de divulgação comunitária: abrir QR Code ou imprimir cartaz A4.
 */
export default function CommunityAlert({ onAbrirQrCode, onImprimirCartaz }) {
  return (
    <section className="w-full bg-white rounded-3xl p-3 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <QrCode size={18} strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Divulgação Comunitária &amp; Fiscalização</h2>
          <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-slate-600">
            Ajude a fortalecer a fiscalização cívica em Ananindeua. Compartilhe o acesso direto ou gere o cartaz oficial para impressão.
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onAbrirQrCode}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2 px-3 text-xs font-black text-white transition-colors hover:bg-blue-700 cursor-pointer"
        >
          <QrCode size={14} strokeWidth={2.25} />
          Abrir QR Code
        </button>
        <button
          type="button"
          onClick={onImprimirCartaz}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
        >
          🖨️ Imprimir Cartaz A4
        </button>
      </div>
    </section>
  )
}
