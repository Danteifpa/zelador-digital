import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIAS = [
  {
    id: 'lixo',
    nome: 'Descarte Irregular de Lixo / Entulho',
    curto: 'Lixo / Entulho',
    falar: 'Lixo e entulho acumulado',
    icone: '🗑️',
    cor: 'border-amber-500 bg-amber-50 text-amber-900',
    corAtiva: 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200'
  },
  {
    id: 'iluminacao',
    nome: 'Falha na Iluminação Pública (Poste Apagado)',
    curto: 'Poste Apagado',
    falar: 'Poste apagado ou lâmpada partida',
    icone: '💡',
    cor: 'border-indigo-500 bg-indigo-50 text-indigo-900',
    corAtiva: 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200'
  },
  {
    id: 'buraco',
    nome: 'Buraco ou Dano na Via Pública',
    curto: 'Buraco na Rua',
    falar: 'Buraco ou dano na rua',
    icone: '🕳️',
    cor: 'border-orange-500 bg-orange-50 text-orange-900',
    corAtiva: 'bg-orange-600 text-white border-orange-700 shadow-md shadow-orange-200'
  },
  {
    id: 'esgoto',
    nome: 'Esgoto / Fuga de Água',
    curto: 'Esgoto / Água',
    falar: 'Fuga de água ou esgoto a céu aberto',
    icone: '💧',
    cor: 'border-sky-500 bg-sky-50 text-sky-900',
    corAtiva: 'bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-200'
  }
]

