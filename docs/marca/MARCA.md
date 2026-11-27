# Marca Rua Viva

Registro de autoria, regras de uso e situação no INPI da marca **Rua Viva** (antes Zelador Digital e Bora Zelar).

> Este documento organiza fatos para um pedido de registro. Não é parecer jurídico: antes de depositar, vale a revisão de um especialista em propriedade industrial.

## Autoria e datas

| Item | Informação |
| --- | --- |
| Autor do nome, do símbolo e do logotipo | Dante Dias Monteiro |
| Primeira versão do símbolo (rua + pino, estilo "Rota") | 15/11/2026, commit `95587e1` (PR #50) |
| Nome "Rua Viva" e símbolo de rua em curva | 27/11/2026, commit `efc9e8d` (PR #62) |
| Desenho | Feito do zero em SVG neste repositório (`frontend/src/components/Logotipo.jsx`); não usa imagem de banco de imagens nem ícone de terceiros |

O histórico do Git, com data e autor de cada mudança, serve como prova de anterioridade da criação.

## Elementos da marca

- **Símbolo:** quadrado azul de cantos arredondados; dentro, uma rua branca em curva com faixa tracejada, terminando num pino laranja (o ponto do problema).
- **Nome:** "Rua" em peso normal e "**Viva**" em negrito azul.
- **Cores:** azul `#1D4ED8`, laranja `#F59E0B`, texto `#0F172A`.
- **Fonte:** Sora (pesos 400 e 800), licença **SIL Open Font License 1.1**, que permite usar a fonte em logotipos e marcas, inclusive para fins comerciais. A fonte não pode ser vendida sozinha; isso não afeta a marca.

## Arquivos

| Arquivo | Uso |
| --- | --- |
| [`rua-viva-inpi-945.jpg`](rua-viva-inpi-945.jpg) | Marca mista (símbolo + nome) em 945 × 945 px (8 × 8 cm a 300 dpi), fundo branco, para o pedido no INPI |
| [`rua-viva-horizontal.png`](rua-viva-horizontal.png) | Logotipo horizontal, fundo transparente |
| [`simbolo.svg`](simbolo.svg) · [`simbolo-1024.png`](simbolo-1024.png) | Só o símbolo |

## Buscas no INPI (busca.inpi.gov.br, pesquisa de marca por nome)

| Data | Termo | Resultado |
| --- | --- | --- |
| 27/11/2026 | `bora zelar` | Nenhum registro |
| 27/11/2026 | `zelar` | 13 processos, incluindo pedido "ZELAR" na **classe 42** (software) em exame desde 30/03/2026 e registro em vigor na classe 37. Motivo para descartar "Bora Zelar" |
| 27/11/2026 | `rua viva` | Nenhum registro |
| 27/11/2026 | `bora bairro`, `egua rua` | Nenhum registro |
| 27/11/2026 | `egua` | 1 registro em vigor, classe 30 (alimentos) |
| 27/11/2026 | `mare` | 50 processos |

Não foi feita a busca de figura (código de Viena). Rua e pino de mapa são elementos comuns: ninguém pode se apropriar deles sozinhos, mas o conjunto (forma, cores e nome) é que dá distinção à marca.

## Próximos passos para registrar

1. Revisão por especialista em propriedade industrial (busca de figura e de nomes parecidos, como "Rua Viva" com grafias diferentes).
2. Pedido no e-Marcas do INPI como **marca mista**, usando `rua-viva-inpi-945.jpg`.
3. Classes sugeridas: **9** (aplicativo e software para baixar) e **42** (software como serviço e plataforma on-line).
4. Guardar o número do processo e acompanhar a Revista da Propriedade Industrial.

## Uso por terceiros

O código do app é AGPL-3.0, mas o nome **Rua Viva** e a identidade visual **não** fazem parte da licença (ver `README.md`). Prefeituras que usam a versão configurável (`VITE_MARCA_*`) aparecem com o nome e a marca delas.
