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
POLITICAS = {0: "Sem GUT (FIFO)", 1: "Com GUT Territorializado + Também Vi"}
COR_POL = {POLITICAS[0]: "#94a3b8", POLITICAS[1]: "#0f766e"}

FEATURES = ["IVS", "Proximidade UBS/Escolas", "Capital Social (Também Vi)",
            "Letramento Digital/ACS", "Intermitência 4G", "Equipes/Dia",
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
COR_PERFIL = {"Cidadão": "#2563eb", "Cidadão idoso": "#7c3aed", "Bairro": "#ea580c",
              "Gestor comunitário": "#059669", "Conta do app": "#64748b"}

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


COR_ARESTA = {"Mora em": "#cbd5e1", "Registro": "#2563eb", "Registro offline (IndexedDB)": "#f59e0b",
              "Sincronização": "#0ea5e9", "Relato no bairro": "#93c5fd", "Também vi": "#db2777",
              "Atuação da equipe": "#059669"}


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
            name=perfil, text=nos, textposition="top center", textfont=dict(size=10),
            marker=dict(size=[12 + 7 * a["influencia"] for a in at], color=COR_PERFIL[perfil],
                        opacity=[0.25 + 0.75 * a["memoria"] for a in at],
                        line=dict(width=[1 + 3 * a["memoria"] for a in at], color="#111827")),
            customdata=[[a["memoria"], a["episodios"], a["cluster"] or "—", G.degree(n),
                         ACOES_MIROFISH.get(n, 0)] for n, a in zip(nos, at)],
            hovertemplate=("<b>%{text}</b><br>Memória episódica: %{customdata[0]:.0%}"
                           "<br>Episódios: %{customdata[1]}<br>Cluster Também Vi: %{customdata[2]}"
                           "<br>Grau: %{customdata[3]}<br>Ações medidas no MiroFish: %{customdata[4]}"
                           "<extra></extra>")))
    fig.update_layout(height=620, margin=dict(l=0, r=0, t=10, b=0),
                      xaxis=dict(visible=False), yaxis=dict(visible=False),
                      legend=dict(orientation="h", y=-0.02), plot_bgcolor="rgba(0,0,0,0)")
    return fig


# ---------------------------------------------------------------------------
# Interface
# ---------------------------------------------------------------------------
with st.sidebar:
    st.header("Parâmetros do cenário")
    st.caption("Alimentam a MLP, o Monte Carlo e o grafo.")
    st.subheader("Sociais")
    ivs = st.slider("IVS — Índice de Vulnerabilidade Social", 0.0, 1.0, 0.45, 0.01,
                    help="IPEA. Maior IVS → mais problemas por dia em cada bairro.")
    prox = st.slider("Proximidade UBS/Escolas (peso territorial)", 1.0, 2.0, 1.4, 0.05, format="%.2fx",
                     help="Multiplica o escore GUT de ocorrências perto de UBS ou escola.")
    capital = st.slider("Capital Social — 'Também Vi'", 1.0, 5.0, 2.5, 0.1,
                        help="Confirmações médias por vizinhos. Sobe a Tendência (T) e agrupa duplicatas.")
    letramento = st.slider("Letramento Digital / apoio de ACS", 0, 100, 50, 5, format="%d%%",
                           help="Mais registros (menos subnotificação) e sync mais rápida ao abrir o app.") / 100
    st.subheader("Operacionais")
    intermit = st.slider("Intermitência do 4G", 0, 80, 30, 5, format="%d%%",
                         help="Chance de o relato nascer offline e ir para a fila do IndexedDB.") / 100
    equipes = st.slider("Equipes de campo por dia", 2, 20, 8)
    st.divider()
    reps = st.select_slider("Repetições Monte Carlo", [30, 60, 100, 200], value=60)

P = {"ivs": ivs, "prox": prox, "capital": capital, "letramento": letramento,
     "intermit": intermit, "equipes": equipes}

st.title("Zelador Digital Comunitário")
st.caption("VIII SIEPEX · IFPA Campus Ananindeua · Ambiente de apoio à decisão (gêmeo digital sintético)")
st.warning("Simulação com premissas do autor e agentes fictícios. Não é dado de campo. "
           "Modelo completo em `simulation/fundamentacao_teorica_siepex.md`.", icon="⚠️")

aba1, aba2, aba3 = st.tabs(["Monte Carlo + Rede Neural", "Dinâmica temporal", "Grafo multiagente"])

mc = monte_carlo(P, reps)
sla = mc["sla"]
ml = treinar_mlp()

