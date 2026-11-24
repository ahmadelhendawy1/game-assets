/*!
 * AI4EduTech Game Maker: SEA VOYAGE template (side view, real rolling waves)
 * Needs Phaser 3.80 and ai4-assets.js loaded first, and window.AI4_GAME_DATA:
 * {
 *   "game": "sea", "language": "en" | "ar", "title": "...",
 *   "teacher": "...", "school": "...", "whatsapp": "+20...",
 *   "worlds": [ { "name": "...", "questions": [ { "q": "...", "choices": ["a","b","c","d"], "answer": "a", "why": "..." } ] } ]
 * }
 * "answer" may be the exact text of the correct choice or its number (0 = first).
 * Fair-choice rules: game skill never changes the score; an answer counts only when the student presses SAIL
 * (or taps a buoy) in the calm buoy line; the first commit is final; there is no game over.
 * Platform hooks: window.AI4Game.reportProgress / reportComplete, window.AI4Game.studentName, #screen-end "X / Y".
 */
(function () {
  'use strict';
  var D = window.AI4_GAME_DATA || {};
  var AR = /^ar/i.test(D.language || '');
  var A = window.AI4Assets, K = A ? A.key : function (n) { return 'ai4-' + n; };

  /* ───────────── text (English + Egyptian Arabic) ───────────── */
  var T = AR ? {
    sub: 'رحلة بحرية تعليمية', name: 'اكتب اسمك', start: 'يلا نبحر ⛵', needName: 'اكتب اسمك الأول',
    q: 'سؤال', of: 'من', hint: '◀ ▶ اختار عوّامة ودوس «أبحر» — أو دوس على العوّامة نفسها',
    sail: 'أبحر', hop: 'نط', move: 'حرّك المركب بالأسهم ← →، ونط فوق الصخور بـ ↑',
    correct: 'صح! 🎉', wrong: 'مش مظبوط. الإجابة الصح «', wrong2: '».', next: 'كمّل للعوّامات اللي جاية ←',
    world: 'العالم', bossNear: 'وحش البحر قدامك! كمّل ←', boss: 'وحش البحر! كل إجابة صح = قذيفة 💥', worldDone: 'خلّصت العالم ده! 🏆',
    done: 'خلّصت الرحلة! 🏆', time: 'الوقت', cert: 'الشهادة 🎓', wa: 'ابعت النتيجة واتساب', again: 'العب تاني',
    certTitle: 'شهادة تقدير', certThat: 'الشهادة دي بتأكد إن', certDone: 'خلّص بنجاح', sign: 'توقيع المدرس', print: 'اطبع', close: 'اقفل',
    rotate: 'لف الموبايل بالعرض عشان تلعب أحسن 📱', paused: 'اللعبة واقفة ⏸', resume: 'كمّل',
    score: 'النتيجة', coins: 'العملات', student: 'الطالب', game: 'اللعبة', errData: 'بيانات اللعبة ناقصة أو فيها غلط.'
  } : {
    sub: 'A Sea Voyage learning game', name: 'Your name', start: 'Set sail ⛵', needName: 'Type your name first',
    q: 'Question', of: 'of', hint: '◀ ▶ choose a buoy, then press SAIL — or tap the buoy',
    sail: 'SAIL', hop: 'HOP', move: 'Sail with ← →, hop over rocks with ↑',
    correct: 'Correct! 🎉', wrong: 'Not quite. The answer is “', wrong2: '”.', next: 'Sail on to the next buoys →',
    world: 'World', bossNear: 'The sea monster is ahead! Sail on →', boss: 'Sea monster! Every correct answer is a cannonball 💥', worldDone: 'World complete! 🏆',
    done: 'Voyage complete! 🏆', time: 'Time', cert: 'Certificate 🎓', wa: 'Send result on WhatsApp', again: 'Play again',
    certTitle: 'Certificate of Achievement', certThat: 'This certifies that', certDone: 'has successfully completed', sign: 'Teacher', print: 'Print', close: 'Close',
    rotate: 'Turn your phone sideways to play 📱', paused: 'Paused ⏸', resume: 'Resume',
    score: 'Score', coins: 'Coins', student: 'Student', game: 'Game', errData: 'The game data is missing or has a mistake.'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }

  /* ───────────── data → worlds of questions ───────────── */
  var WORLDS = (Array.isArray(D.worlds) && D.worlds.length ? D.worlds : [{ name: D.title || '', questions: D.questions || [] }]).map(function (w, wi) {
    var qs = (w.questions || []).map(function (q) {
      var ch = (q.choices || []).map(String).filter(function (c) { return c.trim() !== ''; }).slice(0, 4);
      var ans = typeof q.answer === 'number' ? q.answer : ch.indexOf(String(q.answer == null ? '' : q.answer).trim());
      if (ans < 0) ans = ch.map(function (c) { return c.trim().toLowerCase(); }).indexOf(String(q.answer || '').trim().toLowerCase());
      return { q: String(q.q || q.question || ''), choices: ch, answer: ans, why: String(q.why || q.explanation || '') };
    }).filter(function (q) { return q.q && q.choices.length >= 2 && q.answer >= 0 && q.answer < q.choices.length; });
    return { name: String(w.name || (T.world + ' ' + (wi + 1))), questions: qs };
  }).filter(function (w) { return w.questions.length; });
  var TOTAL = WORLDS.reduce(function (n, w) { return n + w.questions.length; }, 0);

  /* ───────────── page: styles, HUD, screens ───────────── */
  var css = '' +
    'html,body{margin:0;height:100%;background:#0b2540;overflow:hidden;font:600 16px/1.4 ' + (AR ? '"IBM Plex Sans Arabic","Segoe UI",Tahoma' : '"Nunito","Segoe UI",system-ui') + ',sans-serif;color:#fff}' +
    '#g-root{position:fixed;inset:0}#g-canvas{position:absolute;inset:0}' +
    '.g-hud{position:absolute;top:8px;left:8px;right:8px;z-index:10;display:flex;gap:8px;align-items:flex-start;justify-content:space-between;pointer-events:none}' +
    '.g-pills{display:flex;gap:6px;flex-wrap:wrap}.g-pill{background:rgba(8,30,60,.85);border:2px solid #fcd34d;border-radius:999px;padding:4px 12px;font-weight:800;font-size:14px;white-space:nowrap}' +
    '.g-btns{display:flex;gap:6px;pointer-events:auto}.g-ib{width:44px;height:44px;border-radius:50%;border:2px solid #fff;background:rgba(8,30,60,.85);color:#fff;font-size:18px;cursor:pointer}' +
    '#g-q{position:absolute;top:58px;left:50%;transform:translateX(-50%);z-index:10;width:min(760px,92vw);background:rgba(8,30,60,.92);border:3px solid #fcd34d;border-radius:18px;padding:10px 18px;text-align:center;display:none}' +
    '#g-q .n{font-size:13px;color:#fcd34d;font-weight:900;letter-spacing:.04em}#g-q .t{font-size:clamp(18px,2.6vw,26px);font-weight:900;margin:2px 0}#g-q .h{font-size:13px;opacity:.9}' +
    '#g-msg{position:absolute;top:58px;left:50%;transform:translateX(-50%);z-index:9;max-width:92vw;background:rgba(8,30,60,.85);border-radius:14px;padding:6px 16px;font-weight:800;text-align:center;display:none}' +
    '#g-banner{position:absolute;top:42%;left:50%;transform:translate(-50%,-50%) scale(.6);opacity:0;z-index:12;background:#fffdf5;color:#1b1b3a;border:4px solid #fcd34d;border-radius:22px;padding:16px 34px;font-weight:900;font-size:clamp(20px,3.4vw,34px);text-align:center;transition:all .35s cubic-bezier(.3,1.4,.5,1);pointer-events:none}' +
    '#g-banner.on{opacity:1;transform:translate(-50%,-50%) scale(1)}' +
    '.g-touch{position:absolute;left:0;right:0;bottom:12px;z-index:10;display:flex;justify-content:space-between;padding:0 14px;pointer-events:none;direction:ltr}.g-touch div{display:flex;gap:10px}' +
    '.g-touch button{pointer-events:auto;width:64px;height:64px;border-radius:50%;border:3px solid #fff;background:rgba(29,78,216,.75);color:#fff;font:900 17px system-ui;touch-action:none}' +
    '.g-touch .sail{width:104px;border-radius:32px;background:rgba(234,88,12,.92)}' +
    '.g-screen{position:absolute;inset:0;z-index:20;display:none;align-items:center;justify-content:center;background:rgba(8,30,60,.72);padding:16px}' +
    '.g-card{background:#fffdf5;color:#1b1b3a;border:4px solid #fcd34d;border-radius:24px;padding:24px 30px;text-align:center;width:min(460px,94vw);box-shadow:0 20px 60px rgba(0,0,0,.4)}' +
    '.g-card h1{margin:0 0 4px;font-size:clamp(24px,4vw,34px);font-weight:900;color:#1d4ed8}.g-card p{margin:4px 0 12px;color:#475569}' +
    '.g-card input{width:100%;box-sizing:border-box;padding:12px 14px;font-size:17px;border:2px solid #94a3b8;border-radius:14px;margin:6px 0 4px;text-align:center}' +
    '.g-big{margin-top:10px;padding:13px 26px;border:0;border-radius:999px;background:#ea580c;color:#fff;font-family:inherit;font-weight:900;font-size:19px;cursor:pointer;box-shadow:0 4px 0 #9a3412}' +
    '.g-alt{margin:6px 4px 0;padding:10px 18px;border:2px solid #1d4ed8;border-radius:999px;background:#fff;color:#1d4ed8;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer}' +
    '.g-wa{border-color:#16a34a;color:#16a34a}.g-err{color:#b91c1c;font-weight:800;min-height:1.2em}' +
    '#screen-end .score{font-size:56px;font-weight:900;color:#1d4ed8;line-height:1.1;direction:ltr}' +
    '#g-cert .g-card{width:min(640px,96vw);border:8px double #b8860b;background:#fffdf5}#g-cert h2{margin:0;color:#8a6508;font-size:30px}#g-cert .who{font-size:32px;font-weight:900;color:#1d4ed8;border-bottom:2px solid #cbd5e1;padding:4px 20px;display:inline-block;margin:6px 0}' +
    '#g-rot{position:absolute;bottom:90px;left:50%;transform:translateX(-50%);z-index:11;background:rgba(8,30,60,.9);border-radius:14px;padding:8px 14px;font-weight:800;display:none}' +
    '@media (orientation:portrait) and (pointer:coarse){#g-rot{display:block}}' +
    '@media print{body *{visibility:hidden}#g-cert,#g-cert *{visibility:visible}#g-cert{position:fixed;inset:0;background:#fff}#g-cert button{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  document.documentElement.lang = AR ? 'ar' : 'en';
  var root = document.createElement('div'); root.id = 'g-root'; root.dir = AR ? 'rtl' : 'ltr';
  root.innerHTML =
    '<div id="g-canvas"></div>' +
    '<div class="g-hud"><div class="g-pills"><span class="g-pill" id="g-world"></span><span class="g-pill" id="g-score"></span><span class="g-pill" id="g-coins"></span></div>' +
    '<div class="g-btns"><button class="g-ib" id="g-mute" aria-label="Sound">🔊</button><button class="g-ib" id="g-pause" aria-label="Pause">⏸</button></div></div>' +
    '<div id="g-q" data-hud><div class="n" id="g-qn"></div><div class="t" id="g-qt" dir="auto"></div><div class="h">' + esc(T.hint) + '</div></div>' +
    '<div id="g-msg" data-hud></div><div id="g-banner"></div><div id="g-rot">' + esc(T.rotate) + '</div>' +
    '<div class="g-touch" id="g-touch"><div><button id="b-l" aria-label="Left">◀</button><button id="b-r" aria-label="Right">▶</button></div><div><button id="b-u" aria-label="' + esc(T.hop) + '">▲</button><button id="b-s" class="sail">' + esc(T.sail) + '</button></div></div>' +
    '<div class="g-screen" id="g-start" style="display:flex"><div class="g-card"><h1 dir="auto">' + esc(D.title || 'Sea Voyage') + '</h1><p>' + esc(T.sub) + (D.school ? ' · ' + esc(D.school) : '') + '</p>' +
      '<input id="g-name" placeholder="' + esc(T.name) + '" dir="auto" maxlength="40" autocomplete="name"><div class="g-err" id="g-nerr"></div><button class="g-big" id="g-go">' + esc(T.start) + '</button></div></div>' +
    '<div class="g-screen" id="g-paused"><div class="g-card"><h1>' + esc(T.paused) + '</h1><div id="g-sound"></div><button class="g-big" id="g-resume">' + esc(T.resume) + '</button></div></div>' +
    '<div class="g-screen" id="screen-end"><div class="g-card"><h1>' + esc(T.done) + '</h1><div class="score" id="g-final">0 / 0</div><p id="g-time"></p>' +
      '<div><button class="g-alt" id="g-certbtn">' + esc(T.cert) + '</button>' + (D.whatsapp ? '<button class="g-alt g-wa" id="g-wa">' + esc(T.wa) + '</button>' : '') + '</div><button class="g-big" id="g-again">' + esc(T.again) + '</button></div></div>' +
    '<div class="g-screen" id="g-cert"><div class="g-card">' + (D.school ? '<div style="font-weight:800;color:#334155" dir="auto">' + esc(D.school) + '</div>' : '') + '<h2>' + esc(T.certTitle) + '</h2><p>' + esc(T.certThat) + '</p>' +
      '<div class="who" id="g-cname" dir="auto"></div><p>' + esc(T.certDone) + ' <b dir="auto">' + esc(D.title || '') + '</b></p><div style="font-size:22px;font-weight:900;color:#15803d" id="g-cscore"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:16px;color:#475569"><span id="g-cdate"></span><span style="min-width:180px;border-top:1.5px solid #64748b;padding-top:4px"><b dir="auto" style="color:#1b1b3a">' + esc(D.teacher || '') + '</b><br>' + esc(T.sign) + '</span></div>' +
      '<div><button class="g-alt" id="g-print">' + esc(T.print) + '</button><button class="g-alt" id="g-cclose">' + esc(T.close) + '</button></div></div></div>';
  document.body.appendChild(root);
  var $ = function (id) { return document.getElementById(id); };

  if (!TOTAL) { $('g-start').querySelector('.g-card').innerHTML = '<h1>⚠️</h1><p>' + esc(T.errData) + '</p>'; return; }
  if (!window.Phaser || !A) { $('g-start').querySelector('.g-card').innerHTML = '<h1>⚠️</h1><p>' + (AR ? 'مقدرناش نحمّل اللعبة. اتأكد من النت واعمل ريفريش.' : 'The game could not load. Check the internet connection and refresh.') + '</p>'; return; }

  /* ───────────── shared state across worlds ───────────── */
  var G = { score: 0, answered: 0, coins: 0, t0: 0, reported: false, name: '', started: false, muted: A.isMuted() };
  var input = {};
  [['b-l', 'left'], ['b-r', 'right'], ['b-u', 'up'], ['b-s', 'sail']].forEach(function (p) {
    var b = $(p[0]);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); input[p[1]] = true; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { input[p[1]] = false; }); });
  });
  function hudPills(wi) {
    $('g-world').textContent = '🌊 ' + WORLDS[wi].name;
    $('g-score').textContent = '⭐ \u2066' + G.score + ' / ' + TOTAL + '\u2069';   // keep "X / Y" left-to-right in Arabic too
    $('g-coins').textContent = '🪙 ' + G.coins;
  }
  function msg(html, ms) { var m = $('g-msg'); m.innerHTML = html; m.style.display = html ? 'block' : 'none'; clearTimeout(msg._t); if (ms) msg._t = setTimeout(function () { m.style.display = 'none'; }, ms); }
  function banner(text, ms) { var b = $('g-banner'); b.textContent = text; b.classList.add('on'); clearTimeout(banner._t); banner._t = setTimeout(function () { b.classList.remove('on'); }, ms || 1800); }
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TINTS = [null, 0xffcfa0, 0x9fb0ff, 0xbff0d8, 0xffc2e0];                // day, sunset, night, mint, pink
  var SEAS = [null, { mid: 0x1d74b8, deep: 0x123f73, back: 0x195f99, front: 0x5bbbe0 }, { mid: 0x15467f, deep: 0x0a2246, back: 0x123b6b, front: 0x3f7fc0 }];

  /* ───────────── the level scene (one per world) ───────────── */
  var Sea = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () { Phaser.Scene.call(this, 'sea'); },
    init: function (d) { this.wi = d && d.wi || 0; },
    preload: function () { if (!this.textures.exists(K('boat-side'))) A.preload(this, { pack: ['runner-desert', 'sea'], music: ['sea', 'boss'] }); },
    create: function () {
      var s = this, wi = this.wi, W = WORLDS[wi], QS = W.questions, n = QS.length;
      var SPEED = 260, SEG = 3000, X0 = 1400;
      var zoneX = QS.map(function (q, i) { return X0 + i * SEG; });
      var BOSS_X = X0 + n * SEG + 600, LEVEL_W = BOSS_X + 900;
      var qi = -1, asked = false, done = false, near = -1, buoys = [], ended = false, worldScore = 0, sel = 0, wantCommit = false;
      hudPills(wi); msg(esc(T.move), 4000);
      s.cameras.main.setBounds(0, 0, LEVEL_W, 720);
      var bg = A.parallax(s, { farFactor: 0.08 });
      if (TINTS[wi % TINTS.length]) bg.layers.forEach(function (l) { l.ts.setTint(TINTS[wi % TINTS.length]); });
      var sea = A.sea(s, { level: 520, amplitude: REDUCED ? 6 : 16, colors: SEAS[wi % SEAS.length] || undefined });
      var boat = s.add.image(200, 500, K('boat-side')).setOrigin(0.5, 0.95).setScale(0.8).setDepth(30);
      sea.float(boat, { sink: 14, tilt: REDUCED ? 0.4 : 1 });
      var hop = 0, hopV = 0, vx = 0, hurtUntil = -9999, lastHit = -9999;

      // hazards and coins only in the open sea between question zones
      var inZone = function (x) { return zoneX.some(function (z) { return x > z - 260 && x < z + 1350; }); };
      var rocks = [], sharks = [], coinList = [];
      for (var x = 700; x < BOSS_X - 700; x += 520 + Math.random() * 380) {
        if (inZone(x)) continue;
        rocks.push(sea.float(s.add.image(x, 0, K('rocks')).setOrigin(0.5, 0.75).setScale(0.6).setDepth(25), { sink: 6, tilt: 0 }));
      }
      for (var z = 0; z <= n; z++) {
        var from = z === 0 ? 400 : zoneX[z - 1] + 1450, to = z < n ? zoneX[z] - 300 : BOSS_X - 800;
        if (to - from > 600) { var sh = sea.float(s.add.image((from + to) / 2, 0, K('shark')).setScale(0.7).setDepth(26), { sink: -6, tilt: 0.6 }); sh.setData('home', (from + to) / 2).setData('range', Math.min(240, (to - from) / 2 - 80)); sharks.push(sh); }
        for (var cx = from + 120; cx < to; cx += 170) if (!rocks.some(function (r) { return Math.abs(r.x - cx) < 90; }))
          coinList.push(sea.float(s.add.image(cx, 0, K('coin')).setScale(0.42).setDepth(26), { sink: -70 - ((cx / 170 | 0) % 3 === 0 ? 40 : 0), tilt: 0.3 }));
      }
      var monster = sea.float(s.add.image(BOSS_X + 200, 0, K('boss')).setOrigin(0.5, 0.75).setScale(0.55).setDepth(24), { sink: 40, tilt: 0.4 });
      if (TINTS[wi % TINTS.length]) monster.setTint(TINTS[wi % TINTS.length]);
      var fishT = 0;

      s.cameras.main.startFollow(boat, true, 0.1, 0.05, AR ? 160 : -160, 160);
      var keys = s.input.keyboard.addKeys('LEFT,RIGHT,UP,SPACE,ENTER,A,D,W');
      A.music(s, 'sea'); A.setMuted(s, G.muted);
      if (wi > 0) banner(T.world + ' ' + (wi + 1) + ': ' + W.name, 2200);

      function startQuestion(i) {
        qi = i; asked = true; done = false; near = -1; sea.setCalm(true); vx = 0; A.sfx(s, 'go'); msg('');
        var Q = QS[i], order = Phaser.Utils.Array.Shuffle(Q.choices.map(function (c, k) { return k; }));
        var gap = 260, start = zoneX[i] + 250;
        buoys = order.map(function (ci, k) {
          var b = s.add.image(start + k * gap, 0, K('buoy')).setOrigin(0.5, 0.8).setScale(0.75).setDepth(25);
          b.setData('c', ci); sea.float(b, { sink: 8, tilt: 0.8 });
          b.setInteractive({ useHandCursor: true }).on('pointerdown', function () { if (asked && !done) { sel = k; wantCommit = true; } });
          b.lbl = A.label(s, b, Q.choices[ci], { offsetY: -8, size: 20, maxWidth: 230 });
          return b;
        });
        sel = 0; wantCommit = false;
        var cam = s.cameras.main; cam.stopFollow();
        cam.pan(start + (buoys.length - 1) * gap / 2, 360, REDUCED ? 0 : 700, 'Sine.easeInOut');   // every buoy fully on screen
        $('g-qn').textContent = T.q + ' ' + (G.answered + 1) + ' ' + T.of + ' ' + TOTAL;
        $('g-qt').textContent = Q.q; $('g-q').style.display = 'block';
      }
      function commit(k) {
        if (done) return; done = true; A.sfx(s, 'commit');
        var b = buoys[k], Q = QS[qi], right = b.getData('c') === Q.answer;
        buoys.forEach(function (x) { x.disableInteractive(); });
        G.answered++; if (right) { G.score++; worldScore++; }
        hudPills(wi);
        try { window.AI4Game && window.AI4Game.reportProgress && window.AI4Game.reportProgress(G.score, TOTAL); } catch (e) {}
        s.time.delayedCall(250, function () {
          $('g-q').style.display = 'none';
          if (right) {
            A.sfx(s, 'correct'); sea.splash(b.x, 1.6); b.lbl.setHighlight(true, '#86efac');
            if (!REDUCED) s.tweens.add({ targets: s.cameras.main, zoom: 1.05, duration: 180, yoyo: true });
            msg('<b style="color:#86efac">' + esc(T.correct) + '</b> ' + esc(Q.why));
          } else {
            A.sfx(s, 'wrong'); if (!REDUCED) s.cameras.main.shake(220, 0.01); sea.splash(boat.x, 1.4);
            buoys.forEach(function (x) { if (x.getData('c') === Q.answer) x.lbl.setHighlight(true, '#86efac'); });
            msg('<b style="color:#fca5a5">' + esc(T.wrong) + esc(Q.choices[Q.answer]) + esc(T.wrong2) + '</b> ' + esc(Q.why));
          }
          s.time.delayedCall(right ? 2400 : 3400, function () {
            buoys.forEach(function (x) { x.lbl.destroy(); sea.unfloat(x); s.tweens.add({ targets: x, alpha: 0, y: x.y + 60, duration: 500, onComplete: function () { x.destroy(); } }); });
            buoys = []; asked = false; sea.setCalm(false);
            s.cameras.main.startFollow(boat, true, 0.1, 0.05, AR ? 160 : -160, 160);
            msg(esc(qi + 1 < n ? T.next : T.bossNear), 3000);
          });
        });
      }
      function bossFight() {
        ended = true; vx = 0; A.music(s, 'boss'); sea.setCalm(true); msg(esc(T.boss));
        var shots = Math.max(1, worldScore);
        s.time.addEvent({ delay: 650, repeat: shots - 1, callback: function () {
          var ball = s.add.circle(boat.x + (boat.flipX ? -60 : 60), boat.y - 90, 12, 0x1b1b3a).setDepth(40);
          A.sfx(s, 'shoot');
          s.tweens.add({ targets: ball, x: monster.x - 40, y: monster.y - 120, duration: 500, ease: 'Quad.in', onComplete: function () {
            ball.destroy(); A.sfx(s, 'boss-hit'); sea.splash(monster.x - 40, 1.4); if (!REDUCED) s.cameras.main.shake(150, 0.008);
            monster.setTintFill(0xffffff); s.time.delayedCall(120, function () { monster.clearTint(); if (TINTS[wi % TINTS.length]) monster.setTint(TINTS[wi % TINTS.length]); });
          } });
        } });
        // the boss always goes down after the world's last question: the score decides nothing here (fair rule F10)
        s.time.delayedCall(650 * shots + 900, function () {
          sea.unfloat(monster); A.sfx(s, 'level-up'); sea.splash(monster.x, 2.2);
          s.tweens.add({ targets: monster, y: monster.y + 420, angle: -15, alpha: 0, duration: 1400, ease: 'Quad.in' });
          s.time.delayedCall(1600, function () {
            msg('');
            if (wi + 1 < WORLDS.length) { banner(T.worldDone, 1600); s.time.delayedCall(1700, function () { s.scene.restart({ wi: wi + 1 }); }); }
            else finish(s);
          });
        });
      }

      function tick(time, delta) {
        var dt = Math.min(delta, 50) / 1000;
        var L = keys.LEFT.isDown || keys.A.isDown || input.left, R = keys.RIGHT.isDown || keys.D.isDown || input.right;
        var U = Phaser.Input.Keyboard.JustDown(keys.UP) || Phaser.Input.Keyboard.JustDown(keys.W) || (input.up && !input._u); input._u = input.up;
        var S = Phaser.Input.Keyboard.JustDown(keys.SPACE) || Phaser.Input.Keyboard.JustDown(keys.ENTER) || (input.sail && !input._s); input._s = input.sail;
        var JL = Phaser.Input.Keyboard.JustDown(keys.LEFT) || Phaser.Input.Keyboard.JustDown(keys.A) || (input.left && !input._l); input._l = input.left;
        var JR = Phaser.Input.Keyboard.JustDown(keys.RIGHT) || Phaser.Input.Keyboard.JustDown(keys.D) || (input.right && !input._r); input._r = input.right;
        var target = ended ? 0 : time < hurtUntil ? -90 : (R ? SPEED : L ? -200 : 40);
        vx += ((asked ? 0 : target) - vx) * Math.min(1, dt * 3);
        var minX = 120, maxX = LEVEL_W - 300;
        if (asked && buoys.length) {
          // buoy line: each left/right press moves exactly one buoy (never in between), the boat glides there
          if (!done) { if (JR) sel = Math.min(buoys.length - 1, sel + 1); if (JL) sel = Math.max(0, sel - 1); }
          var tx = buoys[sel].x, d = tx - boat.x, stepX = 520 * dt;
          boat.x += Math.abs(d) <= stepX ? d : Math.sign(d) * stepX;
          if (Math.abs(d) > 4) boat.setFlipX(d < 0);
        } else {
          if (qi >= 0) minX = zoneX[qi] + 150;                                       // never sail back into an answered zone
          boat.x = Phaser.Math.Clamp(boat.x + vx * dt, minX, ended ? boat.x : maxX);
          boat.setFlipX(vx < -20);
        }
        if (U && hop === 0 && hopV === 0 && !asked && !ended) { hopV = -520; A.sfx(s, 'jump'); sea.splash(boat.x, 0.7); }
        if (hop < 0 || hopV < 0) { hopV += 1500 * dt; hop = Math.min(0, hop + hopV * dt); if (hop === 0) { hopV = 0; sea.splash(boat.x, 1); A.sfx(s, 'splash'); } }
        boat.y += hop;
        coinList.forEach(function (c) { if (c.active && Math.abs(c.x - boat.x) < 60 && Math.abs(c.y - (boat.y - 90)) < 95) { c.destroy(); G.coins++; A.sfx(s, 'coin'); hudPills(wi); } });
        // hazards only cost coins; the boat passes through after a hit, so it is never stuck (fair rule F1)
        if (!asked && !ended) rocks.concat(sharks).forEach(function (r) {
          if (time - lastHit > 1500 && Math.abs(r.x - boat.x) < 70 && hop > -40) {
            lastHit = time; hurtUntil = time + 450; G.coins = Math.max(0, G.coins - 2); hudPills(wi);
            A.sfx(s, 'hurt'); if (!REDUCED) s.cameras.main.shake(160, 0.006); sea.splash(boat.x + 40, 1.2);
          }
        });
        sharks.forEach(function (sh, i) { var h = sh.getData('home'), rg = sh.getData('range'); sh.x = h + Math.sin(time / 1400 + i) * rg; sh.setFlipX(Math.cos(time / 1400 + i) > 0); });
        fishT -= dt;
        if (fishT <= 0 && !REDUCED) {
          fishT = 1.3 + Math.random() * 1.2;
          var fx = s.cameras.main.scrollX + 200 + Math.random() * 900, f = s.add.image(fx, sea.surfaceY(fx), K('fish')).setScale(0.45).setDepth(20);
          sea.splash(fx, 0.5); s.tweens.add({ targets: f, x: fx + 160, duration: 900 });
          s.tweens.add({ targets: f, y: f.y - 150, angle: 40, duration: 450, yoyo: true, ease: 'Quad.out', onComplete: function () { sea.splash(f.x, 0.5); f.destroy(); } });
        }
        if (!asked && !ended && qi + 1 < n && boat.x > zoneX[qi + 1]) startQuestion(qi + 1);
        if (!asked && !ended && qi + 1 === n && boat.x > BOSS_X - 500) bossFight();
        if (asked && !done) {
          if (sel !== near) { if (near >= 0 && buoys[near]) buoys[near].lbl.setHighlight(false); buoys[sel].lbl.setHighlight(true); if (near >= 0) A.sfx(s, 'select'); near = sel; }
          if (S) wantCommit = true;
          if (wantCommit && Math.abs(boat.x - buoys[sel].x) < 6) commit(sel);        // commit the highlighted buoy once the boat is there
        }
      }
      s.events.on('update', tick);
      s.events.once('shutdown', function () { s.events.off('update', tick); buoys.forEach(function (b) { if (b.lbl) b.lbl.destroy(); }); });
      window.__ai4game = { scene: s, boat: boat, get buoys() { return buoys; }, get asked() { return asked; }, get done() { return done; }, get qi() { return qi; }, get answer() { return asked ? QS[qi].answer : -1; }, get sel() { return sel; }, get ended() { return ended; }, world: wi, zoneX: zoneX, rocks: rocks.map(function (r) { return r.x; }), G: G, total: TOTAL };
    }
  });

  function finish(s) {
    A.stopMusic(); A.sfx(s, 'victory');
    var secs = (Date.now() - G.t0) / 1000;
    $('g-final').textContent = G.score + ' / ' + TOTAL;
    $('g-time').textContent = T.time + ': \u2066' + fmtTime(secs) + '\u2069 · 🪙 ' + G.coins;
    $('screen-end').style.display = 'flex';
    if (!G.reported) { G.reported = true; try { window.AI4Game && window.AI4Game.reportComplete && window.AI4Game.reportComplete(G.score, TOTAL); } catch (e) {} }
    G.endSecs = secs;
  }

  /* ───────────── buttons ───────────── */
  var game = null;
  // the class-code join (tracked games) happens on top of this screen: copy the joined name in when it arrives
  var namePoll = setInterval(function () {
    try { var pre = window.AI4Game && window.AI4Game.studentName; if (pre && !$('g-name').value.trim()) $('g-name').value = pre; } catch (e) {}
    if (G.started) clearInterval(namePoll);
  }, 400);
  $('g-go').addEventListener('click', function () {
    var nm = $('g-name').value.trim() || (window.AI4Game && window.AI4Game.studentName) || '';
    if (!nm) { $('g-nerr').textContent = T.needName; $('g-name').focus(); return; }
    G.name = nm; G.t0 = Date.now(); G.started = true;
    $('g-start').style.display = 'none';
    game = new Phaser.Game({ type: Phaser.AUTO, parent: 'g-canvas', width: 1280, height: 720, backgroundColor: '#8ecbf5',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [Sea] });
    window.__game = game;
  });
  $('g-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('g-go').click(); });
  function scene() { return game && game.scene.getScene('sea'); }
  $('g-mute').textContent = G.muted ? '🔇' : '🔊';
  if (A.soundControls) $('g-sound').appendChild(A.soundControls({ lang: AR ? 'ar' : 'en', onChange: function (m) { G.muted = m; $('g-mute').textContent = m ? '🔇' : '🔊'; } }));
  $('g-mute').addEventListener('click', function () { G.muted = !G.muted; if (scene()) A.setMuted(scene(), G.muted); this.textContent = G.muted ? '🔇' : '🔊'; });
  function pause(on) { var sc = scene(); if (!sc || !G.started || $('screen-end').style.display === 'flex') return; if (on) { sc.scene.pause(); $('g-paused').style.display = 'flex'; } else { sc.scene.resume(); $('g-paused').style.display = 'none'; } }
  $('g-pause').addEventListener('click', function () { pause(true); });
  $('g-resume').addEventListener('click', function () { pause(false); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') pause(true); });
  $('g-again').addEventListener('click', function () {
    $('screen-end').style.display = 'none'; G.score = 0; G.answered = 0; G.coins = 0; G.t0 = Date.now();   // G.reported stays true: the first result is the one recorded
    scene().scene.restart({ wi: 0 });
  });
  $('g-certbtn').addEventListener('click', function () {
    $('g-cname').textContent = G.name;
    $('g-cscore').textContent = T.score + ': \u2066' + G.score + ' / ' + TOTAL + '\u2069 · ' + T.time + ': \u2066' + fmtTime(G.endSecs || 0) + '\u2069';
    $('g-cdate').textContent = new Date().toLocaleDateString(AR ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    $('g-cert').style.display = 'flex';
  });
  $('g-print').addEventListener('click', function () { window.print(); });
  $('g-cclose').addEventListener('click', function () { $('g-cert').style.display = 'none'; });
  if ($('g-wa')) $('g-wa').addEventListener('click', function () {
    var text = T.student + ': ' + G.name + '\n' + T.game + ': ' + (D.title || '') + '\n' + T.score + ': ' + G.score + ' / ' + TOTAL + '\n' + T.time + ': ' + fmtTime(G.endSecs || 0);
    window.open('https://wa.me/' + String(D.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(text), '_blank');
  });
})();
