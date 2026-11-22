"""Zelador Digital Comunitário — painel de apoio à decisão (VIII SIEPEX).

Três abas:
  1. Monte Carlo de 30 dias + MLP (metamodelo do SLA em horas).
  2. Dinâmica temporal: fila offline (IndexedDB/Background Sync) e resolução por bairro.
  3. Grafo multiagente dos 24 agentes MiroFish/Zep, Dia 1 a Dia 7.

Todos os números vêm de premissas sintéticas (ver fundamentacao_teorica_siepex.md).
Não são dados de campo.

Rodar:
    pip install streamlit scikit-learn plotly pandas networkx
    streamlit run dashboard_siepex.py
"""

from __future__ import annotations

import html
import json
from pathlib import Path

import networkx as nx
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sklearn.compose import TransformedTargetRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

AQUI = Path(__file__).resolve().parent
SEMENTE = json.loads((AQUI / "experimento_ananindeua_7dias.json").read_text(encoding="utf-8"))

# ---------------------------------------------------------------------------
# Premissas fixas do modelo (todas assumidas, não calibradas)
# ---------------------------------------------------------------------------
DIAS_MC = 30            # horizonte de chegadas
DIAS_DRENO = 30         # dias extras só para esvaziar a fila
ESCALA_DEMANDA = 4.0    # semente tem 15 moradores; escala p/ cidade
RESOLUCOES_POR_EQUIPE = 1.5
CUSTO_DUPLICATA = 0.35  # triagem de relato repetido sem "Também vi"
FRAC_PERTO_UBS = 0.30   # fração das ocorrências perto de UBS/escola
P_BG_SYNC = SEMENTE["parametros_modelo"]["prob_sync_fila_por_dia_com_rede_volta"]["background_sync"]
GRAVIDADE = {"esgoto": 5, "alagamento": 5, "buraco": 4, "arvore": 4, "sinalizacao": 4,
             "calcada": 3, "iluminacao": 3}
# deslocamento do IVS de cada bairro em relação à média (premissa do autor)
IVS_OFFSET = {"Cidade Nova": -0.10, "Coqueiro (BR-316)": 0.00, "Icuí-Guajará": 0.15,
              "Paar": 0.05, "Guanabara": -0.15, "Águas Lindas": 0.15}

BAIRROS = list(SEMENTE["bairros"].keys())
POLITICAS = {0: "Sem GUT (FIFO)", 1: "GUT territorializado + Também Vi"}
# paleta funcional (tema escuro)
VERDE, CIANO, AMBAR, CORAL = "#10B981", "#38BDF8", "#F59E0B", "#F43F5E"
TEXTO, SUAVE, GRADE, CARTAO = "#E5E7EB", "#9CA3AF", "#2E3545", "#1F2430"
COR_POL = {POLITICAS[0]: CORAL, POLITICAS[1]: VERDE}

FEATURES = ["IVS", "Proximidade UBS/Escolas", "Capital Social (Também Vi)",
            "Letramento Digital/Lideranças Comunitárias", "Restrição de Dados Móveis / Offline", "Equipes/Dia",
            "Gravidade", "Perto de UBS/Escola", "Ficou offline", "Relatos 'Também vi'",
            "Política GUT"]

# 24 agentes gerados pelo MiroFish (logs/config.json, sim_a1255520dedd)
AGENTES = [
    (0, "C07", "CitizenUser", "supportive", 1.1, 0.75), (1, "Coqueiro (BR-316)", "NeighborhoodGroup", "observer", 2.2, 0.35),
    (2, "Águas Lindas", "NeighborhoodGroup", "observer", 2.2, 0.35), (3, "C10", "CitizenUser", "supportive", 1.0, 0.65),
    (4, "C14", "ElderlyCitizen", "supportive", 0.9, 0.55), (5, "C01", "CitizenUser", "supportive", 1.2, 0.9),
    (6, "Gestor comunitário B", "CommunityManager", "supportive", 2.5, 0.5), (7, "C13", "ElderlyCitizen", "supportive", 1.0, 0.6),
    (8, "C06", "CitizenUser", "supportive", 1.1, 0.7), (9, "C11", "CitizenUser", "supportive", 0.95, 0.55),
    (10, "C08", "CitizenUser", "supportive", 1.15, 0.8), (11, "Icuí-Guajará", "NeighborhoodGroup", "observer", 2.2, 0.35),
    (12, "C09", "CitizenUser", "supportive", 1.0, 0.6), (13, "Gestor comunitário A", "CommunityManager", "supportive", 2.8, 0.6),
    (14, "Zelador Digital", "AppOfficialAccount", "neutral", 3.0, 0.2), (15, "C04", "CitizenUser", "supportive", 1.1, 0.85),
    (16, "C05", "CitizenUser", "supportive", 1.0, 0.8), (17, "Paar", "NeighborhoodGroup", "observer", 2.2, 0.25),
    (18, "C12", "CitizenUser", "supportive", 0.9, 0.55), (19, "C15", "ElderlyCitizen", "supportive", 0.8, 0.4),
    (20, "Guanabara", "NeighborhoodGroup", "observer", 2.2, 0.25), (21, "C02", "CitizenUser", "neutral", 1.0, 0.75),
    (22, "C03", "CitizenUser", "opposing", 1.1, 0.7), (23, "Cidade Nova", "NeighborhoodGroup", "observer", 2.5, 0.3),
]
# ações reais medidas na rodada MiroFish (relatorio_siepex.md)
ACOES_MIROFISH = {"C10": 10, "Coqueiro (BR-316)": 4, "C13": 4, "Águas Lindas": 4, "Zelador Digital": 4,
                  "C07": 4, "C14": 4, "Gestor comunitário B": 4, "C06": 3}
PERFIS = {"CitizenUser": "Cidadão", "ElderlyCitizen": "Cidadão idoso", "NeighborhoodGroup": "Bairro",
          "CommunityManager": "Gestor comunitário", "AppOfficialAccount": "Conta do app"}
COR_PERFIL = {"Cidadão": CIANO, "Cidadão idoso": "#A78BFA", "Bairro": AMBAR,
              "Gestor comunitário": VERDE, "Conta do app": "#94A3B8"}

st.set_page_config(page_title="Zelador Digital — SIEPEX", page_icon="🏙️", layout="wide")