# --- Aba 1 ------------------------------------------------------------------
with aba1:
    resumo = (sla.groupby("politica")
              .agg(media=("sla_h", "mean"), p90=("sla_h", lambda s: s.quantile(0.9)),
                   resolvido=("resolvido", "mean"))
              .reindex(list(POLITICAS.values())))
    crit = sla[sla["grav"] >= 5].groupby("politica")["sla_h"].mean().reindex(list(POLITICAS.values()))
    sem, com = POLITICAS[0], POLITICAS[1]
    mod = ml["modelo"]
    prev = mod.predict(np.array([linha_x(P, 5, 1, 0, P["capital"] * 0.25, 0),
                                 linha_x(P, 5, 1, 0, P["capital"] * 0.25, 1)]))

    with st.container(horizontal=True):
        st.metric("SLA médio · Com GUT", f"{resumo.loc[com, 'media']:.0f} h",
                  f"{resumo.loc[com, 'media'] - resumo.loc[sem, 'media']:+.0f} h vs FIFO",
                  delta_color="inverse", border=True)
        st.metric("SLA gravidade 5 · Com GUT", f"{crit[com]:.0f} h",
                  f"{crit[com] - crit[sem]:+.0f} h vs FIFO", delta_color="inverse", border=True)
        st.metric("MLP: esgoto perto de UBS", f"{prev[1]:.0f} h",
                  f"{prev[1] - prev[0]:+.0f} h vs FIFO", delta_color="inverse", border=True)
        st.metric("R² da MLP (teste)", f"{ml['r2']:.3f}", border=True)
        st.metric("MAE da MLP (teste)", f"{ml['mae']:.1f} h", border=True)

    c1, c2 = st.columns(2)
    with c1, st.container(border=True):
        st.markdown("**Sem GUT vs Com GUT Territorializado + Também Vi**")
        tab = pd.DataFrame({
            "Indicador": ["SLA médio (h)"] * 2 + ["SLA P90 (h)"] * 2 + ["SLA gravidade 5 (h)"] * 2,
            "Política": [sem, com] * 3,
            "Horas": [resumo.loc[sem, "media"], resumo.loc[com, "media"], resumo.loc[sem, "p90"],
                      resumo.loc[com, "p90"], crit[sem], crit[com]]})
        fig = px.bar(tab, x="Indicador", y="Horas", color="Política", barmode="group",
                     color_discrete_map=COR_POL, text_auto=".0f")
        fig.update_layout(height=380, legend=dict(orientation="h", y=-0.2), margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="SLA médio, P90 e de gravidade 5 nas duas políticas")
    with c2, st.container(border=True):
        st.markdown("**Fila acumulada nos 30 dias (mediana e faixa P10–P90)**")
        fig = go.Figure()
        dias = np.arange(1, DIAS_MC + 1)
        for pol, nome in POLITICAS.items():
            b = mc["backlog"][pol][:, :DIAS_MC]
            lo, md, hi = np.percentile(b, [10, 50, 90], axis=0)
            cor = COR_POL[nome]
            fig.add_trace(go.Scatter(x=np.r_[dias, dias[::-1]], y=np.r_[hi, lo[::-1]], fill="toself",
                                     fillcolor=cor, opacity=0.2, line=dict(width=0),
                                     hoverinfo="skip", showlegend=False))
            fig.add_trace(go.Scatter(x=dias, y=md, name=nome, line=dict(color=cor, width=3)))
        fig.update_layout(height=380, xaxis_title="Dia", yaxis_title="Ocorrências na fila",
                          legend=dict(orientation="h", y=-0.2), margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="Fila acumulada nos 30 dias nas duas políticas")

    c3, c4 = st.columns(2)
    with c3, st.container(border=True):
        st.markdown("**Importância das variáveis (permutation importance, Δ MAE em horas)**")
        imp = ml["imp"]
        fig = px.bar(imp, x="importancia", y="variavel", orientation="h", error_x="dp",
                     color_discrete_sequence=["#0f766e"])
        fig.update_layout(height=420, xaxis_title="Aumento do MAE ao embaralhar (h)",
                          yaxis_title=None, margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="Importância das variáveis da rede neural")
    with c4, st.container(border=True):
        st.markdown("**MLP: SLA previsto vs equipes por dia (esgoto perto de UBS)**")
        eq = np.arange(2, 21)
        curvas = []
        for pol, nome in POLITICAS.items():
            Xc = np.array([linha_x({**P, "equipes": e}, 5, 1, 0, P["capital"] * 0.25, pol) for e in eq])
            curvas.append(pd.DataFrame({"Equipes/dia": eq, "SLA previsto (h)": mod.predict(Xc), "Política": nome}))
        fig = px.line(pd.concat(curvas), x="Equipes/dia", y="SLA previsto (h)", color="Política",
                      markers=True, color_discrete_map=COR_POL)
        fig.add_vline(x=equipes, line_dash="dash", line_color="#64748b", annotation_text="cenário atual")
        fig.update_layout(height=420, legend=dict(orientation="h", y=-0.2), margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="SLA previsto pela MLP conforme o número de equipes")

    with st.expander("Ficha técnica da rede neural e do Monte Carlo"):
        st.markdown(
            f"- **Monte Carlo:** {reps} repetições × 30 dias de chegadas (+30 de dreno), "
            f"≈{mc['ocorrencias_media']:.0f} ocorrências por repetição; mesmas chegadas nas duas políticas "
            "(números aleatórios comuns).\n"
            f"- **MLP:** `MLPRegressor(64, 32, 16)`, ReLU, Adam, `StandardScaler`, alvo em log(1+SLA); "
            f"treino {ml['n_tr']} / teste {ml['n_te']} (80/20), dados de 90 cenários aleatórios do próprio simulador.\n"
            "- A MLP é um **metamodelo** do simulador: aprende as premissas, não a realidade.")
        fig = px.scatter(ml["teste"], x="real", y="previsto", opacity=0.35, log_x=True, log_y=True,
                         labels={"real": "SLA simulado (h)", "previsto": "SLA previsto pela MLP (h)"})
        lim = [ml["teste"].min().min(), ml["teste"].max().max()]
        fig.add_trace(go.Scatter(x=lim, y=lim, mode="lines", line=dict(dash="dash", color="#ef4444"),
                                 name="ideal"))
        fig.update_layout(height=360)
        st.plotly_chart(fig, width="stretch", alt="SLA simulado contra SLA previsto pela MLP")

