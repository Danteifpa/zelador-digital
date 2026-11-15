import { useRef, useState } from 'react'
import { EyeOff, Undo2, X } from 'lucide-react'

/**
 * Faixa abaixo da foto: diz quantos rostos foram borrados e abre o editor
 * "Borrar placa ou outra área". onBorrar(areas) recebe retângulos em pixels da imagem.
 */
export default function PrivacidadeFoto({ fotoPreview, rostosBorrados = 0, onBorrar, grande = false }) {
  const [editando, setEditando] = useState(false)

  return (
    <>
      <div className={`flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 ${grande ? 'text-sm' : 'text-xs'}`}>
        <span className="font-semibold text-slate-600">
          {rostosBorrados > 0
            ? `🙂 ${rostosBorrados === 1 ? '1 rosto borrado' : `${rostosBorrados} rostos borrados`} automaticamente`
            : 'Nenhum rosto encontrado na foto'}
        </span>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-black text-slate-800 border border-slate-300 hover:bg-slate-100 cursor-pointer"
        >
          <EyeOff size={14} aria-hidden="true" /> Borrar área
        </button>
      </div>
      {editando && (
        <EditorAreas
          fotoPreview={fotoPreview}
          onFechar={() => setEditando(false)}
          onAplicar={async (areas) => {
            await onBorrar(areas)
            setEditando(false)
          }}
        />
      )}
    </>
  )
}

function EditorAreas({ fotoPreview, onFechar, onAplicar }) {
  const imagemRef = useRef(null)
  const inicioRef = useRef(null)
  const [areas, setAreas] = useState([])
  const [desenhando, setDesenhando] = useState(null)
  const [aplicando, setAplicando] = useState(false)

  const pontoNaImagem = (evento) => {
    const caixa = imagemRef.current.getBoundingClientRect()
    return {
      x: Math.min(Math.max(evento.clientX - caixa.left, 0), caixa.width),
      y: Math.min(Math.max(evento.clientY - caixa.top, 0), caixa.height)
    }
  }

  const retangulo = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), largura: Math.abs(a.x - b.x), altura: Math.abs(a.y - b.y) })

  const aoPressionar = (evento) => {
    evento.preventDefault()
    evento.currentTarget.setPointerCapture?.(evento.pointerId)
    inicioRef.current = pontoNaImagem(evento)
    setDesenhando(retangulo(inicioRef.current, inicioRef.current))
  }

  const aoMover = (evento) => {
    if (!inicioRef.current) return
    setDesenhando(retangulo(inicioRef.current, pontoNaImagem(evento)))
  }

  const aoSoltar = (evento) => {
    if (!inicioRef.current) return
    let r = retangulo(inicioRef.current, pontoNaImagem(evento))
    inicioRef.current = null
    setDesenhando(null)
    // Um toque sem arrastar vira um quadrado do tamanho de uma placa no ponto tocado.
    if (r.largura < 12 || r.altura < 12) {
      const caixa = imagemRef.current.getBoundingClientRect()
      const lado = caixa.width * 0.22
      r = { x: Math.max(0, r.x - lado / 2), y: Math.max(0, r.y - lado / 4), largura: lado, altura: lado / 2 }
    }
    setAreas((atuais) => [...atuais, r])
  }

  const aplicar = async () => {
    const img = imagemRef.current
    const escala = img.naturalWidth / img.clientWidth
    setAplicando(true)
    try {
      await onAplicar(areas.map((a) => ({ x: a.x * escala, y: a.y * escala, largura: a.largura * escala, altura: a.altura * escala })))
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label="Borrar área da foto">
      <div className="flex items-center justify-between p-3 text-white">
        <p className="text-sm font-black">Arraste sobre a placa, rosto ou número de casa</p>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
          <X size={18} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden px-3">
        <div className="relative touch-none select-none" onPointerDown={aoPressionar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}>
          <img ref={imagemRef} src={fotoPreview} alt="Foto para borrar" draggable={false} className="max-h-[70vh] max-w-full rounded-xl" />
          {[...areas, ...(desenhando ? [desenhando] : [])].map((a, i) => (
            <span
              key={i}
              className="absolute border-2 border-amber-400 bg-amber-400/40 backdrop-blur-sm"
              style={{ left: a.x, top: a.y, width: a.largura, height: a.altura }}
            />
          ))}
        </div>
      </div>
      <p className="px-4 pt-2 text-center text-xs text-slate-300">Ou toque uma vez no lugar da placa.</p>
      <div className="grid grid-cols-2 gap-2 p-3">
        <button
          type="button"
          disabled={areas.length === 0}
          onClick={() => setAreas((atuais) => atuais.slice(0, -1))}
          className="min-h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-bold text-white disabled:opacity-40 cursor-pointer"
        >
          <Undo2 size={16} aria-hidden="true" /> Desfazer
        </button>
        <button
          type="button"
          disabled={areas.length === 0 || aplicando}
          onClick={aplicar}
          className="min-h-12 rounded-2xl bg-amber-500 text-sm font-black text-slate-950 disabled:opacity-40 cursor-pointer"
        >
          {aplicando ? 'Borrando...' : `Borrar ${areas.length || ''} área(s)`}
        </button>
      </div>
    </div>
  )
}
