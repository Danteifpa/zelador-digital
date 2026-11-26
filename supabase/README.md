# Supabase — banco, permissões e avisos

Tudo o que roda no Supabase do Zelador Digital está versionado nesta pasta.

## Migrações (aplicar em ordem)

| Arquivo | O que faz |
| --- | --- |
| [`20261110233504_gestores_e_rls.sql`](migrations/20261110233504_gestores_e_rls.sql) | Tabela `gestores`, função `eh_gestor()`, regras de acesso (RLS) em `ocorrencias`, vista só de leitura e consulta de protocolo |
| [`20261111002456_estados_unificados.sql`](migrations/20261111002456_estados_unificados.sql) | Estados `pendente` / `em_analise` / `resolvido` com restrição `CHECK` |
| [`20261111004515_notificacoes_push.sql`](migrations/20261111004515_notificacoes_push.sql) | Tabela `inscricoes_push` e gatilho que chama a função de avisos |
| [`20261111123327_textos_pt_br.sql`](migrations/20261111123327_textos_pt_br.sql) | Troca a descrição padrão antiga ("registada") por "registrada" |
| [`20261111124716_apoios.sql`](migrations/20261111124716_apoios.sql) | "Também vi este problema": tabela `apoios`, função `apoiar_ocorrencia` (1 por aparelho, limite por hora) e remove `incrementar_apoio` |
| [`20261115015856_moderacao.sql`](migrations/20261115015856_moderacao.sql) | Moderação: limite de 8 registros/hora e 20/dia por conexão (gestores isentos), denúncia de fotos (`denunciar_ocorrencia`, foto oculta com 3 denúncias) e gestores podem apagar fotos do Storage |
| [`20261115022825_categorias.sql`](migrations/20261115022825_categorias.sql) | Lista fechada de categorias, com as novas alagamento, árvore, calçada e sinalização |
| [`20261115023735_erros_app.sql`](migrations/20261115023735_erros_app.sql) | Registro de erros do app (`registrar_erro`, sem dados pessoais, limite por hora) visível só para gestores |
| [`20261115024033_bairros_transparencia.sql`](migrations/20261115024033_bairros_transparencia.sql) | Tabela `bairros`, bairro automático e `resolvido_em` nas ocorrências, views públicas `transparencia_bairros` e `dados_abertos`. Carga dos limites: [`dados/carregar_bairros.sql`](dados/carregar_bairros.sql) |
| [`20261115024747_mfa_gestores.sql`](migrations/20261115024747_mfa_gestores.sql) | `eh_gestor()` exige sessão com código (aal2) para gestores que ativaram a verificação em duas etapas |
| [`20261115060000_limpeza_fotos_orfas.sql`](migrations/20261115060000_limpeza_fotos_orfas.sql) | Limpeza semanal (pg_cron, domingo 3h) das fotos sem ocorrência há mais de 7 dias, pela Edge Function `limpar-fotos-orfas` |
| [`20261115070000_pesquisa_sus.sql`](migrations/20261115070000_pesquisa_sus.sql) | Questionário de usabilidade SUS anônimo (`registrar_pesquisa_sus`, 3 por dia por conexão), lido só por gestores |
| [`20261115164000_search_path_pontuacao_sus.sql`](migrations/20261115164000_search_path_pontuacao_sus.sql) | `search_path` fixo em `pontuacao_sus` (alerta do linter) |
| [`20261126120000_orgaos.sql`](migrations/20261126120000_orgaos.sql) | Encaminhamento por órgão: tabela `orgaos`, órgão automático pela categoria, `gestores.orgao` e regra para gestor de órgão só alterar o que é do órgão dele |

Cada arquivo roda numa transação e pode ser aplicado mais de uma vez. Para aplicar: **SQL Editor → New query → colar → Run**.

## Edge Function `notificar-status`

Envia os avisos push quando o status de uma ocorrência muda ([código](functions/notificar-status/index.ts)). Publicada com `verify_jwt = false`, porque é chamada pelo gatilho do banco; só recebe o id da ocorrência e confirma tudo no banco.

**Segredo necessário** (Edge Functions → Secrets):

| Nome | Valor |
| --- | --- |
| `VAPID_PRIVATE_KEY` | chave privada gerada com `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` *(opcional)* | contato, ex.: `mailto:contato@exemplo.com` |

A chave pública correspondente está no código da função e em `frontend/src/lib/push.js`. Se trocar o par de chaves, atualize os dois lugares; as inscrições antigas deixam de funcionar e os moradores precisam ativar os avisos de novo.

## Gestores

Contas são criadas só pelo administrador (o registro público está desligado em **Authentication → Sign In / Providers → Allow new users to sign up**).

**Adicionar um gestor**

1. **Authentication → Users → Add user → Create new user**: email, senha forte e **Auto Confirm User**.
2. No SQL Editor:
   ```sql
   insert into public.gestores (user_id, nome)
   select id, 'Nome do gestor' from auth.users where email = 'email@exemplo.com'
   on conflict (user_id) do nothing;
   ```

| Situação | Como fazer |
| --- | --- |
| Ligar o gestor a um órgão | `update public.gestores set orgao = 'iluminacao' where user_id = (select id from auth.users where email = '...');` (ids em `select * from public.orgaos`) |
| Voltar a gestor geral | `update public.gestores set orgao = null where user_id = ...;` |
| Gestor esqueceu a senha | Authentication → Users → abrir o usuário → **Reset password** |
| Retirar o acesso | `delete from public.gestores where user_id = (select id from auth.users where email = '...');` |

## Quem pode o quê

| Quem | Ler ocorrências | Registrar (sempre `pendente`) | Alterar / excluir |
| --- | --- | --- | --- |
| Morador (sem login) | sim | sim | não |
| Conta logada que não é gestora | sim | sim | não |
| Gestor geral (sem órgão) | sim | sim | sim, qualquer chamado |
| Gestor de um órgão | sim | sim | só os chamados do órgão dele; pode encaminhar para outro órgão |

## Verificação rápida

```sql
-- 4 regras em ocorrencias
select policyname, cmd from pg_policies where tablename = 'ocorrencias';

-- gestores cadastrados
select g.nome, u.email from public.gestores g join auth.users u on u.id = g.user_id;

-- só os 3 estados oficiais
select status, count(*) from public.ocorrencias group by 1;

-- últimas chamadas à função de avisos (status 200 = ok)
select id, status_code, content from net._http_response order by id desc limit 5;
```
