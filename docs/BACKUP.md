# Backup e restauração do banco

## O que é copiado

Toda segunda-feira o GitHub Actions ([`.github/workflows/backup.yml`](../.github/workflows/backup.yml))
faz uma cópia do banco de produção (esquemas `public`, `auth`, `storage` e `vault`), **criptografa** com
AES-256 e guarda o arquivo por 90 dias em *Actions → Backup do banco → Artifacts*.

As **fotos** ficam no Storage do Supabase e não entram nessa cópia (só a lista de arquivos).

## Configurar (uma vez)

1. No Supabase: **Connect → Session pooler**. Copie a conexão (começa com `postgresql://postgres.`) e
   troque `[YOUR-PASSWORD]` pela senha do banco.
2. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = a conexão do passo 1
   - `BACKUP_SENHA` = uma senha longa só para os backups. **Guarde-a fora do GitHub** (gerenciador de
     senhas): sem ela não dá para abrir nenhum backup.
3. Em **Actions → Backup do banco → Run workflow**, rode uma vez para testar.

## Restaurar

```bash
gpg --decrypt zelador-digital-AAAA-MM-DD.dump.gpg > zelador.dump   # pede a BACKUP_SENHA
pg_restore --list zelador.dump | head                               # confere o conteúdo
# Restaurar só as ocorrências num banco novo (exemplo):
pg_restore --dbname "postgresql://..." --data-only --table=ocorrencias zelador.dump
```

Restaure sempre primeiro num projeto de teste, nunca direto em produção.
