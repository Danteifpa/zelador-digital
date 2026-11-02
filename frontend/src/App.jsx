import { useState } from 'react';
import FormularioOcorrencia from './components/FormularioOcorrencia';
import MapaOcorrencias from './components/MapaOcorrencias';
import HistoricoRegistos from './components/HistoricoRegistos';
import PainelGestor from './components/PainelGestor';
import { ShieldAlert, Map, PlusCircle, List, SlidersHorizontal } from 'lucide-react';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('reportar');

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-24 flex flex-col">
      {/* Cabeçalho */}
      <header className="bg-blue-600 text-white px-4 py-3.5 shadow-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-white" size={24} />
          <h1 className="font-bold text-lg tracking-tight">Zelador Digital</h1>
        </div>

        {/* Botão Gestão */}
        <button
          type="button"
          onClick={() => setAbaAtiva(abaAtiva === 'gestor' ? 'reportar' : 'gestor')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition shadow-sm ${
            abaAtiva === 'gestor'
              ? 'bg-amber-400 text-amber-950 font-bold'
              : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>{abaAtiva === 'gestor' ? 'Modo Cidadão' : 'Gestão'}</span>
        </button>
      </header>

      {/* Conteúdo dinâmico */}
      <main className="flex-1 p-4 max-w-md w-full mx-auto">
        {abaAtiva === 'reportar' && (
          <FormularioOcorrencia onOcorrenciaCriada={() => setAbaAtiva('registos')} />
        )}
        {abaAtiva === 'mapa' && <MapaOcorrencias />}
        {abaAtiva === 'registos' && <HistoricoRegistos />}
        {abaAtiva === 'gestor' && <PainelGestor />}
      </main>

      {/* Barra de Navegação Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-around items-center z-50 shadow-lg">
        <button
          type="button"
          onClick={() => setAbaAtiva('reportar')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition ${
            abaAtiva === 'reportar' ? 'text-blue-600 font-bold' : 'text-gray-400'
          }`}
        >
          <PlusCircle size={20} />
          <span>Reportar</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('mapa')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition ${
            abaAtiva === 'mapa' ? 'text-blue-600 font-bold' : 'text-gray-400'
          }`}
        >
          <span>Mapa</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('registos')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition ${
            abaAtiva === 'registos' ? 'text-blue-600 font-bold' : 'text-gray-400'
          }`}
        >
          <List size={20} />
          <span>Registos</span>
        </button>
      </nav>
    </div>
  );
}