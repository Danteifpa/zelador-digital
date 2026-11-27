import { Camera } from 'lucide-react'

/**
 * Ação principal do app: registrar um problema na rua.
 * Amarelo de faixa de pedestre, a única cor forte da tela. Área de toque grande.
 */
export default function RegisterButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-20 px-4 py-4 bg-faixa hover:bg-faixa-escura text-asfalto rounded-xl flex items-center gap-4 text-left shadow-[0_3px_0_#e0b200] active:translate-y-px active:shadow-[0_2px_0_#e0b200] transition-[transform,box-shadow] cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-asfalto"
    >
      <span className="w-12 h-12 rounded-lg bg-asfalto text-faixa flex items-center justify-center shrink-0" aria-hidden="true">
        <Camera size={26} strokeWidth={2.25} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-marca text-lg font-extrabold leading-tight">Registrar um problema</span>
        <span className="block text-sm font-medium mt-0.5 text-asfalto/80">Buraco, poste apagado, lixo ou esgoto</span>
      </span>
    </button>
  )
}
