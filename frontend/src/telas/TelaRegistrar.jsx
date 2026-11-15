import AvisoFoto from '../components/AvisoFoto'
import IconeCategoria from '../components/IconeCategoria'
import PrivacidadeFoto from '../components/PrivacidadeFoto'
import { CATEGORIAS } from '../lib/categorias'
import { CENTRO_COMUNITARIO } from '../lib/geo'
import { formatarKm } from '../lib/gestao'
import { Camera, MapPin, RefreshCw, Save, Send, Volume2 } from 'lucide-react'

export default function TelaRegistrar({ alternarReconhecimentoVoz, borrarAreasDaFoto, capturandoGps, categoria, distanciaAtualKm, enviando, estaOnline, falarTexto, fotoPreview, gravandoVoz, handleFotoChange, handleSubmit, localizacao, modo, obterLocalizacaoAtual, origemLocalizacao, pontoReferencia, processandoFoto, removerFoto, rostosBorrados, selecionarCategoria, setPontoReferencia }) {
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-black text-slate-800">Novo Registro Territorial</h2>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${estaOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {estaOnline ? 'Online' : 'Armazenamento Local'}
        </span>
      </div>

      {modo === 'facil' && (
        <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-3 flex items-center justify-between text-amber-900">
          <div className="flex items-center space-x-2">
            <Volume2 size={20} strokeWidth={2.25} aria-hidden="true" />
            <span className="text-xs font-bold">Modo Fácil: Botões ampliados e áudio ativo</span>
          </div>
          <button
            type="button"
            onClick={() => falarTexto('Escolha o problema, tire a foto e clique no botão enviar.')}
            className="text-xs bg-amber-500 text-white font-bold px-2.5 py-1 rounded-xl shadow-2xs cursor-pointer"
          >
            Ouvir Ajuda
          </button>
        </div>
      )}

      <div>
        <label className={`block font-black text-slate-600 uppercase tracking-wider mb-2.5 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
          1. Selecione o Tipo:
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIAS.map((cat) => {
            const ativo = categoria === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selecionarCategoria(cat)}
                className={`rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  modo === 'facil' ? 'p-5' : 'p-3.5'
                } ${
                  ativo
                    ? `${cat.activeBg} ${cat.border} shadow-sm scale-[1.01]`
                    : `bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100`
                }`}
              >
                <IconeCategoria categoria={cat.id} size={modo === 'facil' ? 36 : 28} colorido={!ativo} className="mb-1.5" />
                <span className={`font-bold ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className={`block font-black text-slate-600 uppercase tracking-wider mb-2 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
          2. Fotografia do Local:
        </label>

        {!fotoPreview && !processandoFoto && <AvisoFoto grande={modo === 'facil'} />}

        {processandoFoto ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-blue-600 font-bold animate-pulse">
            Otimizando a foto, protegendo rostos e lendo a localização... ⚡
          </div>
        ) : fotoPreview ? (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
            <img src={fotoPreview} alt="Visualização" className={`w-full object-cover ${modo === 'facil' ? 'h-64' : 'h-48'}`} />
            <button
              type="button"
              onClick={removerFoto}
              className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md transition-all cursor-pointer"
            >
              ✕ Trocar Foto
            </button>
          </div>
        ) : null}
        {fotoPreview && !processandoFoto && (
          <PrivacidadeFoto fotoPreview={fotoPreview} rostosBorrados={rostosBorrados} onBorrar={borrarAreasDaFoto} grande={modo === 'facil'} />
        )}
        {processandoFoto || fotoPreview ? null : (
          <label className={`border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-all ${modo === 'facil' ? 'p-7' : 'p-5'}`}>
            <Camera size={modo === 'facil' ? 36 : 28} strokeWidth={2} className="mb-1.5 text-blue-600" aria-hidden="true" />
            <span className={`font-bold text-slate-700 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>Tirar foto ou selecionar</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Leitura de GPS EXIF e compressão automática</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Localização e Validação Territorial (Geofencing) */}
      <div className={`rounded-2xl border border-slate-200 bg-slate-50 space-y-2 ${modo === 'facil' ? 'p-4' : 'p-3.5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0" aria-hidden="true">
              {origemLocalizacao === 'exif' ? <Camera size={18} strokeWidth={2.25} /> : <MapPin size={18} strokeWidth={2.25} />}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <p className={`font-bold text-slate-800 ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
                  {localizacao
                    ? origemLocalizacao === 'exif'
                      ? 'GPS extraído da fotografia!'
                      : 'Localização GPS capturada!'
                    : capturandoGps
                    ? 'Obtendo GPS...'
                    : 'GPS pendente'}
                </p>
                {origemLocalizacao === 'exif' && (
                  <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">
                    EXIF
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                {localizacao
                  ? `Lat: ${localizacao.latitude.toFixed(5)}, Long: ${localizacao.longitude.toFixed(5)}`
                  : 'Clique para atualizar'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={obterLocalizacaoAtual}
            disabled={capturandoGps}
            className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Recapturar GPS atual"
          >
            {capturandoGps ? 'Obtendo...' : <RefreshCw size={16} strokeWidth={2.25} aria-label="Atualizar GPS" />}
          </button>
        </div>

        {localizacao && distanciaAtualKm !== null && (
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1.5">
              <span className={distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm ? 'text-emerald-600' : 'text-amber-500'}>
                {distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm ? '●' : '▲'}
              </span>
              <span className="text-slate-600 font-medium">
                {distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm
                  ? `Área comunitária (${formatarKm(distanciaAtualKm)} do centro)`
                  : `Ponto Externo (${distanciaAtualKm.toFixed(1)} km do bairro)`}
              </span>
            </div>
            <span className={`font-black text-[10px] px-2 py-0.5 rounded-md ${
              distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {distanciaAtualKm <= CENTRO_COMUNITARIO.raioMaximoKm ? 'Dentro do Limite' : 'Fora do Raio'}
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`block font-black text-slate-600 uppercase tracking-wider ${modo === 'facil' ? 'text-sm' : 'text-xs'}`}>
            Referência (Opcional):
          </label>
          <button
            type="button"
            onClick={alternarReconhecimentoVoz}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
              gravandoVoz ? 'bg-rose-600 text-white animate-pulse' : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}
          >
            <span>🎤</span>
            <span>{gravandoVoz ? 'Ouvindo...' : 'Por voz'}</span>
          </button>
        </div>

        <input
          type="text"
          placeholder="Ex.: Em frente à padaria, perto da praça..."
          value={pontoReferencia}
          onChange={(e) => setPontoReferencia(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={enviando || processandoFoto}
        className={`w-full rounded-2xl font-black uppercase tracking-wider text-white shadow-md transition-all ${
          modo === 'facil' ? 'py-5 text-base' : 'py-3.5 text-xs'
        } ${
          enviando || processandoFoto ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {enviando ? 'Processando...' : estaOnline ? 'Enviar registro' : 'Salvar no celular'}
          {!enviando && (estaOnline ? <Send size={18} strokeWidth={2.25} aria-hidden="true" /> : <Save size={18} strokeWidth={2.25} aria-hidden="true" />)}
        </span>
      </button>
    </form>
  )
}