# ---------------------------------------------------------------------------
# Motor Monte Carlo
# ---------------------------------------------------------------------------
def gerar_ocorrencias(p: dict, rng: np.random.Generator) -> dict:
    """Problemas reais que surgem nos 30 dias. Comum às duas políticas."""
    linhas = []
    for b_idx, nome in enumerate(BAIRROS):
        info = SEMENTE["bairros"][nome]
        ivs_b = float(np.clip(p["ivs"] + IVS_OFFSET[nome], 0, 1))
        lam = (info["problemas_por_dia"] * ESCALA_DEMANDA * (0.6 + 0.8 * ivs_b)
               * (0.5 + 0.5 * p["letramento"]))
        cats = list(info["categorias"].keys())
        pesos = np.array(list(info["categorias"].values()), float)
        pesos /= pesos.sum()
        n_dia = rng.poisson(lam, DIAS_MC)
        n = int(n_dia.sum())
        dia = np.repeat(np.arange(DIAS_MC), n_dia)
        grav = np.array([GRAVIDADE.get(c, 2) for c in rng.choice(cats, n, p=pesos)])
        linhas.append(pd.DataFrame({"bairro": b_idx, "dia": dia, "grav": grav}))
    df = pd.concat(linhas, ignore_index=True)
    n = len(df)
    t_cria = df["dia"].to_numpy() * 24 + rng.uniform(6, 22, n)
    offline = rng.random(n) < p["intermit"]
    bg = rng.random(n) < P_BG_SYNC
    atraso = np.where(bg, rng.exponential(2.0, n),
                      rng.exponential(18 * (1 - 0.6 * p["letramento"]) + 2, n))
    return {
        "bairro": df["bairro"].to_numpy(), "grav": df["grav"].to_numpy(),
        "t_cria": t_cria, "t_sync": t_cria + offline * atraso,
        "offline": offline, "bg": bg,
        "perto": rng.random(n) < FRAC_PERTO_UBS,
        "dup": rng.poisson(0.25 * p["capital"], n),
    }


def processar(oc: dict, p: dict, politica: int, rng: np.random.Generator) -> dict:
    """Fila diária com capacidade das equipes. Devolve SLA (h) e série diária."""
    n = len(oc["t_cria"])
    dia_disp = np.floor(oc["t_sync"] / 24).astype(int) + 1  # mínimo 1 dia (semente)
    pend = np.ones(n, bool)
    t_res = np.full(n, (DIAS_MC + DIAS_DRENO) * 24.0)
    custo = np.ones(n) if politica else 1 + CUSTO_DUPLICATA * oc["dup"]
    w_terr = np.where(oc["perto"], p["prox"], 1.0)
    tend = np.where(1 + oc["dup"] >= 3, 5, 4)  # dezembro = chuvoso -> T>=4
    backlog, resolv_b = [], np.zeros((DIAS_MC + DIAS_DRENO, len(BAIRROS)))
    for d in range(DIAS_MC + DIAS_DRENO):
        cap = rng.poisson(p["equipes"] * RESOLUCOES_POR_EQUIPE)
        fila = np.flatnonzero(pend & (dia_disp <= d))
        backlog.append(len(fila))
        if cap == 0 or len(fila) == 0:
            continue
        if politica:
            idade = d - dia_disp[fila]
            urg = np.where(idade > 7, 5, np.where(idade >= 3, 4, 3))
            gut = oc["grav"][fila] * urg * tend[fila] * w_terr[fila]
            fila = fila[np.lexsort((oc["t_sync"][fila], -gut))]
        else:
            fila = fila[np.argsort(oc["t_sync"][fila])]
        acum = np.cumsum(custo[fila])
        feitos = fila[acum <= cap]
        if len(feitos) == 0:
            continue
        t_res[feitos] = d * 24 + rng.uniform(8, 18, len(feitos))
        pend[feitos] = False
        np.add.at(resolv_b[d], oc["bairro"][feitos], 1)
    sla = np.maximum(t_res - oc["t_cria"], 1.0)
    return {"sla": sla, "resolvido": ~pend, "backlog": np.array(backlog), "resolv_b": resolv_b}


@st.cache_data(show_spinner="Rodando Monte Carlo (30 dias)...")
def monte_carlo(p: dict, reps: int, semente: int = 2026) -> dict:
    ss = np.random.SeedSequence(semente)
    sla_tab, backlog, resolv_b, offline_h, metas = [], {0: [], 1: []}, {0: [], 1: []}, [], []
    horas = (DIAS_MC + 2) * 24
    for r, filho in enumerate(ss.spawn(reps)):
        rng = np.random.default_rng(filho)
        oc = gerar_ocorrencias(p, rng)
        # fila offline por hora (IndexedDB): conta relatos entre criação e sync
        fila_h = np.zeros((2, horas))
        for k, mask in enumerate([oc["bg"], ~oc["bg"]]):
            m = oc["offline"] & mask
            ini = oc["t_cria"][m].astype(int)
            fim = np.minimum(np.ceil(oc["t_sync"][m]).astype(int), horas - 1)
            np.add.at(fila_h[k], ini, 1)
            np.add.at(fila_h[k], fim, -1)
        offline_h.append(np.cumsum(fila_h, axis=1))
        metas.append(len(oc["t_cria"]))
        for pol in (0, 1):
            res = processar(oc, p, pol, np.random.default_rng(filho.spawn(1)[0]))
            backlog[pol].append(res["backlog"])
            resolv_b[pol].append(res["resolv_b"])
            sla_tab.append(pd.DataFrame({
                "rep": r, "politica": POLITICAS[pol], "bairro": np.array(BAIRROS)[oc["bairro"]],
                "grav": oc["grav"], "offline": oc["offline"], "sla_h": res["sla"],
                "resolvido": res["resolvido"]}))
    return {
        "sla": pd.concat(sla_tab, ignore_index=True),
        "backlog": {k: np.array(v) for k, v in backlog.items()},
        "resolv_b": {k: np.array(v) for k, v in resolv_b.items()},
        "offline_h": np.array(offline_h),
        "ocorrencias_media": float(np.mean(metas)),
    }


@st.cache_resource(show_spinner="Treinando a rede neural MLP (64-32-16)...")
def treinar_mlp(n_cenarios: int = 90, semente: int = 7):
    """Metamodelo: aprende SLA (h) a partir de cenários aleatórios do Monte Carlo."""
    rng = np.random.default_rng(semente)
    blocos = []
    for _ in range(n_cenarios):
        p = {"ivs": rng.uniform(0, 1), "prox": rng.uniform(1, 2), "capital": rng.uniform(1, 5),
             "letramento": rng.uniform(0, 1), "intermit": rng.uniform(0, 0.8),
             "equipes": int(rng.integers(2, 21))}
        oc = gerar_ocorrencias(p, rng)
        for pol in (0, 1):
            res = processar(oc, p, pol, rng)
            n = len(res["sla"])
            blocos.append(np.column_stack([
                np.full(n, p["ivs"]), np.full(n, p["prox"]), np.full(n, p["capital"]),
                np.full(n, p["letramento"]), np.full(n, p["intermit"]), np.full(n, p["equipes"]),
                oc["grav"], oc["perto"], oc["offline"], oc["dup"], np.full(n, pol), res["sla"]]))
    dados = np.vstack(blocos)
    dados = dados[rng.choice(len(dados), min(12000, len(dados)), replace=False)]
    X, y = dados[:, :-1], dados[:, -1]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    modelo = TransformedTargetRegressor(
        regressor=make_pipeline(
            StandardScaler(),
            MLPRegressor(hidden_layer_sizes=(64, 32, 16), activation="relu", alpha=1e-3,
                         learning_rate_init=1e-3, max_iter=400, early_stopping=True,
                         random_state=42)),
        func=np.log1p, inverse_func=np.expm1)
    modelo.fit(X_tr, y_tr)
    y_hat = modelo.predict(X_te)
    imp = permutation_importance(modelo, X_te[:2000], y_te[:2000], n_repeats=5,
                                 random_state=42, scoring="neg_mean_absolute_error")
    return {
        "modelo": modelo, "r2": r2_score(y_te, y_hat), "mae": mean_absolute_error(y_te, y_hat),
        "n_tr": len(X_tr), "n_te": len(X_te),
        "imp": pd.DataFrame({"variavel": FEATURES, "importancia": imp.importances_mean,
                             "dp": imp.importances_std}).sort_values("importancia"),
        "teste": pd.DataFrame({"real": y_te[:1500], "previsto": y_hat[:1500]}),
    }


