// Edge Function: apaga do Storage as fotos que não pertencem a nenhuma ocorrência.
//
// Fotos ficam órfãs quando um chamado é excluído, quando o envio falha depois do upload
// ou quando o gestor remove uma foto denunciada sem apagar o arquivo. Só apaga arquivos
// com mais de 7 dias (a fila offline pode demorar para completar um envio).
//
// Chamada toda semana pelo pg_cron (migração limpeza_fotos_orfas) com um token guardado
// no Vault ("limpeza_token"). O token é conferido no banco (token_limpeza_valido), então
// ele nunca precisa ser copiado para os segredos da função.

import { createClient } from 'npm:@supabase/supabase-js@2'

const LOTE = 100

Deno.serve(async (req) => {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  })

  const { data: autorizado } = await admin.rpc('token_limpeza_valido', { p_token: token })
  if (autorizado !== true) return new Response('não autorizado', { status: 401 })

  const simular = new URL(req.url).searchParams.get('simular') === '1'
  const { data: orfas, error } = await admin.rpc('fotos_orfas', { p_dias: 7, p_limite: 500 })
  if (error) return Response.json({ erro: error.message }, { status: 500 })

  const porBucket = new Map<string, string[]>()
  for (const { bucket, caminho } of orfas ?? []) {
    porBucket.set(bucket, [...(porBucket.get(bucket) ?? []), caminho])
  }

  let removidas = 0
  const falhas: string[] = []
  if (!simular) {
    for (const [bucket, caminhos] of porBucket) {
      for (let i = 0; i < caminhos.length; i += LOTE) {
        const { data, error: erroRemocao } = await admin.storage.from(bucket).remove(caminhos.slice(i, i + LOTE))
        if (erroRemocao) falhas.push(`${bucket}: ${erroRemocao.message}`)
        else removidas += data?.length ?? 0
      }
    }
  }

  return Response.json({ simulacao: simular, encontradas: orfas?.length ?? 0, removidas, falhas })
})
