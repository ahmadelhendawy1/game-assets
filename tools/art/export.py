import json, os, numpy as np
from PIL import Image
OUT = '/home/claude/game-assets/packs/runner-desert'
def save(im, rel, q=86):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, 'WEBP', quality=q, method=6); return rel
def fit(im, max_side):
    s = max_side / max(im.size); return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS), s
def mirror_tile(im):
    w, h = im.size; out = Image.new(im.mode, (w * 2, h)); out.paste(im, (0, 0)); out.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (w, 0)); return out
files, meta = {}, {}
# hero parts (one shared scale keeps joints aligned)
rig = json.load(open('rig.json')); HS = 0.36
srcs = {'torso': 'torso_clean.png', 'head': 'cut/hero_parts/0.png', 'armFront': 'cut/hero_parts/3.png', 'armBack': 'cut/hero_parts/2.png', 'legFront': 'cut/hero_parts/4.png', 'legBack': 'cut/hero_parts/5.png'}
hero = {}
for k, f in srcs.items():
    im = Image.open(f).convert('RGBA'); im = im.resize((round(im.width * HS), round(im.height * HS)), Image.LANCZOS)
    files['hero-' + k] = save(im, f'hero/{k}.webp')
    r = rig[k]; hero[k] = {'pivot': [round(r['pivot'][0] * HS, 1), round(r['pivot'][1] * HS, 1)], 'size': list(im.size)}
    if 'attach' in r: hero[k].update(attach=[round(r['attach'][0] * HS, 1), round(r['attach'][1] * HS, 1)], rest=r['rest'])
full = Image.open('src/hero_full.png').convert('RGBA'); full = full.crop(full.getbbox()); full, _ = fit(full, 420)
files['hero-full'] = save(full, 'hero/full.webp')
# objects / tiles / enemies: target longest side in px (2x of on-screen size for sharp phones)
plan = {'door': ('cut/objects/0.png', 300), 'door-open': ('cut/objects/1.png', 300), 'crystal': ('cut/objects/2.png', 220),
        'coin': ('cut/objects/3.png', 110), 'flag': ('cut/objects/4.png', 220), 'heart': ('cut/objects/5.png', 96),
        'platform': ('cut/tiles/1.png', 300), 'crate': ('cut/tiles/2.png', 150), 'spikes': ('cut/tiles/3.png', 220),
        'enemy': ('cut/enemies/1.png', 200), 'boss': ('cut/enemies/0.png', 520)}
for k, (f, m) in plan.items():
    im, _ = fit(Image.open(f).convert('RGBA'), m); files[k] = save(im, f"{'objects' if k not in ('enemy','boss') else 'enemies'}/{k}.webp"); meta[k] = list(im.size)
# ground: centre 80% of the strip (no rounded end caps), mirrored -> seamless, 160px tall
g = Image.open('cut/tiles/0.png').convert('RGBA'); w = g.width; g = g.crop((int(w * .1), 0, int(w * .9), g.height))
g = g.resize((round(g.width * 160 / g.height), 160), Image.LANCZOS); g = mirror_tile(g)
files['ground'] = save(g, 'objects/ground.webp'); meta['ground'] = list(g.size)
# backgrounds: mirrored so they scroll forever without a seam; 720px tall
far = Image.open('src/bg_far.png').convert('RGB'); far = far.resize((round(far.width * 720 / far.height), 720), Image.LANCZOS)
files['bg-far'] = save(mirror_tile(far), 'bg/far.webp', 80); meta['bg-far'] = [far.width * 2, 720]
mid = Image.open('src/bg_mid.png').convert('RGBA'); a = np.array(mid); al = a[..., 3]; al[al < 12] = 0; a[..., 3] = al; mid = Image.fromarray(a)
mid = mid.crop((0, mid.getbbox()[1], mid.width, mid.height)); mid = mid.resize((round(mid.width * 420 / mid.height), 420), Image.LANCZOS)
files['bg-mid'] = save(mirror_tile(mid), 'bg/mid.webp', 82); meta['bg-mid'] = [mid.width * 2, 420]
pack = {'id': 'runner-desert', 'title': 'Runner Quest - Desert world', 'version': 1,
        'files': files, 'sizes': meta, 'hero': {'parts': hero, 'order': ['armBack', 'legBack', 'legFront', 'torso', 'head', 'armFront']},
        'music': 'adventure', 'bossMusic': 'boss'}
json.dump(pack, open(os.path.join(OUT, 'pack.json'), 'w'), indent=1)
tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in files.values())
print(len(files), 'images', round(tot / 1024), 'KB total'); print(json.dumps(meta))
