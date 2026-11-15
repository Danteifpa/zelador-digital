// Parâmetros do endereço (atalhos do ícone instalado e links de protocolo).

// Atalhos do ícone instalado (manifest.json → shortcuts): /?aba=reportar, /?aba=mapa, ...
export function protocoloDoEndereco() {
  if (typeof window === 'undefined') return null
  const codigo = new URLSearchParams(window.location.search).get('protocolo')
  return codigo && /^ZD-[0-9A-F]{6}$/i.test(codigo) ? codigo.toUpperCase() : null
}

export function abaDoEndereco() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('aba')
}
