import json, math, numpy as np, cv2
from PIL import Image
P = 'cut/hero_parts/'
# 1) remove the forearm stub baked into the torso (skin below the near sleeve), fill with backpack
t = np.array(Image.open(P + '1.png'))
r, g, b = [t[..., i].astype(int) for i in range(3)]
# flood-fill the skin stub from a seed inside it; dark outlines stop the fill
rgb0 = np.ascontiguousarray(t[..., :3])
ff = np.zeros((t.shape[0] + 2, t.shape[1] + 2), np.uint8)
cv2.floodFill(rgb0.copy(), ff, (115, 225), (0, 0, 0), (55, 70, 60), (55, 70, 60), cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8) | 8)
stub = ff[1:-1, 1:-1] > 0
# also take the stub's own dark outline: dark pixels within 9px of the stub
dark = (r + g + b) < 200
grown = cv2.dilate(stub.astype(np.uint8), np.ones((19, 19), np.uint8)) > 0
m = ((cv2.dilate(stub.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0) | (dark & grown)).astype(np.uint8)
skin = stub
near = np.zeros_like(stub); near[150:310, 40:200] = True
navy = (b > r + 25) & (b > g) & (t[..., 3] > 200) & near & (r + g + b > 120) & ~grown
col = np.median(t[navy][:, :3], axis=0)
# only paint where the backpack would be (not over the jacket edge): keep jacket-yellow pixels
yellow = (r > 200) & (g > 140) & (b < 120) & ~stub
m = (m.astype(bool) & ~yellow).astype(np.uint8)
soft = cv2.GaussianBlur(m.astype(np.float32), (5, 5), 0)[..., None]
t2 = t.copy().astype(np.float32)
t2[..., :3] = t2[..., :3] * (1 - soft) + col * soft
t2 = t2.clip(0, 255).astype(np.uint8)
Image.fromarray(t2).save('torso_clean.png')
print('skin px removed', int(m.sum()))
# 2) rig: pivot = joint point inside each part image (source px); attach = where it sits on the torso
RIG = {
  'torso':    dict(img='torso_clean.png',      pivot=[230, 300]),            # hip centre = root
  'head':     dict(img=P + '0.png', pivot=[180, 342], attach=[262, 52],  rest=0),
  'armFront': dict(img=P + '3.png', pivot=[45, 42],   attach=[150, 92],  rest=42),
  'armBack':  dict(img=P + '2.png', pivot=[72, 52],   attach=[215, 100], rest=30),
  'legFront': dict(img=P + '4.png', pivot=[108, 24],  attach=[245, 282], rest=0),
  'legBack':  dict(img=P + '5.png', pivot=[82, 24],   attach=[200, 278], rest=0),
}
ORDER = ['armBack', 'legBack', 'legFront', 'torso', 'head', 'armFront']
def assemble(pose=None, scale=1.0):
    pose = pose or {}
    W = H = 1400; canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ox, oy = 560, 700
    tp = RIG['torso']['pivot']
    for k in ORDER:
        part = RIG[k]; im = Image.open(part['img']).convert('RGBA')
        if k == 'torso':
            canvas.alpha_composite(im, (ox - tp[0], oy - tp[1])); continue
        ang = part['rest'] + pose.get(k, 0)
        px, py = part['pivot']
        # rotate about pivot: pad so pivot is centre
        R = int(math.hypot(max(px, im.width - px), max(py, im.height - py))) + 2
        pad = Image.new('RGBA', (2 * R, 2 * R)); pad.alpha_composite(im, (R - px, R - py))
        rot = pad.rotate(-ang, resample=Image.BICUBIC)       # PIL rotates CCW; game rotation is CW
        ax, ay = part['attach']
        canvas.alpha_composite(rot, (ox - tp[0] + ax - R, oy - tp[1] + ay - R))
    return canvas.crop(canvas.getbbox())
if __name__ == '__main__':
    poses = {'idle': {}, 'run-a': {'armFront': -45, 'armBack': 40, 'legFront': 28, 'legBack': -30},
             'run-b': {'armFront': 40, 'armBack': -40, 'legFront': -30, 'legBack': 28},
             'jump': {'armFront': -75, 'armBack': -55, 'legFront': -25, 'legBack': 20}}
    ims = [assemble(p) for p in poses.values()] + [Image.open('src/hero_full.png').convert('RGBA')]
    ims[-1] = ims[-1].crop(ims[-1].getbbox())
    h = 700; ims = [i.resize((int(i.width * h / i.height), h)) for i in ims]
    sheet = Image.new('RGB', (sum(i.width for i in ims) + 20 * len(ims), h + 20), (225, 232, 240)); x = 10
    for i in ims: sheet.paste(i, (x, 10), i); x += i.width + 20
    sheet.save('rig_check.png'); json.dump({k: {kk: vv for kk, vv in v.items() if kk != 'img'} for k, v in RIG.items()}, open('rig.json', 'w'), indent=1)
