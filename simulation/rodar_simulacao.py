"""Simulação baseada em regras (agentes fictícios) do Zelador Digital em Ananindeua, 7 dias.

IMPORTANTE: este NÃO é o MiroFish. O MiroFish exige chave de LLM (Ollama local ou API) e chave
Zep Cloud, indisponíveis neste ambiente. Este modelo estocástico (semente fixa) usa as regras do
app (ReportModal/PainelGestor/sw.js) e as premissas declaradas no JSON.

Uso: python rodar_simulacao.py
"""
import collections
import json
import math
import pathlib
import random

AQUI = pathlib.Path(__file__).parent
EXP = json.loads((AQUI / "experimento_ananindeua_7dias.json").read_text(encoding="utf-8"))
P = EXP["parametros_modelo"]
REDE = P["prob_rede_disponivel_no_momento"]
rng = random.Random(EXP["semente"])

GRAV = {"esgoto": 5, "alagamento": 5, "buraco": 4, "arvore": 4, "sinalizacao": 4, "calcada": 3, "iluminacao": 3}


def dist_m(a, b):
    r = 6371000
    la, lb = math.radians(a["lat"]), math.radians(b["lat"])
    dl, dn = lb - la, math.radians(b["lon"] - a["lon"])
    h = math.sin(dl / 2) ** 2 + math.cos(la) * math.cos(lb) * math.sin(dn / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(h), math.sqrt(1 - h))


def gut(o, recebidas, dia):
    recorrente = any(x is not o and dist_m(o, x) <= 500 for x in recebidas)
    g = GRAV.get(o["categoria"], 2)
    idade = dia - o["dia_recebida"]
    u = 3 if o["status"] != "pendente" else (5 if idade > 7 else 4 if idade >= 3 else 3)
    chuvoso = P["mes_simulado"] >= 12 or P["mes_simulado"] <= 5
    t = 5 if o["apoios"] >= 3 else (4 if recorrente or chuvoso else 3)
    return g * u * t


def sorteio_pesado(d):
    chaves, pesos = zip(*d.items())
    return rng.choices(chaves, weights=pesos)[0]


logs, ocorrencias = [], []


def log(dia, ator, evento, **kw):
    logs.append({"dia": dia, "ator": ator, "evento": evento, **kw})


