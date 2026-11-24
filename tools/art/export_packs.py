#!/usr/bin/env python3
"""Export the 7 Codex art sets into game packs (WebP + pack.json). Run from the art work folder with src/ and cut/."""
import json, os, sys, math, numpy as np
from PIL import Image, ImageDraw
OUTROOT = '/home/claude/game-assets/packs'
def C(p): return Image.open('cut/' + p).convert('RGBA')
def SRC(p): return Image.open('src/' + p)
def fit(im, m): s = m / max(im.size); return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
def fit_h(im, h): return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
def mirror_x(im): w, h = im.size; o = Image.new(im.mode, (w * 2, h)); o.paste(im, (0, 0)); o.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (w, 0)); return o
def mirror_y(im): w, h = im.size; o = Image.new(im.mode, (w, h * 2)); o.paste(im, (0, 0)); o.paste(im.transpose(Image.FLIP_TOP_BOTTOM), (0, h)); return o
def wrap_blend(im, axis, k=64):
    """Make an almost-seamless tile fully seamless: cross-fade the last k px into the first k px."""
    a = np.array(im.convert('RGB')).astype(float)
    if axis == 'y': a = a.transpose(1, 0, 2)
    n = a.shape[1]; t = np.linspace(0, 1, k)[None, :, None]
    out = a[:, :n - k].copy(); out[:, :k] = a[:, :k] * t + a[:, n - k:] * (1 - t)
    if axis == 'y': out = out.transpose(1, 0, 2)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))
def center_strip(im, frac=0.1):
    w = im.width; return im.crop((int(w * frac), 0, int(w * (1 - frac)), im.height))

class Pack:
    def __init__(self, pid, title, music):
        self.id, self.d = pid, os.path.join(OUTROOT, pid); os.makedirs(self.d, exist_ok=True)
        self.data = {'id': pid, 'title': title, 'version': 1, 'files': {}, 'sizes': {}, 'music': music, 'bossMusic': 'boss'}
    def add(self, key, im, q=86, folder='img'):
        rel = f'{folder}/{key}.webp'; p = os.path.join(self.d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        im.save(p, 'WEBP', quality=q, method=6); self.data['files'][key] = rel; self.data['sizes'][key] = list(im.size)
    def save(self):
        json.dump(self.data, open(os.path.join(self.d, 'pack.json'), 'w'), indent=1)
        tot = sum(os.path.getsize(os.path.join(self.d, f)) for f in self.data['files'].values())
        print(f"{self.id:14s} {len(self.data['files']):2d} images {tot // 1024:5d} KB")

def rig(pack, parts, order, torso_pivot, scale, swing=None):
    """parts: name -> (cut path, pivot, attach, rest). Pivots/attach are in source px; stored scaled."""
    out = {}
    for k, (path, pivot, attach, rest) in parts.items():
        im = C(path); im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        pack.add('hero-' + k, im, folder='hero')
        out[k] = {'pivot': [round(pivot[0] * scale, 1), round(pivot[1] * scale, 1)], 'size': list(im.size)}
        if attach: out[k].update(attach=[round(attach[0] * scale, 1), round(attach[1] * scale, 1)], rest=rest)
    out['torso']['pivot'] = [round(torso_pivot[0] * scale, 1), round(torso_pivot[1] * scale, 1)]
    pack.data['hero'] = {'parts': out, 'order': order, 'swing': swing or {}}

def arrow():
    """Code-drawn arrow matching the pack style (navy outline, wood shaft, steel tip, white fletching)."""
    W, H = 360, 60; im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im); N = (27, 27, 58, 255)
    d.rounded_rectangle([40, 24, 300, 36], 6, fill=(160, 98, 48, 255), outline=N, width=4)
    d.polygon([(290, 12), (352, 30), (290, 48)], fill=(205, 212, 222, 255), outline=N); d.line([(290, 12), (352, 30), (290, 48), (290, 12)], fill=N, width=4)
    for dy in (-1, 1):
        d.polygon([(8, 30 + dy * 2), (60, 30 + dy * 2), (40, 30 + dy * 24), (0, 30 + dy * 24)], fill=(245, 245, 240, 255), outline=N)
        d.line([(8, 30 + dy * 2), (60, 30 + dy * 2), (40, 30 + dy * 24), (0, 30 + dy * 24), (8, 30 + dy * 2)], fill=N, width=3)
    return im

