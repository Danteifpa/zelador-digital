import { Bell, BellRing, Check } from 'lucide-react'

const TEXTOS = {
  ativado: { titulo: 'Avisos ativados', detalhe: 'Você será notificado quando o status deste protocolo mudar.' },
  pendente: { titulo: 'Avisos guardados', detalhe: 'Serão ativados assim que o registro for enviado.' },
  'ios-instalar': { titulo: 'Instale o app para receber avisos', detalhe: 'No iPhone: Compartilhar → "Adicionar à Tela de Início". Depois, toque aqui de novo.' },
  negado: { titulo: 'Notificações bloqueadas', detalhe: 'Libere as notificações deste site nas configurações do navegador.' },
  'sem-suporte': { titulo: 'Avisos indisponíveis', detalhe: 'Este navegador não recebe notificações.' }
}

/**
 * Botão "Receber avisos deste protocolo" (assistente, confirmação de registro e consulta).
 * `estado` vem do App: null | 'ativando' | 'ativado' | 'pendente' | 'negado' | ...
 */
export default function BotaoAvisos({ estado, onAtivar }) {
  const concluido = estado === 'ativado' || estado === 'pendente'
  const texto = TEXTOS[estado]

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-left" aria-live="polite">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true">
          {concluido ? <BellRing size={18} strokeWidth={2.25} /> : <Bell size={18} strokeWidth={2.25} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-indigo-900">{texto?.titulo || 'Receber avisos deste protocolo'}</p>
          <p className="mt-0.5 text-xs text-indigo-700">
            {texto?.detalhe || 'Receba uma notificação no celular quando o status mudar.'}
          </p>
        </div>
      </div>
      {!concluido && (
        <button
          type="button"
          onClick={onAtivar}
          disabled={estado === 'ativando'}
          className="mt-2.5 w-full min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-sm font-black text-white cursor-pointer"
        >
          {estado === 'ativando' ? 'Ativando...' : estado ? 'Tentar novamente' : 'Ativar avisos'}
        </button>
      )}
      {concluido && (
        <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700">
          <Check size={14} strokeWidth={3} aria-hidden="true" /> Pronto
        </p>
      )}
    </div>
  )
}
