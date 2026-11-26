// Lista única das categorias de ocorrência.
//
// O banco guarda só o id ('lixo', 'iluminacao', 'buraco', ...; a lista válida também está
// na restrição ocorrencias_categoria_valida do banco); as telas mostram
// sempre o rótulo através de rotuloDaCategoria(), nunca o id cru ("Iluminacao").

import { MARCA } from './marca'

// `curto`: rótulo dos filtros do mapa; `cor`: cor do marcador no mapa.
const TODAS_AS_CATEGORIAS = [
  { id: 'lixo', label: 'Lixo / Entulho', curto: 'Lixo', cor: '#d97706', icon: '🗑️', border: 'border-amber-400', activeBg: 'bg-amber-500 text-white', fala: 'Selecionado: Lixo e Entulho' },
  { id: 'iluminacao', label: 'Poste Apagado', curto: 'Postes', cor: '#4f46e5', icon: '💡', border: 'border-indigo-400', activeBg: 'bg-indigo-600 text-white', fala: 'Selecionado: Iluminação ou Poste Apagado' },
  { id: 'buraco', label: 'Buraco na Rua', curto: 'Buracos', cor: '#ea580c', icon: '🕳️', border: 'border-orange-500', activeBg: 'bg-orange-600 text-white', fala: 'Selecionado: Buraco na Rua e Vias' },
  { id: 'esgoto', label: 'Esgoto / Água', curto: 'Esgoto', cor: '#0284c7', icon: '💧', border: 'border-sky-400', activeBg: 'bg-sky-600 text-white', fala: 'Selecionado: Vazamento de Água ou Esgoto' },
  { id: 'alagamento', label: 'Alagamento', curto: 'Alagamento', cor: '#0d9488', icon: '🌊', border: 'border-teal-400', activeBg: 'bg-teal-600 text-white', fala: 'Selecionado: Alagamento' },
  { id: 'arvore', label: 'Árvore / Galho', curto: 'Árvores', cor: '#16a34a', icon: '🌳', border: 'border-green-400', activeBg: 'bg-green-600 text-white', fala: 'Selecionado: Árvore caída ou galho perigoso' },
  { id: 'calcada', label: 'Calçada Quebrada', curto: 'Calçadas', cor: '#7c3aed', icon: '🚶', border: 'border-violet-400', activeBg: 'bg-violet-600 text-white', fala: 'Selecionado: Calçada quebrada ou sem acessibilidade' },
  { id: 'sinalizacao', label: 'Sinalização', curto: 'Sinalização', cor: '#e11d48', icon: '🚦', border: 'border-rose-400', activeBg: 'bg-rose-600 text-white', fala: 'Selecionado: Sinalização ou semáforo com defeito' }
]

// Categorias que o morador vê: todas ou só as ativas na marca (VITE_CATEGORIAS).
export const CATEGORIAS = MARCA.categorias.length
  ? TODAS_AS_CATEGORIAS.filter((categoria) => MARCA.categorias.includes(categoria.id))
  : TODAS_AS_CATEGORIAS

// Só a gestão pode reclassificar uma ocorrência como "Outro".
export const CATEGORIA_OUTRO = { id: 'outro', label: 'Outro', curto: 'Outro', cor: '#2563eb', icon: '📍' }

const POR_ID = Object.fromEntries([...TODAS_AS_CATEGORIAS, CATEGORIA_OUTRO].map((categoria) => [categoria.id, categoria]))

export function rotuloDaCategoria(id) {
  if (!id) return 'Não classificado'
  const chave = String(id).trim().toLowerCase()
  if (POR_ID[chave]) return POR_ID[chave].label
  // Valor desconhecido (dados antigos): mostra legível, com inicial maiúscula.
  return chave.charAt(0).toUpperCase() + chave.slice(1)
}

export const iconeDaCategoria = (id) => POR_ID[String(id ?? '').trim().toLowerCase()]?.icon || '📍'
