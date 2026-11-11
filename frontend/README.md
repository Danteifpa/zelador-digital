# Zelador Digital — frontend

App React + Vite (PWA). Visão geral, capturas de tela e arquitetura no [README principal](../README.md).

```bash
npm ci
npm run dev       # http://localhost:5173
npm run build     # dist/ com service worker
npm run lint
```

## Onde está cada coisa

| Pasta / arquivo | Conteúdo |
| --- | --- |
| `src/App.jsx` | Estado principal, envio de ocorrências, fila offline, telas do morador |
| `src/components/ReportModal.jsx` | Assistente de registro em 4 passos |
| `src/components/PainelGestor.jsx` | Estado e ações do Painel de Gestão |
| `src/components/gestao/` | Partes visuais do painel (lista, mapa GUT, ofício, boletim...) |
| `src/lib/status.js` | Estados das ocorrências (único lugar com os nomes e cores) |
| `src/lib/filaOffline.js`, `armazenamento.js` | Fila offline e cópia da lista em IndexedDB |
| `src/lib/push.js`, `public/push-sw.js` | Avisos push (inscrição e exibição) |
| `src/lib/protocolo.js` | UUID gerado no celular e protocolo `ZD-XXXXXX` |
| `src/lib/imageOptimizer.js` | Compressão única da foto |
| `vite.config.js` | PWA (Workbox), cache de mapas e fotos |
