// Órgãos responsáveis pelos chamados (mesmos ids da tabela public.orgaos).
//
// O banco preenche o órgão sozinho pela categoria (função orgao_da_categoria). Esta
// tabela repete a regra para o app funcionar também com dados antigos, sem a coluna.

// prazoDias: prazo padrão de atendimento (mesmo valor de public.orgaos.prazo_dias).
export const ORGAOS = [
  { id: 'iluminacao', nome: 'Iluminação pública', prazoDias: 7 },
  { id: 'limpeza', nome: 'Limpeza urbana', prazoDias: 5 },
  { id: 'saneamento', nome: 'Saneamento e drenagem', prazoDias: 10 },
  { id: 'vias', nome: 'Vias e calçadas', prazoDias: 15 },
  { id: 'meio_ambiente', nome: 'Meio ambiente e arborização', prazoDias: 10 },
  { id: 'transito', nome: 'Trânsito e sinalização', prazoDias: 7 },
  { id: 'triagem', nome: 'Triagem geral', prazoDias: 3 }
]

const ORGAO_POR_CATEGORIA = {
  iluminacao: 'iluminacao',
  lixo: 'limpeza',
  esgoto: 'saneamento',
  alagamento: 'saneamento',
  buraco: 'vias',
  calcada: 'vias',
  arvore: 'meio_ambiente',
  sinalizacao: 'transito'
}

const NOME_POR_ID = Object.fromEntries(ORGAOS.map((o) => [o.id, o.nome]))
const PRAZO_POR_ID = Object.fromEntries(ORGAOS.map((o) => [o.id, o.prazoDias]))

/** Órgão padrão de uma categoria; o que não tem dono vai para a triagem. */
export function orgaoDaCategoria(categoria) {
  return ORGAO_POR_CATEGORIA[String(categoria ?? '').trim().toLowerCase()] || 'triagem'
}

/** Órgão do chamado: o que está no banco ou, em dado antigo, o da categoria. */
export function orgaoDoChamado(item) {
  return item?.orgao && NOME_POR_ID[item.orgao] ? item.orgao : orgaoDaCategoria(item?.categoria)
}

export function nomeDoOrgao(id) {
  return NOME_POR_ID[id] || 'Triagem geral'
}

/** Filtra a lista por órgão; 'todos' devolve tudo. */
export function filtrarPorOrgao(lista, orgao) {
  if (!orgao || orgao === 'todos') return lista
  return lista.filter((item) => orgaoDoChamado(item) === orgao)
}

/** Prazo de atendimento do órgão, em dias. */
export function prazoDoOrgao(id) {
  return PRAZO_POR_ID[id] ?? PRAZO_POR_ID.triagem
}
