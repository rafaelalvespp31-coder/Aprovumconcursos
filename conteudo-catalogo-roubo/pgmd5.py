import json, hashlib, sys
def pg(x):
    if isinstance(x, dict):
        ks = sorted(x, key=lambda k: (len(k.encode()), k.encode()))
        return "{" + ", ".join(json.dumps(k, ensure_ascii=False) + ": " + pg(x[k]) for k in ks) + "}"
    if isinstance(x, list): return "[" + ", ".join(pg(v) for v in x) + "]"
    return json.dumps(x, ensure_ascii=False)
md5 = lambda s: hashlib.md5(s.encode()).hexdigest()
