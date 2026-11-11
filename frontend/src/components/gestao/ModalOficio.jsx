import { formatarData, protocoloCivico } from '../../lib/gestao'
import { rotuloDaCategoria } from '../../lib/categorias'

/** Ofício em formato A4 com as demandas selecionadas, pronto para imprimir. */
export default function ModalOficio({ pendentesSelecionadas, resolvidasAuditadas, setMostrarOficio }) {
  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-oficio">
      <style>{`@media print { body * { visibility: hidden !important; } .oficio-impressao, .oficio-impressao * { visibility: visible !important; } .oficio-impressao { position: absolute !important; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="oficio-impressao mx-auto max-w-[210mm] bg-white text-slate-900 shadow-2xl print:shadow-none">
        <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white print:hidden">
          <h2 className="text-sm font-black">Pré-visualização do ofício</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold hover:bg-indigo-700 cursor-pointer">Imprimir / PDF</button>
            <button type="button" onClick={() => setMostrarOficio(false)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-800 cursor-pointer">Fechar</button>
          </div>
        </div>
        <article className="min-h-[297mm] p-[16mm] text-[11px] leading-relaxed">
          <header className="border-b-2 border-slate-900 pb-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em]">Zelador Digital</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider">Plataforma comunitária de monitoramento urbano</p>
            <h1 id="titulo-oficio" className="mt-5 text-base font-black uppercase">Ofício de Reivindicação Comunitária</h1>
            <p className="mt-2 text-right">Ananindeua - PA, {formatarData(new Date().toISOString())}</p>
          </header>

          <div className="mt-6 space-y-3">
            <p><strong>Às autoridades, órgãos públicos e concessionárias competentes,</strong></p>
            <p>
              A comunidade de Ananindeua - PA, por meio do Zelador Digital, encaminha o presente ofício para solicitar providências imediatas quanto às demandas de zeladoria urbana listadas abaixo. Os registros foram coletados e georreferenciados por moradores, compondo uma base técnica de acompanhamento do território.
            </p>
            <p>
              Considerando o histórico de ocorrências levantado e a necessidade de preservar a segurança, a mobilidade e a qualidade de vida da população, solicitamos vistoria, resposta formal e programação de atendimento pelos órgãos ou concessionárias responsáveis.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 px-2 py-1 text-left">Nº</th>
                  <th className="border border-slate-400 px-2 py-1 text-left">Tipo</th>
                  <th className="border border-slate-400 px-2 py-1 text-left">Endereço / referência aproximada</th>
                  <th className="border border-slate-400 px-2 py-1 text-left">Coordenadas decimais</th>
                  <th className="border border-slate-400 px-2 py-1 text-left">Registro</th>
                </tr>
              </thead>
              <tbody>
                {pendentesSelecionadas.length === 0 ? (
                  <tr><td colSpan="5" className="border border-slate-400 px-2 py-4 text-center">Nenhuma demanda pendente selecionada.</td></tr>
                ) : pendentesSelecionadas.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-slate-400 px-2 py-1">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-1">{rotuloDaCategoria(item.categoria)}</td>
                    <td className="border border-slate-400 px-2 py-1">{item.endereco || item.morada || item.bairro || 'Área georreferenciada da comunidade'}</td>
                    <td className="border border-slate-400 px-2 py-1 font-mono">{item.latitude != null && item.longitude != null ? `${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}` : 'Não informado'}</td>
                    <td className="border border-slate-400 px-2 py-1">{formatarData(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resolvidasAuditadas.length > 0 && (
            <section className="mt-8 break-inside-avoid">
              <h2 className="border-b border-slate-400 pb-2 text-xs font-black uppercase">Anexo fotográfico — prestação de contas</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {resolvidasAuditadas.map((item) => (
                  <figure key={item.id} className="break-inside-avoid">
                    <div className="grid grid-cols-2 gap-1">
                      <img src={item.foto_url} alt="Registro inicial" className="h-24 w-full object-cover border border-slate-300" />
                      <img src={item.foto_resolucao} alt="Intervenção concluída" className="h-24 w-full object-cover border border-slate-300" />
                    </div>
                    <figcaption className="mt-1 text-[8px]">
                      {protocoloCivico(item.id)} — Antes / Depois — {rotuloDaCategoria(item.categoria)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          <p className="mt-6">
            Sem mais para o momento, aguardamos o encaminhamento das medidas cabíveis e a comunicação do cronograma de atendimento, reafirmando o compromisso da comunidade com a transparência e o monitoramento responsável dos serviços públicos.
          </p>

          <div className="mt-20 grid grid-cols-2 gap-10 text-center">
            <div className="border-t border-slate-700 pt-2">Comissão de moradores</div>
            <div className="border-t border-slate-700 pt-2">Dante Dias Monteiro<br /><span className="text-[9px]">Desenvolvedor do Zelador Digital</span></div>
          </div>
        </article>
      </div>
    </div>
    </>
  )
}
