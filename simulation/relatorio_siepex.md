# Relatório da simulação de 7 dias em Ananindeua — motor MiroFish (VIII SIEPEX)

> **Leia antes de citar.** Dados gerados pelo **motor real do MiroFish** (simulação `sim_a1255520dedd`), com 15 cidadãos e 2 gestores **fictícios** descritos em `experimento_ananindeua_7dias.json`. Não são dados de campo nem evidência de uso real do app. O MiroFish simula **interação social** (publicar, comentar, curtir em duas redes simuladas): ele **não mede** funil de registro, abandono por passo nem tempo de resolução. Essas métricas, que existiam no modelo de regras anterior, **não** aparecem aqui. As falas dos agentes são texto gerado por LLM e saíram majoritariamente em chinês (idioma-padrão dos prompts do motor).

## Como foi rodado

| Item | Valor |
|---|---|
| Motor | MiroFish (backend local) + OASIS, memória em grafo Zep Cloud |
| Semente | `experimento_ananindeua_7dias.json` convertido em documento-semente (`rodar_mirofish.py`) |
| Período simulado | 168 h (7 dias), 60 min por rodada |
| Rodadas executadas | 28 (limite imposto por `max_rounds=28`, por custo/cota do LLM) |
| Plataformas | Twitter e Reddit simulados em paralelo |
| Entidades-agente geradas | 24 (o grafo extraiu cidadãos, gestores e bairros) |
| LLM | Gemini via API compatível com OpenAI: `gemini-3-flash-preview` (grafo, perfis, simulação) e `gemini-3.1-flash-lite` (texto do relatório, após a cota gratuita diária do primeiro acabar) |
| Término | 2026-11-20T14:29:46.163125 (status `completed`) |

## Dados medidos

Total de ações: **41** (Twitter 19, Reddit 22). Agentes que agiram: **9** de 24. Rodadas com alguma ação: 3 de 28 (rodadas 0 a 8).

| Tipo de ação | Quantidade |
|---|---|
| CREATE_POST | 34 |
| LIKE_POST | 4 |
| CREATE_COMMENT | 2 |
| QUOTE_POST | 1 |

| Agente | Ações |
|---|---|
| C10 | 10 |
| Coqueiro (BR-316) | 4 |
| C13 | 4 |
| Águas Lindas | 4 |
| Zelador Digital | 4 |
| C07 | 4 |
| C14 | 4 |
| Gestor comunitário B | 4 |
| C06 | 3 |

| Plataforma | Ações |
|---|---|
| reddit | 22 |
| twitter | 19 |

Observação: ações concentradas em poucas rodadas e em poucos agentes. Com 41 ações, diferenças entre agentes ou plataformas são ruído, não efeito.

## Relatório gerado pelo MiroFish (ReportAgent)

### Relatório de Previsão: Impacto do Zelador Digital em Ananindeua (PA)

> A simulação revela que a eficácia da gestão urbana digital depende menos da tecnologia de registro e mais da capacidade de resposta dos gestores frente à saturação de demandas em bairros de alta densidade.

---

## Dinâmica de Engajamento e Comportamento dos Cidadãos

A dinâmica de engajamento dos cidadãos em Ananindeua, conforme observado na simulação de 7 dias, demonstra que a eficácia da gestão urbana digital está intrinsecamente ligada à resiliência técnica do aplicativo e à acessibilidade da interface para diferentes perfis demográficos.

**Acessibilidade como Pilar de Inclusão**

A segmentação dos usuários entre o modo padrão e o "Modo Fácil" revelou-se um diferencial estratégico para a participação ativa de cidadãos de faixas etárias mais elevadas. Usuários como C13 (63 anos) e C14 (67 anos), ao utilizarem o "Modo Fácil", beneficiaram-se de um design focado na redução de barreiras cognitivas e motoras:

> "No ReportModal.jsx, o Modo Fácil fala cada passo em voz alta e usa alvos de toque maiores."

Essa abordagem, integrada ao fluxo de registro de 4 passos, permite que o cidadão mantenha o engajamento mesmo em condições de rede instáveis, garantindo que a intenção de reportar não seja abandonada por frustração técnica.

**Resiliência Técnica e Comportamento Offline**

