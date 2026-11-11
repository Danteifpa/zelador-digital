# Supabase — banco, permissões e avisos

Tudo o que roda no Supabase do Zelador Digital está versionado nesta pasta.

## Migrações (aplicar em ordem)

| Arquivo | O que faz |
| --- | --- |
| [`20261110_gestores_e_rls.sql`](migrations/20261110_gestores_e_rls.sql) | Tabela `gestores`, função `eh_gestor()`, regras de acesso (RLS) em `ocorrencias`, vista só de leitura e consulta de protocolo |
| [`20261111_estados_unificados.sql`](migrations/20261111_estados_unificados.sql) | Estados `pendente` / `em_analise` / `resolvido` com restrição `CHECK` |
| [`20261111_notificacoes_push.sql`](migrations/20261111_notificacoes_push.sql) | Tabela `inscricoes_push` e gatilho que chama a função de avisos |
| [`20261111_textos_pt_br.sql`](migrations/20261111_textos_pt_br.sql) | Troca a descrição padrão antiga ("registada") por "registrada" |

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
| Gestor esqueceu a senha | Authentication → Users → abrir o usuário → **Reset password** |
| Retirar o acesso | `delete from public.gestores where user_id = (select id from auth.users where email = '...');` |

## Quem pode o quê

| Quem | Ler ocorrências | Registrar (sempre `pendente`) | Alterar / excluir |
| --- | --- | --- | --- |
| Morador (sem login) | sim | sim | não |
| Conta logada que não é gestora | sim | sim | não |
| Gestor | sim | sim | sim |

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
