import Logotipo from './Logotipo'
import { MARCA } from '../lib/marca'
export default function ModalSobre({ setModalSobreAberto, abrirComoUsar }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-slate-200 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Logotipo size={26} />
            <h2 className="text-lg font-black text-slate-800 mt-1">Sobre o desenvolvedor</h2>
          </div>
          <button
            type="button"
            onClick={() => setModalSobreAberto(false)}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2">
            <img src="/assinatura-dante.png" alt="Logo de Dante Dias Monteiro" width="27" height="32" className="h-8 w-auto opacity-80" />
            <p className="text-base font-black text-slate-800">Dante Dias Monteiro</p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Criador e desenvolvedor do {MARCA.nome}, projeto de iniciativa comunitária independente para mapeamento e acompanhamento de zeladoria urbana em {MARCA.cidade}.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Software livre sob a licença AGPL-3.0.{' '}
            <a
              href="https://github.com/Danteifpa/zelador-digital"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-blue-700 underline"
            >
              Ver código-fonte
            </a>
            . O nome e a marca {MARCA.nome} não fazem parte da licença.
          </p>
        </div>
        {abrirComoUsar && (
          <button
            type="button"
            onClick={abrirComoUsar}
            className="w-full mt-6 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-bold hover:bg-blue-100 cursor-pointer"
          >
            Como usar o app (tutorial)
          </button>
        )}
        <button
          type="button"
          onClick={() => setModalSobreAberto(false)}
          className="w-full mt-2 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