def linha_x(p: dict, grav: int, perto: int, offline: int, dup: float, pol: int) -> list:
    return [p["ivs"], p["prox"], p["capital"], p["letramento"], p["intermit"], p["equipes"],
            grav, perto, offline, dup, pol]


# ---------------------------------------------------------------------------
# Grafo multiagente (7 dias)
# ---------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def eventos_grafo(p: dict, semente: int = SEMENTE["semente"]) -> pd.DataFrame:
    """Eventos dia a dia entre os 24 agentes: registro, sync, Também vi, atuação."""
    rng = np.random.default_rng(semente)
    pm = SEMENTE["parametros_modelo"]
    cid = {c["id"]: c for c in SEMENTE["cidadaos"]}
    ev, pend = [], []  # pend: (bairro, gravidade)
    fator_sinal = {"4g_estavel": 0.3, "4g_instavel": 1.0, "3g_instavel": 1.4}
    trabalho = {g["papel"]: set(g["dias_de_trabalho"]) for g in SEMENTE["gestores"]}
    for dia in range(1, 8):
        registros = []
        for c in cid.values():
            ivs_b = np.clip(p["ivs"] + IVS_OFFSET[c["bairro"]], 0, 1)
            p_obs = pm["prob_observar_problema_por_dia"] * (0.6 + 0.8 * ivs_b)
            ajuda = 1.0 + (0.4 if c["modo_facil"] or c["idade"] >= 60 else 0.0) * p["letramento"]
            p_reg = min(0.95, pm["prob_decidir_registrar_dado_que_observou"] * (0.6 + 0.8 * p["letramento"]) * ajuda / 1.4)
            if rng.random() < p_obs and rng.random() < p_reg:
                cats = SEMENTE["bairros"][c["bairro"]]["categorias"]
                cat = rng.choice(list(cats), p=np.array(list(cats.values())) / sum(cats.values()))
                off = rng.random() < min(0.95, p["intermit"] * fator_sinal[c["sinal"]])
                atraso = 0 if not off else (0 if rng.random() < P_BG_SYNC else 1)
                ev.append((dia, c["id"], "Zelador Digital", "Registro offline (IndexedDB)" if off else "Registro", cat))
                if off:
                    ev.append((dia + atraso, c["id"], "Zelador Digital", "Sincronização", cat))
                ev.append((dia, c["id"], c["bairro"], "Relato no bairro", cat))
                registros.append((c["id"], c["bairro"], cat))
                pend.append((c["bairro"], GRAVIDADE.get(cat, 2)))
        # Também vi: vizinhos confirmam relatos do dia
        p_tv = min(0.9, pm["prob_tambem_vi_dado_que_ve_ocorrencia_vizinha"] * p["capital"] / 1.5)
        for autor, bairro, cat in registros:
            for c in cid.values():
                if c["id"] != autor and c["bairro"] == bairro and rng.random() < p_tv:
                    ev.append((dia, c["id"], autor, "Também vi", cat))
        # equipes: cada gestor coordena metade das equipes e atende por GUT
        for gestor in ("Gestor comunitário A", "Gestor comunitário B"):
            if dia not in trabalho[gestor] or not pend:
                continue
            cap = rng.poisson(p["equipes"] / 2 * RESOLUCOES_POR_EQUIPE / 4)  # escala 15 moradores
            pend.sort(key=lambda x: -x[1] * (p["prox"] if x[0] in ("Icuí-Guajará", "Águas Lindas") else 1))
            for _ in range(min(cap, len(pend))):
                bairro, g = pend.pop(0)
                ev.append((dia, gestor, bairro, "Atuação da equipe", f"gravidade {g}"))
    return pd.DataFrame(ev, columns=["dia", "origem", "destino", "tipo", "detalhe"])


def estado_grafo(ev: pd.DataFrame, dia: int):
    """Grafo acumulado até o dia, com memória episódica e clusters."""
    G = nx.Graph()
    for aid, nome, tipo, postura, infl, ativ in AGENTES:
        G.add_node(nome, perfil=PERFIS[tipo], postura=postura, influencia=infl, atividade=ativ)
    for c in SEMENTE["cidadaos"]:  # vínculo de residência (estrutural)
        G.add_edge(c["id"], c["bairro"], tipo="Mora em", peso=0.5)
    ate = ev[ev["dia"] <= dia]
    for (o, d_, t), grp in ate.groupby(["origem", "destino", "tipo"]):
        if G.has_edge(o, d_) and G[o][d_]["tipo"] != "Mora em":
            G[o][d_]["peso"] += len(grp)
        else:
            G.add_edge(o, d_, tipo=t, peso=float(len(grp)))
    episodios = pd.concat([ate["origem"], ate["destino"]]).value_counts()
    tv = nx.Graph([(o, d_) for o, d_ in ate.loc[ate["tipo"] == "Também vi", ["origem", "destino"]].values])
    cluster = {}
    for k, comp in enumerate(sorted(nx.connected_components(tv), key=len, reverse=True), 1):
        for n_ in comp:
            cluster[n_] = k
    for n_ in G.nodes:
        e = int(episodios.get(n_, 0))
        G.nodes[n_]["episodios"] = e
        G.nodes[n_]["memoria"] = 1 - np.exp(-0.35 * e)  # consolidação (Zep)
        G.nodes[n_]["cluster"] = cluster.get(n_, 0)
    return G


@st.cache_data(show_spinner=False)
def posicoes() -> dict:
    G = nx.Graph()
    G.add_nodes_from(a[1] for a in AGENTES)
    for c in SEMENTE["cidadaos"]:
        G.add_edge(c["id"], c["bairro"])
        G.add_edge(c["id"], "Zelador Digital", weight=0.2)
    for b in BAIRROS:
        G.add_edge(b, "Gestor comunitário A", weight=0.3)
        G.add_edge(b, "Gestor comunitário B", weight=0.3)
    return {k: tuple(v) for k, v in nx.spring_layout(G, seed=11, k=0.55, iterations=200).items()}


