import json

# Vocabulário aceito pelos cards "Na prática" (src/domain/content/visual.ts).
ROLES = {"delegado", "pm", "policial_penal", "perito", "promotor", "juiz", "advogado", "vitima", "investigado", "preso", "cidadao", "servidor", "gestor", "professor"}
SCENES = {"delegacia", "local_crime", "cela", "forum", "rua", "casa", "bar", "hospital", "piscina", "reparticao", "escola", "obra", "transito", "rodovia"}
POSES = {"neutro", "fala", "aponta", "pega", "ataca", "bracos_cruzados"}
MOODS = {"neutro", "serio", "bravo", "surpreso", "feliz", "triste"}
PROPS = {"arma", "documento", "celular", "maleta", "faca", "copo", "carimbo"}
STATES = {"ok", "erro", "neutro", "alerta"}


def P(c, lado="centro", pose="neutro", humor="neutro", objeto=None, olha=None):
    assert c in ROLES and lado in {"esq", "centro", "dir"} and pose in POSES and humor in MOODS, (c, pose, humor)
    assert objeto is None or objeto in PROPS, objeto
    d = {"p": c, "lado": lado, "pose": pose, "humor": humor}
    if objeto: d["objeto"] = objeto
    if olha: d["olha"] = olha
    return d


def Q(cenario, legenda, personagens, fala=None, efeito=None):
    assert cenario in SCENES, cenario
    assert len(legenda) <= 90, legenda
    assert len(personagens) <= 3
    d = {"cenario": cenario, "legenda": legenda, "personagens": personagens}
    if fala:
        assert 0 <= fala[0] < len(personagens) and 1 <= len(fala[1]) <= 80, fala
        d["fala"] = {"quem": fala[0], "texto": fala[1]}
    if efeito: d["efeito"] = efeito
    return d


def _step(p):
    assert 1 <= len(p[0]) <= 70 and p[1] in STATES, p
    d = dict(rotulo=p[0], estado=p[1])
    if len(p) > 2:
        assert len(p[2]) <= 120, p
        d["detalhe"] = p[2]
    return d


def fluxo(titulo, passos, conclusao=None):
    assert len(titulo) <= 70 and 2 <= len(passos) <= 6, titulo
    d = {"tipo": "fluxo", "titulo": titulo, "passos": [_step(p) for p in passos]}
    if conclusao: d["conclusao"] = _step(conclusao)
    return d


def comp(titulo, a, b):
    assert len(titulo) <= 70, titulo
    lados = []
    for x in (a, b):
        assert 1 <= len(x[0]) <= 50 and 1 <= len(x[1]) <= 60 and x[2] in STATES and len(x[3]) <= 4, x
        assert all(len(i) <= 80 for i in x[3]), x
        lados.append(dict(titulo=x[0], resultado=x[1], estado=x[2], itens=x[3]))
    return {"tipo": "comparacao", "titulo": titulo, "lados": lados}


def linha(titulo, unidade, marcos):
    assert len(titulo) <= 70 and len(unidade) <= 12 and 2 <= len(marcos) <= 6, titulo
    for mm in marcos: assert 1 <= len(mm[1]) <= 50 and mm[2] in STATES, mm
    return {"tipo": "linha_tempo", "titulo": titulo, "unidade": unidade, "marcos": [dict(em=mm[0], rotulo=mm[1], estado=mm[2]) for mm in marcos]}


def ex(sit, perg, resp, tirinha, carimbo, esquema):
    assert 1 <= len(tirinha) <= 3
    return "\n\n:::exemplo\n" + "\n".join([
        f"Situação: {sit}", f"Pergunta: {perg}", f"Resposta: {resp}",
        "Tirinha: " + json.dumps(tirinha, ensure_ascii=False),
        f"Carimbo: {carimbo}",
        "Esquema: " + json.dumps(esquema, ensure_ascii=False),
    ]) + "\n:::"


S = []


def sec(kind, title, body, nodes, source=None):
    d = {"kind": kind, "title": title, "bodyMarkdown": body.strip(), "nodeKeys": nodes}
    if source: d["sourceKey"] = source
    S.append(d)


MOD = {}


def m(title, *idx):
    for i in idx: MOD[i] = title


def fix_md(md, quote_breaks=False):
    """Linha em branco após tabela (senão a linha seguinte vira linha da tabela) e,
    opcionalmente, quebra de linha entre linhas consecutivas de citação ("> ...")."""
    L = md.split("\n")
    out = []
    for i, a in enumerate(L):
        b = L[i + 1] if i + 1 < len(L) else ""
        if quote_breaks and a.startswith("> ") and b.startswith("> ") and not a.endswith("  "):
            a += "  "
        out.append(a)
        if a.strip().startswith("|") and b.strip() and not b.strip().startswith("|"):
            out.append("")
    return "\n".join(out)