export default function FormularioOcorrencia({ onSucesso }) {
  const [modoAcessivel, setModoAcessivel] = useState(() => {
    return localStorage.getItem('zelador_modo_acessivel') === 'true'
  })

  const [categoria, setCategoria] = useState('lixo')
  const [descricao, setDescricao] = useState('')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [localizacao, setLocalizacao] = useState(null)
  const [aCarregarLocalizacao, setACarregarLocalizacao] = useState(false)
  const [aEnviar, setAEnviar] = useState(false)
  const [mensagemSucesso, setMensagemSucesso] = useState(false)
  const [aGravarVoz, setAGravarVoz] = useState(false)

  const alternarModoAcessibilidade = () => {
    const novoValor = !modoAcessivel
    setModoAcessivel(novoValor)
    localStorage.setItem('zelador_modo_acessivel', String(novoValor))
    if (novoValor) {
      narrarTexto('Modo simplificado e acessível ativado')
    }
  }

  const narrarTexto = (texto) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const sintese = new SpeechSynthesisUtterance(texto)
      sintese.lang = 'pt-BR'
      sintese.rate = 1.0
      window.speechSynthesis.speak(sintese)
    }
  }

  useEffect(() => {
    capturarLocalizacao()
  }, [])

  const capturarLocalizacao = () => {
    if (navigator.geolocation) {
      setACarregarLocalizacao(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalizacao({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
          setACarregarLocalizacao(false)
        },
        () => {
          setACarregarLocalizacao(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }

  const iniciarDitadoPorVoz = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('O seu navegador não possui suporte para ditado por voz. Pode enviar a fotografia e o local diretamente!')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false

    recognition.onstart = () => {
      setAGravarVoz(true)
      narrarTexto('Fale agora o ponto de referência')
    }

    recognition.onresult = (evento) => {
      const textoDitado = evento.results[0][0].transcript
      setDescricao((prev) => (prev ? `${prev} ${textoDitado}` : textoDitado))
      setAGravarVoz(false)
    }

    recognition.onerror = () => setAGravarVoz(false)
    recognition.onend = () => setAGravarVoz(false)
    recognition.start()
  }

  const manipularFoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFoto(file)
      setFotoPreview(URL.createObjectURL(file))
      if (modoAcessivel) narrarTexto('Fotografia adicionada com sucesso')
    }
  }

  const submeterDenuncia = async (e) => {
    e.preventDefault()

    try {
      setAEnviar(true)
      let fotoUrl = null

      if (foto) {
        const nomeArquivo = `denuncia_${Date.now()}_${foto.name}`
        const { error: erroUpload } = await supabase.storage
          .from('ocorrencias')
          .upload(nomeArquivo, foto)

        if (!erroUpload) {
          const { data: dadosPublicos } = supabase.storage
            .from('ocorrencias')
            .getPublicUrl(nomeArquivo)
          fotoUrl = dadosPublicos.publicUrl
        }
      }

      const payload = {
        categoria,
        descricao: descricao.trim() || 'Registo sem detalhe de texto',
        foto_url: fotoUrl,
        latitude: localizacao ? localizacao.latitude : null,
        longitude: localizacao ? localizacao.longitude : null,
        status: 'pendente',
        criado_em: new Date().toISOString()
      }

      const { error: erroInsert } = await supabase.from('ocorrencias').insert([payload])
      if (erroInsert) throw erroInsert

      if (modoAcessivel) {
        narrarTexto('Registo enviado com sucesso! Muito obrigado pela ajuda!')
      }

      setMensagemSucesso(true)
      setTimeout(() => {
        setMensagemSucesso(false)
        if (onSucesso) onSucesso()
      }, 2000)
    } catch (err) {
      console.error(err)
      alert('Erro ao enviar o registo. Verifique a ligação à internet.')
    } finally {
      setAEnviar(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Registar Ocorrência</h2>
          <p className="text-xs text-slate-500">Mapeamento comunitário para melhorias nas ruas</p>
        </div>

        <button
          type="button"
          onClick={alternarModoAcessibilidade}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            modoAcessivel
              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title="Alternar modo de acessibilidade com botões maiores e voz"
        >
          <span>{modoAcessivel ? '🔊 Modo Fácil' : '👓 Modo Padrão'}</span>
        </button>
      </div>

      {mensagemSucesso ? (
        <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <h3 className="text-xl font-bold text-slate-800">Ocorrência Registada!</h3>
          <p className="text-slate-500 text-sm">Obrigado por ajudar a cuidar do nosso bairro.</p>
        </div>
      ) : (
        <form onSubmit={submeterDenuncia} className="space-y-5">
          {modoAcessivel ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-800">
                  1. Toque no tipo de problema:
                </label>
                <span className="text-[11px] text-blue-600 font-medium">Toque para ouvir 🔊</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIAS.map((cat) => {
                  const ativa = categoria === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoria(cat.id)
                        narrarTexto(cat.falar)
                      }}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all active:scale-95 cursor-pointer ${
                        ativa ? cat.corAtiva : `${cat.cor} border-dashed`
                      }`}
                    >
                      <span className="text-3xl mb-1">{cat.icone}</span>
                      <span className="text-xs font-bold">{cat.curto}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Categoria do Problema
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icone} {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {modoAcessivel ? '2. Tire uma fotografia do local:' : 'Fotografia Comprovativa'}
            </label>

            {fotoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                <img src={fotoPreview} alt="Fotografia selecionada" className="w-full h-44 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setFoto(null)
                    setFotoPreview(null)
                  }}
                  className="absolute top-2 right-2 bg-rose-600 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-md"
                >
                  ✕ Trocar Fotografia
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400 transition-colors">
                <span className="text-2xl mb-1">📸</span>
                <span className="text-xs font-semibold text-slate-700">Tirar fotografia ou escolher</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={manipularFoto}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">📍</span>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {localizacao
                    ? 'Localização capturada!'
                    : aCarregarLocalizacao
                    ? 'A procurar sinal GPS...'
                    : 'Localização pendente'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {localizacao
                    ? `${localizacao.latitude.toFixed(4)}, ${localizacao.longitude.toFixed(4)}`
                    : 'Permita o acesso ao GPS do telemóvel'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={capturarLocalizacao}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              🔄 Atualizar
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Ponto de Referência {modoAcessivel ? '(Opcional)' : ''}
              </label>

              <button
                type="button"
                onClick={iniciarDitadoPorVoz}
                className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center space-x-1 transition-all ${
                  aGravarVoz
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
                title="Ditar texto falando ao microfone"
              >
                <span>🎙️</span>
                <span>{aGravarVoz ? 'A ouvir...' : 'Falar por voz'}</span>
              </button>
            </div>

            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Perto do mercadinho, poste na curva..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={aEnviar}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center space-x-2 ${
              aEnviar
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <span>{aEnviar ? 'A enviar...' : 'Enviar Registo'}</span>
            <span>🚀</span>
          </button>
        </form>
      )}
    </div>
  )
}