A infraestrutura do aplicativo, baseada no `sw.js` e no uso de `IndexedDB`, atua como um facilitador silencioso do engajamento. Em bairros onde a conectividade é um desafio constante, como Icuí-Guajará e Águas Lindas, a capacidade de registrar problemas sem uma conexão imediata é fundamental:

> "O sw.js coloca registros sem rede na fila offline no IndexedDB."

A simulação aponta que a tecnologia de *Background Sync* no Chrome/Android é o ponto de virada para a eficácia do sistema, pois assegura que o registro, uma vez iniciado, seja concluído assim que a rede estiver disponível. A geração de um protocolo local (`protocolo ZD-XXXXXX`) mesmo sem internet confere ao cidadão a sensação de que sua demanda foi registrada, aumentando a confiança na ferramenta.

**Dinâmica de Validação e Priorização Coletiva**

O engajamento dos cidadãos não se limita ao registro individual, mas estende-se à validação coletiva através da funcionalidade "Também vi". Este comportamento é capturado pelo `PainelGestor.jsx` para alimentar a lógica de priorização GUT (Gravidade, Urgência, Tendência), onde o engajamento coletivo eleva a criticidade das demandas:

> "Tendência 5 para 3 ou mais 'Também vi', 4 para vizinho a até 500 m ou mês chuvoso (dez-mai) e 3 caso contrário."

Essa estrutura cria um ciclo de feedback onde a participação do cidadão influencia diretamente a velocidade de resposta da gestão. Contudo, a análise da densidade de problemas — variando de 0.8 em Guanabara a 1.2 em Coqueiro (BR-316) — indica que a sustentabilidade do engajamento dependerá da capacidade dos gestores comunitários em processar esse volume crescente de triagem, evitando que o sistema se torne um gargalo de expectativas não atendidas.

## Gargalos de Gestão e Eficiência Operacional

A análise dos gargalos de gestão e eficiência operacional em Ananindeua demonstra que a transição de um sistema de registro digital para uma resposta urbana efetiva é limitada por uma assimetria entre a demanda gerada pelos cidadãos e a capacidade de processamento dos gestores comunitários.

**Limitações de Capacidade e Sobrecarga de Triagem**

A estrutura operacional atual revela um gargalo crítico na triagem humana. Os gestores, embora utilizem ferramentas de suporte, possuem uma capacidade de processamento diário que não escala proporcionalmente ao volume de ocorrências em bairros de alta densidade, como Coqueiro (BR-316) e Águas Lindas, que registram, respectivamente, 1,2 e 1,1 problemas por dia. Conforme observado:

> "Gestor comunitário A resolve 1 chamado por dia, faz triagem de 4 por dia e trabalha nos dias [1, 2, 3, 4, 5]."

> "Gestor comunitário B resolve 1 chamado por dia, faz triagem de 3 por dia e trabalha nos dias [1, 2, 3, 4, 5, 6]."

Essa limitação operacional indica que, em períodos de alta incidência, o sistema tende a acumular chamados em estado "pendente", exigindo que a matriz GUT atue como um filtro rigoroso para evitar o colapso da gestão.

**Eficiência da Priorização GUT**

Para otimizar o fluxo, o `PainelGestor.jsx` automatiza a criticidade das demandas. A lógica de priorização, que define criticidade >=60 como "crítica" e >=30 como "atenção", é fundamental para que os gestores foquem nos problemas de maior impacto social:

> "PainelGestor.jsx prioriza por GUT = gravidade x urgência x tendência, com gravidade 5 para esgoto/alagamento, 4 para buraco/árvore/sinalização, 3 para calçada/iluminação e 2 para outros."

A inclusão da variável "tendência" — que eleva a prioridade quando múltiplos cidadãos reportam o mesmo problema através da função "Também vi" — atua como um mecanismo de validação coletiva. Isso permite que a gestão priorize intervenções em áreas críticas de infraestrutura, como o esgoto e alagamento recorrentes em Icuí-Guajará, antes que se tornem crises de saúde pública.

**Resiliência e Fluxo de Dados**