def N(*ranges):
    """N((1, 5), 9) -> ["N0001", ..., "N0005", "N0009"]"""
    out = []
    for r in ranges:
        if isinstance(r, tuple):
            out += [f"N{i:04d}" for i in range(r[0], r[1] + 1)]
        else:
            out.append(f"N{r:04d}")
    return out


# ---------------------------------------------------------------------------
# Banco de questões (formato de catalog_questions)
# ---------------------------------------------------------------------------
import re as _re

QS = []
_L = "ABCDE"
_ROT = "CAEBDBDACEABEDCBAEDCADBEC"
HEAD = "Questão autoral (APROVUM), inspirada no estilo das bancas de concursos policiais — não é questão oficial."


def ME(level, diff, node, statement, opts, correct, why, fundamento, pegadinha, dica, essential=False):
    """Múltipla escolha A–E. `correct` é a letra na ordem escrita; o gabarito é redistribuído."""
    assert level in ("facil", "medio", "dificil") and 1 <= diff <= 5
    assert len(opts) == 5 and correct in _L, statement[:60]
    n_me = sum(1 for x in QS if x["type"] == "multipla_escolha")
    target = _ROT[n_me % len(_ROT)]
    shift = (_L.index(target) - _L.index(correct)) % 5
    order = [None] * 5
    for i in range(5):
        order[(i + shift) % 5] = i
    remap = {_L[old]: _L[new] for new, old in enumerate(order)}
    fix = lambda t: _re.sub(r"\(([A-E](?:, [A-E])*)\)", lambda mm: "(" + ", ".join(sorted(remap[x] for x in mm.group(1).split(", "))) + ")",
                            _re.sub(r"\b(alternativa|alternativas) ([A-E])\b", lambda mm: f"{mm.group(1)} {remap[mm.group(2)]}", t))
    opts = [opts[o] for o in order]
    correct = remap[correct]
    why, pegadinha, dica = fix(why), fix(pegadinha), fix(dica)
    options = [{"label": _L[i], "text": t, "correct": _L[i] == correct, "explanation": e} for i, (t, e) in enumerate(opts)]
    just = f"Gabarito: {correct}. {why}\n\nFundamentação: {fundamento}\nPegadinha usada: {pegadinha}\nDica de resolução: {dica}"
    QS.append({"level": level, "type": "multipla_escolha", "statement": HEAD + "\n\n" + statement, "options": options,
               "correctAnswerTrue": False, "justification": just, "nodeKey": node, "difficulty": diff,
               "essential": essential, "dependsOnExternalSource": False})


def CE(level, diff, node, statement, certo, why, fundamento, pegadinha, essential=False):
    assert level in ("facil", "medio", "dificil") and 1 <= diff <= 5
    just = f"Gabarito: {'CERTO' if certo else 'ERRADO'}. {why}\n\nFundamentação: {fundamento}\nPegadinha usada: {pegadinha}"
    QS.append({"level": level, "type": "certo_errado", "statement": HEAD + "\n\nJulgue o item a seguir.\n\n" + statement, "options": [],
               "correctAnswerTrue": certo, "justification": just, "nodeKey": node, "difficulty": diff,
               "essential": essential, "dependsOnExternalSource": False})


def save_questions(path="questoes.json", keys=None):
    from collections import Counter
    for x in QS:
        assert 10 <= len(x["statement"]) <= 4000 and 10 <= len(x["justification"]) <= 3000, x["statement"][:80]
        if x["type"] == "multipla_escolha":
            assert sum(o["correct"] for o in x["options"]) == 1
            for o in x["options"]:
                assert 1 <= len(o["text"]) <= 1500 and 5 <= len(o["explanation"]) <= 1500, o
        if keys is not None:
            assert x["nodeKey"] in keys, x["nodeKey"]
    st = [x["statement"] for x in QS]
    assert len(set(st)) == len(st), "questão duplicada"
    lv = Counter(x["level"] for x in QS)
    for k in ("facil", "medio", "dificil"):
        assert lv[k] >= 10, lv
    json.dump(QS, open(path, "w", encoding="utf8"), ensure_ascii=False)
    gab = Counter(next(o["label"] for o in x["options"] if o["correct"]) for x in QS if x["type"] == "multipla_escolha")
    ce = Counter(x["correctAnswerTrue"] for x in QS if x["type"] == "certo_errado")
    print(len(QS), "questões;", dict(lv), "| tipos", dict(Counter(x["type"] for x in QS)), "| gabaritos A–E", dict(sorted(gab.items())), "| C/E", dict(ce))
