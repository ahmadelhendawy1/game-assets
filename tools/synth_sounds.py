#!/usr/bin/env python3
"""
AI4EduTech sound kit synthesizer.
Renders every sound effect and music loop from code (no samples, no licences needed),
then encodes each as .ogg (Vorbis) and .mp3 so every browser has a format it can play.

Brand signature: a rising 3-note bell motif G5 - C6 - E6 ("AI-4-Edu").
It is reused in correct / power-up / level-up / victory so every game sounds like one brand.

Run:  python3 tools/synth_sounds.py      (needs numpy and ffmpeg)
"""
import os, subprocess, tempfile, wave
import numpy as np
from scipy.signal import lfilter

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(4)          # fixed seed: rebuilding gives identical files

# ───────────────────────── basic building blocks ─────────────────────────
def t_axis(d): return np.arange(int(SR * d)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
def n2f(name):                          # 'C#5' -> Hz
    p, o = (name[:-1], int(name[-1]))
    return midi(12 * (o + 1) + NOTE[p])

def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=None):
    """ADSR envelope of n samples (s = sustain level, hold = sustain time)."""
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    h_n = max(0, n - a_n - d_n - r_n) if hold is None else int(hold * SR)
    e = np.concatenate([np.linspace(0, 1, max(a_n, 1)), np.linspace(1, s, max(d_n, 1)),
                        np.full(h_n, s), np.linspace(s, 0, max(r_n, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]

def osc(f, d, kind='sine'):
    t = t_axis(d)
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR if np.ndim(f) else 2 * np.pi * f * t
    if kind == 'sine': return np.sin(ph)
    if kind == 'tri': return 2 / np.pi * np.arcsin(np.sin(ph))
    if kind == 'saw':   # band-limited-ish: sum of 12 harmonics
        return sum(np.sin(k * ph) / k for k in range(1, 13)) * 0.6
    if kind == 'square':  # soft square: odd harmonics only, rolled off
        return sum(np.sin(k * ph) / k for k in range(1, 12, 2)) * 0.9
    raise ValueError(kind)

def bell(f, d, bright=1.0):
    """Marimba/bell FM voice: the AI4 signature timbre."""
    t = t_axis(d)
    idx = bright * 3.0 * np.exp(-t * 9)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * idx
    body = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 3.2)
    sparkle = np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 14) * 0.25
    return (body + sparkle) * env(len(t), a=0.002, d=d, s=0, r=0.01)

def pluck(f, d, kind='tri', decay=7):
    t = t_axis(d)
    return osc(f, d, kind) * np.exp(-t * decay) * env(len(t), a=0.003, d=d, s=0, r=0.01)

def noise(d): return rng.uniform(-1, 1, int(SR * d))

def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be a number or an array (sweeps)."""
    if np.ndim(cutoff) == 0:
        a = np.exp(-2 * np.pi * cutoff / SR)
        return lfilter([1 - a], [1, -a], x)
    c = np.broadcast_to(np.asarray(cutoff, float), x.shape)
    a = np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc; y[i] = acc
    return y

def highpass(x, cutoff): return x - lowpass(x, cutoff)

def reverb(x, wet=0.22, size=1.0):
    """Small Schroeder reverb: 4 combs + 2 all-pass. Gives sounds a polished 'room'."""
    out = np.zeros(len(x) + int(SR * 1.2 * size))
    xp = np.pad(x, (0, len(out) - len(x)))
    for dl, g in [(1557, .84), (1617, .83), (1491, .82), (1422, .81)]:
        dl = int(dl * size)
        b = np.zeros(dl + 1); b[dl] = 1
        a = np.zeros(dl + 1); a[0] = 1; a[dl] = -g
        out += lfilter(b, a, xp) * 0.25
    for dl, g in [(225, .5), (556, .5)]:
        b = np.zeros(dl + 1); b[0] = -g; b[dl] = 1
        a = np.zeros(dl + 1); a[0] = 1; a[dl] = -g
        out = lfilter(b, a, out)
    out = lowpass(out, 6000)
    return xp * (1 - wet) + out * wet

def mix(*parts):
    """parts = (signal, start_seconds, gain)"""
    end = max(int(s * SR) + len(sig) for sig, s, g in parts)
    o = np.zeros(end)
    for sig, s, g in parts:
        i = int(s * SR); o[i:i + len(sig)] += sig * g
    return o

def finish(x, peak=0.84, fade=0.01):
    x = x - np.mean(x)
    f = int(fade * SR)
    if f and len(x) > 2 * f: x[-f:] *= np.linspace(1, 0, f)
    m = np.max(np.abs(x)) or 1
    return x / m * peak

def trim_tail(x, thresh=1e-3):
    idx = np.where(np.abs(x) > thresh)[0]
    return x[:idx[-1] + int(0.02 * SR)] if len(idx) else x

# ───────────────────────── sound effects ─────────────────────────
MOTIF = ['G5', 'C6', 'E6']

def sfx():
    S = {}
    S['tap'] = lowpass(pluck(1250, 0.06, 'tri', 60), 5000)
    S['select'] = pluck(n2f('A5'), 0.12, 'sine', 30) + pluck(n2f('E6'), 0.12, 'sine', 35) * .4
    S['commit'] = mix((pluck(n2f('C5'), 0.15, 'square', 25), 0, .5), (lowpass(noise(.04), 3000) * env(int(.04 * SR), .001, .04), 0, .4), (bell(n2f('G5'), .25, .6), .02, .6))
    sweep = np.linspace(320, 760, int(.2 * SR))
    S['jump'] = lowpass(osc(sweep, .2, 'square') * env(int(.2 * SR), .004, .19), 4200)
    S['land'] = mix((osc(np.linspace(140, 55, int(.13 * SR)), .13) * np.exp(-t_axis(.13) * 22), 0, 1), (lowpass(noise(.08), 900) * np.exp(-t_axis(.08) * 40), 0, .6))
    S['coin'] = mix((pluck(n2f('B5'), .08, 'square', 18), 0, .5), (pluck(n2f('E6'), .35, 'square', 9), .07, .55), (bell(n2f('E7'), .3, .5), .07, .15))
    S['correct'] = reverb(mix(*[(bell(n2f(n), .9 if i == 2 else .5), i * .085, 1 if i == 2 else .8) for i, n in enumerate(MOTIF)],
                              *[(bell(n2f(n), .6, .4), .26 + i * .04, .18) for i, n in enumerate(['G6', 'C7', 'E7'])]), .25)
    S['wrong'] = reverb(mix((pluck(n2f('E4'), .22, 'tri', 9) + pluck(n2f('E4') * 1.006, .22, 'tri', 9), 0, .5),
                            (pluck(n2f('C4'), .42, 'tri', 6) + pluck(n2f('C4') * 0.994, .42, 'tri', 6), .16, .55)), .15)
    S['hurt'] = mix((lowpass(osc(np.linspace(520, 190, int(.22 * SR)), .22, 'square'), 2500) * env(int(.22 * SR), .003, .21), 0, .7),
                    (lowpass(noise(.12), 2000) * np.exp(-t_axis(.12) * 25), 0, .35))
    S['boss-hit'] = reverb(mix((osc(np.linspace(110, 38, int(.5 * SR)), .5) * np.exp(-t_axis(.5) * 6), 0, 1),
                               (lowpass(noise(.35), np.linspace(6000, 400, int(.35 * SR))) * np.exp(-t_axis(.35) * 9), 0, .7),
                               (bell(n2f('C4'), .6, 2.2), 0, .35)), .3, 1.3)
    S['power-up'] = reverb(mix(*[(bell(n2f(n), .35, .8), i * .055, .7) for i, n in enumerate(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'])]), .25)
    lv = [(bell(n2f(n), .6), i * .1, .8) for i, n in enumerate(MOTIF)] + [(bell(n2f(n), 1.2), .38 + i * .1, .8) for i, n in enumerate(['G6', 'C7', 'E7'])]
    pad = sum(osc(n2f(n), 1.3, 'saw') for n in ['C4', 'E4', 'G4', 'C5']) * env(int(1.3 * SR), .15, .3, .5, .6)
    S['level-up'] = reverb(mix(*lv, (lowpass(pad, 2500), .35, .12)), .3, 1.2)
    S['victory'] = victory()
    S['tick'] = mix((highpass(pluck(1800, .05, 'sine', 80), 600), 0, 1), (lowpass(noise(.02), 4000) * np.exp(-t_axis(.02) * 200), 0, .4))
    S['go'] = reverb(mix((bell(n2f('C6'), .5), 0, .7), (bell(n2f('G6'), .7), 0, .5), (pluck(n2f('C4'), .5, 'saw', 6), 0, .3)), .25)
    nz = noise(.45); S['whoosh'] = lowpass(highpass(nz, 300), np.concatenate([np.linspace(400, 5000, int(.25 * SR)), np.linspace(5000, 600, int(.2 * SR))])) * env(int(.45 * SR), .2, .25)
    S['splash'] = reverb(lowpass(noise(.6), np.linspace(5000, 500, int(.6 * SR))) * env(int(.6 * SR), .005, .55) * (1 + .3 * np.sin(2 * np.pi * 23 * t_axis(.6))), .2)
    S['door-open'] = reverb(mix((lowpass(noise(.05), 2500) * np.exp(-t_axis(.05) * 80), 0, .6), (osc(np.linspace(180, 260, int(.4 * SR)), .4, 'saw') * env(int(.4 * SR), .05, .35) , .03, .12), (bell(n2f('E6'), .6, .7), .12, .55), (bell(n2f('G6'), .6, .7), .2, .45)), .25)
    S['shoot'] = lowpass(osc(np.linspace(1400, 300, int(.16 * SR)), .16, 'square'), 5000) * env(int(.16 * SR), .002, .15)
    S['kick-ball'] = mix((osc(np.linspace(160, 60, int(.12 * SR)), .12) * np.exp(-t_axis(.12) * 25), 0, 1), (lowpass(noise(.03), 5000) * np.exp(-t_axis(.03) * 120), 0, .5))
    return S

def victory():
    """~3.2 s fanfare: signature motif, then I-IV-V-I with bells, brass pad and a cymbal swell."""
    parts = [(bell(n2f(n), .5), i * .12, .9) for i, n in enumerate(MOTIF)]
    chords = [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4', 'C5']]
    starts = [.45, .85, 1.25, 1.65]; lens = [.4, .4, .4, 1.5]
    for ch, s, L in zip(chords, starts, lens):
        brass = sum(lowpass(osc(n2f(n), L, 'saw'), 1800 + 600 * (L > 1)) for n in ch) * env(int(L * SR), .03, .1, .7, .25)
        parts.append((brass, s, .18))
        parts.append((bell(n2f(ch[-1][:-1] + str(int(ch[-1][-1]) + 1)), L + .5), s, .5))
        parts.append((pluck(n2f(ch[0][:-1] + '2'), L, 'tri', 3), s, .5))
    cym = highpass(noise(1.6), 5000) * np.concatenate([np.linspace(0, 1, int(.4 * SR)), np.exp(-t_axis(1.2) * 3)])
    parts.append((cym, 1.25, .25))
    return reverb(mix(*parts), .3, 1.3)

# ───────────────────────── music loops ─────────────────────────
def drum(kind, d=None):
    if kind == 'kick': return osc(np.linspace(130, 45, int(.18 * SR)), .18) * np.exp(-t_axis(.18) * 18)
    if kind == 'snare': return mix((lowpass(noise(.16), 5000) * np.exp(-t_axis(.16) * 22), 0, .7), (osc(190, .1) * np.exp(-t_axis(.1) * 30), 0, .5))
    if kind == 'clap': return lowpass(highpass(noise(.14), 900), 4000) * np.exp(-t_axis(.14) * 25)
    if kind == 'hat': return highpass(noise(.05), 7000) * np.exp(-t_axis(.05) * 70)
    if kind == 'shaker': return highpass(noise(.08), 5000) * env(int(.08 * SR), .03, .05)

def chord_notes(root, quality, octave=4):
    iv = {'maj': [0, 4, 7], 'min': [0, 3, 7], 'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10], 'sus': [0, 5, 7]}[quality]
    r = 12 * (octave + 1) + NOTE[root]
    return [r + i for i in iv]

MOODS = {
    #  name        bpm  progression (root, quality)                                lead voice  drums    feel
    'adventure': (120, [('C', 'maj'), ('G', 'maj'), ('A', 'min'), ('F', 'maj')],    'bell',    'pop',   'bounce'),
    'sea':       (92,  [('D', 'maj7'), ('G', 'maj7'), ('B', 'min7'), ('A', 'sus')], 'bell',    'shaker','calm'),
    'space':     (110, [('A', 'min'), ('F', 'maj'), ('C', 'maj'), ('G', 'maj')],    'square',  'pop',   'arp'),
    'mystery':   (100, [('E', 'min'), ('C', 'maj'), ('A', 'min'), ('B', 'maj')],    'tri',     'light', 'pizz'),
    'stadium':   (128, [('G', 'maj'), ('C', 'maj'), ('D', 'maj'), ('C', 'maj')],    'square',  'clap',  'bounce'),
    'castle':    (112, [('D', 'min'), ('A#', 'maj'), ('C', 'maj'), ('D', 'min')],   'saw',     'pop',   'heroic'),
    'race':      (140, [('E', 'maj'), ('C#', 'min'), ('A', 'maj'), ('B', 'maj')],   'square',  'drive', 'drive'),
    'boss':      (132, [('C', 'min'), ('G#', 'maj'), ('A#', 'maj'), ('G', 'maj')],  'saw',     'drive', 'tense'),
}

def render_pattern(mood):
    bpm, prog, lead, drums, feel = MOODS[mood]
    beat = 60 / bpm; bar = 4 * beat
    L = bar * len(prog) * 2                      # 8 bars (progression twice)
    parts = []
    for b in range(len(prog) * 2):
        root, q = prog[b % len(prog)]
        notes = chord_notes(root, q, 4); t0 = b * bar
        # pad
        pad = sum(lowpass(osc(midi(n), bar, 'saw'), 1400) for n in notes) * env(int(bar * SR), .25, .3, .6, .3)
        parts.append((pad, t0, .045 if feel != 'calm' else .06))
        # bass
        bn = midi(notes[0] - 24)
        if feel in ('drive', 'tense'):
            for k in range(8): parts.append((lowpass(pluck(bn, beat / 2, 'saw', 9), 900), t0 + k * beat / 2, .32))
        elif feel == 'calm':
            parts.append((lowpass(pluck(bn, bar, 'tri', 1.5), 700), t0, .45))
        else:
            for k, off in enumerate([0, 1.5, 2, 3]): parts.append((lowpass(pluck(bn * (2 if k == 2 else 1), beat, 'tri', 6), 900), t0 + off * beat, .42))
        # arpeggio / lead
        arp = notes + [notes[0] + 12]
        step = beat / (4 if feel in ('arp', 'drive', 'tense') else 2)
        n_steps = int(round(bar / step))
        for k in range(n_steps):
            if feel == 'calm' and k % 2: continue
            if feel == 'pizz' and k % 4 == 3: continue
            nn = arp[(k * (1 if feel != 'heroic' else 2)) % len(arp)] + 12
            f = midi(nn)
            if lead == 'bell': v = bell(f, step * 2.5, .7)
            else: v = lowpass(pluck(f, step * 1.6, lead, 10 if feel != 'pizz' else 18), 3200 if lead != 'tri' else 5000)
            parts.append((v, t0 + k * step, .16 if lead == 'bell' else .11))
        # melody hook on bars 5-8: signature motif in the key, keeps the brand audible
        if b == len(prog):
            for i, iv in enumerate([7, 12, 16]):
                parts.append((bell(midi(12 * 6 + NOTE[prog[0][0]] + iv - 12), .5), t0 + i * beat / 2, .2))
        # drums
        for k in range(4):
            tb = t0 + k * beat
            if drums == 'shaker':
                parts.append((drum('shaker'), tb, .12)); parts.append((drum('shaker'), tb + beat / 2, .08))
                if k == 0: parts.append((drum('kick'), tb, .4))
                continue
            if drums == 'light':
                if k in (0, 2): parts.append((drum('kick'), tb, .35))
                parts.append((drum('hat'), tb + beat / 2, .1)); continue
            parts.append((drum('kick'), tb, .7 if k in (0, 2) or drums == 'drive' else 0))
            if k in (1, 3): parts.append((drum('clap' if drums == 'clap' else 'snare'), tb, .35))
            for h in range(2 if drums != 'drive' else 4):
                parts.append((drum('hat'), tb + h * beat / (2 if drums != 'drive' else 4), .12 if h % 2 else .07))
    # render twice and keep the 2nd copy: reverb tails wrap around, so the loop is seamless
    one = np.zeros(int(L * SR) + SR)
    for sig, s, g in parts:
        i = int(s * SR); one[i:i + len(sig)] += sig[:len(one) - i] * g
    two = np.zeros(int(2 * L * SR) + 2 * SR)
    n = int(L * SR)
    two[:len(one)] += one; two[n:n + len(one)] += one
    wet = reverb(two, .18, 1.1)
    seg = wet[n:2 * n].copy()
    k = 2048                                     # 46 ms crossfade so the end flows into the start
    ramp = np.linspace(0, 1, k)
    seg[-k:] = seg[-k:] * (1 - ramp) + wet[n - k:n] * ramp
    return seg

# ───────────────────────── encode ─────────────────────────
def write(name, x, folder, loop=False):
    x = finish(x if loop else trim_tail(x), fade=0 if loop else .01)
    os.makedirs(folder, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    base = os.path.join(folder, name)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4' if loop else '5', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '112k' if loop else '128k', base + '.mp3'], check=True)
    os.remove(tmp)
    print(f'{name:12s} {len(x) / SR:5.2f}s')

if __name__ == '__main__':
    for k, v in sfx().items(): write(k, v, os.path.join(ROOT, 'audio', 'sfx'))
    for m in MOODS: write(m, render_pattern(m), os.path.join(ROOT, 'audio', 'music'), loop=True)
