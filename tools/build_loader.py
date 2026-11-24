#!/usr/bin/env python3
"""Copy every packs/<id>/pack.json into ai4-assets.js (between the PACKS markers). Run after adding or changing a pack."""
import json, os, re, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
packs = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'packs', '*', 'pack.json'))):
    d = json.load(open(f)); packs[d['id']] = d
p = os.path.join(ROOT, 'ai4-assets.js'); s = open(p).read()
s = re.sub(r'/\*PACKS\*/.*?/\*END PACKS\*/', lambda m: '/*PACKS*/' + json.dumps(packs, separators=(',', ':')) + '/*END PACKS*/', s, flags=re.S)
open(p, 'w').write(s); print('packs:', ', '.join(packs))
# Per-game sounds (audio/games/sounds.json, written by tools/prep_audio.py) go between the SOUNDS markers.
sp = os.path.join(ROOT, 'audio', 'games', 'sounds.json')
if os.path.exists(sp):
    snd = json.load(open(sp)); s = open(p).read()
    s = re.sub(r'/\*SOUNDS\*/.*?/\*END SOUNDS\*/', lambda m: '/*SOUNDS*/' + json.dumps(snd, separators=(',', ':')) + '/*END SOUNDS*/', s, flags=re.S)
    open(p, 'w').write(s); print('game sounds:', ', '.join(snd))
