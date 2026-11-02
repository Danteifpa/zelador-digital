import React, { useState } from 'react'
import FormularioOcorrencia from './components/FormularioOcorrencia'
import HistoricoRegistos from './components/HistoricoRegistos'
import MapaOcorrencias from './components/MapaOcorrencias'
import PainelGestor from './components/PainelGestor'

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('reportar') // 'reportar', 'mapa', 'registos', 'gestao'
  const [modalSobreAberto, setModalSobreAberto] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans antialiased">
      {/* Cabeçalho Principal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 nao-imprimir shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black tracking-tight text-blue-600">Zelador</span>
            <span className="text-2xl font-light tracking-tight text-slate-700">Digital</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Botão Sobre o Projeto */}
            <button
              onClick={() => setModalSobreAberto(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1 border border-slate-200"
              title="Sobre o Zelador Digital"
            >
              <span>ℹ️</span>
              <span className="hidden sm:inline">Sobre</span>
            </button>

            {/* Botão Área de Gestão */}
            <button
              onClick={() => setAbaAtiva('gestao')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                abaAtiva === 'gestao'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              ⚙️ Gestão
            </button>
          </div>
        </div>

        {/* Barra de Navegação Rápida (Abas Comunitárias) */}
        <nav className="max-w-5xl mx-auto px-4 flex border-t border-slate-100 text-sm font-medium">
          <button
            onClick={() => setAbaAtiva('reportar')}
            className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center space-x-2 ${
              abaAtiva === 'reportar'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>➕</span>
            <span>Reportar</span>
          </button>

          <button
            onClick={() => setAbaAtiva('mapa')}
            className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center space-x-2 ${
              abaAtiva === 'mapa'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🗺️</span>
            <span>Mapa</span>
          </button>

          <button
            onClick={() => setAbaAtiva('registos')}
            className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center space-x-2 ${
              abaAtiva === 'registos'
                ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span>
            <span>Registos</span>
          </button>
        </nav>
      </header>

      {/* Conteúdo Central Dinâmico */}
      <main className="max-w-5xl w-full mx-auto p-4 flex-1">
        {abaAtiva === 'reportar' && <FormularioOcorrencia onSucesso={() => setAbaAtiva('registos')} />}
        {abaAtiva === 'mapa' && <MapaOcorrencias />}
        {abaAtiva === 'registos' && <HistoricoRegistos />}
        {abaAtiva === 'gestao' && <PainelGestor onVoltar={() => setAbaAtiva('reportar')} />}
      </main>

      {/* Rodapé Oficial da Aplicação */}
      <footer className="w-full py-6 mt-10 border-t border-slate-200 bg-white/80 backdrop-blur-sm text-center text-xs text-slate-500 nao-imprimir">
        <div className="max-w-5xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Zelador Digital &copy; {new Date().getFullYear()} — Plataforma de Gestão Comunitária
          </p>
          <p>
            Idealizado, projetado e desenvolvido por{' '}
            <span className="font-semibold text-blue-600">Dante Dias Monteiro</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Iniciativa civil independente para mapeamento urbano, saneamento e zeladoria social.
          </p>
        </div>
      </footer>

      {/* Rodapé Exclusivo para Relatórios Impressos / PDF */}
      <div className="hidden print:block text-center text-[10px] text-slate-500 py-4 border-t border-slate-300 mt-6">
        Relatório técnico gerado pela plataforma Zelador Digital • Desenvolvido por Dante Dias Monteiro • Uso Comunitário
      </div>

      {/* Modal 'Sobre o Projeto' */}
      {modalSobreAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 nao-imprimir">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Sobre o Zelador Digital</h3>
                <p className="text-xs text-blue-600 font-medium">Tecnologia Comunitária Aberta</p>
              </div>
              <button
                onClick={() => setModalSobreAberto(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
              <p>
                O <strong>Zelador Digital</strong> é uma ferramenta independente criada para aproximar a comunidade das melhorias urbanas necessárias em nosso bairro.
              </p>
              <p>
                O objetivo é mapear com precisão técnica focos de resíduos irregulares, pontos sem iluminação pública e buracos nas vias, transformando reclamações soltas em <strong>dados organizados, mapas de calor e ofícios formais</strong> para os órgãos competentes.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block uppercase tracking-wider mb-1">
                  Autoria e Desenvolvimento
                </span>
                <p className="font-bold text-slate-800 text-sm">Dante Dias Monteiro</p>
                <p className="text-xs text-slate-500">
                  Idealizador, arquiteto de software e mantenedor do projeto
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalSobreAberto(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}