import { ETAPAS_ONBOARDING } from '../lib/conteudoApp'
import { feedbackSensorial } from '../lib/feedbackSensorial'

export default function Onboarding({ concluirOnboarding, etapaOnboarding, setEtapaOnboarding, abrirComoUsar }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col justify-between text-center space-y-6 relative border border-slate-100">
        <div className="flex justify-end w-full">
          <button
            onClick={concluirOnboarding}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Pular apresentação
          </button>
        </div>

        <div className="space-y-4">
          <div className={`w-20 h-20 mx-auto rounded-3xl ${ETAPAS_ONBOARDING[etapaOnboarding].gradiente} flex items-center justify-center text-4xl shadow-md`}>
            {ETAPAS_ONBOARDING[etapaOnboarding].icone}
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-800">
              {ETAPAS_ONBOARDING[etapaOnboarding].titulo}
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
              {ETAPAS_ONBOARDING[etapaOnboarding].descricao}
            </p>
          </div>
        </div>

        <div className="flex justify-center items-center space-x-2">
          {ETAPAS_ONBOARDING.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                etapaOnboarding === idx ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="pt-2">
          {etapaOnboarding < ETAPAS_ONBOARDING.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                feedbackSensorial.toqueSuave()
                setEtapaOnboarding((prev) => prev + 1)
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              Continuar →
            </button>
          ) : (
            <button
              type="button"
              onClick={concluirOnboarding}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              Começar a usar
            </button>
          )}
          {abrirComoUsar && (
            <button
              type="button"
              onClick={abrirComoUsar}
              className="w-full py-2 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
            >
              Ver o tutorial passo a passo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
