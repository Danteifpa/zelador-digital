# Como contribuir

Obrigado por querer melhorar o Zelador Digital! Este guia explica como propor mudanças.

## Antes de começar

- Procure nas [issues](https://github.com/Danteifpa/zelador-digital/issues) se o assunto já existe.
- Para mudanças grandes, abra uma issue primeiro para combinarmos a abordagem.
- Falhas de segurança **não** vão em issue pública: veja [`SECURITY.md`](SECURITY.md).

## Ambiente

```bash
cd frontend
npm ci
npm run dev
```

Use Node.js 22 (`.nvmrc`). Detalhes no [README](README.md#como-rodar-localmente).

## Fluxo de trabalho

1. Crie um branch a partir da `main` com um prefixo:
   - `feat/` nova funcionalidade · `fix/` correção · `perf/` desempenho
   - `refactor/` reorganização sem mudar comportamento · `docs/` documentação · `i18n/` textos
2. Faça commits pequenos, com mensagem no formato `tipo: descrição` (ex.: `fix: fila offline não perde fotos`).
3. Rode antes de abrir o PR:
   ```bash
   npm test
   npm run build
   npm run lint
   ```
4. Abra o pull request preenchendo o modelo (o que mudou, como testar, capturas de tela se mexer na interface).
5. Cada PR ganha um link de prévia da Vercel; ao ser integrado na `main`, o deploy é automático.

## Convenções

- **Textos da interface em português do Brasil** ("registrar", "celular", "tela").
- **Acessibilidade**: botões com área de toque ≥ 44 px, `aria-label` em ícones, foco visível, nada de bloquear zoom.
- **Estados das ocorrências**: use sempre `lib/status.js` (`pendente`, `em_analise`, `resolvido`). O banco recusa outros valores.
- **Celulares simples**: evite dependências pesadas no carregamento inicial; carregue telas grandes com `React.lazy`.
- **Banco de dados**: toda mudança no Supabase vira um arquivo em `supabase/migrations/AAAAMMDD_descricao.sql`, que pode ser aplicado mais de uma vez sem erro. Nunca dê permissão de `update`/`delete` ao papel `anon`.
- **Segredos** nunca entram no repositório (chave privada VAPID, chave de serviço do Supabase).

## Código de conduta

Seja respeitoso e construtivo. Este é um projeto comunitário: críticas ao código são bem-vindas, ataques a pessoas não.
