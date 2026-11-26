// Órgãos responsáveis pelos chamados (mesmos ids da tabela public.orgaos).
//
// O banco preenche o órgão sozinho pela categoria (função orgao_da_categoria). Esta
// tabela repete a regra para o app funcionar também com dados antigos, sem a coluna.

export const ORGAOS = [
  { id: 'iluminacao', nome: 'Iluminação pública' },
  { id: 'limpeza', nome: 'Limpeza urbana' },
  { id: 'saneamento', nome: 'Saneamento e drenagem' },
  { id: 'vias', nome: 'Vias e calçadas' },
  { id: 'meio_ambiente', nome: 'Meio ambiente e arborização' },
  { id: 'transito', nome: 'Trânsito e sinalização' },
  { id: 'triagem', nome: 'Triagem geral' }
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
