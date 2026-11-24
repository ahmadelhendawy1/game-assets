/*!
 * AI4EduTech game assets loader v1.0 for Phaser 3.80 (packs: runner-desert, runner-rides, sea, space, maze, soccer, castle, kart)
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

  var state = { packs: {}, muted: false, musicKey: null, musicObj: null, failed: {}, owner: {} };

  /* Pack manifests are built into this file (tools/build_loader.py copies every packs/<id>/pack.json here),
     so all files are queued at once. Adding files while the Phaser loader is already running can stall it. */
  var PACKS = /*PACKS*/{"castle":{"id":"castle","title":"Castle Defense","version":1,"files":{"hero-torso":"hero/hero-torso.webp","hero-head":"hero/hero-head.webp","hero-armFront":"hero/hero-armFront.webp","hero-armBack":"hero/hero-armBack.webp","hero-legFront":"hero/hero-legFront.webp","hero-legBack":"hero/hero-legBack.webp","bg-far":"img/bg-far.webp","ground":"img/ground.webp","tower":"img/tower.webp","gate":"img/gate.webp","tower-base":"img/tower-base.webp","arrow":"img/arrow.webp","goblin":"img/goblin.webp","golem":"img/golem.webp","slime":"img/slime.webp","boss":"img/boss.webp"},"sizes":{"hero-torso":[112,172],"hero-head":[148,140],"hero-armFront":[113,216],"hero-armBack":[91,111],"hero-legFront":[62,154],"hero-legBack":[80,154],"bg-far":[2160,720],"ground":[1238,150],"tower":[208,330],"gate":[320,300],"tower-base":[223,230],"arrow":[120,20],"goblin":[195,220],"golem":[201,220],"slime":[197,220],"boss":[515,540]},"music":"castle","bossMusic":"boss","hero":{"parts":{"torso":{"pivot":[60.0,144.0],"size":[112,172]},"head":{"pivot":[94.0,136.0],"size":[148,140],"attach":[60.0,47.2],"rest":0},"armFront":{"pivot":[15.2,118.0],"size":[113,216],"attach":[64.0,66.0],"rest":30},"armBack":{"pivot":[16.8,15.2],"size":[91,111],"attach":[74.0,66.0],"rest":24},"legFront":{"pivot":[34.0,8.8],"size":[62,154],"attach":[70.0,140.0],"rest":0},"legBack":{"pivot":[32.0,8.8],"size":[80,154],"attach":[51.2,138.0],"rest":0}},"order":["armBack","legBack","legFront","torso","head","armFront"],"swing":{"armFront":0.3}}},"kart":{"id":"kart","title":"Turbo Kart","version":1,"files":{"track-tile":"img/track-tile.webp","kart-red":"img/kart-red.webp","kart-blue":"img/kart-blue.webp","kart-green":"img/kart-green.webp","kart-yellow":"img/kart-yellow.webp","oil":"img/oil.webp","cone":"img/cone.webp","boost":"img/boost.webp","coin":"img/coin.webp","star":"img/star.webp","tyres":"img/tyres.webp","garage":"img/garage.webp","boss":"img/boss.webp"},"sizes":{"track-tile":[467,1400],"kart-red":[212,240],"kart-blue":[211,240],"kart-green":[212,240],"kart-yellow":[213,240],"oil":[200,157],"cone":[106,120],"boost":[160,147],"coin":[94,100],"star":[110,105],"tyres":[110,140],"garage":[230,300],"boss":[222,320]},"music":"race","bossMusic":"boss"},"maze":{"id":"maze","title":"Maze Explorer","version":1,"files":{"floor":"img/floor.webp","wall":"img/wall.webp","wall-corner":"img/wall-corner.webp","torch":"img/torch.webp","door":"img/door.webp","door-open":"img/door-open.webp","explorer-down":"img/explorer-down.webp","explorer-up":"img/explorer-up.webp","explorer-right":"img/explorer-right.webp","gem-blue":"img/gem-blue.webp","gem-red":"img/gem-red.webp","key":"img/key.webp","chest":"img/chest.webp","ghost":"img/ghost.webp","checkpoint":"img/checkpoint.webp","boss":"img/boss.webp"},"sizes":{"floor":[128,128],"wall":[160,140],"wall-corner":[160,156],"torch":[155,160],"door":[160,154],"door-open":[160,145],"explorer-down":[91,240],"explorer-up":[89,240],"explorer-right":[137,240],"gem-blue":[98,100],"gem-red":[98,100],"key":[120,78],"chest":[150,127],"ghost":[150,140],"checkpoint":[140,136],"boss":[500,433]},"music":"mystery","bossMusic":"boss"},"runner-desert":{"id":"runner-desert","title":"Runner Quest - Desert world","version":1,"files":{"hero-torso":"hero/torso.webp","hero-head":"hero/head.webp","hero-armFront":"hero/armFront.webp","hero-armBack":"hero/armBack.webp","hero-legFront":"hero/legFront.webp","hero-legBack":"hero/legBack.webp","hero-full":"hero/full.webp","door":"objects/door.webp","door-open":"objects/door-open.webp","crystal":"objects/crystal.webp","coin":"objects/coin.webp","flag":"objects/flag.webp","heart":"objects/heart.webp","platform":"objects/platform.webp","crate":"objects/crate.webp","spikes":"objects/spikes.webp","enemy":"enemies/enemy.webp","boss":"enemies/boss.webp","ground":"objects/ground.webp","bg-far":"bg/far.webp","bg-mid":"bg/mid.webp"},"sizes":{"door":[300,259],"door-open":[300,258],"crystal":[209,220],"coin":[110,97],"flag":[220,204],"heart":[96,80],"platform":[300,152],"crate":[150,138],"spikes":[220,84],"enemy":[200,129],"boss":[520,449],"ground":[1176,160],"bg-far":[2160,720],"bg-mid":[1876,420]},"hero":{"parts":{"torso":{"pivot":[82.8,108.0],"size":[123,118]},"head":{"pivot":[64.8,123.1],"size":[132,128],"attach":[94.3,18.7],"rest":0},"armFront":{"pivot":[16.2,15.1],"size":[110,94],"attach":[54.0,33.1],"rest":42},"armBack":{"pivot":[25.9,18.7],"size":[92,94],"attach":[77.4,36.0],"rest":30},"legFront":{"pivot":[38.9,8.6],"size":[78,166],"attach":[88.2,101.5],"rest":0},"legBack":{"pivot":[29.5,8.6],"size":[96,163],"attach":[72.0,100.1],"rest":0}},"order":["armBack","legBack","legFront","torso","head","armFront"]},"music":"adventure","bossMusic":"boss"},"runner-rides":{"id":"runner-rides","title":"Runner Quest rides: horse and kart","version":1,"files":{"horse-body":"ride/horse-body.webp","horse-leg-hind-far":"ride/horse-leg-hind-far.webp","horse-leg-front-far":"ride/horse-leg-front-far.webp","horse-leg-hind-near":"ride/horse-leg-hind-near.webp","horse-leg-front-near":"ride/horse-leg-front-near.webp","horse-rider":"ride/horse-rider.webp","kart-body":"ride/kart-body.webp","kart-wheel-back":"ride/kart-wheel-back.webp","kart-wheel-front":"ride/kart-wheel-front.webp","kart-driver":"ride/kart-driver.webp"},"sizes":{"horse-body":[378,243],"horse-leg-hind-far":[65,161],"horse-leg-front-far":[48,157],"horse-leg-hind-near":[63,163],"horse-leg-front-near":[47,158],"horse-rider":[147,260],"kart-body":[401,179],"kart-wheel-back":[96,98],"kart-wheel-front":[68,70],"kart-driver":[142,178]},"music":"adventure","bossMusic":"boss","rides":{"horse":{"body":"horse-body","size":[378,243],"groundY":352.8,"legs":{"horse-leg-hind-far":{"pivot":[39.9,7.56],"attach":[107.1,191.1]},"horse-leg-front-far":{"pivot":[25.2,5.88],"attach":[268.8,186.9]},"horse-leg-hind-near":{"pivot":[41.16,7.56],"attach":[126.0,194.04]},"horse-leg-front-near":{"pivot":[24.36,5.88],"attach":[289.8,189.84]}},"rider":{"key":"horse-rider","pivot":[49.476,182.28],"at":[180.6,138.6]}},"kart":{"body":"kart-body","size":[401,179],"groundY":193.6,"panelTop":95.8,"wheels":{"kart-wheel-back":{"at":[67.2,140.7]},"kart-wheel-front":{"at":[261.24,144.9]}},"driver":{"key":"kart-driver","pivot":[91.728,165.816],"at":[144.9,97.44]}}}},"sea":{"id":"sea","title":"Sea Voyage","version":1,"files":{"sea-tile":"img/sea-tile.webp","boat-pirate":"img/boat-pirate.webp","boat-sail":"img/boat-sail.webp","boat-fishing":"img/boat-fishing.webp","buoy":"img/buoy.webp","whirlpool":"img/whirlpool.webp","rocks":"img/rocks.webp","rope":"img/rope.webp","shark":"img/shark.webp","fish":"img/fish.webp","coin":"img/coin.webp","island-1":"img/island-1.webp","island-2":"img/island-2.webp","island-3":"img/island-3.webp","boat-side":"img/boat-side.webp","boss":"img/boss.webp"},"sizes":{"sea-tile":[512,512],"boat-pirate":[132,300],"boat-sail":[126,300],"boat-fishing":[129,300],"buoy":[144,200],"whirlpool":[240,215],"rocks":[220,184],"rope":[1200,104],"shark":[170,89],"fish":[120,79],"coin":[110,94],"island-1":[360,352],"island-2":[360,325],"island-3":[360,330],"boat-side":[300,260],"boss":[540,493]},"music":"sea","bossMusic":"boss"},"soccer":{"id":"soccer","title":"Football Star","version":1,"files":{"hero-torso":"hero/hero-torso.webp","hero-head":"hero/hero-head.webp","hero-armFront":"hero/hero-armFront.webp","hero-armBack":"hero/hero-armBack.webp","hero-legFront":"hero/hero-legFront.webp","hero-legBack":"hero/hero-legBack.webp","bg-far":"img/bg-far.webp","ground":"img/ground.webp","corner-flag":"img/corner-flag.webp","cone":"img/cone.webp","ball":"img/ball.webp","defender-run":"img/defender-run.webp","defender-slide":"img/defender-slide.webp","penalty-view":"img/penalty-view.webp","boss":"img/boss.webp"},"sizes":{"hero-torso":[134,132],"hero-head":[137,148],"hero-armFront":[113,89],"hero-armBack":[81,131],"hero-legFront":[79,170],"hero-legBack":[93,167],"bg-far":[2160,720],"ground":[1198,140],"corner-flag":[136,220],"cone":[114,130],"ball":[99,100],"defender-run":[223,320],"defender-slide":[380,276],"penalty-view":[1280,853],"boss":[428,520]},"music":"stadium","bossMusic":"boss","hero":{"parts":{"torso":{"pivot":[69.3,121.8],"size":[134,132]},"head":{"pivot":[74.8,142.0],"size":[137,148],"attach":[79.8,16.8],"rest":0},"armFront":{"pivot":[18.9,18.9],"size":[113,89],"attach":[63.0,35.7],"rest":55},"armBack":{"pivot":[47.0,17.6],"size":[81,131],"attach":[86.1,35.7],"rest":-8},"legFront":{"pivot":[39.9,7.6],"size":[79,170],"attach":[77.7,118.4],"rest":0},"legBack":{"pivot":[32.8,7.6],"size":[93,167],"attach":[58.8,116.8],"rest":0}},"order":["armBack","legBack","legFront","torso","head","armFront"],"swing":{}}},"space":{"id":"space","title":"Space Defender","version":1,"files":{"space-tile":"img/space-tile.webp","ship-blue":"img/ship-blue.webp","ship-red":"img/ship-red.webp","ship-green":"img/ship-green.webp","planet-orange":"img/planet-orange.webp","planet-blue":"img/planet-blue.webp","planet-green":"img/planet-green.webp","planet-pink":"img/planet-pink.webp","asteroid-1":"img/asteroid-1.webp","asteroid-2":"img/asteroid-2.webp","asteroid-3":"img/asteroid-3.webp","drone":"img/drone.webp","shield":"img/shield.webp","explosion":"img/explosion.webp","star":"img/star.webp","laser":"img/laser.webp","boss":"img/boss.webp"},"sizes":{"space-tile":[765,1100],"ship-blue":[194,260],"ship-red":[219,260],"ship-green":[199,260],"planet-orange":[220,194],"planet-blue":[214,220],"planet-green":[219,220],"planet-pink":[220,219],"asteroid-1":[230,221],"asteroid-2":[220,156],"asteroid-3":[160,149],"drone":[160,137],"shield":[138,140],"explosion":[220,190],"star":[110,107],"laser":[120,36],"boss":[559,560]},"music":"space","bossMusic":"boss"}}/*END PACKS*/;

  function key(name) { return P + name; }
  function packsOf(scene) { return scene.registry.get(P + 'packs') || []; }
  function packOf(scene) { var l = packsOf(scene); for (var i = 0; i < l.length; i++) if (l[i].hero) return l[i]; return l[0] || null; }
  function ridesOf(scene) { var l = packsOf(scene); for (var i = 0; i < l.length; i++) if (l[i].rides) return l[i].rides; return null; }
  function has(scene, name) { return packsOf(scene).some(function (pk) { return pk.files[name]; }); }

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
    var ids = packId ? [].concat(packId) : [], loaded = [], moodsFromPacks = [];
    ids.forEach(function (id) {
      var data = PACKS[id];
      if (!data) { if (root.console) console.warn('[AI4Assets] unknown pack "' + id + '" - using drawn placeholders'); return; }
      state.packs[id] = data; loaded.push(data);
      Object.keys(data.files).forEach(function (name) {
        var k = key(name);
        // Packs share names (boss, coin, ground...): the pack loaded last owns the name, so replace the old image.
        if (state.owner[k] && state.owner[k] !== id && scene.textures.exists(k)) scene.textures.remove(k);
        state.owner[k] = id; delete state.failed[k];
        L.image(k, BASE + 'packs/' + id + '/' + data.files[name]);
      });
      [data.music, data.bossMusic].forEach(function (m) { if (m && moodsFromPacks.indexOf(m) < 0) moodsFromPacks.push(m); });
    });
    scene.registry.set(P + 'packs', loaded);
    (moods || moodsFromPacks).filter(Boolean).forEach(addMusic);
    function addMusic(m) { if (MUSIC.indexOf(m) >= 0) L.audio(key('music-' + m), [BASE + 'audio/music/' + m + '.ogg', BASE + 'audio/music/' + m + '.mp3']); }
    L.once('complete', function () { makeFallbacks(scene); });
  }

  /* Draw a simple placeholder for any image that failed (or was never in the pack). */
  function makeFallbacks(scene) {
    var names = [], sizes = {};
    packsOf(scene).forEach(function (pk) { Object.keys(pk.files).forEach(function (n) { names.push(n); sizes[n] = pk.sizes[n]; }); });
    names.forEach(function (n) {
      var k = key(n);
      if (scene.textures.exists(k) && !state.failed[k]) return;
      if (scene.textures.exists(k)) scene.textures.remove(k);
      var sz = sizes[n] || [96, 96];
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
    if (has(scene, 'bg-far')) add('bg-far', opts.farFactor || 0.12, h, 0);
    var midH = Math.round(h * (opts.midHeight || 0.55));
    if (has(scene, 'bg-mid')) add('bg-mid', opts.midFactor || 0.4, midH, h - midH - (opts.groundOffset || 0));
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
    aim:       { lean: 0 },
    celebrate: { lean: 0 }
  };
  function hero(scene, x, y, opts) {
    opts = opts || {};
    var pack = packOf(scene);
    var rig = pack && pack.hero;
    var c = scene.add.container(x, y);
    var inner = scene.add.container(0, 0); c.add(inner);
    var parts = {}, natural = 1, swing = (rig && rig.swing) || {};
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
        target.armFront = -38 * Math.sin(ph) * (swing.armFront == null ? 1 : swing.armFront); target.armBack = 38 * Math.sin(ph) * (swing.armBack == null ? 1 : swing.armBack);
        target.head = 2 * Math.sin(ph * 2); bob = -5 * Math.abs(Math.sin(ph));
      } else if (pose === 'celebrate') {
        ph = time / 1000 * 9; target.armFront = -150 + 18 * Math.sin(ph); target.armBack = -135 - 18 * Math.sin(ph);
        target.legFront = 6; target.legBack = -6; bob = -14 * Math.abs(Math.sin(ph * 0.5));
      } else if (pose === 'aim') {
        target.armFront = rig ? -parts.armFront.__rest : 0; target.armBack = rig ? -parts.armBack.__rest - 25 : 0; target.head = -3;
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

  /* ───────────── rides (pack 'runner-rides'): horse with rider, kart with driver ─────────────
     AI4Assets.ride(scene, x, feetY, { type: 'horse' | 'kart', height: 190 }) -> container with the same
     setPose / face / flashHurt / speed as the hero. Wheels spin and legs gallop by themselves. */
  function ride(scene, x, y, opts) {
    opts = opts || {};
    var R = ridesOf(scene), type = opts.type === 'kart' ? 'kart' : 'horse', def = R && R[type];
    if (!def) return hero(scene, x, y, opts);           // no rides pack: fall back to the hero on foot
    var c = scene.add.container(x, y), inner = scene.add.container(0, 0); c.add(inner);
    var bw = def.size[0], parts = {}, groundY = 0;
    function img(k, px, py, ox, oy) { var s = scene.textures.get(key(k)).getSourceImage(), im = scene.add.image(ox, oy, key(k)).setOrigin(px / s.width, py / s.height); inner.add(im); return im; }
    if (type === 'horse') {
      Object.keys(def.legs).forEach(function (k) { var L = def.legs[k], s = scene.textures.get(key(k)).getSourceImage(); groundY = Math.max(groundY, L.attach[1] + s.height - L.pivot[1]); });
      ['horse-leg-hind-far', 'horse-leg-front-far', 'horse-leg-hind-near', 'horse-leg-front-near'].forEach(function (k) {
        var L = def.legs[k]; parts[k] = img(k, L.pivot[0], L.pivot[1], L.attach[0] - bw / 2, L.attach[1] - groundY);
      });
      parts.body = img(def.body, 0, 0, -bw / 2, -groundY);
      parts.rider = img(def.rider.key, def.rider.pivot[0], def.rider.pivot[1], def.rider.at[0] - bw / 2, def.rider.at[1] - groundY);
    } else {
      Object.keys(def.wheels).forEach(function (k) { var s = scene.textures.get(key(k)).getSourceImage(); groundY = Math.max(groundY, def.wheels[k].at[1] + s.height / 2); });
      parts.body = img(def.body, 0, 0, -bw / 2, -groundY);
      parts.rider = img(def.driver.key, def.driver.pivot[0], def.driver.pivot[1], def.driver.at[0] - bw / 2, def.driver.at[1] - groundY);
      var side = img(def.body, 0, 0, -bw / 2, -groundY); side.setCrop(0, def.panelTop, def.size[0], def.size[1] - def.panelTop); parts.side = side;
      Object.keys(def.wheels).forEach(function (k) { var s = scene.textures.get(key(k)).getSourceImage(); parts[k] = img(k, s.width / 2, s.height / 2, def.wheels[k].at[0] - bw / 2, def.wheels[k].at[1] - groundY); });
    }
    Object.keys(parts).forEach(function (k) { parts[k].__y0 = parts[k].y; });
    var b = inner.getBounds(), natural = b.height || 1, scale = (opts.height || 190) / natural;
    inner.setScale(scale); c.setSize(b.width * scale, natural * scale); c.heroHeight = natural * scale;
    var pose = 'idle', dir = 1, t0 = scene.time.now, spin = 0, lean = 0;
    c.speed = 1;
    c.setPose = function (p) { if (POSES[p] && p !== pose) { pose = p; t0 = scene.time.now; } return c; };
    c.getPose = function () { return pose; };
    c.face = function (d) { if (d) { dir = d < 0 ? -1 : 1; inner.scaleX = Math.abs(inner.scaleX) * dir; } return c; };
    c.flashHurt = function () { Object.keys(parts).forEach(function (n) { parts[n].setTint(0xff7b7b); }); scene.time.delayedCall(220, function () { Object.keys(parts).forEach(function (n) { if (parts[n].active) parts[n].clearTint(); }); }); return c; };
    function step(time, delta) {
      if (!c.active) return;
      var t = (time - t0) / 1000, ph = time / 1000 * 10 * (c.speed || 1), bob = 0, tl = 0;
      if (type === 'horse') {
        var A = { 'horse-leg-front-near': 0, 'horse-leg-front-far': 0, 'horse-leg-hind-near': 0, 'horse-leg-hind-far': 0 };
        if (pose === 'run') { A['horse-leg-front-near'] = -34 * Math.sin(ph); A['horse-leg-front-far'] = -34 * Math.sin(ph + 0.6); A['horse-leg-hind-near'] = 30 * Math.sin(ph + 0.3); A['horse-leg-hind-far'] = 30 * Math.sin(ph + 0.9); bob = -8 * Math.abs(Math.sin(ph)); tl = 3 * Math.sin(ph); }
        else if (pose === 'jump' || pose === 'fall') { A['horse-leg-front-near'] = -55; A['horse-leg-front-far'] = -45; A['horse-leg-hind-near'] = 35; A['horse-leg-hind-far'] = 30; tl = pose === 'jump' ? -10 : 6; }
        else if (pose === 'hurt') { A['horse-leg-front-near'] = -40; A['horse-leg-front-far'] = -30; tl = -12; bob = 2 * Math.sin(t * 60) * Math.max(0, 1 - t * 2); }
        else if (pose === 'celebrate') { A['horse-leg-front-near'] = -70 + 15 * Math.sin(ph); A['horse-leg-front-far'] = -60 + 15 * Math.sin(ph + 1); tl = -18; }
        else { bob = 1.2 * Math.sin(time / 450); }
        Object.keys(A).forEach(function (k) { parts[k].angle += (A[k] - parts[k].angle) * 0.35; });
        parts.rider.y = parts.rider.__y0 + bob * 0.5 / scale;
      } else {
        var moving = pose === 'run' || pose === 'jump' || pose === 'fall';
        spin += (moving ? 720 * (c.speed || 1) : 0) * (delta || 16) / 1000;
        Object.keys(def.wheels).forEach(function (k) { parts[k].angle = spin; });
        if (pose === 'run') bob = -2 * Math.abs(Math.sin(ph * 1.5));
        if (pose === 'jump') tl = -8; if (pose === 'fall') tl = 5;
        if (pose === 'hurt') { tl = Math.sin(t * 40) * 10 * Math.max(0, 1 - t * 2); }
        if (pose === 'celebrate') { bob = -10 * Math.abs(Math.sin(ph * 0.6)); }
        parts.rider.y = parts.rider.__y0 + (pose === 'run' ? Math.sin(ph * 2) * 1.5 / scale : 0);
      }
      lean += (tl - lean) * 0.2; inner.angle = lean * dir; inner.y = bob;
    }
    scene.events.on('update', step);
    c.once('destroy', function () { scene.events.off('update', step); });
    return c;
  }

  /* ───────────── endless scrolling background for top-down games (sea-tile, space-tile, track-tile) ─────────────
     AI4Assets.scroller(scene, 'sea-tile', { speed: 120, axis: 'y', width: 700 }) -> { ts, speed } ; set .speed any time. */
  function scroller(scene, name, opts) {
    opts = opts || {};
    var cam = scene.cameras.main, w = opts.width || cam.width, h = cam.height, x = opts.x == null ? (cam.width - w) / 2 : opts.x;
    var src = scene.textures.get(key(name)).getSourceImage(), s = opts.tileScale || (opts.fitWidth === false ? 1 : w / src.width);
    if (opts.axis === 'x') s = opts.tileScale || h / src.height;
    var ts = scene.add.tileSprite(x, 0, w / s, h / s, key(name)).setOrigin(0, 0).setScale(s).setScrollFactor(0).setDepth(opts.depth == null ? -100 : opts.depth);
    var api = { ts: ts, speed: opts.speed == null ? 120 : opts.speed, scale: s };
    function upd(time, delta) { var d = api.speed * (delta || 16) / 1000 / s; if (opts.axis === 'x') ts.tilePositionX += d; else ts.tilePositionY -= d; }
    scene.events.on('update', upd);
    scene.events.once('shutdown', function () { scene.events.off('update', upd); });
    return api;
  }

  /* ───────────── side-view sea: animated rolling waves that things float on ─────────────
     const sea = AI4Assets.sea(scene, { level: 470 });          // water surface y on screen
     sea.float(boat, { sink: 18, tilt: 1 });                      // boat rides the waves (bobs + tilts)
     sea.surfaceY(worldX) / sea.slope(worldX); sea.setCalm(true) // calm sea in the choice zone
     sea.splash(worldX, size)                                     // spray + ring at the surface
     Layers: back (behind everything), main (behind floating things) and a see-through front layer drawn
     over the hulls, so boats sit IN the water. Wave phase follows the camera, so a scrolling level works. */
  function sea(scene, opts) {
    opts = opts || {};
    var cam = scene.cameras.main, W = cam.width, H = cam.height, level = opts.level == null ? Math.round(H * 0.64) : opts.level;
    var amp = opts.amplitude || 14, calm = 1, calmTarget = 1, t = 0, floats = [];
    var C = Object.assign({ deep: 0x0b4f8a, mid: 0x1683c7, light: 0x2fb4e8, back: 0x0d6aa8, foam: 0xffffff, front: 0x48c6f0 }, opts.colors || {});
    var gBack = scene.add.graphics().setScrollFactor(0).setDepth(opts.depthBack == null ? -60 : opts.depthBack);
    var gMain = scene.add.graphics().setScrollFactor(0).setDepth(opts.depthMain == null ? 4 : opts.depthMain);
    var gFront = scene.add.graphics().setScrollFactor(0).setDepth(opts.depthFront == null ? 60 : opts.depthFront);
    // depth shading: one rectangle (4 corners, so the gradient is smooth) that darkens the deep water
    var gDeep = scene.add.graphics().setScrollFactor(0).setDepth((opts.depthMain == null ? 4 : opts.depthMain) + 0.5);
    if (gDeep.fillGradientStyle) gDeep.fillGradientStyle(C.deep, C.deep, C.deep, C.deep, 0, 0, 0.85, 0.85); else gDeep.fillStyle(C.deep, 0.4);
    gDeep.fillRect(0, level + 34, W, H - level - 30);
    if (!scene.textures.exists(P + 'drop')) { var d = scene.make.graphics({ add: false }); d.fillStyle(0xffffff, 1).fillCircle(6, 6, 6); d.generateTexture(P + 'drop', 12, 12); d.destroy(); }
    function wave(x, k, ph) {     // x = world x
      var a = amp * calm;
      return a * (0.55 * Math.sin(x * 0.011 * k - t * 1.3 + ph) + 0.30 * Math.sin(x * 0.023 * k + t * 0.9 + ph * 2) + 0.15 * Math.sin(x * 0.047 * k - t * 2.1 + ph * 3));
    }
    function surf(x) { return level + wave(x, 1, 0); }
    function draw(g, par, k, ph, off, colTop, colBot, alpha, foam) {
      g.clear();
      var sx = cam.scrollX * par, step = 12, top = Infinity, pts = [];
      for (var x = -step; x <= W + step; x += step) { var y = level + off + wave(x + sx, k, ph); pts.push(x, y); if (y < top) top = y; }
      g.fillStyle(colTop, alpha);   // flat fill: gradients on wavy shapes draw diagonal streaks
      g.beginPath(); g.moveTo(pts[0], H + 10);
      for (var i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.lineTo(pts[pts.length - 2], H + 10); g.closePath(); g.fillPath();
      if (foam) {
        g.lineStyle(4, C.foam, 0.85 * alpha); g.beginPath(); g.moveTo(pts[0], pts[1]);
        for (var j = 2; j < pts.length; j += 2) g.lineTo(pts[j], pts[j + 1]);
        g.strokePath();
        g.lineStyle(2, C.foam, 0.35 * alpha);   // soft second crest line and sparkles
        for (var m = 0; m < pts.length - 4; m += 10) { var yy = pts[m + 1] + 14 + 4 * Math.sin(t * 2 + m); g.lineBetween(pts[m] + 4, yy, pts[m] + 26, yy + 1); }
      }
    }
    var api = {
      level: level,
      surfaceY: function (x) { return surf(x); },
      slope: function (x) { return (surf(x + 4) - surf(x - 4)) / 8; },
      setCalm: function (on) { calmTarget = on ? 0.25 : 1; return api; },
      setAmplitude: function (a) { amp = a; return api; },
      float: function (obj, o) { o = o || {}; floats.push({ obj: obj, sink: o.sink || 0, tilt: o.tilt == null ? 1 : o.tilt, rot: 0 }); return obj; },
      unfloat: function (obj) { floats = floats.filter(function (f) { return f.obj !== obj; }); },
      splash: function (x, size) {
        size = size || 1; var y = surf(x);
        for (var i = 0; i < 14 * size; i++) {
          var p = scene.add.image(x, y, P + 'drop').setDepth(61).setScale(0.3 + Math.random() * 0.5 * size).setAlpha(0.9).setTint(0xe6f7ff);
          scene.tweens.add({ targets: p, x: x + (Math.random() - 0.5) * 120 * size, y: y - 30 - Math.random() * 70 * size, alpha: 0, duration: 500 + Math.random() * 300, ease: 'Quad.out', onComplete: function (tw, targets) { targets[0].destroy(); } });
        }
        var ring = scene.add.ellipse(x, y + 4, 30, 8).setStrokeStyle(3, 0xffffff, 0.8).setDepth(61);
        scene.tweens.add({ targets: ring, scaleX: 4 * size, scaleY: 2, alpha: 0, duration: 600, onComplete: function () { ring.destroy(); } });
      }
    };
    function upd(time, delta) {
      var dt = (delta || 16) / 1000; t += dt; calm += (calmTarget - calm) * Math.min(1, dt * 1.5);
      draw(gBack, 0.55, 0.8, 1.7, -18, C.back, C.deep, 1, false);
      draw(gMain, 1, 1, 0, 0, C.mid, C.deep, 1, true);
      draw(gFront, 1.15, 1.1, 0.9, 22, C.front, C.mid, 0.55, true);
      floats.forEach(function (f) {
        if (!f.obj.active) return;
        var x = f.obj.x, target = Math.atan(api.slope(x)) * f.tilt;
        f.rot += (target - f.rot) * Math.min(1, dt * 6);
        f.obj.y = surf(x) + f.sink; f.obj.rotation = f.rot;
      });
      floats = floats.filter(function (f) { return f.obj.active; });
    }
    scene.events.on('update', upd);
    scene.events.once('shutdown', function () { scene.events.off('update', upd); });
    return api;
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
      'background:' + (opts.bg || 'rgba(255,255,255,.95)') + ';color:' + (opts.color || '#1b1b3a') + ';box-shadow:0 3px 0 rgba(0,0,0,.25);border:3px solid ' + (opts.border || '#1b1b3a') + ';z-index:2147483000';
    host.appendChild(el);
    var dy = opts.offsetY || 0;
    /* Never hide under the game's question panel: if the label would overlap it, it goes below the object instead.
       Mark the panel with data-hud (other common names are matched too). */
    var AVOID = opts.avoid || '[data-hud], #quiz-banner, #question, #question-bar, .question-bar, .quiz-banner, .hud-question';
    function overlapsHud(r) {
      var list = document.querySelectorAll(AVOID);
      for (var i = 0; i < list.length; i++) {
        var h = list[i]; if (h === el || h.contains(el)) continue;
        var q = h.getBoundingClientRect(); if (!q.width || !q.height || getComputedStyle(h).visibility === 'hidden') continue;
        if (r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top) return true;
      }
      return false;
    }
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
      if (overlapsHud(el.getBoundingClientRect())) {
        var below = ((b.bottom != null ? b.bottom : obj.y) - cam.scrollY) * sy + (r.top - hr.top) + el.offsetHeight + 8;
        el.style.top = Math.min(r.height - 4, below) + 'px';
      }
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
    parallax: parallax, ground: ground, hero: hero, ride: ride, scroller: scroller, sea: sea, label: label, pack: packOf, has: function (scene, n) { return has(scene, n); },
    size: function (scene, n) { var r = null; packsOf(scene).forEach(function (pk) { if (pk.sizes[n]) r = pk.sizes[n]; }); return r; }
  };
})(typeof window !== 'undefined' ? window : this);
