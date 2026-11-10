export async function otimizarImagem(arquivo, larguraMaxima = 1280, qualidade = 0.7) {
  if (!arquivo || !arquivo.type?.startsWith('image/')) return arquivo

  const imagem = await new Promise((resolve, reject) => {
    const elemento = new Image()
    const url = URL.createObjectURL(arquivo)
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

  const escala = Math.min(1, larguraMaxima / imagem.naturalWidth)
  const largura = Math.round(imagem.naturalWidth * escala)
  const altura = Math.round(imagem.naturalHeight * escala)
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  canvas.getContext('2d').drawImage(imagem, 0, 0, largura, altura)

  const tipo = canvas.toDataURL('image/webp', qualidade).startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg'
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((resultado) => resultado ? resolve(resultado) : reject(new Error('Não foi possível compactar a imagem.')), tipo, qualidade)
  })

  const extensao = tipo === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `ocorrencia-otimizada.${extensao}`, { type: tipo, lastModified: Date.now() })
}
