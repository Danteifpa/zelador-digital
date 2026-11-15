import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { rpc: vi.fn() } }))
const { supabase } = await import('./supabase')
const { idDoDispositivo } = await import('./apoios')
const {
  caminhoNoStorage,
  denunciarOcorrencia,
  ehLimiteDeRegistros,
  estaDenunciada,
  jaDenunciei,
  mensagemDaDenuncia,
  MENSAGENS_DENUNCIA
} = await import('./moderacao')

const OCORRENCIA = '0b6a3c2e-1f7d-4e55-9a10-3c4d5e6f7a8b'

describe('moderação', () => {
  it('reconhece o erro de limite de registros do banco', () => {
    expect(ehLimiteDeRegistros({ message: 'LIMITE_REGISTROS', code: 'P0001' })).toBe(true)
    expect(ehLimiteDeRegistros(new Error('LIMITE_REGISTROS'))).toBe(true)
    expect(ehLimiteDeRegistros({ message: 'duplicate key', code: '23505' })).toBe(false)
    expect(ehLimiteDeRegistros(null)).toBe(false)
  })

  it('envia a denúncia com o id do celular e lembra que denunciou', async () => {
    supabase.rpc.mockResolvedValue({ data: { denunciado: true, oculta: false }, error: null })
    expect(jaDenunciei(OCORRENCIA)).toBe(false)
    await denunciarOcorrencia(OCORRENCIA, 'pessoa_ou_placa')
    expect(supabase.rpc).toHaveBeenCalledWith('denunciar_ocorrencia', {
      p_ocorrencia_id: OCORRENCIA,
      p_dispositivo_id: idDoDispositivo(),
      p_motivo: 'pessoa_ou_placa'
    })
    expect(jaDenunciei(OCORRENCIA)).toBe(true)
  })

  it('não lembra a denúncia barrada pelo limite', async () => {
    const outra = '1b6a3c2e-1f7d-4e55-9a10-3c4d5e6f7a8b'
    supabase.rpc.mockResolvedValue({ data: { denunciado: false, motivo: 'limite' }, error: null })
    await denunciarOcorrencia(outra, 'foto_impropria')
    expect(jaDenunciei(outra)).toBe(false)
  })

  it('escolhe a mensagem certa', () => {
    expect(mensagemDaDenuncia({ denunciado: true, oculta: true })).toBe(MENSAGENS_DENUNCIA.oculta)
    expect(mensagemDaDenuncia({ denunciado: true, oculta: false })).toBe(MENSAGENS_DENUNCIA.denunciado)
    expect(mensagemDaDenuncia({ denunciado: false, motivo: 'repetido' })).toBe(MENSAGENS_DENUNCIA.repetido)
    expect(mensagemDaDenuncia(undefined)).toBe(MENSAGENS_DENUNCIA.erro)
  })

  it('separa os registros denunciados', () => {
    expect(estaDenunciada({ total_denuncias: 1 })).toBe(true)
    expect(estaDenunciada({ total_denuncias: 0, foto_oculta: true })).toBe(true)
    expect(estaDenunciada({ total_denuncias: 0, foto_oculta: false })).toBe(false)
  })

  it('acha o caminho da foto no Storage', () => {
    const url = 'https://xtskjevtskjjlyusccxy.supabase.co/storage/v1/object/public/ocorrencias/ocorrencias/1731_abc.jpg'
    expect(caminhoNoStorage(url)).toBe('ocorrencias/1731_abc.jpg')
    expect(caminhoNoStorage('blob:http://localhost/123')).toBeNull()
    expect(caminhoNoStorage(null)).toBeNull()
  })
})