# --- Aba 2 ------------------------------------------------------------------
with aba2:
    off = mc["offline_h"]  # reps x 2 x horas
    pct_off = sla[sla["politica"] == com]["offline"].mean()
    pico = off.sum(axis=1).max(axis=1).mean()
    with st.container(horizontal=True):
        st.metric("Relatos que nasceram offline", f"{pct_off:.0%}", border=True)
        st.metric("Pico médio da fila IndexedDB", f"{pico:.1f} relatos", border=True)
        st.metric("Envio via Background Sync", f"{P_BG_SYNC:.0%}", border=True)
        st.metric("Resolvidos em 60 dias · Com GUT", f"{resumo.loc[com, 'resolvido']:.0%}", border=True)

    with st.container(border=True):
        st.markdown("**Fila offline no celular (IndexedDB) — média por hora, primeiros 7 dias**")
        h = np.arange(7 * 24)
        df_off = pd.DataFrame({
            "Hora": np.r_[h, h] / 24 + 1,
            "Relatos na fila": np.r_[off[:, 0, :7 * 24].mean(0), off[:, 1, :7 * 24].mean(0)],
            "Envio": ["Background Sync (Chrome/Android)"] * len(h) + ["Ao abrir o app (sem Background Sync)"] * len(h)})
        fig = px.area(df_off, x="Hora", y="Relatos na fila", color="Envio",
                      color_discrete_sequence=["#0ea5e9", "#f59e0b"])
        fig.update_layout(height=340, xaxis_title="Dia", legend=dict(orientation="h", y=-0.25), margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="Fila offline no IndexedDB por hora nos primeiros 7 dias")

    c1, c2 = st.columns(2)
    pol_sel = c1.segmented_control("Política", list(POLITICAS.values()), default=com, key="pol_aba2") or com
    pol_k = 0 if pol_sel == sem else 1
    with c1, st.container(border=True):
        st.markdown("**Resolvidos por dia em cada bairro (média)**")
        rb = mc["resolv_b"][pol_k][:, :DIAS_MC, :].mean(0)
        fig = px.imshow(rb.T, x=np.arange(1, DIAS_MC + 1), y=BAIRROS, aspect="auto",
                        color_continuous_scale="Teal", labels=dict(x="Dia", y="", color="Resolvidos"))
        fig.update_layout(height=360, margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="Resolvidos por dia em cada bairro")
    with c2:
        st.write("")
        st.write("")
        with st.container(border=True):
            st.markdown("**SLA médio por bairro — as duas políticas**")
            pb = sla.groupby(["bairro", "politica"])["sla_h"].mean().reset_index()
            fig = px.bar(pb, x="sla_h", y="bairro", color="politica", barmode="group", orientation="h",
                         color_discrete_map=COR_POL, labels={"sla_h": "SLA médio (h)", "bairro": ""})
            fig.update_layout(height=360, legend=dict(orientation="h", y=-0.25, title=None), margin=dict(t=10))
            st.plotly_chart(fig, width="stretch", alt="SLA médio por bairro nas duas políticas")

    with st.container(border=True):
        st.markdown("**Resolução acumulada por bairro (% das ocorrências do bairro)**")
        tot_b = sla[sla["politica"] == pol_sel].groupby("bairro").size().reindex(BAIRROS) / reps
        acum = np.cumsum(mc["resolv_b"][pol_k].mean(0), axis=0)
        df_ac = pd.DataFrame(acum / tot_b.to_numpy() * 100, columns=BAIRROS)
        df_ac["Dia"] = np.arange(1, len(df_ac) + 1)
        fig = px.line(df_ac.melt(id_vars="Dia", var_name="Bairro", value_name="% resolvido"),
                      x="Dia", y="% resolvido", color="Bairro")
        fig.add_vline(x=DIAS_MC, line_dash="dot", annotation_text="fim das chegadas")
        fig.update_layout(height=360, yaxis_range=[0, 102], margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="Resolução acumulada por bairro")

