# Fundamentação teórica e modelagem matemática do painel de apoio à decisão do Zelador Digital Comunitário

**VIII SIEPEX — IFPA Campus Ananindeua**
**Arquivo de referência:** `simulation/dashboard_siepex.py`

> **Natureza dos resultados.** O painel é um gêmeo digital sintético. Todos os parâmetros foram assumidos pelo autor a partir da semente `experimento_ananindeua_7dias.json` e não foram calibrados com dados de campo. Os valores numéricos apresentados neste documento ilustram o comportamento do modelo e não constituem medição empírica do uso do aplicativo em Ananindeua-PA.

---

## 1 Introdução

O foco principal do Zelador Digital Comunitário é **democratizar a denúncia urbana** e enfrentar a **desigualdade territorial de atendimento** em Ananindeua-PA. Bairros periféricos como Icuí-Guajará, Aurá e Águas Lindas concentram problemas graves de saneamento e drenagem, como esgoto a céu aberto e alagamentos recorrentes, e tendem a receber resposta mais lenta do poder público do que as áreas mais centrais e de maior renda. Parte dessa desigualdade nasce na própria porta de entrada: canais de reclamação que exigem deslocamento, conhecimento institucional ou capital político reproduzem a assimetria entre quem já é ouvido e quem permanece invisível.

O aplicativo responde a esse problema com dois mecanismos centrais. O primeiro é a **validação coletiva** por meio do botão "Também vi": vizinhos confirmam o mesmo relato, convertendo laços comunitários em evidência de recorrência e em prioridade, o que operacionaliza o conceito de capital social (PUTNAM, 1993). O segundo é a **Matriz GUT territorializada**: a prioridade de cada caso depende da gravidade do problema, do tempo de espera, da confirmação coletiva e da proximidade de equipamentos públicos sensíveis, como Unidades Básicas de Saúde (UBS) e escolas, e não da ordem de chegada nem da capacidade de pressão de cada bairro. O suporte *offline* (fila no IndexedDB com *Background Sync*) é um **recurso complementar**: agiliza o envio quando faltam dados móveis, mas não é o centro da proposta.

Do ponto de vista da modelagem, a zeladoria urbana participativa envolve três processos acoplados: (i) a geração de demandas pelos moradores, condicionada por fatores sociais e de conectividade; (ii) a transmissão dessas demandas ao sistema, sujeita a restrições de dados móveis (franquia pré-paga esgotada, pontos de sombra e quedas durante temporais); e (iii) a resolução pelas equipes de campo, limitada por capacidade operacional e por uma regra de priorização. Como esses processos são estocásticos e interdependentes, sua análise analítica fechada é pouco tratável. Adotou-se, por isso, uma abordagem computacional em três camadas:

1. **Simulação de Monte Carlo** (METROPOLIS; ULAM, 1949) de uma fila de atendimento com 30 dias de chegadas, comparando duas políticas de priorização;
2. **Rede neural do tipo perceptron multicamadas** (ROSENBLATT, 1958; RUMELHART; HINTON; WILLIAMS, 1986), treinada como metamodelo do simulador para prever o Tempo Estimado de Resolução (SLA, em horas), com interpretação por importância por permutação (BREIMAN, 2001);
3. **Grafo multiagente** dos 24 agentes gerados pelo motor MiroFish com memória em grafo Zep, inspirado na arquitetura de agentes generativos com memória episódica (PARK et al., 2023).

A priorização segue a matriz GUT (Gravidade, Urgência e Tendência), associada na literatura de gestão à análise racional de problemas de Kepner e Tregoe (1981), aqui estendida com um peso territorial e com o mecanismo social "Também vi", que operacionaliza o conceito de capital social (PUTNAM, 1993). A vulnerabilidade territorial é representada pelo Índice de Vulnerabilidade Social (IVS) do IPEA (2015), e, como recurso complementar, a tolerância à falta de dados móveis segue os princípios de software *local-first* (KLEPPMANN et al., 2019).

