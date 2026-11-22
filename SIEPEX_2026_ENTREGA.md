# VIII SIEPEX — IFPA Campus Ananindeua

**Tema:** "Ciência Delas: inclusão, ciência, tecnologia e sustentabilidade para transformar a Amazônia"

---

## 1. RESUMO SIMPLES

**Título (PT-BR):** ZELADOR DIGITAL COMUNITÁRIO: APLICATIVO WEB PROGRESSIVO ACESSÍVEL PARA ZELADORIA URBANA PARTICIPATIVA EM ANANINDEUA-PA

**Título (EN):** COMMUNITY DIGITAL CARETAKER: AN ACCESSIBLE PROGRESSIVE WEB APP FOR PARTICIPATORY URBAN MAINTENANCE IN ANANINDEUA, PARÁ, BRAZIL

**Autor:** Dante Dias Monteiro — IFPA Campus Ananindeua

**Modalidade:** Extensão e Inovação

**Resumo:**

<!-- RESUMO-INICIO -->
Nas cidades da Amazônia, buracos, postes apagados, lixo acumulado e vazamentos de esgoto afetam o cotidiano de quem vive nas periferias, mas os canais para relatar esses problemas costumam ser pouco acessíveis, exigem deslocamento ou não oferecem retorno ao cidadão. Em Ananindeua, no Pará, a conexão instável e a diversidade de letramento digital ampliam essa barreira. Este trabalho apresenta o Zelador Digital Comunitário, projeto independente de iniciativa comunitária que busca aproximar ciência, tecnologia e inclusão social da zeladoria urbana. O objetivo geral é oferecer uma ferramenta gratuita e acessível para que moradores registrem, localizem e acompanhem problemas urbanos. Os objetivos específicos são: simplificar o registro de ocorrências; garantir uso por pessoas com deficiência e com pouca familiaridade digital; funcionar mesmo sem internet; e dar transparência ao andamento de cada relato. A metodologia seguiu desenvolvimento iterativo de software livre, sob licença AGPL-3.0. O aplicativo foi construído como Progressive Web App (PWA) com React 19, Vite 8 e Tailwind CSS 4, dispensando lojas de aplicativos e podendo ser instalado na tela inicial do celular. Mapas usam Leaflet com dados do OpenStreetMap. O servidor utiliza Supabase, com banco Postgres e PostGIS, autenticação, armazenamento de fotos, funções de borda e regras de segurança em nível de linha. Um service worker com Workbox mantém cache offline, e o IndexedDB guarda uma fila de registros enviada automaticamente quando a rede retorna. A qualidade é verificada por testes automatizados com Vitest e Playwright e por integração contínua. Como resultados, o morador registra uma ocorrência em quatro passos: tipo de problema, foto pela câmera, localização por GPS e revisão. A foto é comprimida no próprio aparelho e a posição pode ser lida dos metadados da imagem. Um protocolo no formato ZD-XXXXXX é gerado na hora, mesmo sem conexão, e permite consulta pública. O cidadão recebe avisos no celular quando o status muda de pendente para em análise e resolvido. Um mapa comunitário reúne os relatos, e o painel de gestão prioriza casos pela matriz GUT, além de exportar dados em CSV e GeoJSON. A interface oferece compatibilidade com leitores de tela, áreas de toque ampliadas e um Modo Fácil com voz. Conclui-se que tecnologias web abertas, leves e acessíveis podem fortalecer a participação cidadã na Amazônia urbana, reduzir desigualdades no acesso a serviços e gerar dados georreferenciados úteis ao planejamento local sustentável.
<!-- RESUMO-FIM -->

**Palavras-chave:** Cidadania - Geoprocessamento - Amazônia - Inclusão social

---

## 2. ROTEIRO DOS 8 SLIDES

### Slide 1 — Capa
- **ZELADOR DIGITAL COMUNITÁRIO: APLICATIVO WEB PROGRESSIVO ACESSÍVEL PARA ZELADORIA URBANA PARTICIPATIVA EM ANANINDEUA-PA**
- Dante Dias Monteiro
- IFPA Campus Ananindeua — VIII SIEPEX
- Modalidade: Extensão e Inovação
- Visual: símbolo "Rota" do app + print da tela inicial

