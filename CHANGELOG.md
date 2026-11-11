# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas no fuso de Brasília.

## [Não lançado]

### Adicionado
- "Também vi este problema": vizinhos confirmam um chamado já aberto em vez de registrar outro igual. Aparece no aviso de chamado semelhante, no detalhe e na lista; no Painel, chamados com 3 ou mais confirmações sobem na prioridade GUT.

### Segurança
- A função antiga `incrementar_apoio` (que deixava qualquer pessoa somar apoios sem limite) foi trocada por `apoiar_ocorrencia`: 1 apoio por aparelho e limite por hora por origem.

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

[1.0.0]: https://github.com/Danteifpa/zelador-digital/releases/tag/v1.0.0