---

## 2 Parâmetros de controle

Seis parâmetros, ajustados na barra lateral do painel, alimentam simultaneamente o Monte Carlo, a rede neural e o grafo.

| Símbolo | Parâmetro | Domínio | Papel no modelo |
|---|---|---|---|
| $\nu$ | IVS (IPEA) | $[0;\,1]$ | Eleva a taxa de surgimento de problemas e a observação pelos moradores |
| $\pi$ | Proximidade de UBS/escolas | $[1{,}0;\,2{,}0]$ | Peso territorial multiplicativo no escore GUT |
| $\kappa$ | Capital social ("Também vi") | $[1{,}0;\,5{,}0]$ | Número esperado de confirmações por vizinhos |
| $L$ | Letramento digital / apoio de Lideranças Comunitárias | $[0;\,1]$ | Reduz a subnotificação e acelera a sincronização manual |
| $\iota$ | Restrição de Dados Móveis / Offline | $[0;\,0{,}8]$ | Probabilidade de o registro nascer *offline* por falta de dados móveis |
| $M$ | Equipes de campo por dia | $\{2, \dots, 20\}$ | Capacidade diária de resolução |

Constantes fixas do modelo: fator de escala da demanda $E = 4$; produtividade por equipe $\mu_0 = 1{,}5$ resoluções/dia; custo de triagem de duplicata $c_d = 0{,}35$; fração de ocorrências próximas a UBS/escola $f_z = 0{,}30$; probabilidade de envio por *Background Sync* $p_{bg} = 0{,}85$ (valor da semente).

---

## 3 Modelo de Monte Carlo

### 3.1 Geração das ocorrências

Para cada bairro $b \in \mathcal{B}$ (Cidade Nova, Coqueiro, Icuí-Guajará, Paar, Guanabara e Águas Lindas), o IVS local é deslocado da média do cenário por um termo $\delta_b$ assumido pelo autor:

$$
\nu_b = \min\{1,\ \max\{0,\ \nu + \delta_b\}\}.
$$

A taxa diária de problemas efetivamente registrados é

$$
\lambda_b = r_b \cdot E \cdot (0{,}6 + 0{,}8\,\nu_b) \cdot (0{,}5 + 0{,}5\,L),
$$

em que $r_b$ é a taxa de problemas por dia da semente. O fator $(0{,}6 + 0{,}8\nu_b)$ expressa a maior incidência de problemas de infraestrutura em territórios vulneráveis; o fator $(0{,}5 + 0{,}5L)$ expressa que parte dos problemas só chega ao sistema quando o morador tem letramento digital ou apoio de Lideranças Comunitárias. O número de ocorrências do bairro $b$ no dia $d \in \{0, \dots, 29\}$ é

$$
N_{b,d} \sim \text{Poisson}(\lambda_b).
$$

Cada ocorrência $i$ recebe uma categoria sorteada da distribuição categórica de pesos da semente, convertida em gravidade $G_i \in \{2,3,4,5\}$ pela mesma regra do `PainelGestor.jsx` (esgoto e alagamento: 5; buraco, árvore e sinalização: 4; calçada e iluminação: 3; demais: 2). O instante de criação, em horas, é $t^c_i = 24d + U_i$, com $U_i \sim \mathcal{U}(6, 22)$.

### 3.2 Conectividade e fila *offline* (recurso complementar)

Este componente não é o objeto central da avaliação: ele mede apenas quanto a falta momentânea de dados móveis atrasa a entrada do relato no sistema. O parâmetro $\iota$ não supõe ausência de cobertura: a área urbana de Ananindeua é atendida por redes 4G/5G. Ele representa a falta de acesso efetivo aos dados móveis no momento do registro, por franquia pré-paga esgotada, pontos de sombra dentro de casas e vielas ou quedas de sinal durante temporais. A ocorrência nasce *offline* com probabilidade $\iota$: $O_i \sim \text{Bernoulli}(\iota)$. Nesse caso, ela permanece na fila local do IndexedDB até ser sincronizada. Com probabilidade $p_{bg}$ o navegador dispõe de *Background Sync* ($B_i = 1$) e o atraso é curto; caso contrário, o envio só ocorre quando o morador reabre o aplicativo:

