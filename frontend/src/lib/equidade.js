// Painel de Equidade: compara como cada bairro é atendido (sem acesso à rede: fácil de testar).
//
// Medida principal: dos registros feitos há pelo menos `prazoDias`, quantos foram
// resolvidos dentro desse prazo. Registros mais novos ficam de fora, para não
// punir o bairro por um caso que ainda está no prazo.

const DIA_MS = 86_400_000

export const PRAZO_EQUIDADE_DIAS = 7
export const MINIMO_REGISTROS = 5

/** Data 'AAAA-MM-DD' (ou ISO) em milissegundos UTC; null se vazia ou inválida. */
function emMs(data) {
  if (!data) return null
  const ms = Date.parse(String(data).slice(0, 10))
  return Number.isNaN(ms) ? null : ms
}

function mediana(valores) {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(v.length / 2)
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2
}

/**
 * Calcula a equidade de atendimento a partir das linhas da view dados_abertos
 * ({ bairro, status, registrado_em, resolvido_em }).
 *
 * Devolve os bairros com pelo menos `minimoRegistros` registros elegíveis,
 * do pior para o melhor, o total da cidade e a diferença entre o melhor e o pior.
 */
export function calcularEquidade(linhas, { hoje = new Date(), prazoDias = PRAZO_EQUIDADE_DIAS, minimoRegistros = MINIMO_REGISTROS } = {}) {
  const agora = emMs(hoje.toISOString())
  const porBairro = new Map()

  for (const l of linhas || []) {
    const bairro = l.bairro?.trim()
    const registro = emMs(l.registrado_em)
    if (!bairro || registro === null) continue
    const idade = (agora - registro) / DIA_MS
    if (idade < prazoDias) continue

    const b = porBairro.get(bairro) || { bairro, elegiveis: 0, noPrazo: 0, diasResolucao: [], abertosMais30: 0 }
    b.elegiveis += 1
    const resolucao = l.status === 'resolvido' ? emMs(l.resolvido_em) : null
    if (resolucao !== null) {
      const dias = Math.max(0, (resolucao - registro) / DIA_MS)
      b.diasResolucao.push(dias)
      if (dias <= prazoDias) b.noPrazo += 1
    } else if (l.status !== 'resolvido' && idade > 30) {
      b.abertosMais30 += 1
    }
    porBairro.set(bairro, b)
  }

  const todos = [...porBairro.values()]
  const cidadeElegiveis = todos.reduce((s, b) => s + b.elegiveis, 0)
  const cidadeNoPrazo = todos.reduce((s, b) => s + b.noPrazo, 0)
  const cidade = {
    elegiveis: cidadeElegiveis,
    noPrazo: cidadeNoPrazo,
    percentual: cidadeElegiveis ? (cidadeNoPrazo / cidadeElegiveis) * 100 : null
  }

  const bairros = todos
    .filter((b) => b.elegiveis >= minimoRegistros)
    .map(({ diasResolucao, ...b }) => ({
      ...b,
      percentual: (b.noPrazo / b.elegiveis) * 100,
      medianaDias: mediana(diasResolucao),
      abaixoDaMedia: cidade.percentual !== null && (b.noPrazo / b.elegiveis) * 100 < cidade.percentual
    }))
    .sort((a, b) => a.percentual - b.percentual || b.elegiveis - a.elegiveis || a.bairro.localeCompare(b.bairro, 'pt-BR'))

  const diferenca =
    bairros.length >= 2
      ? { pior: bairros[0], melhor: bairros[bairros.length - 1], pontos: bairros[bairros.length - 1].percentual - bairros[0].percentual }
      : null

  return {
    bairros,
    cidade,
    diferenca,
    foraDaComparacao: todos.length - bairros.length,
    prazoDias,
    minimoRegistros
  }
}

/** Percentual inteiro com "%"; travessão se não houver dado. */
export function formatarPercentual(valor) {
  return valor === null || valor === undefined || Number.isNaN(valor) ? '—' : `${Math.round(valor)}%`
}