COR_ARESTA = {"Mora em": "#3B4357", "Registro": CIANO, "Registro offline (IndexedDB)": AMBAR,
              "Sincronização": "#7DD3FC", "Relato no bairro": "#64748B", "Também vi": CORAL,
              "Atuação da equipe": VERDE}


def figura_grafo(G: nx.Graph, perfis: list[str]) -> go.Figure:
    pos = posicoes()
    vis = {n for n, a in G.nodes(data=True) if a["perfil"] in perfis}
    fig = go.Figure()
    for tipo, cor in COR_ARESTA.items():
        xs, ys, larg = [], [], []
        for u, v, a in G.edges(data=True):
            if a["tipo"] == tipo and u in vis and v in vis:
                xs += [pos[u][0], pos[v][0], None]
                ys += [pos[u][1], pos[v][1], None]
                larg.append(a["peso"])
        if xs:
            fig.add_trace(go.Scatter(
                x=xs, y=ys, mode="lines", name=tipo, hoverinfo="skip",
                line=dict(color=cor, width=1 if tipo == "Mora em" else min(1.5 + 0.6 * np.mean(larg), 6),
                          dash="dot" if "offline" in tipo else "solid")))
    for perfil in perfis:
        nos = [n for n in vis if G.nodes[n]["perfil"] == perfil]
        if not nos:
            continue
        at = [G.nodes[n] for n in nos]
        fig.add_trace(go.Scatter(
            x=[pos[n][0] for n in nos], y=[pos[n][1] for n in nos], mode="markers+text",
            name=perfil, text=nos, textposition="top center", textfont=dict(size=10, color=TEXTO),
            marker=dict(size=[12 + 7 * a["influencia"] for a in at], color=COR_PERFIL[perfil],
                        opacity=[0.25 + 0.75 * a["memoria"] for a in at],
                        line=dict(width=[1 + 3 * a["memoria"] for a in at], color="#E5E7EB")),
            customdata=[[a["memoria"], a["episodios"], a["cluster"] or "—", G.degree(n),
                         ACOES_MIROFISH.get(n, 0)] for n, a in zip(nos, at)],
            hovertemplate=("<b>%{text}</b><br>Memória episódica: %{customdata[0]:.0%}"
                           "<br>Episódios: %{customdata[1]}<br>Cluster Também Vi: %{customdata[2]}"
                           "<br>Grau: %{customdata[3]}<br>Ações medidas no MiroFish: %{customdata[4]}"
                           "<extra></extra>")))
    fig.update_xaxes(visible=False)
    fig.update_yaxes(visible=False)
    return fig


# ---------------------------------------------------------------------------
# Componentes visuais
# ---------------------------------------------------------------------------
AUTORIA = "Dante Dias Monteiro • Bacharelado em Ciência e Tecnologia — IFPA Campus Ananindeua"
NOME_PROBLEMA = {"buraco": "Buraco na via", "lixo": "Lixo acumulado", "iluminacao": "Poste apagado",
                 "calcada": "Calçada danificada", "sinalizacao": "Sinalização danificada",
                 "alagamento": "Alagamento", "esgoto": "Esgoto a céu aberto", "arvore": "Árvore com risco de queda"}

CSS_KPI = f"""<style>
.zd-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:2px 0 6px}}
.zd-kpi{{background:{CARTAO};border:1px solid {GRADE};border-radius:14px;padding:14px 16px;
  display:flex;gap:14px;align-items:flex-start}}
.zd-ic{{flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:20px;font-weight:700}}
.zd-lb{{font-size:.74rem;color:{SUAVE};text-transform:uppercase;letter-spacing:.05em}}
.zd-vl{{font-size:1.75rem;font-weight:700;color:#F3F4F6;line-height:1.15;margin-top:2px}}
.zd-dc{{font-size:.82rem;color:{SUAVE};margin-top:4px;line-height:1.35}}
.zd-dc b{{color:{TEXTO};font-weight:600}}
</style>"""


def num(x: float, casas: int = 0) -> str:
    """Número no padrão brasileiro (vírgula decimal, ponto de milhar)."""
    return f"{x:,.{casas}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def cards_kpi(itens: list[dict]) -> None:
    """Cartões com ícone circular colorido, número grande e legenda direta."""
    blocos = []
    for k in itens:
        cor = k["cor"]
        blocos.append(
            f'<div class="zd-kpi"><div class="zd-ic" style="background:{cor}26;color:{cor}">{k["icone"]}</div>'
            f'<div><div class="zd-lb">{html.escape(k["rotulo"])}</div><div class="zd-vl">{html.escape(k["valor"])}</div>'
            f'<div class="zd-dc">{k["legenda"]}</div></div></div>')
    st.html(CSS_KPI + '<div class="zd-grid">' + "".join(blocos) + "</div>")


def mostrar(fig: go.Figure, alt: str, altura: int = 360, topo: int = 56, **kw) -> None:
    """Aplica o estilo escuro do painel e desenha o gráfico Plotly."""
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", height=altura,
        font=dict(color=TEXTO, size=13), margin=dict(l=8, r=8, t=topo, b=8),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0,
                    title=None, bgcolor="rgba(0,0,0,0)", font=dict(size=11)),
        hoverlabel=dict(bgcolor=CARTAO, bordercolor=GRADE, font=dict(color=TEXTO)))
    fig.update_xaxes(gridcolor=GRADE, zerolinecolor=GRADE, linecolor=GRADE, automargin=True)
    fig.update_yaxes(gridcolor=GRADE, zerolinecolor=GRADE, linecolor=GRADE, automargin=True)
    st.plotly_chart(fig, theme=None, width="stretch", alt=alt,
                    config={"displaylogo": False}, **kw)


def rgba(hexcor: str, a: float) -> str:
    h = hexcor.lstrip("#")
    return f"rgba({int(h[0:2], 16)},{int(h[2:4], 16)},{int(h[4:6], 16)},{a})"


def donuts(itens: list[tuple[str, float, str]], alt: str) -> None:
    """Três medidores em rosca numa só figura (redimensiona junto com o cartão)."""
    fig = go.Figure()
    n = len(itens)
    for i, (rotulo, valor, cor) in enumerate(itens):
        v = float(np.clip(valor, 0, 100))
        x0, x1 = i / n + 0.02, (i + 1) / n - 0.02
        fig.add_trace(go.Pie(values=[v, 100 - v], hole=0.72, sort=False, direction="clockwise",
                             marker=dict(colors=[cor, GRADE]), textinfo="none", hoverinfo="skip",
                             domain=dict(x=[x0, x1], y=[0.26, 1])))
        fig.add_annotation(text=f"<b>{num(v)}%</b>", x=(x0 + x1) / 2, y=0.63, xref="paper", yref="paper",
                           showarrow=False, font=dict(size=20, color=TEXTO))
        fig.add_annotation(text=rotulo, x=(x0 + x1) / 2, y=0.0, xref="paper", yref="paper",
                           showarrow=False, font=dict(size=11, color=cor))
    fig.update_layout(showlegend=False)
    mostrar(fig, alt, altura=230, topo=6)


