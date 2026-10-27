"""Trilha original de estilo militar/cinematográfico, sintetizada do zero (sem amostras de terceiros).
D menor, 92 BPM, 16 compassos em loop: tambores graves, caixa em marcha, pulso grave, metais e tensão."""
import numpy as np, scipy.signal as sg, wave, sys
SR = 44100
BPM = 92
BEAT = 60 / BPM
BARS = 16
L = int(SR * BEAT * 4 * BARS)
rng = np.random.default_rng(7)
mixL = np.zeros(L + SR * 4); mixR = np.zeros(L + SR * 4)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); n = min(len(sig), len(mixL) - i)
    if n <= 0: return
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    mixL[i:i+n] += sig[:n] * gain * l * 1.41; mixR[i:i+n] += sig[:n] * gain * r * 1.41

def env(n, a, d):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
    return e

def taiko(f0=55):
    n = int(SR * 1.6); t = np.arange(n) / SR
    f = f0 * (1 + 1.4 * np.exp(-t * 18))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(n, 0.002, 0.42)
    noise = sg.lfilter(*sg.butter(2, 900 / (SR / 2)), rng.standard_normal(n)) * env(n, 0.001, 0.05)
    return np.tanh((body + noise * 0.6) * 1.6)

def snare(v=1.0):
    n = int(SR * 0.35)
    nz = sg.lfilter(*sg.butter(2, [1800 / (SR / 2), 7000 / (SR / 2)], 'band'), rng.standard_normal(n))
    tone = np.sin(2 * np.pi * 190 * np.arange(n) / SR) * env(n, 0.001, 0.04)
    return (nz * env(n, 0.001, 0.09) * 0.9 + tone * 0.5) * v

def hat():
    n = int(SR * 0.08)
    nz = sg.lfilter(*sg.butter(2, 7000 / (SR / 2), 'high'), rng.standard_normal(n))
    return nz * env(n, 0.0005, 0.018)

def saw(f, n):
    t = np.arange(n) / SR
    return 2 * ((t * f) % 1) - 1

def brass(freqs, dur, bright=1800):
    n = int(SR * dur)
    s = sum(saw(f * (1 + d), n) for f in freqs for d in (-0.004, 0.004))
    s /= len(freqs) * 2
    e = np.minimum(1, np.arange(n) / (SR * 0.06)) * np.minimum(1, (n - np.arange(n)) / (SR * 0.25))
    b, a = sg.butter(2, bright / (SR / 2))
    return sg.lfilter(b, a, s) * e

def drone(f, n):
    s = (saw(f, n) + saw(f * 1.005, n) + 0.5 * saw(f * 2.002, n)) / 2.5
    lfo = 450 + 250 * np.sin(2 * np.pi * np.arange(n) / SR * 0.11)
    out = np.zeros(n); b, a = sg.butter(2, 600 / (SR / 2))
    # filtro varrendo devagar (blocos)
    blk = 2048; zi = sg.lfilter_zi(b, a) * 0
    for i in range(0, n, blk):
        fc = lfo[i] / (SR / 2); b, a = sg.butter(2, fc)
        out[i:i+blk], zi = sg.lfilter(b, a, s[i:i+blk], zi=zi)
    return out

# Harmonia (D menor): Dm | Bb | C | Am, dois compassos cada
root = {0: 73.42, 1: 58.27, 2: 65.41, 3: 55.0}
chords = {0: [146.83, 174.61, 220.0], 1: [116.54, 146.83, 174.61], 2: [130.81, 164.81, 196.0], 3: [110.0, 130.81, 164.81]}
bar = BEAT * 4
n_bar2 = int(SR * bar * 2)
for k in range(BARS // 2):
    c = k % 4
    t0 = k * bar * 2
    add(drone(root[c], n_bar2 + int(SR * 0.3)), t0, 0.22)
    # metais: entram na segunda metade do loop, com pausa dramática
    if k >= 2:
        add(brass(chords[c], bar * 1.5, 1400 if k < 4 else 2200), t0, 0.16, -0.15)
        add(brass([f * 2 for f in chords[c][:2]], bar * 0.5, 2600), t0 + bar * 1.5, 0.09, 0.2)

for b in range(BARS):
    t0 = b * bar
    # tambores graves: 1, (e do 2), 3, e acentos
    for beat, g, f in [(0, 1.0, 52), (1.5, 0.6, 60), (2, 0.85, 48), (3.5, 0.5, 64)]:
        add(taiko(f), t0 + beat * BEAT, 0.55 * g, (-0.3 if f % 2 else 0.3))
    # caixa em marcha (semicolcheias com acentos), entra no compasso 3
    if b >= 2:
        pattern = [1, 0, .35, .3, 1, .3, .35, 0, 1, 0, .35, .3, .8, .5, .6, .7] if b % 4 != 3 else [1, .4, .5, .6, .7, .7, .8, .8, .9, .9, 1, 1, 1, 1, 1, 1]
        for i, v in enumerate(pattern):
            if v: add(snare(v), t0 + i * BEAT / 4 + rng.normal(0, 0.003), 0.16, 0.15)
    for i in range(8):
        add(hat(), t0 + i * BEAT / 2, 0.05 if i % 2 else 0.08, 0.4)

# Reverb simples (resposta ao impulso de ruído com decaimento)
ir_n = int(SR * 2.2)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / 0.55)
ir = sg.lfilter(*sg.butter(1, 3500 / (SR / 2)), ir); ir /= np.abs(ir).sum() / 6
wetL = sg.fftconvolve(mixL, ir)[:len(mixL)]; wetR = sg.fftconvolve(mixR, ir[::-1].copy() * 0 + np.roll(ir, 37))[:len(mixR)]
L2 = mixL * 0.82 + wetL * 0.32; R2 = mixR * 0.82 + wetR * 0.32
# Loop sem emenda: a cauda do fim volta para o começo
tail = len(L2) - L
L2[:tail] += L2[L:]; R2[:tail] += R2[L:]
st = np.stack([L2[:L], R2[:L]], 1)
st = np.tanh(st * 1.4) / np.tanh(1.4)
st /= np.abs(st).max() / 0.89
pcm = (st * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('segundos', L / SR)
