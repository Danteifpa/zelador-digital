// Identificador e protocolo cívico das ocorrências.
//
// O UUID é gerado no próprio telemóvel antes do envio. Assim o cidadão recebe o
// número de protocolo de imediato, mesmo offline, e o mesmo id é reutilizado na
// sincronização da fila (um reenvio do mesmo registo não cria duplicados).

const PADRAO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function gerarIdOcorrencia() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Recurso para navegadores antigos ou contextos sem HTTPS: UUID v4 via getRandomValues.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function ehUuid(valor) {
  return PADRAO_UUID.test(String(valor))
}

// Caminho único para a foto no bucket "ocorrencias" (ex.: ocorrencias/1794405384602_k3x9za.jpg).
export function caminhoDaFoto(extensao = 'jpg', sufixo = '') {
  const aleatorio = Math.random().toString(36).slice(2, 8)
  return `ocorrencias/${Date.now()}${sufixo}_${aleatorio}.${extensao || 'jpg'}`
}

// Mantém o formato já usado na consulta de protocolo: ZD- + 6 primeiros caracteres do id.
export function protocoloCivico(id) {
  return `ZD-${String(id).slice(0, 6).toUpperCase()}`
}