A eficiência operacional também depende da integridade dos dados recebidos. A tecnologia de `Background Sync` no Chrome/Android, aliada ao uso de `IndexedDB` para a fila offline, garante que a intermitência de sinal (com probabilidades de envio que variam de 0.98 em 4g_estavel a 0.75 em 3g_instavel) não interrompa o fluxo de trabalho. A geração de um protocolo local, como o `protocolo ZD-XXXXXX`, assegura que, mesmo sem conectividade, a demanda seja registrada no dispositivo do cidadão, mantendo a confiança no sistema enquanto a sincronização ocorre em segundo plano.

Em suma, o sistema Zelador Digital demonstra que, embora a tecnologia de registro seja resiliente, a eficiência operacional final é estritamente limitada pela capacidade humana de triagem. O sucesso da gestão urbana digital em Ananindeua dependerá, futuramente, da capacidade de escalar a equipe de gestão ou de automatizar ainda mais a resolução de problemas de baixa complexidade, liberando os gestores para demandas que exigem intervenção física direta.

## Tendências Emergentes e Riscos de Sustentabilidade

A sustentabilidade do Zelador Digital em Ananindeua é um equilíbrio precário entre a robustez técnica da interface de registro e a capacidade operacional de resposta da gestão. A análise dos dados de 7 dias aponta que, embora o sistema seja resiliente a falhas de conectividade, ele caminha para um cenário de saturação caso a demanda continue a crescer em bairros de alta densidade.

**A Fragilidade da Escala Operacional**

O modelo atual de gestão, que depende da triagem manual por parte de dois gestores comunitários, apresenta um limite claro de processamento. Com uma média de 1,1 a 1,2 problemas diários em regiões como Águas Lindas e Coqueiro (BR-316), a carga de trabalho dos gestores — que processam apenas 3 a 4 triagens por dia — torna-se um gargalo estrutural:

> "Gestor comunitário A resolve 1 chamado por dia, faz triagem de 4 por dia e trabalha nos dias [1, 2, 3, 4, 5]."

> "Gestor comunitário B resolve 1 chamado por dia, faz triagem de 3 por dia e trabalha nos dias [1, 2, 3, 4, 5, 6]."

A dependência da matriz GUT para filtrar a criticidade das demandas é a principal defesa contra o colapso, mas a eficácia dessa priorização é limitada pela subjetividade e pela necessidade de validação coletiva, que, com uma probabilidade de apenas 0,25 de uso do "Também vi", pode não refletir a real urgência da população em áreas críticas.

**Riscos de Sustentabilidade a Longo Prazo**

O sucesso do Zelador Digital em Ananindeua traz consigo o risco de "fadiga de engajamento". A tecnologia de `Background Sync` e o uso de `IndexedDB` garantem que o cidadão, mesmo em condições de rede precárias (como a 3g_instavel de usuários como C11 e C14), consiga enviar sua demanda e receber um protocolo local:

> "O ReportModal.jsx gera o protocolo ZD-XXXXXX no celular, mesmo sem internet."

> "O sw.js coloca registros sem rede na fila offline no IndexedDB."

No entanto, o risco de sustentabilidade reside no descompasso entre a facilidade de registro e a lentidão da resolução física. Se o tempo de espera para a resolução de um problema — como esgoto ou alagamento, que possuem gravidade 5 — exceder a expectativa criada pelo protocolo, a confiança do cidadão no sistema será erodida. A sustentabilidade futura do projeto não depende apenas da manutenção da infraestrutura digital, mas da capacidade da gestão em escalar a resposta física ou automatizar o processamento de demandas de menor complexidade, evitando que o Zelador Digital se torne um repositório de problemas sem solução, o que desestimularia a participação ativa dos cidadãos a médio prazo.



## Limitações

- Uma única rodada, sem repetição: sem intervalo de confiança.
- Simulação truncada em 28 de 168 rodadas possíveis (1 por hora) por custo/cota do LLM; os 7 dias valem como horizonte configurado, não como 168 passos executados.
- Agentes são personas de LLM, não pessoas; o texto do relatório reflete a semente e a narrativa do modelo, e cita regras do app que vieram da própria semente.
- Dois modelos diferentes foram usados (ver tabela). Coordenadas dos bairros são aproximadas.
- Reprodução: `python rodar_mirofish.py 28` com o backend no ar e o `.env` preenchido; depois `python -X utf8 gerar_relatorio_mirofish.py`. Saídas brutas em `simulation/logs/` (não versionado).
