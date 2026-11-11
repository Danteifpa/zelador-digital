# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas no fuso de Brasília.

## [Não lançado]

## [1.1.0] — 2026-11-11

Vizinhos confirmam problemas, registros offline chegam sozinhos e o código passa a ser testado automaticamente.

### Adicionado
- "Também vi este problema": vizinhos confirmam um chamado já aberto em vez de registrar outro igual. Aparece no aviso de chamado semelhante, no detalhe e na lista; no Painel, chamados com 3 ou mais confirmações sobem na prioridade GUT ([#23](https://github.com/Danteifpa/zelador-digital/pull/23)).
- Envio em segundo plano: no Android, registros feitos sem internet são enviados sozinhos quando a rede volta, mesmo com o app fechado, com o aviso "Registro enviado" ([#26](https://github.com/Danteifpa/zelador-digital/pull/26)).
- Testes automáticos com Vitest (47 testes) rodando no CI: estados, protocolo, prioridade GUT, "Também vi", fila offline, envio em segundo plano e ErrorBoundary ([#27](https://github.com/Danteifpa/zelador-digital/pull/27)).

### Alterado
- O CI bloqueia PRs com testes falhando ou avisos do verificador de código ([#27](https://github.com/Danteifpa/zelador-digital/pull/27), [#28](https://github.com/Danteifpa/zelador-digital/pull/28)).
- README convertido para UTF-8 ([#27](https://github.com/Danteifpa/zelador-digital/pull/27)).

### Corrigido
- Zerados os 13 problemas do verificador de código (ESLint) ([#28](https://github.com/Danteifpa/zelador-digital/pull/28)).
- Aviso de erro de seção com grafia do Brasil ("seção") ([#27](https://github.com/Danteifpa/zelador-digital/pull/27)).

### Segurança
- A função antiga `incrementar_apoio` (que deixava qualquer pessoa somar apoios sem limite) foi trocada por `apoiar_ocorrencia`: 1 apoio por aparelho e limite por hora por origem ([#23](https://github.com/Danteifpa/zelador-digital/pull/23)).
- Novo par de chaves dos avisos push; a chave privada fica só nos segredos do Supabase ([#24](https://github.com/Danteifpa/zelador-digital/pull/24), [#25](https://github.com/Danteifpa/zelador-digital/pull/25)).

## [1.0.0] — 2026-11-10

Primeira versão organizada do Zelador Digital, publicada em [zeladordigital.vercel.app](https://zeladordigital.vercel.app).

### Adicionado
- Assistente de registro em 4 passos com câmera, GPS e protocolo gerado no celular ([#2](https://github.com/Danteifpa/zelador-digital/pull/2)).
- Login dos gestores com Supabase Auth e regras de acesso (RLS) no banco ([#4](https://github.com/Danteifpa/zelador-digital/pull/4)).
- Modo offline completo: fila em IndexedDB, lista e mapa sem internet, aviso de versão nova, ícone próprio e atalhos do ícone ([#7](https://github.com/Danteifpa/zelador-digital/pull/7)).
- Avisos push ao morador quando o status do protocolo muda ([#11](https://github.com/Danteifpa/zelador-digital/pull/11)).
- Domínio oficial `zeladordigital.vercel.app` ([#5](https://github.com/Danteifpa/zelador-digital/pull/5)).

### Alterado
- Interface em português do Brasil ([#9](https://github.com/Danteifpa/zelador-digital/pull/9)).
- App mais leve em celulares simples: −30% no carregamento, foto comprimida uma só vez, zoom permitido ([#6](https://github.com/Danteifpa/zelador-digital/pull/6)).
- Estados unificados: Pendente → Em análise → Resolvido, com restrição no banco ([#8](https://github.com/Danteifpa/zelador-digital/pull/8)).
- Código reorganizado: tela inicial e Painel de Gestão divididos em componentes ([#1](https://github.com/Danteifpa/zelador-digital/pull/1), [#10](https://github.com/Danteifpa/zelador-digital/pull/10)).

### Corrigido
- Telas brancas em caso de erro (Error Boundaries) e perdas de fotos/registros na fila offline ([#3](https://github.com/Danteifpa/zelador-digital/pull/3)).

### Segurança
- Fechada a falha que permitia a qualquer pessoa alterar ou excluir ocorrências sem login; PIN fixo removido do código ([#4](https://github.com/Danteifpa/zelador-digital/pull/4)).

[Não lançado]: https://github.com/Danteifpa/zelador-digital/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Danteifpa/zelador-digital/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Danteifpa/zelador-digital/releases/tag/v1.0.0
