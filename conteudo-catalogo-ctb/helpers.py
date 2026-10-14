import json

def P(c, lado="centro", pose="neutro", humor="neutro", objeto=None, olha=None):
    d = {"p": c, "lado": lado, "pose": pose, "humor": humor}
    if objeto: d["objeto"] = objeto
    if olha: d["olha"] = olha
    return d

def Q(cenario, legenda, personagens, fala=None, efeito=None):
    d = {"cenario": cenario, "legenda": legenda, "personagens": personagens}
    if fala: d["fala"] = {"quem": fala[0], "texto": fala[1]}
    if efeito: d["efeito"] = efeito
    return d

def fluxo(titulo, passos, conclusao=None):
    d = {"tipo": "fluxo", "titulo": titulo, "passos": [dict(rotulo=p[0], estado=p[1], **({"detalhe": p[2]} if len(p) > 2 else {})) for p in passos]}
    if conclusao: d["conclusao"] = dict(rotulo=conclusao[0], estado=conclusao[1], **({"detalhe": conclusao[2]} if len(conclusao) > 2 else {}))
    return d

def comp(titulo, a, b):
    return {"tipo": "comparacao", "titulo": titulo, "lados": [dict(titulo=x[0], resultado=x[1], estado=x[2], itens=x[3]) for x in (a, b)]}

def ex(sit, perg, resp, tirinha, carimbo, esquema):
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

