// Contrato único dos estados de uma ocorrência.
//
// Na base de dados só existem três valores (garantidos por uma CHECK constraint):
//   pendente → em_analise → resolvido
// Todos os ecrãs leem o estado através destas funções, que também aceitam as grafias antigas
// ('em analise', 'em_andamento', 'oficiada', 'concluido', ...) para registos ainda não migrados
// ou guardados offline numa versão anterior.

export const ESTADOS = {
  pendente: {
    rotulo: 'Pendente',
    etapa: 1,
    classeEtiqueta: 'bg-amber-50 text-amber-700 border-amber-200',
    classeBotao: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
  },
  em_analise: {
    rotulo: 'Em análise',
    etapa: 2,
    classeEtiqueta: 'bg-sky-50 text-sky-700 border-sky-200',
    classeBotao: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
  },
  resolvido: {
    rotulo: 'Resolvido',
    etapa: 3,
    classeEtiqueta: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    classeBotao: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
  }
}

export const ORDEM_ESTADOS = ['pendente', 'em_analise', 'resolvido']

const SINONIMOS = {
  'em analise': 'em_analise',
  'em análise': 'em_analise',
  em_andamento: 'em_analise',
  'em andamento': 'em_analise',
  oficiada: 'em_analise',
  concluido: 'resolvido',
  concluído: 'resolvido',
  resolvida: 'resolvido'
}

// Todos os valores que, na base, significam "ainda por resolver" (inclui grafias antigas).
export const VALORES_EM_ABERTO = ['pendente', 'em_analise', ...Object.keys(SINONIMOS).filter((k) => SINONIMOS[k] === 'em_analise')]

export function normalizarEstado(estado) {
  const chave = String(estado ?? '').trim().toLowerCase()
  if (!chave) return 'pendente'
  if (ESTADOS[chave]) return chave
  return SINONIMOS[chave] || 'pendente'
}

export const estaResolvido = (estado) => normalizarEstado(estado) === 'resolvido'
export const etapaDoEstado = (estado) => ESTADOS[normalizarEstado(estado)].etapa
export const rotuloDoEstado = (estado) => ESTADOS[normalizarEstado(estado)].rotulo
export const classeEtiquetaDoEstado = (estado) => ESTADOS[normalizarEstado(estado)].classeEtiqueta
