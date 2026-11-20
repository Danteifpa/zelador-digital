"""Liga experimento_ananindeua_7dias.json ao motor REAL do MiroFish (API em localhost:5001).

Fluxo: JSON -> documento-semente (md) -> ontologia -> grafo Zep -> simulacao -> preparo -> execucao -> relatorio.
Requer o backend rodando (cd mirofish-engine/backend && uv run python run.py) e o .env preenchido.
Uso: python rodar_mirofish.py [max_rounds]
Saidas brutas em simulation/logs/ (ignorado pelo git).
"""
import json
import pathlib
import sys
import time

import requests

AQUI = pathlib.Path(__file__).parent
LOGS = AQUI / "logs"
LOGS.mkdir(exist_ok=True)
API = "http://localhost:5001/api"
EXP = json.loads((AQUI / "experimento_ananindeua_7dias.json").read_text(encoding="utf-8"))
MAX_ROUNDS = int(sys.argv[1]) if len(sys.argv) > 1 else EXP["dias"] * 4


def semente_md() -> str:
    L = [f"# {EXP['titulo']}", "", EXP["natureza"], "", "## Bairros"]
    for nome, b in EXP["bairros"].items():
        cats = ", ".join(f"{k} ({v})" for k, v in b["categorias"].items())
        L.append(f"- **{nome}** (lat {b['lat']}, lon {b['lon']}): ~{b['problemas_por_dia']} problemas/dia. Tipos: {cats}.")
    L += ["", "## Cidadãos (fictícios)"]
    for c in EXP["cidadaos"]:
        facil = "usa o Modo Fácil (voz, botões grandes)" if c["modo_facil"] else "usa o modo normal"
        L.append(f"- **{c['id']}**: {c['genero']}, {c['idade']} anos, mora em {c['bairro']}, {facil}, conexão {c['sinal']}.")
    L += ["", "## Gestores comunitários (fictícios)"]
    for g in EXP["gestores"]:
        L.append(f"- **{g['id']}** ({g['papel']}): resolve {g['capacidade_resolucao_dia']}/dia, triagem {g['capacidade_triagem_dia']}/dia, trabalha nos dias {g['dias_de_trabalho']}.")
    L += ["", "## Regras do aplicativo Zelador Digital"]
    L += [f"- **{k}**: {v}" for k, v in EXP["regras_do_app"].items()]
    L += ["", "## Premissas de comportamento (não calibradas)"]
    L += [f"- {k}: {json.dumps(v, ensure_ascii=False)}" for k, v in EXP["parametros_modelo"].items()]
    return "\n".join(L) + "\n"


REQUISITO = (
    "Simule 7 dias de uso do aplicativo Zelador Digital em Ananindeua (PA) por 15 cidadãos e 2 gestores comunitários "
    "fictícios. Cidadãos observam problemas urbanos e tentam registrá-los (assistente de 4 passos, fila offline, "
    "'Também vi'); gestores priorizam por GUT e resolvem. Meça: taxa de conclusão do registro (por idade, Modo Fácil e "
    "qualidade do sinal), uso da fila offline, ocorrências por bairro e por categoria, apoios 'Também vi', tempo até "
    "resolver e gargalos de gestão. Responda em português do Brasil."
)


def chamar(metodo, caminho, **kw):
    r = requests.request(metodo, f"{API}{caminho}", timeout=300, **kw)
    try:
        j = r.json()
    except ValueError:
        raise SystemExit(f"{caminho}: resposta nao-JSON ({r.status_code}): {r.text[:300]}")
    if not j.get("success", False):
        raise SystemExit(f"{caminho} falhou: {json.dumps(j, ensure_ascii=False)[:600]}")
    return j["data"]


def esperar(desc, fn, pronto, falhou, cada=10, limite=3600):
    t0 = time.time()
    while time.time() - t0 < limite:
        d = fn()
        if falhou(d):
            raise SystemExit(f"{desc} falhou: {json.dumps(d, ensure_ascii=False)[:800]}")
        if pronto(d):
            return d
        print(f"  [{desc}] {str(d)[:160]}", flush=True)
        time.sleep(cada)
    raise SystemExit(f"{desc}: tempo esgotado")


def main():
    estado = {}
    seed = AQUI / "logs" / "semente_ananindeua.md"
    seed.write_text(semente_md(), encoding="utf-8")

    print("1/6 ontologia", flush=True)
    with seed.open("rb") as f:
        d = chamar("POST", "/graph/ontology/generate",
                   data={"simulation_requirement": REQUISITO, "project_name": "Zelador Digital - Ananindeua 7 dias"},
                   files={"files": (seed.name, f, "text/markdown")})
    estado["project_id"] = pid = d["project_id"]

    print("2/6 grafo (Zep)", flush=True)
    d = chamar("POST", "/graph/build", json={"project_id": pid})
    tid = d["task_id"]
    esperar("grafo", lambda: chamar("GET", f"/graph/task/{tid}"),
            lambda x: x.get("status") == "completed", lambda x: x.get("status") == "failed")
    estado["graph_id"] = chamar("GET", f"/graph/project/{pid}")["graph_id"]

    print("3/6 criar simulacao", flush=True)
    d = chamar("POST", "/simulation/create", json={"project_id": pid, "graph_id": estado["graph_id"]})
    estado["simulation_id"] = sid = d["simulation_id"]

    print("4/6 preparar (perfis + config via LLM)", flush=True)
    d = chamar("POST", "/simulation/prepare", json={"simulation_id": sid})
    if not d.get("already_prepared"):
        tid = d["task_id"]
        esperar("preparo", lambda: chamar("POST", "/simulation/prepare/status", json={"task_id": tid, "simulation_id": sid}),
                lambda x: x.get("status") in ("completed", "ready"), lambda x: x.get("status") == "failed")

    print(f"5/6 rodar ({MAX_ROUNDS} rodadas)", flush=True)
    chamar("POST", "/simulation/start", json={"simulation_id": sid, "platform": "parallel", "max_rounds": MAX_ROUNDS})
    esperar("simulacao", lambda: chamar("GET", f"/simulation/{sid}/run-status"),
            lambda x: x.get("runner_status") in ("completed", "stopped"), lambda x: x.get("runner_status") == "failed", cada=20)

    print("6/6 relatorio do MiroFish", flush=True)
    d = chamar("POST", "/report/generate", json={"simulation_id": sid})
    estado["report_id"] = d.get("report_id")
    tid = d["task_id"]
    esperar("relatorio", lambda: chamar("POST", "/report/generate/status", json={"task_id": tid, "simulation_id": sid}),
            lambda x: x.get("status") == "completed", lambda x: x.get("status") == "failed", cada=15)

    estado["run_status"] = chamar("GET", f"/simulation/{sid}/run-status/detail")
    estado["config"] = chamar("GET", f"/simulation/{sid}/config")
    estado["agent_stats"] = chamar("GET", f"/simulation/{sid}/agent-stats")
    estado["actions"] = chamar("GET", f"/simulation/{sid}/actions", params={"limit": 2000})
    rel = chamar("GET", f"/report/by-simulation/{sid}")
    estado["report"] = rel
    (LOGS / "mirofish_resultado.json").write_text(json.dumps(estado, ensure_ascii=False, indent=1), encoding="utf-8")
    print("OK ->", LOGS / "mirofish_resultado.json")


if __name__ == "__main__":
    main()