$$
\Delta_i \sim
\begin{cases}
\text{Exp}\big(\text{média } 2\ \text{h}\big), & B_i = 1,\\[2pt]
\text{Exp}\big(\text{média } 18(1 - 0{,}6L) + 2\ \text{h}\big), & B_i = 0,
\end{cases}
\qquad
t^s_i = t^c_i + O_i\,\Delta_i .
$$

O protocolo ZD-XXXXXX é gerado no aparelho em $t^c_i$, o que corresponde ao princípio *local-first* de que a operação do usuário não depende da disponibilidade do servidor (KLEPPMANN et al., 2019). O SLA, contudo, é contado a partir de $t^c_i$, de modo que o tempo em fila *offline* penaliza o indicador.

A curva de fila *offline* da aba 2 é obtida pela soma, hora a hora, das ocorrências com $t^c_i \le h < t^s_i$, separadas por $B_i$.

### 3.3 Atributos territoriais e sociais

- **Proximidade de equipamento público:** $Z_i \sim \text{Bernoulli}(f_z)$ e peso territorial $w_i = \pi$ se $Z_i = 1$, ou $w_i = 1$ caso contrário.
- **Confirmações "Também vi":** $K_i \sim \text{Poisson}(0{,}25\,\kappa)$, em que $0{,}25$ é a probabilidade de confirmação da semente.

### 3.4 Capacidade e políticas de atendimento

A capacidade diária é $C_d \sim \text{Poisson}(\mu_0 M)$. Uma ocorrência fica disponível para atendimento a partir do dia $a_i = \lfloor t^s_i / 24 \rfloor + 1$, respeitando o prazo mínimo de um dia da semente. A cada dia $d$, o conjunto pendente disponível $Q_d = \{i : \text{pendente},\ a_i \le d\}$ é ordenado conforme a política, e é atendido o maior prefixo cuja soma de custos não excede $C_d$.

**Política 0 — Sem GUT (FIFO).** Ordem crescente de $t^s_i$. Sem agrupamento social, cada confirmação vira um relato duplicado que consome triagem: o custo é $c_i = 1 + c_d K_i$.

**Política 1 — Com GUT territorializado + Também vi.** As duplicatas são agrupadas no relato original ($c_i = 1$) e alimentam a Tendência. O escore de prioridade é

$$
S_i(d) = G_i \cdot U_i(d) \cdot T_i \cdot w_i,
$$

com Urgência dependente da idade $\tau = d - a_i$ do relato,

$$
U_i(d) =
\begin{cases}
3, & \tau < 3,\\
4, & 3 \le \tau \le 7,\\
5, & \tau > 7,
\end{cases}
$$

e Tendência $T_i = 5$ se $1 + K_i \ge 3$ e $T_i = 4$ caso contrário (o mês simulado é dezembro, período chuvoso, no qual a regra do aplicativo atribui tendência mínima 4). A ordenação é decrescente em $S_i(d)$, com desempate por $t^s_i$. Trata-se da matriz GUT clássica (KEPNER; TREGOE, 1981) acrescida do fator territorial $w_i$ e do componente social $T_i$.

### 3.5 Tempo de resolução e censura

A ocorrência atendida no dia $d$ é resolvida em $t^r_i = 24d + V_i$, $V_i \sim \mathcal{U}(8, 18)$ (turno de trabalho). O indicador é

$$
\text{SLA}_i = \max\{t^r_i - t^c_i,\ 1\}\ \text{horas}.
$$

Após os 30 dias de chegadas, a simulação prossegue por mais 30 dias sem novas chegadas, apenas para esvaziar a fila. Ocorrências não resolvidas até o dia 60 recebem $t^r_i = 1440$ h (censura à direita).