def carga_rho(p: dict) -> float:
    """Razão de carga ρ = demanda diária esperada / capacidade das equipes."""
    lam = sum(SEMENTE["bairros"][b]["problemas_por_dia"] * ESCALA_DEMANDA
              * (0.6 + 0.8 * float(np.clip(p["ivs"] + IVS_OFFSET[b], 0, 1)))
              * (0.5 + 0.5 * p["letramento"]) for b in BAIRROS)
    return lam / (p["equipes"] * RESOLUCOES_POR_EQUIPE)


# ---------------------------------------------------------------------------
# Interface
# ---------------------------------------------------------------------------
with st.sidebar:
    st.caption(AUTORIA)
    st.header("Parâmetros do cenário")
    st.caption("Alimentam a rede neural, o Monte Carlo e o grafo.")
    st.subheader(":material/diversity_3: Sociais")
    ivs = st.slider("IVS — Índice de Vulnerabilidade Social", 0.0, 1.0, 0.45, 0.01,
                    help="IPEA. Maior IVS → mais problemas por dia em cada bairro.")
    prox = st.slider("Proximidade UBS/Escolas (peso territorial)", 1.0, 2.0, 1.4, 0.05, format="%.2fx",
                     help="Multiplica o escore GUT de ocorrências perto de UBS ou escola.")
    capital = st.slider("Capital Social — 'Também Vi'", 1.0, 5.0, 2.5, 0.1,
                        help="Confirmações médias por vizinhos. Sobe a Tendência (T) e agrupa duplicatas.")
    letramento = st.slider("Letramento Digital / apoio de Lideranças Comunitárias", 0, 100, 50, 5, format="%d%%",
                           help="Mais registros (menos subnotificação) e sync mais rápida ao abrir o app.") / 100
    st.subheader(":material/engineering: Operacionais")
    intermit = st.slider("Restrição de Dados Móveis / Offline", 0, 80, 30, 5, format="%d%%",
                         help="Chance de o relato nascer offline e ir para a fila do IndexedDB: franquia "
                              "pré-paga esgotada, pontos de sombra ou quedas durante temporais. A cidade "
                              "tem cobertura 4G/5G; o limite é o acesso aos dados, não a antena.") / 100
    equipes = st.slider("Equipes de campo por dia", 2, 20, 8)
    st.divider()
    reps = st.select_slider("Repetições Monte Carlo", [30, 60, 100, 200], value=60,
                            help="Mais repetições = faixa P10–P90 mais estável, cálculo mais lento.")

P = {"ivs": ivs, "prox": prox, "capital": capital, "letramento": letramento,
     "intermit": intermit, "equipes": equipes}

st.title("Zelador Digital Comunitário")
st.caption(f"Painel de apoio à decisão · VIII SIEPEX · {AUTORIA}")

with st.expander("Guia didático: como ler este painel", icon=":material/school:"):
    g1, g2 = st.columns(2)
    with g1:
        st.markdown(
            "**:material/format_list_numbered: FIFO — a fila comum.** Quem chega primeiro é atendido "
            "primeiro, como fila de banco. Um esgoto a céu aberto espera atrás de um poste apagado "
            "que chegou antes.\n\n"
            "**:material/priority_high: Matriz GUT territorializada.** Cada relato ganha uma nota "
            "**G × U × T**: *Gravidade* (esgoto vale 5, poste vale 3), *Urgência* (sobe com os dias de "
            "espera) e *Tendência* (sobe quando vizinhos marcam **\"Também vi\"**). A nota é multiplicada "
            "por um peso extra quando o problema está perto de **UBS ou escola**. Os casos de nota mais "
            "alta são atendidos primeiro. É o que o Zelador Digital faz no Painel do Gestor.")
    with g2:
        st.markdown(
            "**:material/casino: Monte Carlo (faixa P10–P90).** O computador sorteia o mês inteiro "
            "dezenas de vezes, com chegadas diferentes a cada rodada. A linha mostra o caso típico "
            "(mediana); a faixa sombreada mostra onde caem 80% das rodadas: só 10% ficam abaixo dela "
            "(P10) e só 10% acima (P90).\n\n"
            "**:material/neurology: Rede neural MLP (R² e MAE).** Uma rede de 64-32-16 neurônios aprendeu "
            "com milhares de ocorrências simuladas a prever o **SLA**, o tempo até resolver em horas. "
            "O **R²** diz quanto da variação do SLA a rede explica (1 = tudo). O **MAE** é o erro médio, "
            "em horas, de cada previsão.")
    st.info("Tudo aqui é simulado com premissas do autor e agentes fictícios. Serve para comparar "
            "cenários, não para medir Ananindeua. Modelo completo em "
            "`simulation/fundamentacao_teorica_siepex.md`.", icon=":material/info:")

mc = monte_carlo(P, reps)
sla = mc["sla"]
ml = treinar_mlp()
mod = ml["modelo"]
sem, com = POLITICAS[0], POLITICAS[1]
resumo = (sla.groupby("politica")
          .agg(media=("sla_h", "mean"), p90=("sla_h", lambda s: s.quantile(0.9)),
               resolvido=("resolvido", "mean"))
          .reindex(list(POLITICAS.values())))
crit = sla[sla["grav"] >= 5].groupby("politica")["sla_h"].mean().reindex(list(POLITICAS.values()))
prev = mod.predict(np.array([linha_x(P, 5, 1, 0, P["capital"] * 0.25, 0),
                             linha_x(P, 5, 1, 0, P["capital"] * 0.25, 1)]))
ganho = resumo.loc[sem, "media"] - resumo.loc[com, "media"]

cards_kpi([
    {"icone": "⏱", "cor": VERDE, "rotulo": "SLA médio · Zelador Digital", "valor": f"{num(resumo.loc[com, 'media'])} h",
     "legenda": f"<b>{num(abs(ganho))} h {'a menos' if ganho >= 0 else 'a mais'}</b> que a fila FIFO "
                f"(≈ {num(abs(ganho) / 24, 1)} dias)"},
    {"icone": "⚠", "cor": CORAL, "rotulo": "Casos graves (gravidade 5)", "valor": f"{num(crit[com])} h",
     "legenda": f"esgoto e alagamento; na FIFO esperam <b>{num(crit[sem])} h</b>"},
    {"icone": "◈", "cor": CIANO, "rotulo": "Previsão MLP · esgoto perto de UBS", "valor": f"{num(prev[1])} h",
     "legenda": f"contra <b>{num(prev[0])} h</b> previstas na FIFO"},
    {"icone": "R²", "cor": AMBAR, "rotulo": "R² da rede neural", "valor": num(ml["r2"], 2),
     "legenda": f"<b>{num(ml['r2'] * 100)}% da variância</b> do SLA explicada"},
    {"icone": "±", "cor": "#A78BFA", "rotulo": "MAE da rede neural", "valor": f"{num(ml['mae'])} h",
     "legenda": f"erro médio de <b>≈ {num(ml['mae'] / 24, 1)} dias</b> por ocorrência"},
])

