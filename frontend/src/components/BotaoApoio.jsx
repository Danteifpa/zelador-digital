import { useState } from 'react'
import { Check, ThumbsUp } from 'lucide-react'
import { apoiarOcorrencia, jaApoiei, textoConfirmacoes, MENSAGENS_APOIO } from '../lib/apoios'

/**
 * Botão "Também vi este problema". Mostra quantos vizinhos já confirmaram e,
 * depois do toque, "Você confirmou".
 *
 * onApoiado(total, mensagem) é chamado com o novo total para o App atualizar a lista.
 */
export default function BotaoApoio({ ocorrencia, onApoiado, destaque = false }) {
  const [estado, setEstado] = useState(() => (jaApoiei(ocorrencia.id) ? 'confirmado' : null))
  const [total, setTotal] = useState(Number(ocorrencia.total_apoios) || 0)

  const apoiar = async () => {
    if (!navigator.onLine) {
      onApoiado?.(total, MENSAGENS_APOIO.offline)
      return
    }
    setEstado('enviando')
    try {
      const resultado = await apoiarOcorrencia(ocorrencia.id)
      const novoTotal = Number(resultado?.total) || total
      setTotal(novoTotal)
      setEstado(resultado?.apoiado || resultado?.motivo === 'repetido' ? 'confirmado' : null)
      onApoiado?.(novoTotal, MENSAGENS_APOIO[resultado?.apoiado ? 'apoiado' : resultado?.motivo] || MENSAGENS_APOIO.erro)
    } catch (erro) {
      console.error('Falha ao apoiar ocorrência:', erro)
      setEstado(null)
      onApoiado?.(total, MENSAGENS_APOIO.erro)
    }
  }

  const confirmacoes = textoConfirmacoes(total)

  if (estado === 'confirmado') {
    return (
      <div className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-800" role="status">
        <Check size={18} strokeWidth={3} aria-hidden="true" />
        Você confirmou{confirmacoes ? ` · ${confirmacoes}` : ''}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={apoiar}
      disabled={estado === 'enviando'}
      className={`flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition-colors disabled:opacity-60 cursor-pointer ${
        destaque ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
      }`}
    >
      <ThumbsUp size={18} strokeWidth={2.25} aria-hidden="true" />
      <span>
        {estado === 'enviando' ? 'Confirmando...' : 'Também vi este problema'}
        {confirmacoes && estado !== 'enviando' && <span className="block text-xs font-bold opacity-80">{confirmacoes}</span>}
      </span>
    </button>
  )
}
