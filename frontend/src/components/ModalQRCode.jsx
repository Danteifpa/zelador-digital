import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function ModalQRCode({ url, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setErro('')
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2500)
    } catch (error) {
      setErro(`Não foi possível copiar o link: ${error.message}`)
    }
  }

  return (
    <>
      <style>{`@media print {
        body * { display: none !important; }
        body { margin: 0 !important; background: #fff !important; }
        .cartaz-qr-impressao, .cartaz-qr-impressao * {
          display: block !important;
          visibility: visible !important;
        }
        .cartaz-qr-impressao {
          position: absolute !important;
          inset: 0 !important;
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 !important;
        }
      }`}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-qr">
        <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center text-white shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar compartilhamento"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            ✕
          </button>
          <div className="mb-5">
            <span className="text-3xl">📲</span>
            <h2 id="titulo-modal-qr" className="mt-2 text-lg font-black">Divulgue o Zelador Digital</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Leve a fiscalização cidadã para a sua rua em Ananindeua
            </p>
          </div>
          <div className="mx-auto inline-block rounded-3xl bg-white p-4 shadow-inner">
            <QRCodeSVG value={url} size={200} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin />
          </div>
          <p className="mt-3 truncate text-[10px] text-slate-400">{url}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copiarLink}
              className="rounded-2xl bg-blue-600 py-3 text-xs font-black text-white transition-colors hover:bg-blue-700 cursor-pointer"
            >
              {copiado ? '✓ Link copiado!' : 'Copiar Link'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white transition-colors hover:bg-emerald-700 cursor-pointer"
            >
              Imprimir Cartaz A4
            </button>
          </div>
          {erro && <p className="mt-2 text-[10px] font-bold text-rose-300">{erro}</p>}
        </div>
      </div>

      <div className="cartaz-qr-impressao hidden print:block bg-white text-black">
        <div className="m-[12mm] flex min-h-[273mm] flex-col items-center justify-between border-[3px] border-black p-[14mm] text-center">
          <div>
            <p className="text-[13px] font-black uppercase tracking-[0.3em]">Zelador Digital</p>
            <h1 className="mt-12 text-[30pt] font-black uppercase leading-tight">FISCALIZE O NOSSO BAIRRO!</h1>
            <p className="mt-8 text-[17pt] font-bold leading-snug">
              Viu entulho irregular, esgoto a céu aberto ou poste apagado? Registre agora pelo celular.
            </p>
          </div>
          <div className="rounded-[10mm] border-2 border-black bg-white p-[8mm]">
            <QRCodeSVG value={url} size={320} bgColor="#ffffff" fgColor="#000000" level="M" includeMargin />
          </div>
          <div className="max-w-[155mm] text-[14pt] font-bold leading-relaxed">
            <p>1. Aponte a câmera do seu celular para o QR Code</p>
            <p>2. Tire uma foto do local</p>
            <p>3. Acompanhe a resolução com o protocolo gerado.</p>
          </div>
          <p className="border-t-2 border-black pt-5 text-[10pt] font-black">
            Zelador Digital • Plataforma Cívica Independente de Ananindeua • Iniciativa Comunitária
          </p>
        </div>
      </div>
    </>
  )
}
