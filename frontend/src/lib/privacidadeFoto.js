// Privacidade da foto: borra rostos automaticamente e áreas escolhidas (placas) antes do envio.
//
// Tudo acontece no celular: a foto original nunca sai do aparelho. O detector de rostos
// (face-api, modelo TinyFaceDetector de ~190 KB em /modelos) só é baixado quando há foto,
// e fica guardado pelo service worker para as próximas vezes.

const URL_MODELOS = '/modelos'
const TEMPO_MAXIMO_MS = 9000

let carregandoDetector = null

async function carregarDetector() {
  if (!carregandoDetector) {
    carregandoDetector = (async () => {
      const faceapi = await import('@vladmandic/face-api')
      await faceapi.nets.tinyFaceDetector.loadFromUri(URL_MODELOS)
      return faceapi
    })().catch((erro) => {
      carregandoDetector = null
      throw erro
    })
  }
  return carregandoDetector
}

function comTempoLimite(promessa, ms) {
  return Promise.race([promessa, new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error('tempo esgotado')), ms))])
}

export async function imagemDoArquivo(arquivo) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(arquivo)
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Retângulos {x, y, largura, altura} em pixels da imagem. Lista vazia se o detector falhar. */
export async function detectarRostos(imagem) {
  try {
    const faceapi = await comTempoLimite(carregarDetector(), TEMPO_MAXIMO_MS)
    const canvas = document.createElement('canvas')
    canvas.width = imagem.width
    canvas.height = imagem.height
    canvas.getContext('2d').drawImage(imagem, 0, 0)
    const deteccoes = await comTempoLimite(
      faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })),
      TEMPO_MAXIMO_MS
    )
    return deteccoes.map(({ box }) => ({ x: box.x, y: box.y, largura: box.width, altura: box.height }))
  } catch (erro) {
    console.warn('Detector de rostos indisponível:', erro)
    return []
  }
}

/** Aumenta o retângulo (cabelo, queixo, borda da placa) e prende dentro da imagem. */
export function ampliarRetangulo(r, largura, altura, margem = 0.25) {
  const dx = r.largura * margem
  const dy = r.altura * margem
  const x = Math.max(0, Math.floor(r.x - dx))
  const y = Math.max(0, Math.floor(r.y - dy))
  return {
    x,
    y,
    largura: Math.min(largura - x, Math.ceil(r.largura + 2 * dx)),
    altura: Math.min(altura - y, Math.ceil(r.altura + 2 * dy))
  }
}

/** Tamanho do bloco de pixelização: grande o bastante para ninguém reconhecer. */
export function tamanhoDoBloco(r) {
  return Math.max(10, Math.round(Math.min(r.largura, r.altura) / 5))
}

/** Pixeliza as áreas no próprio canvas (irreversível depois de salvo). */
export function pixelarAreas(contexto, retangulos) {
  const { width, height } = contexto.canvas
  for (const original of retangulos) {
    const r = ampliarRetangulo(original, width, height, original.margem ?? 0.25)
    if (r.largura < 2 || r.altura < 2) continue
    const bloco = tamanhoDoBloco(r)
    const pequeno = document.createElement('canvas')
    pequeno.width = Math.max(1, Math.ceil(r.largura / bloco))
    pequeno.height = Math.max(1, Math.ceil(r.altura / bloco))
    const ctxPequeno = pequeno.getContext('2d')
    ctxPequeno.drawImage(contexto.canvas, r.x, r.y, r.largura, r.altura, 0, 0, pequeno.width, pequeno.height)
    contexto.save()
    contexto.imageSmoothingEnabled = false
    contexto.drawImage(pequeno, 0, 0, pequeno.width, pequeno.height, r.x, r.y, r.largura, r.altura)
    contexto.restore()
  }
}

async function salvarCanvas(canvas, arquivoOriginal) {
  const tipo = arquivoOriginal.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  const blob = await new Promise((resolver) => canvas.toBlob(resolver, tipo, 0.8))
  const extensao = tipo === 'image/webp' ? 'webp' : 'jpg'
  const nome = (arquivoOriginal.name || 'foto').replace(/\.[^.]+$/, '') + `.${extensao}`
  return new File([blob], nome, { type: tipo, lastModified: Date.now() })
}

/**
 * Borra as áreas indicadas e, se `detectar`, também os rostos encontrados.
 * @returns {Promise<{ arquivo: File, rostos: number }>}
 */
export async function protegerFoto(arquivo, { detectar = true, areas = [] } = {}) {
  const imagem = await imagemDoArquivo(arquivo)
  const rostos = detectar ? await detectarRostos(imagem) : []
  if (rostos.length === 0 && areas.length === 0) return { arquivo, rostos: 0 }

  const canvas = document.createElement('canvas')
  canvas.width = imagem.width
  canvas.height = imagem.height
  const contexto = canvas.getContext('2d')
  contexto.drawImage(imagem, 0, 0)
  pixelarAreas(contexto, [...rostos, ...areas.map((a) => ({ ...a, margem: 0.05 }))])
  return { arquivo: await salvarCanvas(canvas, arquivo), rostos: rostos.length }
}
