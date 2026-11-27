import CommunityAlert from '../components/CommunityAlert'
import RegisterButton from '../components/RegisterButton'
import StatsOverview from '../components/StatsOverview'
import { feedbackSensorial } from '../lib/feedbackSensorial'
import { ChevronRight, CircleHelp, ClipboardList, Map as IconeMapa, Landmark, Search, Smartphone } from 'lucide-react'

export default function TelaInicio({ bannerPwaIgnorado, imprimirCartazA4, instalarAplicacaoPWA, pwaInstalado, setAbaAtiva, setBannerPwaIgnorado, setErroProtocolo, setImprimirCartaz, setMostrarConsultaProtocolo, setMostrarQrCode, setMostrarReportModal, setProtocoloConsulta, setResultadoProtocolo, setSucessoEnvio, totalPendentes, totalRegistos, totalResolvidos }) {
  return (
    <div className="flex flex-col gap-3 px-2.5 py-2 max-w-lg mx-auto w-full">
      <StatsOverview total={totalRegistos} resolvidos={totalResolvidos} pendentes={totalPendentes} />

      <div>
        <h2 className="mb-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider px-1">Ações Rápidas</h2>

        <RegisterButton
          onClick={() => {
            feedbackSensorial.toqueSuave()
            setSucessoEnvio(null)
            setMostrarReportModal(true)
          }}
        />

        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setAbaAtiva('registos')
            }}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 border border-emerald-100">
              <ClipboardList size={17} strokeWidth={2.25} aria-hidden="true" />
            </div>
            <span className="text-xs font-black text-slate-800">Registros</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Histórico</span>
          </button>

          <button
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setAbaAtiva('mapa')
            }}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 border border-sky-100">
              <IconeMapa size={17} strokeWidth={2.25} aria-hidden="true" />
            </div>
            <span className="text-xs font-black text-slate-800">Ver Mapa</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Pontos e calor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setErroProtocolo('')
              setResultadoProtocolo(null)
              setProtocoloConsulta('')
              setMostrarConsultaProtocolo(true)
            }}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex flex-col items-start transition-all cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 border border-indigo-100">
              <Search size={17} strokeWidth={2.25} aria-hidden="true" />
            </div>
            <span className="text-xs font-black text-slate-800">Consultar</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Protocolo</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            feedbackSensorial.toqueSuave()
            setAbaAtiva('transparencia')
          }}
          className="mt-2.5 w-full flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 text-left shadow-2xs hover:bg-slate-50 cursor-pointer"
        >
          <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0" aria-hidden="true">
            <Landmark size={18} strokeWidth={2.25} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-black text-slate-800">Transparência por bairro</span>
            <span className="block text-[10px] text-slate-500">Quanto está em aberto, quanto foi resolvido e dados abertos</span>
          </span>
          <ChevronRight size={18} className="text-slate-400" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          feedbackSensorial.toqueSuave()
          setAbaAtiva('ajuda')
        }}
        className="w-full flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-left hover:bg-blue-100 cursor-pointer"
      >
        <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0" aria-hidden="true">
          <CircleHelp size={18} strokeWidth={2.25} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-black text-blue-900">Como usar o app</span>
          <span className="block text-[10px] text-blue-700">Tutorial rápido em 9 passos, com leitura em voz alta</span>
        </span>
        <ChevronRight size={18} className="text-blue-400" aria-hidden="true" />
      </button>

      {/* Convite para instalar: discreto, depois das ações principais. */}
      {!pwaInstalado && !bannerPwaIgnorado && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
            <Smartphone size={18} strokeWidth={2.25} />
          </span>
          <p className="flex-1 text-xs font-bold text-slate-700 leading-snug">Instale o app na tela inicial</p>
          <button
            type="button"
            onClick={instalarAplicacaoPWA}
            className="min-h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer"
          >
            Instalar
          </button>
          <button
            type="button"
            aria-label="Dispensar convite para instalar"
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setBannerPwaIgnorado(true)
            }}
            className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <CommunityAlert
        onAbrirQrCode={() => {
          feedbackSensorial.toqueSuave()
          setImprimirCartaz(false)
          setMostrarQrCode(true)
        }}
        onImprimirCartaz={imprimirCartazA4}
      />
    </div>
  )
}
