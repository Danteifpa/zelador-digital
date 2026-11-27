import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import Logotipo from './Logotipo'
import { MARCA } from '../lib/marca'

// QR Code com a identidade do app (public/qr-zelador.svg), gerado para https://zeladordigital.vercel.app.
// Se o endereço oficial mudar, gere de novo; o QR simples (QRCodeSVG) segue como reserva para outros endereços.
const URL_OFICIAL = 'https://zeladordigital.vercel.app'
const QR_PERSONALIZADO = '/qr-zelador.svg'

export default function ModalQRCode({ url, onClose, imprimirAoAbrir = false }) {
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  // "Imprimir Cartaz A4" na tela inicial: só abre a impressão depois que o cartaz
  // (com o QR Code) já está na página. Antes, a impressão abria antes de o módulo carregar.
  useEffect(() => {
    if (!imprimirAoAbrir) return
    const quadro = window.requestAnimationFrame(() => window.setTimeout(() => window.print(), 50))
    return () => window.cancelAnimationFrame(quadro)
  }, [imprimirAoAbrir])

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
      {/* Na impressão só o cartaz aparece. Ele fica direto no <body> (portal), então esconder
          os outros filhos do body não esconde o cartaz junto, como acontecia antes. */}
      <style>{`@media print {
        @page { size: A4; margin: 0; }
        html, body { margin: 0 !important; background: #fff !important; }
        body > *:not(.cartaz-qr-impressao) { display: none !important; }
        .cartaz-qr-impressao { display: block !important; width: 210mm; }
        .cartaz-qr-impressao * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
            <Logotipo size={30} escuro className="justify-center" />
            <h2 id="titulo-modal-qr" className="mt-3 text-lg font-black">Divulgue o {MARCA.nome}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Leve a fiscalização cidadã para a sua rua em {MARCA.cidade}
            </p>
          </div>
          <div className="mx-auto inline-block rounded-3xl bg-white p-4 shadow-inner">
            <img src={QR_PERSONALIZADO} alt={`QR Code para abrir o ${MARCA.nome}`} width="200" height="200" className="block h-[200px] w-[200px]" />
          </div>
          <p className="mt-3 truncate text-[10px] text-slate-400">{url}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copiarLink}
              className="rounded-2xl bg-blue-600 py-3 text-xs font-black text-white transition-colors hover:bg-blue-700 cursor-pointer"
            >
              {copiado ? '✓ Link copiado!' : 'Copiar link'}
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

      {createPortal(
      <div className="cartaz-qr-impressao hidden print:block">
        <div className="flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-[#F6F7F2] text-[#14213D]">
          <div className="flex flex-col gap-[4mm] bg-[#1D4ED8] px-[16mm] pb-[13mm] pt-[16mm] text-[#F6F7F2]">
            <p className="text-[11pt] font-black uppercase tracking-[0.25em] text-[#FFE08A]">{MARCA.cidade} · zeladoria comunitária</p>
            <h1 className="font-marca text-[52pt] font-extrabold leading-[0.98] tracking-tight">Quem vai consertar a sua rua?</h1>
            <p className="max-w-[150mm] text-[15pt] leading-snug text-[#E4EAF5]">A resposta começa com uma foto. Aponte a câmera aqui.</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-[5mm]">
            <div className="rounded-[8mm] bg-white p-[3mm] shadow-[0_0_0_2.5mm_#ffffff]">
              {url === URL_OFICIAL ? (
                <img src={QR_PERSONALIZADO} alt={`QR Code para abrir o ${MARCA.nome}`} className="block h-[100mm] w-[100mm]" />
              ) : (
                <QRCodeSVG value={url} size={378} bgColor="#ffffff" fgColor="#14213D" level="M" includeMargin title={`QR Code para abrir o ${MARCA.nome}`} />
              )}
            </div>
            <p className="text-[13pt] font-black uppercase tracking-[0.08em] text-[#EA580C]">Escaneie com a câmera</p>
          </div>
          <div className="grid grid-cols-3 gap-[4mm] px-[16mm] pb-[10mm]">
            {['Aponte a câmera', 'Fotografe o problema', 'Acompanhe pelo protocolo'].map((passo, i) => (
              <div key={passo} className="flex flex-col gap-[1.5mm] rounded-[5mm] border-2 border-[#D9DED3] bg-white px-[5mm] py-[4mm]">
                <span className="text-[18pt] font-black text-[#1D4ED8]">{i + 1}</span>
                <span className="text-[11.5pt] font-bold leading-tight">{passo}</span>
              </div>
            ))}
          </div>
          <div className="mx-[16mm] flex items-center justify-between border-t-2 border-[#D9DED3] pb-[11mm] pt-[4.5mm]">
            <Logotipo size={36} />
            <span className="text-[10pt] text-[#3E4A61]">Grátis · sem cadastro · zeladordigital.vercel.app</span>
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  )
}
