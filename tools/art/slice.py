import sys, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
def clean(a):
    al=a[...,3].astype(int); al[al<12]=0; al[al>=240]=255; a=a.copy(); a[...,3]=al
    a[al==0,:3]=0; return a
def components(a, grow=7, min_area=1500):
    m=a[...,3]>40
    lab,n=nd.label(nd.binary_dilation(m, iterations=grow))
    out=[]
    for i,sl in enumerate(nd.find_objects(lab),1):
        region=(lab[sl]==i)
        sub=a[sl].copy(); sub[~region]=0
        if (sub[...,3]>40).sum()<min_area: continue
        ys,xs=np.where(sub[...,3]>12)
        y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        out.append(dict(img=sub[y0:y1,x0:x1], box=(sl[1].start+x0, sl[0].start+y0, x1-x0, y1-y0)))
    out.sort(key=lambda c:(round(c['box'][1]/120), c['box'][0]))
    return out
if __name__=='__main__':
    src, outdir = sys.argv[1], sys.argv[2]
    a=clean(np.array(Image.open(src).convert('RGBA')))
    comps=components(a)
    im=Image.fromarray(a); d=ImageDraw.Draw(im)
    for i,c in enumerate(comps):
        x,y,w,h=c['box']; d.rectangle([x,y,x+w,y+h],outline=(255,0,0,255),width=4); d.text((x+6,y+6),str(i),fill=(255,0,0,255))
        Image.fromarray(c['img']).save(f"{outdir}/{i}.png"); print(i, c['box'])
    bg=Image.new('RGBA',im.size,(200,200,200,255)); bg.alpha_composite(im); bg.convert('RGB').resize((im.width//2,im.height//2)).save(f"{outdir}/_index.jpg")