### 3.6 Estimadores e números aleatórios comuns

São executadas $R \in \{30, 60, 100, 200\}$ repetições independentes, geradas por `numpy.random.SeedSequence`. Em cada repetição as **mesmas ocorrências** são submetidas às duas políticas (técnica de números aleatórios comuns), de modo que a diferença observada se deve à política e não ao sorteio da demanda. Reportam-se a média amostral, o percentil 90 do SLA, o SLA médio das ocorrências de gravidade 5 e a faixa P10–P90 da fila diária entre repetições. Pela lei dos grandes números, a média amostral converge para a esperança do SLA sob as premissas do modelo, com erro padrão decrescente na ordem de $1/\sqrt{R}$ (METROPOLIS; ULAM, 1949).

A dinâmica é governada pela razão de carga $\rho = \sum_b \lambda_b / (\mu_0 M)$: para $\rho < 1$ a fila se estabiliza; para $\rho \ge 1$ ela cresce ao longo do horizonte, o que se observa no painel quando o número de equipes é reduzido.

**Efeito territorial da priorização.** Para avaliar o foco do projeto, compara-se o SLA médio das periferias simuladas de maior vulnerabilidade (Icuí-Guajará e Águas Lindas) com o dos bairros de menor vulnerabilidade no modelo (Guanabara e Cidade Nova). No cenário padrão (IVS 0,45; peso territorial 1,4; capital social 2,5; letramento 50%; restrição de dados 30%; 8 equipes; 60 repetições), a fila FIFO resulta em SLA praticamente igual entre os dois grupos (366 h e 369 h), enquanto a GUT territorializada com "Também vi" reduz o SLA das periferias para 174 h contra 259 h nos bairros de menor vulnerabilidade (razão 0,67). Com 12 equipes, os valores passam a 43 h e 52 h (razão 0,83). O resultado decorre das premissas: as periferias concentram categorias de gravidade 5 (esgoto e alagamento) e recebem o peso territorial, de modo que a regra GUT as atende primeiro.

---

## 4 Rede neural MLP como metamodelo do SLA

### 4.1 Conjunto de dados

O simulador é executado em 90 cenários com os seis parâmetros sorteados uniformemente em seus domínios. Para cada cenário e para cada política são registradas todas as ocorrências, das quais se extrai uma amostra aleatória de 12 000 observações. O vetor de entrada tem 11 variáveis:

$$
\mathbf{x} = (\nu,\ \pi,\ \kappa,\ L,\ \iota,\ M,\ G,\ Z,\ O,\ K,\ P),
$$

em que $P \in \{0,1\}$ indica a política. A variável-alvo é o $\text{SLA}$ em horas. Os dados são divididos em 80% para treino e 20% para teste (`random_state = 42`).

### 4.2 Padronização e transformação do alvo

Cada variável de entrada é padronizada pelo `StandardScaler`, com média e desvio-padrão estimados apenas no conjunto de treino:

$$
\tilde{x}_j = \frac{x_j - \bar{x}_j}{s_j}.
$$

Como o SLA tem distribuição assimétrica à direita, a rede é ajustada sobre $z = \ln(1 + \text{SLA})$, e a previsão é devolvida à escala de horas por $\widehat{\text{SLA}} = e^{\hat{z}} - 1$.

### 4.3 Arquitetura

A rede tem topologia $11 \to 64 \to 32 \to 16 \to 1$. Para as camadas ocultas $\ell = 1, 2, 3$,

$$
\mathbf{h}^{(\ell)} = \operatorname{ReLU}\!\left(W^{(\ell)}\mathbf{h}^{(\ell-1)} + \mathbf{b}^{(\ell)}\right),
\qquad \operatorname{ReLU}(u) = \max\{0, u\},
\qquad \mathbf{h}^{(0)} = \tilde{\mathbf{x}},
$$

