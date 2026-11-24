/*!
 * AI4EduTech game assets loader v1.0 for Phaser 3.80
 * https://github.com/ahmadelhendawy1/game-assets
 *
 * Include AFTER Phaser:
 *   <script src="https://cdn.jsdelivr.net/gh/ahmadelhendawy1/game-assets@v1.0.0/ai4-assets.js"></script>
 *
 * In a scene:
 *   preload() { AI4Assets.preload(this, { pack: 'runner-desert' }); }
 *   create()  {
 *     const bg   = AI4Assets.parallax(this);                 // sky + hills, scroll with the camera
 *     const hero = AI4Assets.hero(this, 200, 600, { height: 150 });
 *     hero.setPose('run'); hero.face(1);                     // idle run jump fall hurt celebrate
 *     this.add.image(500, 600, AI4Assets.key('door'));       // texture keys: AI4Assets.key(name)
 *     AI4Assets.sfx(this, 'correct'); AI4Assets.music(this, 'adventure');
 *   }
 *
 * Every image and sound has a drawn/silent fallback, so a game never breaks if the CDN is unreachable.
 */
(function (root) {
  'use strict';
  var VERSION = '1.0.0';
  var script = document.currentScript;
  var BASE = (script && script.src) ? script.src.replace(/[^\/]*$/, '') : 'https://cdn.jsdelivr.net/gh/ahmadelhendawy1/game-assets@v' + VERSION + '/';
  var P = 'ai4-';

  var SFX = ['tap', 'select', 'commit', 'jump', 'land', 'coin', 'correct', 'wrong', 'hurt', 'boss-hit', 'power-up',
             'level-up', 'victory', 'tick', 'go', 'whoosh', 'splash', 'door-open', 'shoot', 'kick-ball'];
  var MUSIC = ['adventure', 'sea', 'space', 'mystery', 'stadium', 'castle', 'race', 'boss'];
  var SFX_VOL = { jump: 0.35, shoot: 0.35, hurt: 0.45, land: 0.4, tap: 0.5, select: 0.5, tick: 0.5 };
  var FALLBACK_COLORS = { door: 0x9a5b2e, 'door-open': 0x3b2a1a, coin: 0xf5c518, flag: 0xe53935, crystal: 0x4fc3f7, heart: 0xe53935,
    platform: 0x8d6e3f, crate: 0xa0703c, spikes: 0x9e9e9e, ground: 0x6aa84f, enemy: 0x283593, boss: 0x1a237e,
    'bg-far': 0x8ecbf5, 'bg-mid': 0x7cb342 };

  var state = { packs: {}, muted: false, musicKey: null, musicObj: null, failed: {} };

  /* Pack manifests are built into this file (tools/build_loader.py copies every packs/<id>/pack.json here),
     so all files are queued at once. Adding files while the Phaser loader is already running can stall it. */
  var PACKS = /*PACKS*/{"runner-desert":{"id":"runner-desert","title":"Runner Quest - Desert world","version":1,"files":{"hero-torso":"hero/torso.webp","hero-head":"hero/head.webp","hero-armFront":"hero/armFront.webp","hero-armBack":"hero/armBack.webp","hero-legFront":"hero/legFront.webp","hero-legBack":"hero/legBack.webp","hero-full":"hero/full.webp","door":"objects/door.webp","door-open":"objects/door-open.webp","crystal":"objects/crystal.webp","coin":"objects/coin.webp","flag":"objects/flag.webp","heart":"objects/heart.webp","platform":"objects/platform.webp","crate":"objects/crate.webp","spikes":"objects/spikes.webp","enemy":"enemies/enemy.webp","boss":"enemies/boss.webp","ground":"objects/ground.webp","bg-far":"bg/far.webp","bg-mid":"bg/mid.webp"},"sizes":{"door":[300,259],"door-open":[300,258],"crystal":[209,220],"coin":[110,97],"flag":[220,204],"heart":[96,80],"platform":[300,152],"crate":[150,138],"spikes":[220,84],"enemy":[200,129],"boss":[520,449],"ground":[1176,160],"bg-far":[2160,720],"bg-mid":[1876,420]},"hero":{"parts":{"torso":{"pivot":[82.8,108.0],"size":[123,118]},"head":{"pivot":[64.8,123.1],"size":[132,128],"attach":[94.3,18.7],"rest":0},"armFront":{"pivot":[16.2,15.1],"size":[110,94],"attach":[54.0,33.1],"rest":42},"armBack":{"pivot":[25.9,18.7],"size":[92,94],"attach":[77.4,36.0],"rest":30},"legFront":{"pivot":[38.9,8.6],"size":[78,166],"attach":[88.2,101.5],"rest":0},"legBack":{"pivot":[29.5,8.6],"size":[96,163],"attach":[72.0,100.1],"rest":0}},"order":["armBack","legBack","legFront","torso","head","armFront"]},"music":"adventure","bossMusic":"boss"}}/*END PACKS*/;

  function key(name) { return P + name; }
  function packOf(scene) { return scene.registry.get(P + 'pack') || null; }

  /* ───────────── preload ───────────── */
  function preload(scene, opts) {
    opts = opts || {};
    var packId = opts.pack;
    var L = scene.load;
    L.setCORS('anonymous');
    L.on('loaderror', function (file) { if (String(file.key).indexOf(P) === 0) state.failed[file.key] = true; });
    if (opts.sfx !== false) SFX.forEach(function (n) {
      L.audio(key('sfx-' + n), [BASE + 'audio/sfx/' + n + '.ogg', BASE + 'audio/sfx/' + n + '.mp3']);
    });
    var moods = opts.music === false ? [] : (opts.music || null);
    var data = packId ? PACKS[packId] : null;
    if (packId && !data && root.console) console.warn('[AI4Assets] unknown pack "' + packId + '" - using drawn placeholders');
    if (data) {
      state.packs[packId] = data; scene.registry.set(P + 'pack', data);
      Object.keys(data.files).forEach(function (name) { L.image(key(name), BASE + 'packs/' + packId + '/' + data.files[name]); });
    }
    (moods || (data ? [data.music, data.bossMusic] : [])).filter(Boolean).forEach(addMusic);
    function addMusic(m) { if (MUSIC.indexOf(m) >= 0) L.audio(key('music-' + m), [BASE + 'audio/music/' + m + '.ogg', BASE + 'audio/music/' + m + '.mp3']); }
    L.once('complete', function () { makeFallbacks(scene); });
  }

  /* Draw a simple placeholder for any image that failed (or was never in the pack). */
  function makeFallbacks(scene) {
    var pack = packOf(scene);
    var names = Object.keys(FALLBACK_COLORS);
    if (pack) names = names.concat(Object.keys(pack.files));
    names.forEach(function (n) {
      var k = key(n);
      if (scene.textures.exists(k) && !state.failed[k]) return;
      if (scene.textures.exists(k)) scene.textures.remove(k);
      var sz = (pack && pack.sizes && pack.sizes[n]) || (n.indexOf('hero-') === 0 && pack ? pack.hero.parts[n.slice(5)] && pack.hero.parts[n.slice(5)].size : null) || [96, 96];
      var g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(FALLBACK_COLORS[n] || 0xf4a261, 1); g.lineStyle(4, 0x1b1b3a, 1);
      if (n === 'coin' || n === 'heart' || n.indexOf('head') >= 0) { g.fillCircle(sz[0] / 2, sz[1] / 2, Math.min(sz[0], sz[1]) / 2 - 3); g.strokeCircle(sz[0] / 2, sz[1] / 2, Math.min(sz[0], sz[1]) / 2 - 3); }
      else { g.fillRoundedRect(2, 2, sz[0] - 4, sz[1] - 4, 12); g.strokeRoundedRect(2, 2, sz[0] - 4, sz[1] - 4, 12); }
      g.generateTexture(k, sz[0], sz[1]); g.destroy();
    });
  }

  /* ───────────── sound ───────────── */
  function sfx(scene, name, cfg) {
    var k = key('sfx-' + name);
    if (state.muted || !scene.cache.audio.exists(k)) return null;
    try { return scene.sound.play(k, Object.assign({ volume: SFX_VOL[name] || 0.6 }, cfg || {})); } catch (e) { return null; }
  }
  function music(scene, mood, cfg) {
    var k = key('music-' + mood);
    if (state.musicKey === k && state.musicObj && state.musicObj.isPlaying) return state.musicObj;
    stopMusic(scene);
    if (!scene.cache.audio.exists(k)) return null;
    try {
      state.musicObj = scene.sound.add(k, Object.assign({ loop: true, volume: 0.32 }, cfg || {}));
      state.musicKey = k;
      state.musicObj.play();
      if (state.muted) state.musicObj.pause();
      return state.musicObj;
    } catch (e) { return null; }
  }
  function stopMusic() { if (state.musicObj) { try { state.musicObj.stop(); state.musicObj.destroy(); } catch (e) {} } state.musicObj = null; state.musicKey = null; }
  function setMuted(scene, m) {
    state.muted = !!m;
    if (state.musicObj) { if (m) state.musicObj.pause(); else state.musicObj.resume(); }
    return state.muted;
  }

  /* ───────────── parallax backgrounds ───────────── */
  function parallax(scene, opts) {
    opts = opts || {};
    var cam = scene.cameras.main, w = cam.width, h = cam.height;
    var layers = [];
    function add(name, factor, height, y) {
      var tex = scene.textures.get(key(name)).getSourceImage();
      var s = height / tex.height;
      var ts = scene.add.tileSprite(0, y, w / s, tex.height, key(name)).setOrigin(0, 0).setScale(s).setScrollFactor(0).setDepth(opts.depth || -100 + layers.length);
      layers.push({ ts: ts, f: factor, s: s });
    }
    add('bg-far', opts.farFactor || 0.12, h, 0);
    var midH = Math.round(h * (opts.midHeight || 0.55));
    add('bg-mid', opts.midFactor || 0.4, midH, h - midH - (opts.groundOffset || 0));
    var api = {
      layers: layers,
      update: function () { layers.forEach(function (l) { l.ts.tilePositionX = cam.scrollX * l.f / l.s; }); },
      destroy: function () { scene.events.off('update', api.update); layers.forEach(function (l) { l.ts.destroy(); }); }
    };
    scene.events.on('update', api.update);
    scene.events.once('shutdown', api.destroy);
    return api;
  }

  /* A repeating ground strip: AI4Assets.ground(scene, x, y, width) -> TileSprite (top edge at y). */
  function ground(scene, x, y, width, height) {
    height = height || 80;
    var tex = scene.textures.get(key('ground')).getSourceImage(), s = height / tex.height;
    return scene.add.tileSprite(x, y, width / s, tex.height, key('ground')).setOrigin(0, 0).setScale(s);
  }

  /* ───────────── cut-out hero ───────────── */
  var POSES = {
    idle:      { armFront: 0, armBack: 0, legFront: 0, legBack: 0, head: 0, lean: 0 },
    run:       { lean: 6 },
    jump:      { armFront: -75, armBack: -55, legFront: -25, legBack: 20, head: -4, lean: 2 },
    fall:      { armFront: -115, armBack: -95, legFront: 12, legBack: -10, head: 4, lean: 0 },
    hurt:      { armFront: -60, armBack: -40, legFront: 15, legBack: -15, head: -10, lean: -14 },
    celebrate: { lean: 0 }
  };
  function hero(scene, x, y, opts) {
    opts = opts || {};
    var pack = packOf(scene);
    var rig = pack && pack.hero;
    var c = scene.add.container(x, y);
    var inner = scene.add.container(0, 0); c.add(inner);
    var parts = {}, natural = 1;
    if (rig) {
      var T = rig.parts.torso;
      var legH = Math.max.apply(null, ['legFront', 'legBack'].map(function (k) { var p = rig.parts[k]; return p.attach[1] - T.pivot[1] + p.size[1] - p.pivot[1]; }));
      var headTop = rig.parts.head.attach[1] - T.pivot[1] - rig.parts.head.pivot[1];
      natural = legH - headTop;
      rig.order.forEach(function (k) {
        var p = rig.parts[k];
        var img = scene.add.image(0, 0, key('hero-' + k));
        img.setOrigin(p.pivot[0] / p.size[0], p.pivot[1] / p.size[1]);
        if (k === 'torso') img.setPosition(0, -legH);
        else img.setPosition(p.attach[0] - T.pivot[0], p.attach[1] - T.pivot[1] - legH);
        img.__rest = p.rest || 0; img.__y0 = img.y;
        img.setAngle(img.__rest);
        parts[k] = img; inner.add(img);
      });
    }
    var scale = (opts.height || 150) / natural;
    inner.setScale(scale);
    var pose = 'idle', dir = 1, t0 = scene.time.now, cur = { armFront: 0, armBack: 0, legFront: 0, legBack: 0, head: 0, lean: 0 };
    c.setSize(natural * scale * 0.45, natural * scale);
    c.heroHeight = natural * scale;
    c.setPose = function (p) { if (POSES[p] && p !== pose) { pose = p; t0 = scene.time.now; } return c; };
    c.getPose = function () { return pose; };
    c.face = function (d) { if (d) { dir = d < 0 ? -1 : 1; inner.scaleX = Math.abs(inner.scaleX) * dir; } return c; };
    c.speed = 1;
    function step(time) {
      if (!c.active) return;
      var t = (time - t0) / 1000, target = Object.assign({}, POSES.idle, POSES[pose]);
      var bob = 0, ph;
      if (pose === 'idle') {
        ph = time / 1000 * 2.2; target.armFront = 4 * Math.sin(ph); target.armBack = -4 * Math.sin(ph); target.head = 2 * Math.sin(ph * 0.5); bob = 1.2 * Math.sin(ph * 2);
      } else if (pose === 'run') {
        ph = time / 1000 * 11 * (c.speed || 1);
        target.legFront = 32 * Math.sin(ph); target.legBack = -32 * Math.sin(ph);
        target.armFront = -38 * Math.sin(ph); target.armBack = 38 * Math.sin(ph);
        target.head = 2 * Math.sin(ph * 2); bob = -5 * Math.abs(Math.sin(ph));
      } else if (pose === 'celebrate') {
        ph = time / 1000 * 9; target.armFront = -150 + 18 * Math.sin(ph); target.armBack = -135 - 18 * Math.sin(ph);
        target.legFront = 6; target.legBack = -6; bob = -14 * Math.abs(Math.sin(ph * 0.5));
      } else if (pose === 'hurt') {
        bob = 2 * Math.sin(t * 60) * Math.max(0, 1 - t * 2);
      }
      var k = pose === 'run' ? 0.5 : 0.22;
      Object.keys(cur).forEach(function (n) { cur[n] += (target[n] - cur[n]) * k; });
      if (rig) {
        ['armFront', 'armBack', 'legFront', 'legBack', 'head'].forEach(function (n) { parts[n].setAngle(parts[n].__rest + cur[n]); });
        ['torso', 'head', 'armFront', 'armBack'].forEach(function (n) { parts[n].y = parts[n].__y0 + bob / scale * 0.6; });
      }
      inner.angle = cur.lean * dir;
      inner.y = bob * 0.4;
    }
    scene.events.on('update', step);
    c.once('destroy', function () { scene.events.off('update', step); });
    c.flashHurt = function () {
      Object.keys(parts).forEach(function (n) { parts[n].setTint(0xff7b7b); });
      scene.time.delayedCall(220, function () { Object.keys(parts).forEach(function (n) { if (parts[n].active) parts[n].clearTint(); }); });
      return c;
    };
    if (!rig) {   // no pack: simple drawn hero so the game still works
      var g = scene.add.graphics();
      g.fillStyle(0xf4a261, 1).fillCircle(0, -natural * 0.85, natural * 0.15);
      g.fillStyle(0x1d4ed8, 1).fillRoundedRect(-natural * 0.15, -natural * 0.7, natural * 0.3, natural * 0.4, 8);
      g.fillStyle(0x5d4037, 1).fillRect(-natural * 0.13, -natural * 0.3, natural * 0.1, natural * 0.3).fillRect(natural * 0.03, -natural * 0.3, natural * 0.1, natural * 0.3);
      inner.add(g);
    }
    return c;
  }

  /* An HTML label that follows a game object (keeps Arabic shaping and direction correct). */
  function label(scene, obj, text, opts) {
    opts = opts || {};
    var canvas = scene.game.canvas, host = canvas.parentElement;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var el = document.createElement('div');
    el.className = 'ai4-label'; el.dir = 'auto'; el.textContent = text;
    el.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%);pointer-events:none;white-space:normal;text-align:center;' +
      'max-width:' + (opts.maxWidth || 220) + 'px;padding:6px 12px;border-radius:14px;font:800 ' + (opts.size || 18) + 'px/1.25 system-ui,"Segoe UI",Tahoma,sans-serif;' +
      'background:' + (opts.bg || 'rgba(255,255,255,.95)') + ';color:' + (opts.color || '#1b1b3a') + ';box-shadow:0 3px 0 rgba(0,0,0,.25);border:3px solid ' + (opts.border || '#1b1b3a') + ';z-index:5';
    host.appendChild(el);
    var dy = opts.offsetY || 0;
    function place() {
      if (!obj.active) { el.remove(); return; }
      var cam = scene.cameras.main, r = canvas.getBoundingClientRect(), hr = host.getBoundingClientRect();
      var sx = r.width / scene.scale.width, sy = r.height / scene.scale.height;
      var b = obj.getBounds ? obj.getBounds() : { centerX: obj.x, top: obj.y, left: obj.x, right: obj.x };
      var view = cam.worldView, off = b.right < view.x || b.left > view.right || !obj.visible;
      el.style.display = off ? 'none' : '';
      if (off) return;
      var x = (b.centerX - cam.scrollX) * sx + (r.left - hr.left), y = (b.top + dy - cam.scrollY) * sy + (r.top - hr.top);
      x = Math.max(el.offsetWidth / 2 + 4, Math.min(r.width - el.offsetWidth / 2 - 4, x));
      el.style.left = x + 'px'; el.style.top = Math.max(el.offsetHeight + 4, y) + 'px';
    }
    scene.events.on('postupdate', place);
    var api = { el: el, setHighlight: function (on, color) { el.style.background = on ? (color || '#ffe066') : (opts.bg || 'rgba(255,255,255,.95)'); el.style.transform = 'translate(-50%,-100%) scale(' + (on ? 1.08 : 1) + ')'; },
                destroy: function () { scene.events.off('postupdate', place); el.remove(); } };
    scene.events.once('shutdown', api.destroy);
    return api;
  }

  root.AI4Assets = {
    version: VERSION, base: BASE, sfxNames: SFX.slice(), musicNames: MUSIC.slice(),
    preload: preload, key: key, sfx: sfx, music: music, stopMusic: stopMusic,
    setMuted: function (scene, m) { return setMuted(scene, m); }, isMuted: function () { return state.muted; },
    parallax: parallax, ground: ground, hero: hero, label: label, pack: packOf
  };
})(typeof window !== 'undefined' ? window : this);
