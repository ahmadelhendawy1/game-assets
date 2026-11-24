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
