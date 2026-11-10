/**
 * Botão principal e acessível para iniciar um novo registo de ocorrência.
 * Área de toque ampliada (py-6, ícone 14×14) e texto em tamanho legível.
 */
export default function RegisterButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-6 px-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-between shadow-lg active:scale-[0.99] transition-all"
    >
      <div className="flex items-center space-x-3">
        <div className="w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center text-3xl font-extrabold shrink-0 border border-white/30">
          ➕
        </div>
        <div className="text-left">
          <span className="text-xl font-bold text-white tracking-tight block">Registar Nova Ocorrência</span>
          <span className="text-sm text-blue-50 mt-1 font-medium block">Buraco, poste apagado, lixo ou esgoto</span>
        </div>
      </div>
      <span className="shrink-0 text-3xl">📸</span>
    </button>
  )
}
