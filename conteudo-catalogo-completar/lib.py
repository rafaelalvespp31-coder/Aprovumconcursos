import json, re
def build(out, slug, next_key, modules, flash, existing_keys=None):
    """modules: [(titulo_modulo, [(kind,titulo,corpo)...], chaves_existentes|None)]"""
    nodes, secs, n = [], [], next_key
    for order, (mod, sections, keys) in enumerate(modules):
        if keys is None:
            k = "N%04d" % n; n += 1
            nodes.append({"key": k, "kind": "topico", "path": str(n - 1), "span": {"start": 0, "end": len(mod)}, "depth": 0,
                          "order": n - 2, "title": mod, "marker": str(n - 1), "parentKey": None, "sourceText": mod,
                          "requiresDirectCoverage": True})
            keys = [k]
        for kind, tit, body in sections:
            assert len(body) <= 12000, (tit, len(body))
            secs.append({"kind": kind, "title": tit, "module": mod, "nodeKeys": keys, "bodyMarkdown": body.strip()})
    json.dump({"slug": slug, "nodes": nodes, "sections": secs, "flash": flash.strip()}, open(out, "w", encoding="utf8"), ensure_ascii=False)
    print(out, len(secs), "seções", sum(len(s["bodyMarkdown"]) for s in secs) // 1000, "KB")