e a saída é linear: $\hat{z} = \mathbf{w}^{(4)\top}\mathbf{h}^{(3)} + b^{(4)}$. A unidade básica é o perceptron de Rosenblatt (1958); o empilhamento em camadas com ativação não linear confere à rede a capacidade de aproximar a relação não linear entre carga, prioridade e tempo de espera.

### 4.4 Treinamento

Minimiza-se o erro quadrático médio com regularização $L_2$ ($\alpha = 10^{-3}$):

$$
\mathcal{L}(\theta) = \frac{1}{2n}\sum_{i=1}^{n}\left(z_i - \hat{z}_i\right)^2 + \frac{\alpha}{2n}\sum_{\ell}\left\lVert W^{(\ell)}\right\rVert_F^2 .
$$

Os gradientes $\partial \mathcal{L} / \partial W^{(\ell)}$ são obtidos pela retropropagação do erro (RUMELHART; HINTON; WILLIAMS, 1986), aplicando-se a regra da cadeia da saída para a entrada:

$$
\boldsymbol{\delta}^{(\ell)} = \left(W^{(\ell+1)\top}\boldsymbol{\delta}^{(\ell+1)}\right) \odot \mathbb{1}\!\left[\mathbf{a}^{(\ell)} > 0\right],
\qquad
\frac{\partial \mathcal{L}}{\partial W^{(\ell)}} = \boldsymbol{\delta}^{(\ell)}\mathbf{h}^{(\ell-1)\top},
$$

em que $\mathbf{a}^{(\ell)}$ é a pré-ativação. A atualização usa o otimizador Adam (taxa inicial $10^{-3}$), com parada antecipada quando o erro em 10% do treino reservado para validação deixa de melhorar.

### 4.5 Métricas de desempenho

No conjunto de teste, em horas:

$$
R^2 = 1 - \frac{\sum_i (y_i - \hat{y}_i)^2}{\sum_i (y_i - \bar{y})^2},
\qquad
\text{MAE} = \frac{1}{n}\sum_i \lvert y_i - \hat{y}_i \rvert .
$$

Com as sementes padrão obteve-se $R^2 \approx 0{,}77$ e $\text{MAE} \approx 104$ h. O MAE elevado é esperado: a posição exata de uma ocorrência na fila em um dado dia depende de sorteios que não estão no vetor $\mathbf{x}$ (ruído irredutível do processo). A rede, portanto, aprende o **SLA esperado** condicional às variáveis, e não o SLA de cada caso individual. Por ser treinada sobre o simulador, ela reproduz as premissas do simulador, não a realidade.

### 4.6 Importância por permutação

A relevância de cada variável é medida pelo aumento do MAE quando a coluna $j$ do conjunto de teste é embaralhada, rompendo sua associação com o alvo (BREIMAN, 2001):

$$
I_j = \frac{1}{K}\sum_{k=1}^{K}\left[\text{MAE}\big(f;\ X^{(j,k)}_{\text{perm}}\big) - \text{MAE}\big(f;\ X\big)\right],
$$

com $K = 5$ repetições sobre 2 000 observações de teste. No cenário padrão, as variáveis de maior importância foram o número de equipes, a gravidade, a política GUT, o letramento digital e o IVS. A indicação de que o relato ficou *offline* teve importância próxima de zero, pois atrasos de algumas horas são pequenos diante de esperas de dias em fila; isso é um resultado do modelo, não uma afirmação de que a conectividade é irrelevante para a adesão ao aplicativo.

---

## 5 Grafo multiagente MiroFish/Zep (aba 3)

### 5.1 Origem dos agentes

Os 24 nós correspondem às entidades geradas pelo motor MiroFish na simulação `sim_a1255520dedd` (15 cidadãos, dos quais 3 classificados como idosos; 6 grupos de bairro; 2 gestores comunitários; 1 conta oficial do aplicativo). Do MiroFish são reaproveitados apenas o perfil, a postura e o peso de influência de cada agente, além das 41 ações efetivamente registradas naquela execução. A evolução diária exibida no painel é uma **reconstrução estilizada** gerada pelas regras abaixo, e não uma reprodução da execução do MiroFish.