for dia in range(1, EXP["dias"] + 1):
    for c in EXP["cidadaos"]:
        # 1) fila offline: envia o que ficou pendente quando há rede (Background Sync)
        for o in [x for x in ocorrencias if x["autor"] == c["id"] and not x["recebida"]]:
            if rng.random() < REDE[c["sinal"]] and rng.random() < P["prob_sync_fila_por_dia_com_rede_volta"]["background_sync"]:
                o["recebida"], o["dia_recebida"] = True, dia
                log(dia, c["id"], "fila_offline_enviada", protocolo=o["protocolo"], atraso_dias=dia - o["dia_criada"])
        # 2) "Também vi" em ocorrência do próprio bairro (só com rede)
        for o in ocorrencias:
            if (o["recebida"] and o["bairro"] == c["bairro"] and o["autor"] != c["id"] and o["status"] != "resolvido"
                    and c["id"] not in o["apoiadores"]
                    and rng.random() < P["prob_tambem_vi_dado_que_ve_ocorrencia_vizinha"]
                    and rng.random() < REDE[c["sinal"]]):
                o["apoiadores"].add(c["id"])
                o["apoios"] += 1
                log(dia, c["id"], "tambem_vi", protocolo=o["protocolo"])
        # 3) observa um problema e tenta registrar (assistente de 4 passos)
        if rng.random() >= P["prob_observar_problema_por_dia"] * EXP["bairros"][c["bairro"]]["problemas_por_dia"]:
            continue
        log(dia, c["id"], "observou_problema", bairro=c["bairro"])
        if rng.random() >= P["prob_decidir_registrar_dado_que_observou"]:
            log(dia, c["id"], "nao_registrou", motivo="desistiu_antes_de_abrir")
            continue
        ab = P["prob_abandono_por_passo"]
        base = ab["idade_60_mais"] if c["idade"] >= 60 else ab["base_18_59"]
        if c["modo_facil"]:
            base *= ab["multiplicador_modo_facil"]
        instavel = c["sinal"] != "4g_estavel"
        foto = rng.random() < P["prob_foto_incluida"]
        abandonou = None
        for passo in ("tipo", "foto", "gps", "revisao"):
            p = base
            if passo == "foto" and foto:
                p += ab["passo_foto_extra"]
            if passo == "gps" and instavel:
                p += ab["passo_gps_extra_se_sinal_instavel"]
            if rng.random() < p:
                abandonou = passo
                break
        if abandonou:
            log(dia, c["id"], "abandonou_registro", passo=abandonou, modo_facil=c["modo_facil"])
            continue
        b = EXP["bairros"][c["bairro"]]
        o = {
            "protocolo": f"ZD-{len(ocorrencias) + 1:06d}", "autor": c["id"], "bairro": c["bairro"],
            "categoria": sorteio_pesado(b["categorias"]),
            "lat": b["lat"] + rng.uniform(-0.004, 0.004), "lon": b["lon"] + rng.uniform(-0.004, 0.004),
            "dia_criada": dia, "dia_recebida": None, "recebida": False, "status": "pendente",
            "apoios": 0, "apoiadores": set(), "foto": foto, "dia_resolvida": None,
        }
        ocorrencias.append(o)
        rede = rng.random() < REDE[c["sinal"]]
        ok = rede and (not foto or rng.random() < P["prob_envio_ok_com_rede_com_foto"][c["sinal"]])
        if ok:
            o["recebida"], o["dia_recebida"] = True, dia
            log(dia, c["id"], "registro_enviado", protocolo=o["protocolo"], categoria=o["categoria"], com_foto=foto)
        else:
            log(dia, c["id"], "registro_na_fila_offline", protocolo=o["protocolo"], categoria=o["categoria"],
                motivo="sem_rede" if not rede else "falha_upload")
    # 4) gestores: triagem por GUT, depois resolução
    recebidas = [o for o in ocorrencias if o["recebida"]]
    for g in EXP["gestores"]:
        if dia not in g["dias_de_trabalho"]:
            continue
        fila = sorted((o for o in recebidas if o["status"] == "pendente"), key=lambda o: -gut(o, recebidas, dia))
        for o in fila[:g["capacidade_triagem_dia"]]:
            o["status"] = "em_analise"
            log(dia, g["id"], "colocou_em_analise", protocolo=o["protocolo"], gut=gut(o, recebidas, dia))
        cand = sorted((o for o in recebidas if o["status"] == "em_analise"
                       and dia - o["dia_recebida"] >= P["gestao"]["dias_para_resolucao_minimo"]),
                      key=lambda o: -gut(o, recebidas, dia))
        for o in cand[:g["capacidade_resolucao_dia"]]:
            o["status"], o["dia_resolvida"] = "resolvido", dia
            log(dia, g["id"], "resolveu", protocolo=o["protocolo"], gut=gut(o, recebidas, dia))

# ---- métricas ----
cid = {c["id"]: c for c in EXP["cidadaos"]}
cnt = collections.Counter(entry["evento"] for entry in logs)
criadas = len(ocorrencias)
tentativas = criadas + cnt["abandonou_registro"]
recebidas = [o for o in ocorrencias if o["recebida"]]


def taxa(a, b):
    return round(100 * a / b, 1) if b else None


def grupo(nome, f):
    ab = sum(1 for e in logs if e["evento"] == "abandonou_registro" and f(cid[e["ator"]]))
    ok = sum(1 for o in ocorrencias if f(cid[o["autor"]]))
    return {"grupo": nome, "agentes": sum(1 for c in EXP["cidadaos"] if f(c)), "tentativas": ab + ok,
            "concluidos": ok, "taxa_conclusao_pct": taxa(ok, ab + ok)}


grupos = [
    grupo("Modo Fácil", lambda c: c["modo_facil"]), grupo("Modo normal", lambda c: not c["modo_facil"]),
    grupo("60+ anos", lambda c: c["idade"] >= 60), grupo("18-59 anos", lambda c: c["idade"] < 60),
    grupo("Feminino", lambda c: c["genero"] == "feminino"), grupo("Masculino", lambda c: c["genero"] == "masculino"),
] + [grupo(f"Sinal {s}", lambda c, s=s: c["sinal"] == s) for s in REDE]
atrasos = [e["atraso_dias"] for e in logs if e["evento"] == "fila_offline_enviada"]
tempos = [o["dia_resolvida"] - o["dia_recebida"] for o in recebidas if o["dia_resolvida"]]
por_bairro = collections.Counter(o["bairro"] for o in ocorrencias)
res = {
    "semente": EXP["semente"], "motor": "regras-estocasticas (NAO MiroFish/LLM)", "dias": EXP["dias"],
    "observacoes_de_problema": cnt["observou_problema"], "tentativas_de_registro": tentativas,
    "registros_criados": criadas, "enviados_na_hora": cnt["registro_enviado"],
    "entraram_na_fila_offline": cnt["registro_na_fila_offline"], "fila_enviada_depois": cnt["fila_offline_enviada"],
    "ainda_na_fila_no_dia_7": sum(1 for o in ocorrencias if not o["recebida"]), "abandonos": cnt["abandonou_registro"],
    "abandono_por_passo": dict(collections.Counter(e["passo"] for e in logs if e["evento"] == "abandonou_registro")),
    "taxa_conclusao_pct": taxa(criadas, tentativas), "tambem_vi": cnt["tambem_vi"],
    "atraso_medio_fila_dias": round(sum(atrasos) / len(atrasos), 2) if atrasos else None,
    "status_final": dict(collections.Counter(o["status"] for o in recebidas)),
    "taxa_resolucao_pct": taxa(sum(1 for o in recebidas if o["status"] == "resolvido"), len(recebidas)),
    "tempo_medio_resolucao_dias": round(sum(tempos) / len(tempos), 2) if tempos else None,
    "por_bairro": dict(por_bairro), "grupos": grupos,
}
saida = [{k: (sorted(v) if isinstance(v, set) else v) for k, v in o.items()} for o in ocorrencias]
(AQUI / "logs").mkdir(exist_ok=True)
(AQUI / "logs" / "rodada_01.json").write_text(
    json.dumps({"resumo": res, "eventos": logs, "ocorrencias": saida}, ensure_ascii=False, indent=1), encoding="utf-8")

