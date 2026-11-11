import { useRegisterSW } from 'virtual:pwa-register/react'

const UMA_HORA = 60 * 60 * 1000

/**
 * Avisa quando há uma versão nova do app e deixa o utilizador escolher quando atualizar,
 * em vez de trocar de versão sozinho (por exemplo, a meio de um registo).
 * Também avisa, uma vez, quando o app fica pronto para funcionar sem internet.
 */
export default function AvisoAtualizacao() {
  const {
    needRefresh: [haVersaoNova, setHaVersaoNova],
    offlineReady: [prontoOffline, setProntoOffline],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_url, registo) {
      // Telemóveis deixam o app aberto dias seguidos: procura versões novas de hora a hora.
      if (registo) window.setInterval(() => registo.update().catch(() => {}), UMA_HORA)
    }
  })

  if (!haVersaoNova && !prontoOffline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-4 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[75] max-w-md mx-auto rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700 p-3.5 flex items-center justify-between gap-3"
    >
      <p className="text-sm font-bold leading-snug">
        {haVersaoNova ? 'Há uma versão nova do Zelador Digital.' : 'O app já funciona sem internet.'}
      </p>
      <div className="flex shrink-0 gap-2">
        {haVersaoNova && (
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="min-h-11 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 text-sm font-black cursor-pointer"
          >
            Atualizar
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setHaVersaoNova(false)
            setProntoOffline(false)
          }}
          className="min-h-11 rounded-xl bg-slate-700 hover:bg-slate-600 px-3 text-sm font-bold cursor-pointer"
          aria-label="Fechar aviso"
        >
          {haVersaoNova ? 'Depois' : 'OK'}
        </button>
      </div>
    </div>
  )
}
