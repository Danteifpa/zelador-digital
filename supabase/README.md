# Supabase — configuração do Zelador Digital

## Acesso dos gestores (substitui o PIN)

Faça os passos **por esta ordem e seguidos**. Entre o passo 3 e o passo 4, os gestores ficam alguns minutos sem conseguir alterar ocorrências, porque o app antigo ainda usa o PIN. O registo de ocorrências pelos cidadãos continua a funcionar durante todo o processo.

1. **Bloquear novos registos de contas.** Authentication → Sign In / Providers → desligar **"Allow new users to sign up"**. Assim só o administrador cria contas.
2. **Criar as contas dos 2 gestores.** Authentication → Users → **Add user → Create new user**: email, senha forte (12 ou mais caracteres) e marcar **Auto Confirm User**. Repetir para o segundo gestor.
3. **Correr o script.** SQL Editor → New query → colar [`migrations/20261110_gestores_e_rls.sql`](migrations/20261110_gestores_e_rls.sql) → **Run**. Depois, no mesmo editor, registar os gestores (trocar emails e nomes):

   ```sql
   insert into public.gestores (user_id, nome)
   select id, 'Nome do Gestor 1' from auth.users where email = 'gestor1@exemplo.com'
   on conflict (user_id) do nothing;

   insert into public.gestores (user_id, nome)
   select id, 'Nome do Gestor 2' from auth.users where email = 'gestor2@exemplo.com'
   on conflict (user_id) do nothing;
   ```

4. **Integrar o PR** no GitHub. A Vercel publica sozinha em cerca de 1 minuto.
5. **Testar:** abrir a aba Gestão, entrar com email e senha, e mudar o estado de uma ocorrência.

### Verificar

```sql
-- Deve listar exatamente 4 políticas
select policyname, cmd from pg_policies where tablename = 'ocorrencias';

-- Deve listar os 2 gestores
select g.nome, u.email from public.gestores g join auth.users u on u.id = g.user_id;
```

### Tarefas do dia a dia

| Situação | Como fazer |
| --- | --- |
| Gestor esqueceu a senha | Authentication → Users → abrir o utilizador → **Reset password** (ou definir uma senha nova) |
| Novo gestor | Criar a conta (passo 2) e correr o `insert` do passo 3 com o email dele |
| Retirar o acesso a alguém | `delete from public.gestores where user_id = (select id from auth.users where email = '...');` |

### O que o script muda

| Quem | Ler ocorrências | Registar (sempre "pendente") | Alterar / apagar |
| --- | --- | --- | --- |
| Cidadão (sem login) | Sim | Sim | **Não** |
| Conta com login que não é gestora | Sim | Sim | **Não** |
| Gestor | Sim | Sim | Sim |

O script também cria a função `consultar_protocolo`. Com ela, a busca de protocolo devolve uma única ocorrência em vez de descarregar até 1000 linhas.

### Desfazer (emergência)

Se for preciso voltar ao comportamento anterior enquanto se investiga um problema:

```sql
create policy "temporario acesso total" on public.ocorrencias for all to anon using (true) with check (true);
```

Isto volta a deixar qualquer pessoa alterar e apagar ocorrências. Remova a política assim que possível:

```sql
drop policy "temporario acesso total" on public.ocorrencias;
```