### Slide 2 — Introdução
- Problemas urbanos recorrentes: buracos, postes apagados, lixo, esgoto.
- Canais de relato pouco acessíveis e sem retorno ao cidadão.
- Barreiras locais: internet instável, baixo letramento digital, pessoas com deficiência.
- Pergunta: como a tecnologia pode incluir o morador na zeladoria da cidade?

### Slide 3 — Objetivos
- **Geral:** oferecer ferramenta gratuita e acessível para registrar, localizar e acompanhar problemas urbanos em Ananindeua-PA.
- **Específicos:**
  1. Registro simples em quatro passos.
  2. Acessibilidade (leitor de tela, toque ampliado, Modo Fácil com voz).
  3. Funcionamento offline com envio automático.
  4. Transparência via protocolo, consulta pública e avisos de status.

### Slide 4 — Metodologia
- **Stack:** React 19 + Vite 8 + Tailwind CSS 4; Leaflet/React Leaflet (OpenStreetMap).
- **PWA:** vite-plugin-pwa (Workbox), instalável, cache offline, fila em IndexedDB.
- **Supabase:** Postgres + PostGIS, Auth, Storage, Edge Function `notificar-status`, RLS.
- **Avisos:** gatilho no banco (pg_net) → Web Push (VAPID).
- **Qualidade:** Vitest, Playwright, ESLint, CI no GitHub; deploy na Vercel; licença AGPL-3.0.
- Visual: diagrama de arquitetura (celular ↔ Supabase).

### Slide 5 — Resultados: Interface e Funcionalidades
- Fluxo de relato: tipo → foto (câmera) → GPS → revisão.
- Foto comprimida no aparelho (~1280 px, WebP); GPS lido do EXIF.
- Protocolo `ZD-XXXXXX` gerado na hora, mesmo offline; consulta pública.
- Status: Pendente → Em análise → Resolvido, com aviso no celular.
- Mapa comunitário e painel com prioridade GUT; exportação CSV/GeoJSON; ofício A4 e boletim para WhatsApp.
- Visual: prints das telas Início, Nova ocorrência e Registros.

### Slide 6 — Discussão: Impacto Comunitário e Sustentabilidade na Amazônia
- Cidadão passa de espectador a agente da zeladoria.
- Inclusão: acessibilidade e modo offline atendem quem mais fica de fora.
- Dados georreferenciados abertos apoiam planejamento urbano.
- Sustentabilidade: lixo e esgoto mapeados ajudam a proteger igarapés e o ambiente urbano.
- Software livre: outras cidades amazônicas podem reutilizar e adaptar.

### Slide 7 — Conclusão e Trabalhos Futuros
- **Conclusão:** tecnologias web abertas, leves e acessíveis fortalecem a participação cidadã e reduzem desigualdades no acesso a serviços urbanos.
- **Trabalhos futuros:**
  - Testes de usabilidade com moradores e pessoas com deficiência.
  - Indicadores de tempo de resolução por bairro.
  - Novas categorias ambientais (alagamentos, queimadas urbanas).
  - Ampliação para outros municípios da Região Metropolitana de Belém.

### Slide 8 — Referências (ABNT)
- BRASIL. **Lei nº 13.146, de 6 de julho de 2015.** Institui a Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência). Brasília, DF: Presidência da República, 2015.
- BRASIL. **Lei nº 13.709, de 14 de agosto de 2018.** Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, DF: Presidência da República, 2018.
- IBGE – INSTITUTO BRASILEIRO DE GEOGRAFIA E ESTATÍSTICA. **Censo Demográfico 2022.** Rio de Janeiro: IBGE, 2023.
- MDN WEB DOCS. **Progressive web apps.** Mozilla, [s.d.]. Disponível em: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps. Acesso em: 17 nov. 2026.
- REACT. **React documentation.** Meta Open Source, [s.d.]. Disponível em: https://react.dev. Acesso em: 17 nov. 2026.
- SUPABASE. **Supabase documentation.** [S.l.], [s.d.]. Disponível em: https://supabase.com/docs. Acesso em: 17 nov. 2026.
- W3C – WORLD WIDE WEB CONSORTIUM. **Web Content Accessibility Guidelines (WCAG) 2.2.** [S.l.]: W3C, 2023. Disponível em: https://www.w3.org/TR/WCAG22/. Acesso em: 17 nov. 2026.