### 5.2 Regras de evolução (dias 1 a 7)

Para cada cidadão $c$, residente no bairro $b(c)$, no dia $d$:

$$
p^{\text{obs}}_c = 0{,}35\,(0{,}6 + 0{,}8\,\nu_{b(c)}),
\qquad
p^{\text{reg}}_c = \min\!\left\{0{,}95,\ \frac{0{,}5\,(0{,}6 + 0{,}8L)\,h_c}{1{,}4}\right\},
$$

com $h_c = 1 + 0{,}4L$ para idosos ou usuários do Modo Fácil (efeito da mediação por Lideranças Comunitárias) e $h_c = 1$ nos demais casos. Um registro ocorre com probabilidade $p^{\text{obs}}_c\,p^{\text{reg}}_c$. Ele fica *offline* com probabilidade $\min\{0{,}95,\ \iota f_s\}$, sendo $f_s = 0{,}3$, $1{,}0$ e $1{,}4$ para os perfis de conexão da semente `4g_estavel`, `4g_instavel` e `3g_instavel` (acesso estável, restrito e muito restrito), e é sincronizado no mesmo dia com probabilidade $p_{bg}$ ou no dia seguinte caso contrário.

Cada vizinho do mesmo bairro confirma o relato ("Também vi") com probabilidade

$$
p^{\text{tv}} = \min\!\left\{0{,}9,\ \frac{0{,}25\,\kappa}{1{,}5}\right\}.
$$

Nos dias de trabalho previstos na semente, cada gestor coordena $M/2$ equipes, com capacidade $\text{Poisson}\big((M/2)\,\mu_0/4\big)$ (a divisão por 4 ajusta a escala ao grupo de 15 moradores), e atende os relatos pendentes em ordem decrescente de $G \cdot \pi_b$, em que $\pi_b = \pi$ para os bairros com maior concentração de equipamentos de saúde e alagamento (Icuí-Guajará e Águas Lindas) e $\pi_b = 1$ nos demais.

### 5.3 Memória episódica e clusters

Seja $E_i(d)$ o número acumulado de episódios (eventos de que o agente $i$ participou) até o dia $d$. A consolidação da memória episódica é modelada por uma curva de saturação exponencial:

$$
m_i(d) = 1 - e^{-0{,}35\,E_i(d)},
$$

que cresce rapidamente nos primeiros episódios e se aproxima de 1 com a repetição. A formulação é uma simplificação da *memory stream* dos agentes generativos de Park et al. (2023), em que observações acumuladas alimentam recuperação e reflexão, e é análoga ao armazenamento incremental de fatos no grafo de conhecimento Zep usado pelo MiroFish.

Os clusters "Também vi" são as componentes conexas do subgrafo formado apenas pelas arestas de confirmação. Eles representam a formação de laços de reciprocidade entre vizinhos, isto é, capital social do tipo *bonding* no sentido de Putnam (1993), que no modelo se converte em maior Tendência no escore GUT.

### 5.4 Visualização e exportação

O tamanho do nó é proporcional ao peso de influência; a opacidade e a espessura da borda são proporcionais a $m_i(d)$; as arestas pontilhadas indicam registros na fila *offline*. A disposição dos nós é calculada uma única vez pelo algoritmo de forças de Fruchterman–Reingold (`networkx.spring_layout`, semente fixa), para que a posição não mude ao mover o controle temporal. O botão de exportação gera arquivos CSV (UTF-8 com BOM, compatível com planilhas) com o estado dos agentes e a lista de eventos até o dia selecionado.

---

## 6 Limitações

