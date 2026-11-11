// Lista única das categorias de ocorrência.
//
// O banco guarda só o id ('lixo', 'iluminacao', 'buraco', 'esgoto'); as telas mostram
// sempre o rótulo através de rotuloDaCategoria(), nunca o id cru ("Iluminacao").

export const CATEGORIAS = [
  { id: 'lixo', label: 'Lixo / Entulho', icon: '🗑️', border: 'border-amber-400', activeBg: 'bg-amber-500 text-white', fala: 'Selecionado: Lixo e Entulho' },
  { id: 'iluminacao', label: 'Poste Apagado', icon: '💡', border: 'border-indigo-400', activeBg: 'bg-indigo-600 text-white', fala: 'Selecionado: Iluminação ou Poste Apagado' },
  { id: 'buraco', label: 'Buraco na Rua', icon: '🕳️', border: 'border-orange-500', activeBg: 'bg-orange-600 text-white', fala: 'Selecionado: Buraco na Rua e Vias' },
  { id: 'esgoto', label: 'Esgoto / Água', icon: '💧', border: 'border-sky-400', activeBg: 'bg-sky-600 text-white', fala: 'Selecionado: Vazamento de Água ou Esgoto' }
]

// Só a gestão pode reclassificar uma ocorrência como "Outro".
export const CATEGORIA_OUTRO = { id: 'outro', label: 'Outro', icon: '📍' }

const POR_ID = Object.fromEntries([...CATEGORIAS, CATEGORIA_OUTRO].map((categoria) => [categoria.id, categoria]))

export function rotuloDaCategoria(id) {
  if (!id) return 'Não classificado'
  const chave = String(id).trim().toLowerCase()
  if (POR_ID[chave]) return POR_ID[chave].label
  // Valor desconhecido (dados antigos): mostra legível, com inicial maiúscula.
  return chave.charAt(0).toUpperCase() + chave.slice(1)
}

export const iconeDaCategoria = (id) => POR_ID[String(id ?? '').trim().toLowerCase()]?.icon || '📍'
