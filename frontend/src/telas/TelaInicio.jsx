import CommunityAlert from '../components/CommunityAlert'
import RegisterButton from '../components/RegisterButton'
import StatsOverview from '../components/StatsOverview'
import { feedbackSensorial } from '../lib/feedbackSensorial'
import { ChevronRight, CircleHelp, ClipboardList, Map as IconeMapa, Landmark, Search, Smartphone, X } from 'lucide-react'

/** Uma linha da lista de caminhos da tela inicial. */
function LinhaCaminho({ Icone, titulo, detalhe, onClick }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-calcada/70 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-placa"
      >
        <span className="w-9 h-9 rounded-lg bg-placa/10 text-placa flex items-center justify-center shrink-0" aria-hidden="true">
          <Icone size={18} strokeWidth={2.25} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-asfalto">{titulo}</span>
          <span className="block text-xs text-slate-600">{detalhe}</span>
        </span>
        <ChevronRight size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
      </button>
    </li>
  )
}

export default function TelaInicio({ bannerPwaIgnorado, imprimirCartazA4, instalarAplicacaoPWA, pwaInstalado, setAbaAtiva, setBannerPwaIgnorado, setErroProtocolo, setImprimirCartaz, setMostrarConsultaProtocolo, setMostrarQrCode, setMostrarReportModal, setProtocoloConsulta, setResultadoProtocolo, setSucessoEnvio, totalPendentes, totalRegistos, totalResolvidos }) {
  const irPara = (aba) => () => {
    feedbackSensorial.toqueSuave()
    setAbaAtiva(aba)
  }

  return (
    <div className="flex flex-col gap-4 px-3 py-3 max-w-lg mx-auto w-full">
      <StatsOverview total={totalRegistos} resolvidos={totalResolvidos} pendentes={totalPendentes} />

      <RegisterButton
        onClick={() => {
          feedbackSensorial.toqueSuave()
          setSucessoEnvio(null)
          setMostrarReportModal(true)
        }}
      />

      <nav aria-label="Atalhos">
        <ul className="rounded-2xl border border-asfalto/10 bg-white divide-y divide-asfalto/10 overflow-hidden">
          <LinhaCaminho Icone={ClipboardList} titulo="Registros" detalhe="Tudo o que já foi registrado" onClick={irPara('registos')} />
          <LinhaCaminho Icone={IconeMapa} titulo="Mapa" detalhe="Onde estão os problemas" onClick={irPara('mapa')} />
          <LinhaCaminho
            Icone={Search}
            titulo="Consultar protocolo"
            detalhe="Veja como está o seu registro"
            onClick={() => {
              feedbackSensorial.toqueSuave()
              setErroProtocolo('')
              setResultadoProtocolo(null)
              setProtocoloConsulta('')
              setMostrarConsultaProtocolo(true)
            }}
          />
          <LinhaCaminho Icone={Landmark} titulo="Transparência por bairro" detalhe="Quanto está em aberto e quanto foi resolvido" onClick={irPara('transparencia')} />
          <LinhaCaminho Icone={CircleHelp} titulo="Como usar o app" detalhe="Tutorial rápido, com leitura em voz alta" onClick={irPara('ajuda')} />
        </ul>
      </nav>

      {/* Convite para instalar: discreto, depois das ações principais. */}
      {!pwaInstalado && !bannerPwaIgnorado && (
        <div className="flex items-center gap-3 rounded-2xl border border-asfalto/10 bg-white p-3">
          <span className="w-9 h-9 rounded-lg bg-placa/10 text-placa flex items-center justify-center shrink-0" aria-hidden="true">
            <Smartphone size={18} strokeWidth={2.25} />
          </span>
          <p className="flex-1 text-xs font-bold text-asfalto leading-snug">Instale o app na tela inicial</p>
          <button
            type="button"
            onClick={instalarAplicacaoPWA}
            className="min-h-9 px-3 rounded-lg bg-placa hover:bg-placa-escura text-white text-xs font-bold cursor-pointer"
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
            className="w-8 h-8 rounded-full text-slate-500 hover:bg-calcada hover:text-asfalto flex items-center justify-center cursor-pointer"
          >
            <X size={16} aria-hidden="true" />
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
