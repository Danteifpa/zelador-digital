"""Monta relatorio_siepex.md a partir das saidas REAIS do MiroFish em simulation/logs/.

Le: logs/{report,run_detail,agent_stats,actions,config}.json (salvos de /api/... do backend MiroFish).
Uso: python -X utf8 gerar_relatorio_mirofish.py
"""
import collections
import json
import pathlib

AQUI = pathlib.Path(__file__).parent
L = lambda f: json.loads((AQUI / "logs" / f).read_text(encoding="utf-8"))["data"]
rep, run, stats, acts, cfg = L("report.json"), L("run_detail.json"), L("agent_stats.json"), L("actions.json")["actions"], L("config.json")

por_tipo = collections.Counter(a["action_type"] for a in acts)
por_plat = collections.Counter(a["platform"] for a in acts)
por_agente = collections.Counter(a["agent_name"] for a in acts)
rodadas = sorted({a["round_num"] for a in acts})
ativos = sorted(por_agente)
ags = cfg.get("agent_configs", [])
tc = cfg.get("time_config", {})

linhas = lambda c: "\n".join(f"| {k} | {v} |" for k, v in c.most_common())
md = f"""# Relatório da simulação de 7 dias em Ananindeua — motor MiroFish (VIII SIEPEX)

> **Leia antes de citar.** Dados gerados pelo **motor real do MiroFish** (simulação `{run['simulation_id']}`), com 15 cidadãos e 2 gestores **fictícios** descritos em `experimento_ananindeua_7dias.json`. Não são dados de campo nem evidência de uso real do app. O MiroFish simula **interação social** (publicar, comentar, curtir em duas redes simuladas): ele **não mede** funil de registro, abandono por passo nem tempo de resolução. Essas métricas, que existiam no modelo de regras anterior, **não** aparecem aqui. As falas dos agentes são texto gerado por LLM e saíram majoritariamente em chinês (idioma-padrão dos prompts do motor).

## Como foi rodado

| Item | Valor |
|---|---|
| Motor | MiroFish (backend local) + OASIS, memória em grafo Zep Cloud |
| Semente | `experimento_ananindeua_7dias.json` convertido em documento-semente (`rodar_mirofish.py`) |
| Período simulado | {run['total_simulation_hours']} h (7 dias), {tc.get('minutes_per_round')} min por rodada |
| Rodadas executadas | {run['total_rounds']} (limite imposto por `max_rounds=28`, por custo/cota do LLM) |
| Plataformas | Twitter e Reddit simulados em paralelo |
| Entidades-agente geradas | {len(ags)} (o grafo extraiu cidadãos, gestores e bairros) |
| LLM | Gemini via API compatível com OpenAI: `gemini-3-flash-preview` (grafo, perfis, simulação) e `gemini-3.1-flash-lite` (texto do relatório, após a cota gratuita diária do primeiro acabar) |
| Término | {run['completed_at']} (status `{run['runner_status']}`) |

## Dados medidos

Total de ações: **{run['total_actions_count']}** (Twitter {run['twitter_actions_count']}, Reddit {run['reddit_actions_count']}). Agentes que agiram: **{len(ativos)}** de {len(ags)}. Rodadas com alguma ação: {len(rodadas)} de {run['total_rounds']} (rodadas {rodadas[0]} a {rodadas[-1]}).

| Tipo de ação | Quantidade |
|---|---|
{linhas(por_tipo)}

| Agente | Ações |
|---|---|
{linhas(por_agente)}

| Plataforma | Ações |
|---|---|
{linhas(por_plat)}

Observação: ações concentradas em poucas rodadas e em poucos agentes. Com 41 ações, diferenças entre agentes ou plataformas são ruído, não efeito.

## Relatório gerado pelo MiroFish (ReportAgent)

{rep['markdown_content'].replace(chr(10) + '# ', chr(10) + '### ').replace('# Relatório de Previsão', '### Relatório de Previsão', 1)}

## Limitações

- Uma única rodada, sem repetição: sem intervalo de confiança.
- Simulação truncada em 28 de 168 rodadas possíveis (1 por hora) por custo/cota do LLM; os 7 dias valem como horizonte configurado, não como 168 passos executados.
- Agentes são personas de LLM, não pessoas; o texto do relatório reflete a semente e a narrativa do modelo, e cita regras do app que vieram da própria semente.
- Dois modelos diferentes foram usados (ver tabela). Coordenadas dos bairros são aproximadas.
- Reprodução: `python rodar_mirofish.py 28` com o backend no ar e o `.env` preenchido; depois `python -X utf8 gerar_relatorio_mirofish.py`. Saídas brutas em `simulation/logs/` (não versionado).
"""
(AQUI / "relatorio_siepex.md").write_text(md, encoding="utf-8")
print("ok", len(md))