aba1, aba2, aba3 = st.tabs([":material/insights: Monte Carlo + Rede Neural",
                            ":material/schedule: Dinâmica temporal",
                            ":material/hub: Grafo multiagente"])

# --- Aba 1 ------------------------------------------------------------------
with aba1:
    rho = carga_rho(P)
    risco = 100 / (1 + np.exp(-(rho - 1) / 0.12))
    cor_risco = VERDE if risco < 50 else AMBAR if risco < 80 else CORAL
    g5 = sla[(sla["grav"] >= 5)]
    res72 = g5.assign(ok=g5["sla_h"] <= 72).groupby("politica")["ok"].mean() * 100

    c1, c2 = st.columns([2, 3])
    with c1, st.container(border=True, height="stretch"):
        st.markdown("**Risco de saturação operacional**")
        fig = go.Figure(go.Indicator(
            mode="gauge+number", value=risco,
            number=dict(suffix="%", valueformat=".0f", font=dict(size=34, color=cor_risco)),
            gauge=dict(axis=dict(range=[0, 100], tickcolor=SUAVE, tickfont=dict(color=SUAVE)),
                       bar=dict(color=cor_risco, thickness=0.3), bgcolor=CARTAO, borderwidth=0,
                       steps=[dict(range=[0, 50], color=rgba(VERDE, 0.14)),
                              dict(range=[50, 80], color=rgba(AMBAR, 0.14)),
                              dict(range=[80, 100], color=rgba(CORAL, 0.16))],
                       threshold=dict(line=dict(color=CORAL, width=3), value=80))))
        mostrar(fig, "Velocímetro do risco de saturação das equipes", altura=240, topo=24)
        st.caption(f"Demanda esperada ÷ capacidade das equipes: **ρ = {num(rho, 2)}**. "
                   "Acima de 1, chegam mais problemas do que as equipes resolvem e a fila cresce.")
    with c2, st.container(border=True, height="stretch"):
        st.markdown("**Indicadores do cenário**")
        donuts([("Resolução<br>crítica", res72.get(com, 0), VERDE),
                ("Lideranças<br>Comunitárias", P["letramento"] * 100, CIANO),
                ("Acurácia<br>R²", ml["r2"] * 100, AMBAR)],
               "Resolução crítica, apoio de Lideranças Comunitárias e acurácia R² em percentual")
        st.caption(f"**Resolução crítica:** casos graves resolvidos em até 72 h "
                   f"(na FIFO: {num(res72.get(sem, 0))}%). "
                   "**Lideranças Comunitárias:** moradores com letramento digital ou ajuda de Lideranças Comunitárias. "
                   "**Acurácia R²:** parte do SLA que a rede neural consegue explicar.")

    c1, c2 = st.columns(2)
    with c1, st.container(border=True):
        st.markdown("**Sem GUT vs Com GUT territorializado + Também Vi**")
        tab = pd.DataFrame({
            "Indicador": ["SLA médio"] * 2 + ["SLA P90"] * 2 + ["SLA gravidade 5"] * 2,
            "Política": [sem, com] * 3,
            "Horas": [resumo.loc[sem, "media"], resumo.loc[com, "media"], resumo.loc[sem, "p90"],
                      resumo.loc[com, "p90"], crit[sem], crit[com]]})
        fig = px.bar(tab, x="Indicador", y="Horas", color="Política", barmode="group",
                     color_discrete_map=COR_POL, text_auto=".0f")
        fig.update_traces(marker_line_width=0, textfont_color=TEXTO)
        fig.update_layout(xaxis_title=None, yaxis_title="Horas")
        mostrar(fig, "SLA médio, P90 e de gravidade 5 nas duas políticas", altura=380)
    with c2, st.container(border=True):
        st.markdown("**Fila de ocorrências nos 30 dias** · mediana e faixa P10–P90")
        fig = go.Figure()
        dias = np.arange(1, DIAS_MC + 1)
        for pol, nome in POLITICAS.items():
            b = mc["backlog"][pol][:, :DIAS_MC]
            lo, md, hi = np.percentile(b, [10, 50, 90], axis=0)
            cor = COR_POL[nome]
            fig.add_trace(go.Scatter(x=dias, y=hi, line=dict(width=0), hoverinfo="skip", showlegend=False))
            fig.add_trace(go.Scatter(x=dias, y=lo, line=dict(width=0), fill="tonexty",
                                     fillcolor=rgba(cor, 0.12), hoverinfo="skip", showlegend=False))
            fig.add_trace(go.Scatter(x=dias, y=md, name=nome, line=dict(color=cor, width=3),
                                     fill="tozeroy", fillcolor=rgba(cor, 0.18)))
        fig.update_layout(xaxis_title="Dia", yaxis_title="Ocorrências esperando")
        mostrar(fig, "Fila acumulada nos 30 dias nas duas políticas", altura=380)

    @st.fragment
    def simulador() -> None:
        with st.container(border=True):
            st.markdown("**:material/science: Testar ocorrência real em Ananindeua (inferência MLP)**")
            st.caption("Escolha um bairro e um problema. A rede neural prevê o tempo até resolver "
                       "nas duas políticas, com os parâmetros da barra lateral.")
            with st.container(horizontal=True, vertical_alignment="bottom"):
                bairro = st.selectbox("Bairro", BAIRROS, index=2, key="sim_bairro")
                cats = list(SEMENTE["bairros"][bairro]["categorias"])
                problema = st.selectbox("Problema", cats, format_func=NOME_PROBLEMA.get, key="sim_prob")
                tv = st.number_input("Vizinhos que marcaram \"Também vi\"", 0, 8, 2, key="sim_tv")
            with st.container(horizontal=True):
                perto = st.toggle("Perto de UBS ou escola", True, key="sim_perto")
                offline = st.toggle("Registrado sem internet", False, key="sim_off")
            p_b = {**P, "ivs": float(np.clip(P["ivs"] + IVS_OFFSET[bairro], 0, 1))}
            g = GRAVIDADE.get(problema, 2)
            fifo, zd = mod.predict(np.array([linha_x(p_b, g, int(perto), int(offline), tv, pol)
                                             for pol in (0, 1)]))
            dif = fifo - zd
            cards_kpi([
                {"icone": "⇥", "cor": CORAL, "rotulo": "Fila comum (FIFO)", "valor": f"{num(fifo)} h",
                 "legenda": f"≈ <b>{num(fifo / 24, 1)} dias</b> até a equipe resolver"},
                {"icone": "✓", "cor": VERDE, "rotulo": "Zelador Digital (GUT + Também vi)",
                 "valor": f"{num(zd)} h", "legenda": f"≈ <b>{num(zd / 24, 1)} dias</b> até a equipe resolver"},
                {"icone": "Δ", "cor": CIANO if dif >= 0 else AMBAR, "rotulo": "Diferença",
                 "valor": f"{num(abs(dif))} h {'mais rápido' if dif >= 0 else 'mais lento'}",
                 "legenda": f"{NOME_PROBLEMA[problema]} em {bairro}: gravidade <b>{g}</b>, "
                            f"IVS local <b>{num(p_b['ivs'], 2)}</b>"},
            ])
            if dif < 0:
                st.caption("Problemas de baixa gravidade podem esperar mais no Zelador Digital: "
                           "a fila passa os casos graves na frente.")

    simulador()

    c3, c4 = st.columns(2)
    with c3, st.container(border=True):
        st.markdown("**Importância das variáveis** · quanto o erro sobe ao embaralhar cada uma")
        imp = ml["imp"]
        fig = px.bar(imp, x="importancia", y="variavel", orientation="h", error_x="dp",
                     color_discrete_sequence=[VERDE])
        fig.update_traces(marker_line_width=0, error_x_color=SUAVE)
        fig.update_layout(xaxis_title="Aumento do MAE (h)", yaxis_title=None)
        mostrar(fig, "Importância das variáveis da rede neural", altura=430, topo=16)
    with c4, st.container(border=True):
        st.markdown("**SLA previsto vs equipes por dia** · esgoto perto de UBS")
        eq = np.arange(2, 21)
        curvas = []
        for pol, nome in POLITICAS.items():
            Xc = np.array([linha_x({**P, "equipes": e}, 5, 1, 0, P["capital"] * 0.25, pol) for e in eq])
            curvas.append(pd.DataFrame({"Equipes/dia": eq, "SLA previsto (h)": mod.predict(Xc), "Política": nome}))
        fig = px.line(pd.concat(curvas), x="Equipes/dia", y="SLA previsto (h)", color="Política",
                      markers=True, color_discrete_map=COR_POL)
        fig.add_vline(x=equipes, line_dash="dash", line_color=SUAVE)
        mostrar(fig, "SLA previsto pela MLP conforme o número de equipes", altura=430)

    with st.expander("Ficha técnica da rede neural e do Monte Carlo", icon=":material/description:"):
        st.markdown(
            f"- **Monte Carlo:** {reps} repetições × 30 dias de chegadas (+30 de dreno), "
            f"≈{num(mc['ocorrencias_media'])} ocorrências por repetição; mesmas chegadas nas duas políticas "
            "(números aleatórios comuns).\n"
            f"- **MLP:** `MLPRegressor(64, 32, 16)`, ReLU, Adam, `StandardScaler`, alvo em log(1+SLA); "
            f"treino {ml['n_tr']} / teste {ml['n_te']} (80/20), dados de 90 cenários aleatórios do próprio simulador.\n"
            "- A MLP é um **metamodelo** do simulador: aprende as premissas, não a realidade.")
        fig = px.scatter(ml["teste"], x="real", y="previsto", opacity=0.35, log_x=True, log_y=True,
                         color_discrete_sequence=[CIANO],
                         labels={"real": "SLA simulado (h)", "previsto": "SLA previsto pela MLP (h)"})
        lim = [ml["teste"].min().min(), ml["teste"].max().max()]
        fig.add_trace(go.Scatter(x=lim, y=lim, mode="lines", line=dict(dash="dash", color=CORAL),
                                 name="previsão perfeita"))
        mostrar(fig, "SLA simulado contra SLA previsto pela MLP", altura=360)

