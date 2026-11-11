// Compressão única da fotografia, feita no momento em que é escolhida.
//
// - Lê o ficheiro com um object URL (sem converter para base64, que duplicava a memória).
// - Reduz o lado maior para `ladoMaximo` px, mantendo a proporção (fotos ao alto e ao baixo).
// - Exporta WebP quando o navegador suporta, senão JPEG.
// - Liberta o object URL e o canvas no fim, para não acumular memória em telemóveis com pouca RAM.
// O canvas não copia os metadados EXIF, por isso a localização não sai no ficheiro enviado.

let suportaWebp = null

function detetarWebp() {
  if (suportaWebp !== null) return suportaWebp
  const teste = document.createElement('canvas')
  teste.width = 1
  teste.height = 1
  suportaWebp = teste.toDataURL('image/webp').startsWith('data:image/webp')
  return suportaWebp
}

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const elemento = new Image()
    elemento.decoding = 'async'
    elemento.onload = () => {
      URL.revokeObjectURL(url)
      resolve(elemento)
    }
    elemento.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem selecionada.'))
    }
    elemento.src = url
  })
}

export async function otimizarImagem(arquivo, ladoMaximo = 1280, qualidade = 0.75) {
  if (!arquivo || !arquivo.type?.startsWith('image/')) return arquivo

  const imagem = await carregarImagem(arquivo)
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.naturalWidth, imagem.naturalHeight))
  const largura = Math.max(1, Math.round(imagem.naturalWidth * escala))
  const altura = Math.max(1, Math.round(imagem.naturalHeight * escala))

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  canvas.getContext('2d').drawImage(imagem, 0, 0, largura, altura)
  imagem.src = ''

  const tipo = detetarWebp() ? 'image/webp' : 'image/jpeg'
  try {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (resultado) => (resultado ? resolve(resultado) : reject(new Error('Não foi possível compactar a imagem.'))),
        tipo,
        qualidade
      )
    })
    // Se a "otimização" ficasse maior do que o original (foto já pequena), mantém o original.
    if (blob.size >= arquivo.size && escala === 1) return arquivo
    const extensao = tipo === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `ocorrencia-otimizada.${extensao}`, { type: tipo, lastModified: Date.now() })
  } finally {
    // Liberta a memória do bitmap do canvas de imediato.
    canvas.width = 0
    canvas.height = 0
  }
}
