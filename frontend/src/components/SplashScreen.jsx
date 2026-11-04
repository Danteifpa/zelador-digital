import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onFinish }) {
  const [desvanecer, setDesvanecer] = useState(false)

  useEffect(() => {
    // Inicia a transição de fade-out após 1.6 segundos
    const timerFade = setTimeout(() => {
      setDesvanecer(true)
    }, 1600)

    // Remove o splash completamente após a animação de saída
    const timerFinish = setTimeout(() => {
      if (onFinish) onFinish()
    }, 2100)

    return () => {
      clearTimeout(timerFade)
      clearTimeout(timerFinish)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white transition-opacity duration-500 ease-in-out select-none ${
        desvanecer ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center animate-in zoom-in-90 duration-700">
        {/* Ícone com pulsar suave */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-4 rounded-3xl bg-blue-600/20 border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <span className="text-4xl animate-bounce">📍</span>
          <div className="absolute inset-0 rounded-3xl border-2 border-blue-400 animate-ping opacity-25"></div>
        </div>

        {/* Logotipo */}
        <div className="flex items-center space-x-1 text-3xl font-black tracking-tight">
          <span className="text-blue-500">Zelador</span>
          <span className="text-slate-100 font-light">Digital</span>
        </div>

        {/* Linha de identidade */}
        <p className="mt-2 text-xs font-medium tracking-widest text-slate-400 uppercase">
          Gestão e Zeladoria Comunitária
        </p>

        {/* Barra de progresso discreta */}
        <div className="w-36 h-1 mt-8 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-[pulse_1s_infinite]"></div>
        </div>
      </div>

      {/* Autoria discreta no rodapé da animação */}
      <div className="absolute bottom-6 text-center text-[11px] text-slate-500">
        Iniciativa Comunitária • Dante Dias Monteiro
      </div>
    </div>
  )
}