# ── SEA ──
p = Pack('sea', 'Sea Voyage', 'sea')
p.add('sea-tile', fit(wrap_blend(wrap_blend(SRC('sea/01-sea-tile.png'), 'x'), 'y'), 512), 82)
for i, n in enumerate(['boat-pirate', 'boat-sail', 'boat-fishing']): p.add(n, fit(C(f'sea/02-boats/{i}.png'), 300))
for i, (n, m) in enumerate([('buoy', 200), ('whirlpool', 240), ('rocks', 220), ('rope', 1200), ('shark', 170), ('fish', 120), ('coin', 110)]): p.add(n, fit(C(f'sea/03-sea-objects/{i}.png'), m))
for i in range(3): p.add(f'island-{i + 1}', fit(C(f'sea/04-islands/{i}.png'), 360))
p.add('boat-side', Image.open('gen/boat-side.png').convert('RGBA'))   # side-view sailboat drawn in code (interim)
p.add('boss', fit(C('sea/05-sea-boss/0.png'), 540)); p.save()

# ── SPACE ── (the ringed planet touches its neighbour: split at the emptiest column)
p = Pack('space', 'Space Defender', 'space')
p.add('space-tile', fit(wrap_blend(SRC('space/01-space-background.png'), 'y'), 1100), 80)
for i, n in enumerate(['ship-blue', 'ship-red', 'ship-green']): p.add(n, fit(C(f'space/02-ships/{i}.png'), 260))
pair = np.array(C('space/03-answer-planets/0.png')); al = pair[..., 3].astype(int).sum(0)
mid = len(al) // 2; cut = mid - 120 + int(np.argmin(al[mid - 120:mid + 120]))
for n, part in [('planet-orange', pair[:, :cut]), ('planet-blue', pair[:, cut:])]:
    im = Image.fromarray(part); p.add(n, fit(im.crop(im.getbbox()), 220))
p.add('planet-green', fit(C('space/03-answer-planets/1.png'), 220)); p.add('planet-pink', fit(C('space/03-answer-planets/2.png'), 220))
for i, (n, m) in enumerate([('asteroid-1', 230), ('asteroid-2', 220), ('asteroid-3', 160), ('drone', 160), ('shield', 140), ('explosion', 220), ('star', 110), ('laser', 120)]): p.add(n, fit(C(f'space/04-space-objects/{i}.png'), m))
p.add('boss', fit(C('space/05-mothership-boss/0.png'), 560)); p.save()

# ── MAZE ──
p = Pack('maze', 'Maze Explorer', 'mystery')
fl = C('maze/01-maze-tiles/0.png'); m = int(fl.width * 0.075)
p.add('floor', fl.crop((m, m, fl.width - m, fl.height - m)).resize((128, 128), Image.LANCZOS))   # no outline: tiles join smoothly
for i, n in enumerate(['wall', 'wall-corner', 'torch', 'door', 'door-open'], 1): p.add(n, fit(C(f'maze/01-maze-tiles/{i}.png'), 160))
for i, n in enumerate(['explorer-down', 'explorer-up', 'explorer-right']): p.add(n, fit(C(f'maze/02-explorer/{i}.png'), 240))
for i, (n, m) in enumerate([('gem-blue', 100), ('gem-red', 100), ('key', 120), ('chest', 150), ('ghost', 150), ('checkpoint', 140)]): p.add(n, fit(C(f'maze/03-maze-objects/{i}.png'), m))
p.add('boss', fit(C('maze/04-maze-boss/0.png'), 500)); p.save()

# ── SOCCER ──
p = Pack('soccer', 'Football Star', 'stadium')
S = 0.42; P = 'soccer/01-player-parts/'
rig(p, {'torso': (P + '1.png', [165, 290], None, 0), 'head': (P + '0.png', [178, 338], [190, 40], 0),
        'armFront': (P + '2.png', [45, 45], [150, 85], 55), 'armBack': (P + '3.png', [112, 42], [205, 85], -8),
        'legFront': (P + '4.png', [95, 18], [185, 282], 0), 'legBack': (P + '5.png', [78, 18], [140, 278], 0)},
    ['armBack', 'legBack', 'legFront', 'torso', 'head', 'armFront'], [165, 290], S)
p.add('bg-far', mirror_x(fit_h(SRC('soccer/02-stadium-far.png').convert('RGB'), 720)), 80)
g = fit_h(center_strip(C('soccer/03-pitch/3.png')), 140); p.add('ground', mirror_x(g))
for i, (n, m) in enumerate([('corner-flag', 220), ('cone', 130), ('ball', 100)]): p.add(n, fit(C(f'soccer/03-pitch/{i}.png'), m))
p.add('defender-run', fit_h(C('soccer/04-defenders/0.png'), 320)); p.add('defender-slide', fit(C('soccer/04-defenders/1.png'), 380))
p.add('penalty-view', fit(SRC('soccer/05-penalty-view.png').convert('RGB'), 1280), 82)
p.add('boss', fit_h(C('soccer/06-keeper-boss/0.png'), 520)); p.save()