# --- Aba 2 ------------------------------------------------------------------
with aba2:
    off = mc["offline_h"]  # reps x 2 x horas
    pct_off = sla[sla["politica"] == com]["offline"].mean()
    pico = off.sum(axis=1).max(axis=1).mean()
    cards_kpi([
        {"icone": "⌁", "cor": AMBAR, "rotulo": "Relatos que nasceram offline", "valor": f"{num(pct_off * 100)}%",
         "legenda": "ficaram guardados no celular (IndexedDB) até a rede voltar"},
        {"icone": "▤", "cor": CIANO, "rotulo": "Pico da fila no celular", "valor": f"{num(pico, 1)} relatos",
         "legenda": "maior número de relatos esperando envio ao mesmo tempo"},
        {"icone": "↻", "cor": VERDE, "rotulo": "Envio automático", "valor": f"{num(P_BG_SYNC * 100)}%",
         "legenda": "dos aparelhos têm <b>Background Sync</b> (Chrome/Android)"},
        {"icone": "✓", "cor": VERDE, "rotulo": "Resolvidos em 60 dias", "valor": f"{num(resumo.loc[com, 'resolvido'] * 100)}%",
         "legenda": f"com GUT; na FIFO <b>{num(resumo.loc[sem, 'resolvido'] * 100)}%</b>"},
    ])

    with st.container(border=True):
        st.markdown("**Fila offline no celular (IndexedDB)** · média por hora, primeiros 7 dias")
        h = np.arange(7 * 24)
        fig = go.Figure()
        for k, (nome, cor) in enumerate([("Background Sync (Chrome/Android)", CIANO),
                                         ("Ao abrir o app (sem Background Sync)", AMBAR)]):
            fig.add_trace(go.Scatter(x=h / 24 + 1, y=off[:, k, :7 * 24].mean(0), name=nome, stackgroup="fila",
                                     line=dict(color=cor, width=1.5), fillcolor=rgba(cor, 0.35)))
        fig.update_layout(xaxis_title="Dia", yaxis_title="Relatos na fila")
        mostrar(fig, "Fila offline no IndexedDB por hora nos primeiros 7 dias", altura=320)

    pol_sel = st.segmented_control("Política", list(POLITICAS.values()), default=com, key="pol_aba2") or com
    pol_k = 0 if pol_sel == sem else 1
    tot_b = sla[sla["politica"] == pol_sel].groupby("bairro").size().reindex(BAIRROS) / reps
    acum = np.cumsum(mc["resolv_b"][pol_k].mean(0), axis=0)
    pct_b = pd.DataFrame(acum / tot_b.to_numpy() * 100, columns=BAIRROS)
    sla_b = sla[sla["politica"] == pol_sel].groupby("bairro")["sla_h"].mean()

    c1, c2 = st.columns([2, 3])
    with c1, st.container(border=True, height="stretch"):
        st.markdown("**Resolução por bairro de Ananindeua** · até o dia 30")
        for b in sorted(BAIRROS, key=lambda b: -pct_b.loc[DIAS_MC - 1, b]):
            v = float(np.clip(pct_b.loc[DIAS_MC - 1, b], 0, 100))
            st.progress(v / 100, text=f"**{b}** — {num(v)}% resolvido · SLA médio {num(sla_b[b])} h")
        st.caption("Percentual das ocorrências do bairro já resolvidas no 30º dia.")
    with c2, st.container(border=True, height="stretch"):
        st.markdown("**Resolvidos por dia em cada bairro** · média das repetições")
        rb = mc["resolv_b"][pol_k][:, :DIAS_MC, :].mean(0)
        fig = px.imshow(rb.T, x=np.arange(1, DIAS_MC + 1), y=BAIRROS, aspect="auto",
                        color_continuous_scale=[[0, CARTAO], [0.5, "#0E7C66"], [1, VERDE]],
                        labels=dict(x="Dia", y="", color="Resolvidos"))
        mostrar(fig, "Resolvidos por dia em cada bairro", altura=330, topo=16)

    c1, c2 = st.columns(2)
    with c1, st.container(border=True):
        st.markdown("**SLA médio por bairro** · as duas políticas")
        pb = sla.groupby(["bairro", "politica"])["sla_h"].mean().reset_index()
        fig = px.bar(pb, x="sla_h", y="bairro", color="politica", barmode="group", orientation="h",
                     color_discrete_map=COR_POL, labels={"sla_h": "SLA médio (h)", "bairro": ""})
        fig.update_traces(marker_line_width=0)
        mostrar(fig, "SLA médio por bairro nas duas políticas", altura=380)
    with c2, st.container(border=True):
        st.markdown("**Resolução acumulada por bairro** · % das ocorrências do bairro")
        df_ac = pct_b.copy()
        df_ac["Dia"] = np.arange(1, len(df_ac) + 1)
        fig = px.line(df_ac.melt(id_vars="Dia", var_name="Bairro", value_name="% resolvido"),
                      x="Dia", y="% resolvido", color="Bairro",
                      color_discrete_sequence=[VERDE, CIANO, AMBAR, CORAL, "#A78BFA", "#94A3B8"])
        fig.add_vline(x=DIAS_MC, line_dash="dot", line_color=SUAVE)
        fig.update_layout(yaxis_range=[0, 102])
        mostrar(fig, "Resolução acumulada por bairro", altura=380, topo=76)

