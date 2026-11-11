import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))
const { supabase } = await import('./supabase')
const { apoiarOcorrencia, idDoDispositivo, jaApoiei, textoConfirmacoes } = await import('./apoios')

const OCORRENCIA = '83803783-78f0-494c-97ff-3a79d97e5d8e'

describe('"Também vi este problema"', () => {
  it('escreve o total de confirmações', () => {
    expect(textoConfirmacoes(0)).toBeNull()
    expect(textoConfirmacoes(undefined)).toBeNull()
    expect(textoConfirmacoes(1)).toBe('1 vizinho confirmou')
    expect(textoConfirmacoes(4)).toBe('4 vizinhos confirmaram')
  })

  it('usa sempre o mesmo id do celular', () => {
    const id = idDoDispositivo()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(idDoDispositivo()).toBe(id)
  })

  it('envia o id do celular e lembra o apoio confirmado', async () => {
    supabase.rpc.mockResolvedValue({ data: { apoiado: true, total: 3 }, error: null })
    const resposta = await apoiarOcorrencia(OCORRENCIA)
    expect(resposta).toEqual({ apoiado: true, total: 3 })
    expect(supabase.rpc).toHaveBeenCalledWith('apoiar_ocorrencia', {
      p_ocorrencia_id: OCORRENCIA,
      p_dispositivo_id: idDoDispositivo()
    })
    expect(jaApoiei(OCORRENCIA)).toBe(true)
  })

  it('não marca como apoiado quando o servidor recusa por limite', async () => {
    supabase.rpc.mockResolvedValue({ data: { apoiado: false, total: 3, motivo: 'limite' }, error: null })
    await apoiarOcorrencia(OCORRENCIA)
    expect(jaApoiei(OCORRENCIA)).toBe(false)
  })
})