# ── CASTLE ──
p = Pack('castle', 'Castle Defense', 'castle')
S = 0.4; P = 'castle/01-defender-parts/'
rig(p, {'torso': (P + '2.png', [150, 360], None, 0), 'head': (P + '1.png', [235, 340], [150, 118], 0),
        'armFront': (P + '0.png', [38, 295], [160, 165], 30), 'armBack': (P + '3.png', [42, 38], [185, 165], 24),
        'legFront': (P + '4.png', [85, 22], [175, 350], 0), 'legBack': (P + '5.png', [80, 22], [128, 345], 0)},
    ['armBack', 'legBack', 'legFront', 'torso', 'head', 'armFront'], [150, 360], S, swing={'armFront': 0.3})
p.add('bg-far', mirror_x(fit_h(SRC('castle/02-castle-far.png').convert('RGB'), 720)), 80)
wall = C('castle/03-castle-wall/0.png'); p.add('ground', mirror_x(fit_h(center_strip(wall, 0.12), 150)))
for i, (n, m) in [(1, ('tower', 330)), (2, ('gate', 320)), (3, ('tower-base', 230))]: p.add(n, fit(C(f'castle/03-castle-wall/{i}.png'), m))
p.add('arrow', fit(arrow(), 120))
for i, n in enumerate(['goblin', 'golem', 'slime']): p.add(n, fit_h(C(f'castle/04-monsters/{i}.png'), 220))
p.add('boss', fit_h(C('castle/05-giant-boss/0.png'), 540)); p.save()

# ── KART ──
p = Pack('kart', 'Turbo Kart', 'race')
p.add('track-tile', fit(mirror_y(SRC('kart/01-track-tile.png').convert('RGB')), 1400), 80)
for i, n in enumerate(['kart-red', 'kart-blue', 'kart-green', 'kart-yellow']): p.add(n, fit(C(f'kart/02-karts/{i}.png'), 240))
for n, m in [('oil', 200), ('cone', 120), ('boost', 160), ('coin', 100), ('star', 110), ('tyres', 140)]: p.add(n, fit(C(f'kart/03-track-objects/{n}.png'), m))
row = C('kart/04-pit-garages/0.png'); q = row.width / 4
gar = row.crop((0, 0, 434, row.height))  # through the right edge of the 2nd post
p.add('garage', fit(gar.crop(gar.getbbox()), 300))
p.add('boss', fit_h(C('kart/05-champion-boss/0.png'), 320)); p.save()

# ── RUNNER RIDES ──
p = Pack('runner-rides', 'Runner Quest rides: horse and kart', 'adventure')
R = 'runner-rides/'; HS = 0.42
def addp(key, path, s): im = C(path); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS); p.add(key, im, folder='ride'); return im
addp('horse-body', R + '01-horse-parts/0.png', HS)
legs = {}
for key, idx, piv, at in [('horse-leg-hind-far', 4, [95, 18], [255, 455]), ('horse-leg-front-far', 2, [60, 14], [640, 445]),
                          ('horse-leg-hind-near', 3, [98, 18], [300, 462]), ('horse-leg-front-near', 1, [58, 14], [690, 452])]:
    addp(key, f'{R}01-horse-parts/{idx}.png', HS); legs[key] = {'pivot': [piv[0] * HS, piv[1] * HS], 'attach': [at[0] * HS, at[1] * HS]}
rider = addp('horse-rider', R + '02-rider/0.png', HS * 0.62)
addp('kart-body', R + '03-kart-parts/0.png', HS)
addp('kart-wheel-back', R + '03-kart-parts/1.png', HS * 0.62); addp('kart-wheel-front', R + '03-kart-parts/2.png', HS * 0.62)
addp('kart-driver', R + '04-driver/0.png', HS * 0.42)
hb = p.data['sizes']['horse-body']; kb = p.data['sizes']['kart-body']
p.data['rides'] = {
  'horse': {'body': 'horse-body', 'size': hb, 'groundY': round(840 * HS, 1),
            'legs': legs, 'rider': {'key': 'horse-rider', 'pivot': [190 * HS * 0.62, 700 * HS * 0.62], 'at': [430 * HS, 330 * HS]}},
  'kart': {'body': 'kart-body', 'size': kb, 'groundY': round(345 * HS + 187 * HS * 0.62, 1), 'panelTop': round(228 * HS, 1),
           'wheels': {'kart-wheel-back': {'at': [160 * HS, 335 * HS]}, 'kart-wheel-front': {'at': [622 * HS, 345 * HS]}},
           'driver': {'key': 'kart-driver', 'pivot': [520 * HS * 0.42, 940 * HS * 0.42], 'at': [345 * HS, 232 * HS]}}}
p.save()