# --- Aba 3 ------------------------------------------------------------------
with aba3:
    ev = eventos_grafo(P)
    with st.container(horizontal=True, vertical_alignment="bottom"):
        dia = st.slider("Evolução temporal", 1, 7, 7, format="Dia %d")
        perfis = st.multiselect("Filtro de perfil", list(COR_PERFIL), default=list(COR_PERFIL))
    perfis = perfis or list(COR_PERFIL)
    G = estado_grafo(ev, dia)
    ate = ev[ev["dia"] <= dia]
    n_clusters = len({a["cluster"] for _, a in G.nodes(data=True) if a["cluster"]})
    mem_cid = np.mean([a["memoria"] for _, a in G.nodes(data=True) if a["perfil"].startswith("Cidadão")])
    cards_kpi([
        {"icone": "✎", "cor": CIANO, "rotulo": f"Registros até o dia {dia}",
         "valor": str(int(ate["tipo"].str.startswith("Registro").sum())),
         "legenda": "relatos enviados pelos 15 moradores"},
        {"icone": "◎", "cor": CORAL, "rotulo": "Clusters \"Também vi\"", "valor": str(n_clusters),
         "legenda": "grupos de vizinhos que confirmaram o mesmo problema"},
        {"icone": "◐", "cor": "#A78BFA", "rotulo": "Memória episódica (cidadãos)", "valor": f"{num(mem_cid * 100)}%",
         "legenda": "quanto cada agente já consolidou do que viveu"},
        {"icone": "⚒", "cor": VERDE, "rotulo": "Atuações das equipes",
         "valor": str(int((ate["tipo"] == "Atuação da equipe").sum())),
         "legenda": "visitas de campo coordenadas pelos gestores"},
    ])

    with st.container(border=True):
        mostrar(figura_grafo(G, perfis), "Grafo dos 24 agentes MiroFish no dia escolhido", altura=640, topo=90)
        st.caption("Tamanho do nó = peso de influência (MiroFish). Opacidade e borda = memória episódica "
                   "consolidada (1 − e^(−0,35·episódios)). Linha pontilhada = registro preso na fila offline.")

    c1, c2 = st.columns(2)
    with c1, st.container(border=True):
        st.markdown("**Consolidação da memória episódica por perfil**")
        serie = []
        for d in range(1, 8):
            Gd = estado_grafo(ev, d)
            for perfil in COR_PERFIL:
                vals = [a["memoria"] for _, a in Gd.nodes(data=True) if a["perfil"] == perfil]
                serie.append({"Dia": d, "Perfil": perfil, "Memória": np.mean(vals)})
        fig = px.line(pd.DataFrame(serie), x="Dia", y="Memória", color="Perfil", markers=True,
                      color_discrete_map=COR_PERFIL)
        fig.add_vline(x=dia, line_dash="dash", line_color=SUAVE)
        fig.update_layout(yaxis_tickformat=".0%")
        mostrar(fig, "Memória episódica média por perfil ao longo dos 7 dias", altura=360, topo=76)
    with c2, st.container(border=True):
        st.markdown("**Eventos por dia e tipo**")
        cont = ev.groupby(["dia", "tipo"]).size().reset_index(name="n")
        fig = px.bar(cont, x="dia", y="n", color="tipo", color_discrete_map=COR_ARESTA,
                     labels={"dia": "Dia", "n": "Eventos", "tipo": ""})
        fig.update_traces(marker_line_width=0)
        fig.add_vline(x=dia, line_dash="dash", line_color=SUAVE)
        mostrar(fig, "Eventos por dia e tipo no grafo", altura=360, topo=76)

    nos_df = pd.DataFrame([{"agente": n, "perfil": a["perfil"], "postura": a["postura"],
                            "influencia": a["influencia"], "episodios": a["episodios"],
                            "memoria_episodica": round(a["memoria"], 4), "cluster_tambem_vi": a["cluster"],
                            "grau": G.degree(n), "acoes_mirofish_medidas": ACOES_MIROFISH.get(n, 0), "dia": dia}
                           for n, a in G.nodes(data=True) if a["perfil"] in perfis])
    with st.container(horizontal=True):
        st.download_button("Exportar agentes (CSV)", nos_df.to_csv(index=False).encode("utf-8-sig"),
                           f"agentes_dia{dia}.csv", "text/csv", icon=":material/download:")
        st.download_button("Exportar eventos (CSV)", ate.to_csv(index=False).encode("utf-8-sig"),
                           f"eventos_ate_dia{dia}.csv", "text/csv", icon=":material/download:")
    st.dataframe(nos_df.drop(columns="dia"), hide_index=True, width="stretch", alt="Estado dos agentes no dia escolhido",
                 column_config={"memoria_episodica": st.column_config.ProgressColumn(
                     "Memória episódica", min_value=0, max_value=1, format="percent")})