md = [
    "# Relatório quantitativo — simulação de 7 dias em Ananindeua (VIII SIEPEX)", "",
    f"> **Leia antes de citar.** Simulação **exploratória** com 15 cidadãos e 2 gestores **fictícios**, rodada pelo modelo "
    f"estocástico de regras `rodar_simulacao.py` (semente {EXP['semente']}). **Não foi o MiroFish**: ele precisa de LLM "
    "(Ollama/API) e chave Zep Cloud, indisponíveis no ambiente (Ollama não instalado, sem chaves). Os números decorrem de "
    "premissas declaradas em `experimento_ananindeua_7dias.json`, não calibradas com dados reais, e **não** são evidência "
    "empírica de uso. Servem para testar a lógica do fluxo e orientar perguntas de pesquisa de campo.", "",
    "## Funil de registro", "", "| Indicador | Valor |", "|---|---|",
]
for k, v in [
    ("Problemas observados", res["observacoes_de_problema"]), ("Tentativas de registro (abriram o assistente)", tentativas),
    ("Registros criados (com protocolo)", criadas), ("Enviados na hora", res["enviados_na_hora"]),
    ("Entraram na fila offline", res["entraram_na_fila_offline"]),
    ("Fila enviada depois (Background Sync)", res["fila_enviada_depois"]),
    ("Ainda na fila no dia 7", res["ainda_na_fila_no_dia_7"]), ("Abandonos", res["abandonos"]),
    ("Taxa de conclusão", f"{res['taxa_conclusao_pct']}%"), ("Atraso médio da fila (dias)", res["atraso_medio_fila_dias"]),
    ("“Também vi”", res["tambem_vi"]),
]:
    md.append(f"| {k} | {v} |")
md += ["", f"Abandono por passo: {res['abandono_por_passo']}", "", "## Conclusão do registro por grupo", "",
       "| Grupo | Agentes | Tentativas | Concluídos | Conclusão |", "|---|---|---|---|---|"]
for g in grupos:
    md.append(f"| {g['grupo']} | {g['agentes']} | {g['tentativas']} | {g['concluidos']} | {g['taxa_conclusao_pct']}% |")
md += ["", "Com 15 agentes e 7 dias os grupos têm poucas tentativas: diferenças pequenas são ruído, não efeito.", "",
       "## Gestão", "", f"- Status final das ocorrências recebidas: {res['status_final']}",
       f"- Taxa de resolução: {res['taxa_resolucao_pct']}%",
       f"- Tempo médio até resolver (dias): {res['tempo_medio_resolucao_dias']}", "", "## Ocorrências por bairro", ""]
md += [f"- {b}: {n}" for b, n in por_bairro.most_common()]
md += ["", "## Limitações", "",
       "- Agentes não “raciocinam”: o comportamento é sorteado a partir de probabilidades fixas.",
       "- As probabilidades (abandono, rede, observação) são premissas, não medidas.",
       "- Mudar a semente muda os números; para resultados robustos, repetir muitas rodadas.",
       "- Coordenadas dos bairros são aproximadas.",
       "- Para rodar o MiroFish de verdade: definir `LLM_API_KEY`/`LLM_BASE_URL` (ex.: `http://localhost:11434/v1` com Ollama) "
       "e `ZEP_API_KEY` em `mirofish-engine/.env`; as dependências já estão em `simulation/.venv`."]
(AQUI / "relatorio_siepex.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(json.dumps(res, ensure_ascii=False, indent=1))
