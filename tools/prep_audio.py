import subprocess, re, os, json, sys
SRC = "/mnt/user-data/uploads/Game Audio-20261124T104235Z-1-001/Game Audio"
OUT = "/home/claude/game-assets/audio/games"
GAMES = ['runner','sea','space','maze','football','castle','kart']
def run(a): return subprocess.run(a, capture_output=True, text=True)
def lufs(f):
    o = run(['ffmpeg','-hide_banner','-i',f,'-af','ebur128','-f','null','-']).stderr
    m = re.findall(r'I:\s*(-?[\d.]+) LUFS', o); return float(m[-1])
def stats(f):
    o = run(['ffmpeg','-hide_banner','-i',f,'-af','astats=measure_perchannel=none','-f','null','-']).stderr
    rms = float(re.findall(r'RMS level dB:\s*(-?[\d.inf]+)', o)[-1]); pk = float(re.findall(r'Peak level dB:\s*(-?[\d.inf]+)', o)[-1]); return rms, pk
def dur(f): return float(run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).stdout)
manifest = {}
for g in GAMES:
    d = os.path.join(OUT, g); os.makedirs(os.path.join(d,'sfx'), exist_ok=True); man = {'sfx': []}
    for kind in ['music','boss']:
        src = f"{SRC}/Loops (seamless, ogg+wav)/{g}_{kind}_loop.ogg"
        gain = -16 - lufs(src)
        run(['ffmpeg','-y','-v','error','-i',src,'-af',f'volume={gain:.2f}dB','-c:a','libvorbis','-q:a','4',f'{d}/{kind}.ogg'])
        run(['ffmpeg','-y','-v','error','-i',src,'-af',f'volume={gain:.2f}dB','-c:a','libmp3lame','-b:a','128k',f'{d}/{kind}.mp3'])
        man[kind] = True
        print(g, kind, 'gain', round(gain,1), 'dur', round(dur(src),3), '->', round(dur(f'{d}/{kind}.ogg'),3))
    src = f"{SRC}/{g}_victory.mp3"
    tmp = '/tmp/v.wav'
    run(['ffmpeg','-y','-v','error','-i',src,'-af','silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.01,areverse,silenceremove=start_periods=1:start_threshold=-60dB:start_duration=0.05,areverse',tmp])
    gain = -15 - lufs(tmp); rms, pk = stats(tmp); gain = min(gain, -1 - pk)
    run(['ffmpeg','-y','-v','error','-i',tmp,'-af',f'volume={gain:.2f}dB','-c:a','libmp3lame','-b:a','128k',f'{d}/victory.mp3'])
    man['victory'] = True; print(g, 'victory', round(dur(src),2), '->', round(dur(f'{d}/victory.mp3'),2), 'gain', round(gain,1))
    for f in sorted(os.listdir(f"{SRC}/SFX")):
        if not f.startswith(g + '_'): continue
        name = f[len(g)+1:-4]; s = f"{SRC}/SFX/{f}"
        run(['ffmpeg','-y','-v','error','-i',s,'-af','silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.005',tmp])
        rms, pk = stats(tmp); gain = min(-17 - rms, -1 - pk)
        run(['ffmpeg','-y','-v','error','-i',tmp,'-af',f'volume={gain:.2f}dB','-c:a','libmp3lame','-b:a','128k',f'{d}/sfx/{name}.mp3'])
        man['sfx'].append(name); print('  ', g, name, 'rms', rms, 'pk', pk, 'gain', round(gain,1))
    manifest[g] = man
json.dump(manifest, open(os.path.join(OUT,'sounds.json'),'w'), indent=1)
print(json.dumps(manifest))
