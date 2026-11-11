// Edge Function: envia avisos push quando o status de uma ocorrência muda.
//
// Chamada pelo gatilho public.avisar_mudanca_de_status (pg_net) com { ocorrencia_id }.
// Não confia no corpo do pedido além do id: lê o status no banco e só avisa quem ainda
// não recebeu esse status (coluna ultimo_status_notificado), por isso chamadas repetidas
// ou externas não geram avisos falsos nem duplicados.
//
// Segredos (Supabase → Edge Functions → Secrets):
//   VAPID_PRIVATE_KEY  (gerada com `npx web-push generate-vapid-keys`; a pública está no código)
//   VAPID_SUBJECT (opcional, ex.: mailto:contato@exemplo.com)

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const ROTULOS: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  resolvido: 'Resolvido'
}

const MENSAGENS: Record<string, string> = {
  pendente: 'Sua ocorrência voltou para a fila de pendentes.',
  em_analise: 'Sua ocorrência está em análise pela gestão comunitária.',
  resolvido: 'Problema resolvido! Toque para ver o andamento e a foto da solução.'
}

const CHAVE_PUBLICA_VAPID = 'BG-hfZT9xDRBMovOj_6JJHHDIAuGBSW36IsG_yH0C9mtEuz8lBp3tpPuVC0MpF5usU2w4_j3xNU0B9E92nmYkqs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido' }, 405)

  let ocorrenciaId: string | undefined
  try {
    ocorrenciaId = (await req.json())?.ocorrencia_id
  } catch {
    return resposta({ erro: 'JSON inválido' }, 400)
  }
  if (!ocorrenciaId || !UUID.test(ocorrenciaId)) return resposta({ erro: 'ocorrencia_id inválido' }, 400)

  // A chave pública não é secreta (também está no app, em lib/push.js).
  const chavePublica = Deno.env.get('VAPID_PUBLIC_KEY') ?? CHAVE_PUBLICA_VAPID
  const chavePrivada = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!chavePublica || !chavePrivada) return resposta({ erro: 'Chaves VAPID não configuradas' }, 503)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:avisos@zeladordigital.vercel.app', chavePublica, chavePrivada)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  })

  const { data: ocorrencia, error: erroOcorrencia } = await supabase
    .from('ocorrencias')
    .select('id, status, categoria')
    .eq('id', ocorrenciaId)
    .maybeSingle()
  if (erroOcorrencia) return resposta({ erro: erroOcorrencia.message }, 500)
  if (!ocorrencia) return resposta({ erro: 'Ocorrência não encontrada' }, 404)

  const { data: inscricoes, error: erroInscricoes } = await supabase
    .from('inscricoes_push')
    .select('id, endpoint, p256dh, auth, ultimo_status_notificado')
    .eq('ocorrencia_id', ocorrenciaId)
  if (erroInscricoes) return resposta({ erro: erroInscricoes.message }, 500)

  const protocolo = `ZD-${ocorrenciaId.slice(0, 6).toUpperCase()}`
  const aviso = JSON.stringify({
    titulo: `Protocolo ${protocolo}: ${ROTULOS[ocorrencia.status] ?? ocorrencia.status}`,
    corpo: MENSAGENS[ocorrencia.status] ?? 'O status da sua ocorrência mudou.',
    url: `/?protocolo=${protocolo}`,
    tag: protocolo
  })

  let enviados = 0
  let removidos = 0
  let falhas = 0
  for (const inscricao of inscricoes ?? []) {
    if (inscricao.ultimo_status_notificado === ocorrencia.status) continue
    try {
      await webpush.sendNotification(
        { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
        aviso,
        { TTL: 60 * 60 * 24, urgency: 'normal' }
      )
      await supabase.from('inscricoes_push').update({ ultimo_status_notificado: ocorrencia.status }).eq('id', inscricao.id)
      enviados++
    } catch (erro) {
      const codigo = (erro as { statusCode?: number }).statusCode
      if (codigo === 404 || codigo === 410) {
        // O celular cancelou a inscrição (app desinstalado, permissão retirada): limpa.
        await supabase.from('inscricoes_push').delete().eq('id', inscricao.id)
        removidos++
      } else {
        falhas++
        console.error('Falha ao enviar aviso', codigo, (erro as Error).message)
      }
    }
  }

  return resposta({ protocolo, status: ocorrencia.status, enviados, removidos, falhas })
})
