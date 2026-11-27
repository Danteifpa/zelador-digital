import { useState } from 'react'
import { MessageSquareHeart, X } from 'lucide-react'
import { AFIRMACOES_SUS, ESCALA_SUS, deveConvidarParaPesquisa, enviarPesquisaSus, marcarPesquisa } from '../lib/pesquisaSus'
import { MARCA } from '../lib/marca'

/**
 * Convite discreto (depois de um registro) para o questionário de usabilidade.
 * Anônimo e opcional: ajuda a medir se o app é fácil de usar.
 */
export default function PesquisaUsabilidade({ grande = false }) {
  const [mostrarConvite, setMostrarConvite] = useState(() => deveConvidarParaPesquisa())
  const [aberta, setAberta] = useState(false)

  if (!mostrarConvite) return null

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
        <MessageSquareHeart size={22} className="shrink-0 text-violet-600" aria-hidden="true" />
        <p className={`flex-1 font-bold text-violet-900 ${grande ? 'text-sm' : 'text-xs'}`}>Ajude a melhorar o app: 10 perguntas rápidas, sem identificação.</p>
        <button type="button" onClick={() => setAberta(true)} className="min-h-9 shrink-0 rounded-xl bg-violet-600 px-3 text-xs font-black text-white cursor-pointer">
          Responder
        </button>
        <button
          type="button"
          aria-label="Agora não"
          onClick={() => {
            marcarPesquisa('dispensado')
            setMostrarConvite(false)
          }}
          className="w-8 h-8 shrink-0 rounded-full text-violet-400 hover:bg-violet-100 flex items-center justify-center cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      {aberta && (
        <Questionario
          grande={grande}
          onFechar={() => setAberta(false)}
          onConcluir={() => {
            marcarPesquisa('respondido')
            setMostrarConvite(false)
            setAberta(false)
          }}
        />
      )}
    </>
  )
}

function Questionario({ grande, onFechar, onConcluir }) {
  const [respostas, setRespostas] = useState(Array(10).fill(null))
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [obrigado, setObrigado] = useState(false)
  const completas = respostas.every(Boolean)

  const enviar = async () => {
    setEnviando(true)
    setErro('')
    try {
      await enviarPesquisaSus(respostas, comentario)
      setObrigado(true)
      setTimeout(onConcluir, 1800)
    } catch {
      setErro('Não foi possível enviar agora. Verifique a internet e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/70 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Questionário de usabilidade">
      <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-violet-600">Pesquisa anônima</p>
            <h2 className="text-lg font-black text-slate-800">O que você achou do app?</h2>
            <p className="text-xs text-slate-500">Marque o quanto você concorda com cada frase.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {obrigado ? (
          <p className="rounded-2xl bg-emerald-50 p-6 text-center text-sm font-black text-emerald-800" role="status">Obrigado! Sua resposta ajuda a melhorar o {MARCA.nome}.</p>
        ) : (
          <>
            <ol className="space-y-4">
              {AFIRMACOES_SUS.map((frase, i) => (
                <li key={frase}>
                  <fieldset>
                    <legend className={`font-bold text-slate-800 ${grande ? 'text-base' : 'text-sm'}`}>{i + 1}. {frase}</legend>
                    <div className="mt-2 grid grid-cols-5 gap-1">
                      {ESCALA_SUS.map(({ valor, rotulo }) => {
                        const marcado = respostas[i] === valor
                        return (
                          <button
                            key={valor}
                            type="button"
                            aria-pressed={marcado}
                            aria-label={rotulo}
                            title={rotulo}
                            onClick={() => setRespostas((atuais) => atuais.map((r, j) => (j === i ? valor : r)))}
                            className={`min-h-11 rounded-xl border text-sm font-black cursor-pointer ${marcado ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                          >
                            {valor}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>Discordo totalmente</span>
                      <span>Concordo totalmente</span>
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
            <label className="block text-sm font-bold text-slate-700">
              Quer deixar uma sugestão? (opcional)
              <textarea
                rows={3}
                maxLength={500}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Não escreva nome, telefone ou endereço."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-normal"
              />
            </label>
            {erro && <p role="alert" className="text-xs font-bold text-rose-700">{erro}</p>}
            <button
              type="button"
              disabled={!completas || enviando}
              onClick={enviar}
              className="w-full min-h-12 rounded-2xl bg-violet-600 text-sm font-black text-white disabled:opacity-40 cursor-pointer"
            >
              {enviando ? 'Enviando...' : completas ? 'Enviar respostas' : `Responda as 10 frases (${respostas.filter(Boolean).length}/10)`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