1. Todas as probabilidades, os deslocamentos de IVS por bairro, a escala de demanda e a produtividade das equipes são premissas do autor, não calibradas com dados da Prefeitura de Ananindeua nem do IPEA.
2. O IVS é usado como índice agregado em $[0, 1]$, sem decomposição nas dimensões infraestrutura urbana, capital humano e renda e trabalho (IPEA, 2015).
3. A rede neural é um metamodelo do simulador: um $R^2$ elevado indica que ela reproduz bem as premissas, não que as premissas estejam corretas.
4. A execução do MiroFish que originou os 24 agentes teve 41 ações em 28 de 168 rodadas possíveis, sem repetição; não permite inferência estatística.
5. O Aurá, citado como exemplo de periferia, não está entre os seis bairros da semente. As "áreas mais centrais" são representadas apenas pelos bairros com menor deslocamento de IVS no modelo (Guanabara e Cidade Nova), também por premissa do autor.
6. A política FIFO do modelo é neutra entre bairros: ela não reproduz o histórico de atendimento mais lento das periferias. O painel mostra, portanto, o efeito de priorizar por gravidade e território, e não a dimensão da desigualdade real, que exigiria dados de atendimento da Prefeitura.
7. A comparação entre políticas mostra a redistribuição da espera: a priorização GUT reduz fortemente o SLA das ocorrências graves, mas desloca a espera para as de baixa gravidade; por isso o percentil 90 do SLA quase não se altera entre as políticas no cenário padrão (cerca de 645 h a 650 h).

---

## Referências

BREIMAN, L. Random forests. **Machine Learning**, Dordrecht, v. 45, n. 1, p. 5-32, 2001. DOI: https://doi.org/10.1023/A:1010933404324.

INSTITUTO DE PESQUISA ECONÔMICA APLICADA (IPEA). **Atlas da vulnerabilidade social nos municípios brasileiros**. Organização de Marco Aurélio Costa e Bárbara Oliveira Marguti. Brasília: IPEA, 2015.

KEPNER, C. H.; TREGOE, B. B. **The new rational manager**. Princeton: Princeton Research Press, 1981.

KLEPPMANN, M.; WIGGINS, A.; VAN HARDENBERG, P.; McGRANAGHAN, M. Local-first software: you own your data, in spite of the cloud. *In*: ACM SIGPLAN INTERNATIONAL SYMPOSIUM ON NEW IDEAS, NEW PARADIGMS, AND REFLECTIONS ON PROGRAMMING AND SOFTWARE (ONWARD! '19), 2019, Athens. **Proceedings** [...]. New York: ACM, 2019. p. 154-178. DOI: https://doi.org/10.1145/3359591.3359737.

METROPOLIS, N.; ULAM, S. The Monte Carlo method. **Journal of the American Statistical Association**, Alexandria, v. 44, n. 247, p. 335-341, 1949. DOI: https://doi.org/10.1080/01621459.1949.10483310.

PARK, J. S.; O'BRIEN, J. C.; CAI, C. J.; MORRIS, M. R.; LIANG, P.; BERNSTEIN, M. S. Generative agents: interactive simulacra of human behavior. *In*: ANNUAL ACM SYMPOSIUM ON USER INTERFACE SOFTWARE AND TECHNOLOGY (UIST '23), 36., 2023, San Francisco. **Proceedings** [...]. New York: ACM, 2023. DOI: https://doi.org/10.1145/3586183.3606763.

PUTNAM, R. D. **Making democracy work**: civic traditions in modern Italy. Princeton: Princeton University Press, 1993.

ROSENBLATT, F. The perceptron: a probabilistic model for information storage and organization in the brain. **Psychological Review**, Washington, v. 65, n. 6, p. 386-408, 1958. DOI: https://doi.org/10.1037/h0042519.

RUMELHART, D. E.; HINTON, G. E.; WILLIAMS, R. J. Learning representations by back-propagating errors. **Nature**, London, v. 323, n. 6088, p. 533-536, 1986. DOI: https://doi.org/10.1038/323533a0.
