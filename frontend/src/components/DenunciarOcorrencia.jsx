import { useState } from 'react'
import { Flag } from 'lucide-react'
import {
  MOTIVOS_DENUNCIA,
  MENSAGENS_DENUNCIA,
  denunciarOcorrencia,
  jaDenunciei,
  mensagemDaDenuncia
} from '../lib/moderacao'

/**
 * Link discreto "Denunciar foto ou registro". Abre a escolha do motivo e envia
 * uma denúncia por celular. onDenunciado(resultado, mensagem) avisa o App.
 */
export default function DenunciarOcorrencia({ ocorrencia, onDenunciado }) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState(() => jaDenunciei(ocorrencia.id))

  if (feito) {
    return (
      <p className="text-center text-[11px] font-semibold text-slate-400" role="status">
        Você denunciou este registro. A gestão vai revisar.
      </p>
    )
  }

  const enviar = async (motivo) => {
    if (!navigator.onLine) {
      onDenunciado?.(null, MENSAGENS_DENUNCIA.offline)
      return
    }
    setEnviando(true)
    try {
      const resultado = await denunciarOcorrencia(ocorrencia.id, motivo)
      if (resultado?.denunciado || resultado?.motivo === 'repetido') setFeito(true)
      setAberto(false)
      onDenunciado?.(resultado, mensagemDaDenuncia(resultado))
    } catch (erro) {
      console.error('Falha ao denunciar:', erro)
      onDenunciado?.(null, MENSAGENS_DENUNCIA.erro)
    } finally {
      setEnviando(false)
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mx-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
      >
        <Flag size={13} aria-hidden="true" />
        Denunciar foto ou registro
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-3" role="group" aria-label="Motivo da denúncia">
      <p className="text-xs font-black text-rose-800">O que há de errado?</p>
      {MOTIVOS_DENUNCIA.map((motivo) => (
        <button
          key={motivo.valor}
          type="button"
          disabled={enviando}
          onClick={() => enviar(motivo.valor)}
          className="block w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:border-rose-400 disabled:opacity-60 cursor-pointer"
        >
          {motivo.rotulo}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="w-full py-1.5 text-[11px] font-bold text-slate-500 cursor-pointer"
      >
        Cancelar
      </button>
    </div>
  )
}