# --- Aba 3 ------------------------------------------------------------------
with aba3:
    ev = eventos_grafo(P)
    c1, c2 = st.columns([2, 3])
    dia = c1.slider("Evolução temporal", 1, 7, 7, format="Dia %d")
    perfis = c2.multiselect("Filtro de perfil", list(COR_PERFIL), default=list(COR_PERFIL))
    G = estado_grafo(ev, dia)
    ate = ev[ev["dia"] <= dia]
    n_clusters = len({a["cluster"] for _, a in G.nodes(data=True) if a["cluster"]})
    mem_cid = np.mean([a["memoria"] for _, a in G.nodes(data=True) if a["perfil"].startswith("Cidadão")])

    with st.container(horizontal=True):
        st.metric("Registros até o dia", int(ate["tipo"].str.startswith("Registro").sum()), border=True)
        st.metric("Clusters 'Também Vi'", n_clusters, border=True)
        st.metric("Memória episódica média (cidadãos)", f"{mem_cid:.0%}", border=True)
        st.metric("Atuações das equipes", int((ate["tipo"] == "Atuação da equipe").sum()), border=True)

    with st.container(border=True):
        st.plotly_chart(figura_grafo(G, perfis or list(COR_PERFIL)), width="stretch", alt="Grafo dos 24 agentes MiroFish no dia escolhido")
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
        fig.add_vline(x=dia, line_dash="dash", line_color="#64748b")
        fig.update_layout(height=340, yaxis_tickformat=".0%", margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="Memória episódica média por perfil ao longo dos 7 dias")
    with c2, st.container(border=True):
        st.markdown("**Eventos por dia e tipo**")
        cont = ev.groupby(["dia", "tipo"]).size().reset_index(name="n")
        fig = px.bar(cont, x="dia", y="n", color="tipo", color_discrete_map=COR_ARESTA,
                     labels={"dia": "Dia", "n": "Eventos", "tipo": ""})
        fig.add_vline(x=dia, line_dash="dash", line_color="#64748b")
        fig.update_layout(height=340, margin=dict(t=10))
        st.plotly_chart(fig, width="stretch", alt="Eventos por dia e tipo no grafo")

    nos_df = pd.DataFrame([{"agente": n, "perfil": a["perfil"], "postura": a["postura"],
                            "influencia": a["influencia"], "episodios": a["episodios"],
                            "memoria_episodica": round(a["memoria"], 4), "cluster_tambem_vi": a["cluster"],
                            "grau": G.degree(n), "acoes_mirofish_medidas": ACOES_MIROFISH.get(n, 0), "dia": dia}
                           for n, a in G.nodes(data=True) if a["perfil"] in (perfis or COR_PERFIL)])
    with st.container(horizontal=True):
        st.download_button("Exportar agentes (CSV)", nos_df.to_csv(index=False).encode("utf-8-sig"),
                           f"agentes_dia{dia}.csv", "text/csv", icon=":material/download:")
        st.download_button("Exportar eventos (CSV)", ate.to_csv(index=False).encode("utf-8-sig"),
                           f"eventos_ate_dia{dia}.csv", "text/csv", icon=":material/download:")
    st.dataframe(nos_df.drop(columns="dia"), hide_index=True, width="stretch", alt="Estado dos agentes no dia escolhido",
                 column_config={"memoria_episodica": st.column_config.ProgressColumn(
                     "Memória episódica", min_value=0, max_value=1, format="percent")})
