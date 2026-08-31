/* =========================================================
   BICHIKU / game.js
   ========================================================= */
(function () {
  'use strict';

  /* =======================================================
     1. CONFIG
     ======================================================= */
  const CONFIG = {
    board: { width: 400, height: 700 },

    wall: 12,
    floor: 34,
    dropY: 76,
    dangerLine: 138,

    gameOverDelay: 2200,
    dropCooldown: 430,
    chainWindow: 950,

    chainMultipliers: [1, 1, 1.2, 1.5, 1.8, 2.0, 2.5],
    spawnWeights: [55, 30, 15],

    physics: {
      gravity: 0.9,
      restitution: 0.05,
      friction: 0.6,
      frictionStatic: 0.9,
      density: 0.003,
      airFriction: 0.01,
      slop: 0.05
    },

    maxParticles: 150,

    items: [
      { key: 'bandage',             name: '絆創膏',             short: '絆創膏',   size: 45,  score: 10,   color: '#F6C89B' },
      { key: 'firstaid',            name: '救急セット',         short: '救急',     size: 55,  score: 30,   color: '#F4645C' },
      { key: 'light',               name: 'ライト',             short: 'ライト',   size: 65,  score: 60,   color: '#F9CE5F' },
      { key: 'battery',             name: 'モバイルバッテリー', short: 'バッテリー', size: 75, score: 120,  color: '#F6A8AF' },
      { key: 'food',                name: '非常食セット',       short: '非常食',   size: 90,  score: 250,  color: '#A6C486' },
      { key: 'backpack',            name: '防災リュック',       short: 'リュック', size: 105, score: 500,  color: '#F0574E' },
      { key: 'home-stockpile',      name: '家庭備蓄',           short: '家庭備蓄', size: 125, score: 1000, color: '#E0AE79' },
      { key: 'community-stockpile', name: '地域備蓄庫',         short: '地域備蓄', size: 150, score: 3000, color: '#F2A03D' }
    ],

    messages: [
      '備蓄の基本はまず足元・床の安全から。安定した低い場所にストックを。',
      '家庭では最低3日分、できれば1週間分の備蓄を。',
      '水は1人1日3リットル。飲む分だけでなく、生活用水も要ります。',
      '食べながら買い足す「ローリングストック」なら、備蓄は続きます。',
      '懐中電灯は玄関と枕元に。停電の夜、まっ先に必要になります。',
      'モバイルバッテリーは満充電で保管。月に一度は残量をチェック。',
      '防災リュックは玄関のそばへ。持ち出すのは両手が空く重さまで。',
      '家具の固定は、いちばん効く備え。倒れる前にとめておく。',
      '集合場所と連絡手段を、家族といま決めておきましょう。',
      '近所の避難所まで、一度歩いてみる。夜道なら、なおいい。',
      '常備薬とお薬手帳のコピーも、りっぱな備蓄です。',
      'トイレは我慢できません。携帯トイレを1人1日5回分。',
      '自分の地域の備蓄倉庫に何があるか、知っていますか。'
    ]
  };

  const MAX_LEVEL = CONFIG.items.length - 1;
  const W = CONFIG.board.width;
  const H = CONFIG.board.height;

  /* =======================================================
     2. 保存まわり
     ======================================================= */
  const KEY = {
    best: 'bichiku.best',
    nick: 'bichiku.nickname',
    rank: 'bichiku.ranking',
    mute: 'bichiku.mute'
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* =======================================================
     3. ランキング API
     ======================================================= */
  async function submitScore(name, score) {
    try {
      const list = loadJSON(KEY.rank, []);
      list.push({ name: name || 'GUEST', score: score, at: Date.now() });
      list.sort((a, b) => b.score - a.score);
      saveJSON(KEY.rank, list.slice(0, 20));
      return true;
    } catch (e) { return false; }
  }

  async function getRanking(limit) {
    const list = loadJSON(KEY.rank, []);
    return list.slice(0, limit || 10);
  }

  /* =======================================================
     4. サウンド
     ======================================================= */
  const Sound = {
    ctx: null,
    muted: loadJSON(KEY.mute, false),

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { this.ctx = new AC(); } catch (e) { return; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    tone(opt) {
      if (this.muted || !this.ctx) return;
      try {
        const t0 = this.ctx.currentTime + (opt.delay || 0);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = opt.type || 'sine';
        osc.frequency.setValueAtTime(opt.freq, t0);
        if (opt.to) osc.frequency.exponentialRampToValueAtTime(opt.to, t0 + opt.dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(opt.vol || 0.15, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opt.dur);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t0); osc.stop(t0 + opt.dur + 0.02);
      } catch (e) {}
    },

    drop()     { this.tone({ freq: 300, to: 190, dur: 0.09, type: 'triangle', vol: 0.10 }); },
    merge(l)   { const f = 330 * Math.pow(1.13, l);
                 this.tone({ freq: f, to: f * 1.5, dur: 0.13, type: 'sine', vol: 0.16 });
                 this.tone({ freq: f * 2, dur: 0.08, type: 'sine', vol: 0.06, delay: 0.04 }); },
    chain(n)   { const f = 660 * Math.pow(1.12, Math.min(n, 6));
                 this.tone({ freq: f, to: f * 1.6, dur: 0.16, type: 'square', vol: 0.07 }); },
    max()      { [523, 659, 784, 1047].forEach((f, i) =>
                   this.tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.13, delay: i * 0.09 })); },
    clearMax() { [523, 659, 784, 1047, 1318].forEach((f, i) =>
                   this.tone({ freq: f, dur: 0.35, type: 'square', vol: 0.12, delay: i * 0.08 })); },
    over()     { this.tone({ freq: 400, to: 90, dur: 0.75, type: 'sawtooth', vol: 0.13 }); },
    ui()       { this.tone({ freq: 520, dur: 0.06, type: 'sine', vol: 0.08 }); }
  };

  /* =======================================================
     5. 画像の読み込み
     ======================================================= */
  const IMAGES = CONFIG.items.map(function (item) {
    const img = new Image();
    img.decoding = 'async';
    img.ok = false;
    img.addEventListener('load', function () { img.ok = img.naturalWidth > 0; });
    img.addEventListener('error', function () { img.ok = false; });
    img.src = 'assets/' + item.key + '.png';
    return img;
  });

  function itemNode(level, px) {
    const item = CONFIG.items[level];
    const img = document.createElement('img');
    img.src = 'assets/' + item.key + '.png';
    img.alt = item.name;
    img.width = px; img.height = px;
    img.addEventListener('error', function () {
      const div = document.createElement('div');
      div.className = 'fallback';
      div.style.cssText = img.style.cssText;
      div.style.background = item.color;
      div.style.width = px + 'px';
      div.style.height = px + 'px';
      div.textContent = item.short;
      div.title = item.name;
      if (img.parentNode) img.parentNode.replaceChild(div, img);
    });
    return img;
  }

  /* =======================================================
     6. UI参照
     ======================================================= */
  const $ = function (sel) { return document.querySelector(sel); };
  const screens = {
    title:   $('#s-title'),
    howto:   $('#s-howto'),
    ranking: $('#s-ranking'),
    game:    $('#s-game')
  };
  const overlays = {
    nickname: $('#ov-nickname'),
    pause:    $('#ov-pause'),
    confirm:  $('#ov-confirm'),
    gameover: $('#ov-gameover'),
    error:    $('#ov-error')
  };

  const ui = {
    score:     $('#ui-score'),
    best:      $('#ui-best'),
    next:      $('#ui-next'),
    final:     $('#ui-final'),
    finalBest: $('#ui-final-best'),
    newBest:   $('#ui-newbest'),
    tip:       $('#ui-tip'),
    chain:     $('#fx-chain'),
    fxMax:     $('#fx-max'),
    fxMaxJp:   $('#fx-max-text-jp'),
    fxMaxEn:   $('#fx-max-text-en'),
    sound:     $('#btn-sound')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('is-active', k === name);
    });
  }
  function openOverlay(name) { overlays[name].classList.add('is-active'); }
  function closeOverlay(name) { overlays[name].classList.remove('is-active'); }
  function closeAllOverlays() {
    Object.keys(overlays).forEach(function (k) { overlays[k].classList.remove('is-active'); });
  }

  function pad5(n) { return String(Math.floor(n)).padStart(5, '0'); }

  function bump(el) {
    el.classList.remove('is-bump');
    void el.offsetWidth;
    el.classList.add('is-bump');
  }

  /* =======================================================
     7. ゲーム状態
     ======================================================= */
  let clock = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const State = {
    mode: 'title',
    score: 0,
    best: loadJSON(KEY.best, 0),
    nickname: loadJSON(KEY.nick, ''),
    currentLevel: 0,
    nextLevel: 0,
    aimX: W / 2,
    canDrop: true,
    lastDropAt: 0,
    chain: 0,
    lastMergeAt: 0,
    dangerTimer: 0,
    items: [],
    particles: [],
    floats: [],
    scanAt: 0
  };

  /* =======================================================
     8. 物理エンジン
     ======================================================= */
  let engine, world, Body, Bodies, Composite;
  const mergeQueue = [];
  const floorY = H - CONFIG.floor;

  function initPhysics() {
    if (typeof Matter === 'undefined') return false;

    const Engine = Matter.Engine,
          Events = Matter.Events;
    Bodies = Matter.Bodies;
    Body = Matter.Body;
    Composite = Matter.Composite;

    engine = Engine.create({ enableSleeping: false });
    engine.gravity.y = CONFIG.physics.gravity;
    engine.positionIterations = 20;
    engine.velocityIterations = 16;
    world = engine.world;

    const staticOpts = { isStatic: true, friction: 1.0, restitution: 0.0, label: 'wall' };
    const wallThickness = 400;
    const floorThickness = 400;

    // 床の上面を floorY にぴったり一致させる配置
    Composite.add(world, [
      Bodies.rectangle(CONFIG.wall - wallThickness / 2, H / 2, wallThickness, H * 4, staticOpts),
      Bodies.rectangle(W - CONFIG.wall + wallThickness / 2, H / 2, wallThickness, H * 4, staticOpts),
      Bodies.rectangle(W / 2, floorY + floorThickness / 2, W * 4, floorThickness, staticOpts)
    ]);

    Events.on(engine, 'collisionStart', function (evt) {
      for (let i = 0; i < evt.pairs.length; i++) {
        const a = evt.pairs[i].bodyA, b = evt.pairs[i].bodyB;
        if (!a.isItem || !b.isItem) continue;
        if (a.merged || b.merged) continue;
        if (a.level !== b.level) continue;

        a.merged = b.merged = true;
        mergeQueue.push([a, b]);
      }
    });

    return true;
  }

  function createItem(level, x, y) {
    if (!world) return null;
    const item = CONFIG.items[level];
    const r = item.size / 2;
    const p = CONFIG.physics;
    const body = Bodies.circle(x, y, r, {
      label: 'item',
      restitution: p.restitution,
      friction: p.friction,
      frictionStatic: p.frictionStatic,
      frictionAir: p.airFriction,
      density: p.density,
      slop: p.slop
    });
    body.level = level;
    body.isItem = true;
    body.merged = false;
    body.entered = false;
    body.bornAt = clock;
    body.pop = 0;
    Composite.add(world, body);
    State.items.push(body);
    return body;
  }

  function removeItem(body) {
    if (!world) return;
    Composite.remove(world, body);
    const i = State.items.indexOf(body);
    if (i >= 0) State.items.splice(i, 1);
  }

  function scanOverlaps() {
    const list = State.items;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.merged) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.merged || b.level !== a.level) continue;
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const rr = a.circleRadius + b.circleRadius;
        if (dx * dx + dy * dy < rr * rr * 0.94) {
          a.merged = b.merged = true;
          mergeQueue.push([a, b]);
          break;
        }
      }
    }
  }

  function processMerges() {
    if (!mergeQueue.length) return;
    const now = clock;

    while (mergeQueue.length) {
      const pair = mergeQueue.shift();
      const a = pair[0], b = pair[1];
      if (State.items.indexOf(a) < 0 || State.items.indexOf(b) < 0) continue;

      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      const currentLevel = a.level;
      const wasEntered = a.entered || b.entered;

      removeItem(a);
      removeItem(b);

      State.chain = (now - State.lastMergeAt < CONFIG.chainWindow) ? State.chain + 1 : 1;
      State.lastMergeAt = now;

      const mult = CONFIG.chainMultipliers[Math.min(State.chain, CONFIG.chainMultipliers.length - 1)];

      if (currentLevel === MAX_LEVEL) {
        const clearGain = Math.round(5000 * mult);
        addScore(clearGain);
        State.floats.push({ x: x, y: y, text: 'CLEAR! +' + clearGain, life: 1300, max: 1300 });
        burst(x, y, '#FFD24A', MAX_LEVEL + 2);
        celebrateClearMax(x, y);
      } else {
        const level = currentLevel + 1;
        const born = createItem(level, x, y);
        if (born) {
          born.pop = 1;
          born.entered = wasEntered;
          Body.setVelocity(born, {
            x: (a.velocity.x + b.velocity.x) * 0.2,
            y: Math.min((a.velocity.y + b.velocity.y) * 0.2, 0.5)
          });
        }

        const gain = Math.round(CONFIG.items[level].score * mult);
        addScore(gain);

        State.floats.push({ x: x, y: y, text: '+' + gain, life: 900, max: 900 });
        burst(x, y, CONFIG.items[level].color, level);

        Sound.merge(level);
        if (level === MAX_LEVEL) celebrateMax(x, y);
      }

      if (State.chain >= 2) { Sound.chain(State.chain); showChain(State.chain); }
    }
  }

  function addScore(v) {
    State.score += v;
    ui.score.textContent = pad5(State.score);
    bump(ui.score);
    if (State.score > State.best) {
      State.best = State.score;
      ui.best.textContent = pad5(State.best);
    }
  }

  function showChain(n) {
    ui.chain.textContent = 'CHAIN ×' + n;
    ui.chain.classList.remove('is-on');
    void ui.chain.offsetWidth;
    ui.chain.classList.add('is-on');
  }

  function celebrateMax(x, y) {
    Sound.max();
    if (ui.fxMaxJp) ui.fxMaxJp.textContent = '地域備蓄庫 完成！';
    if (ui.fxMaxEn) ui.fxMaxEn.textContent = 'COMMUNITY STOCKPILE!';
    ui.fxMax.classList.remove('is-on');
    void ui.fxMax.offsetWidth;
    ui.fxMax.classList.add('is-on');
    setTimeout(function () { ui.fxMax.classList.remove('is-on'); }, 2100);

    const colors = ['#FFD24A', '#FF9B2F', '#FF5A4E', '#FFF7E8'];
    for (let i = 0; i < 44; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      State.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        life: 900 + Math.random() * 500, max: 1400,
        size: 3 + Math.random() * 4,
        color: colors[i % colors.length],
        star: i % 3 === 0
      });
    }
    trimParticles();
  }

  function celebrateClearMax(x, y) {
    Sound.clearMax();
    if (ui.fxMaxJp) ui.fxMaxJp.textContent = '備蓄完了！ PERFECT!';
    if (ui.fxMaxEn) ui.fxMaxEn.textContent = 'STOCKPILE CLEARED! +5000';
    ui.fxMax.classList.remove('is-on');
    void ui.fxMax.offsetWidth;
    ui.fxMax.classList.add('is-on');
    setTimeout(function () { ui.fxMax.classList.remove('is-on'); }, 2100);

    const colors = ['#FFD24A', '#FF5A4E', '#8FBF6E', '#FF9B2F', '#FFFDF7'];
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 6;
      State.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
        life: 1100 + Math.random() * 500, max: 1600,
        size: 4 + Math.random() * 4,
        color: colors[i % colors.length],
        star: true
      });
    }
    trimParticles();
  }

  /* =======================================================
     9. エフェクト
     ======================================================= */
  function burst(x, y, color, level) {
    const n = Math.min(8 + level * 2, 22);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const sp = 1.6 + Math.random() * 2.8;
      State.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: 400 + Math.random() * 280, max: 680,
        size: 2 + Math.random() * 3.5,
        color: i % 3 === 0 ? '#FFF3D6' : color,
        star: i % 4 === 0
      });
    }
    trimParticles();
  }

  function trimParticles() {
    const over = State.particles.length - CONFIG.maxParticles;
    if (over > 0) State.particles.splice(0, over);
  }

  function updateEffects(dt) {
    const ps = State.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.x += p.vx * (dt / 16.7);
      p.y += p.vy * (dt / 16.7);
      p.vy += 0.16 * (dt / 16.7);
      p.vx *= 0.99;
    }
    const fs = State.floats;
    for (let i = fs.length - 1; i >= 0; i--) {
      fs[i].life -= dt;
      fs[i].y -= 0.035 * dt;
      if (fs[i].life <= 0) fs.splice(i, 1);
    }
    for (let i = 0; i < State.items.length; i++) {
      const b = State.items[i];
      if (b.pop > 0) b.pop = Math.max(0, b.pop - dt / 190);
    }
  }

  /* =======================================================
     10. 描画
     ======================================================= */
  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  let dpr = 1;

  function fitCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', function () { setTimeout(fitCanvas, 150); });

  const INK = '#4A2F22';

  function drawFallbackItem(item, r) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = '800 ' + Math.max(8, Math.round(r * 0.34)) + 'px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.short, 0, 0);
  }

  function drawItemAt(level, x, y, angle, scale, alpha) {
    const item = CONFIG.items[level];
    const r = (item.size / 2) * (scale || 1);
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    const img = IMAGES[level];
    if (img && img.ok) {
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
    } else {
      drawFallbackItem(item, r);
    }
    ctx.restore();
  }

  function draw() {
    if (!screens.game.classList.contains('is-active')) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 背景
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#FFFCF3');
    g.addColorStop(1, '#FFF2DC');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 床（生活と備えの土台）
    ctx.fillStyle = 'rgba(255,155,47,.32)';
    ctx.fillRect(0, floorY, W, CONFIG.floor);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(74,47,34,.45)';
    ctx.font = '700 9px "Fredoka", "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BASE GROUND / 備えの土台', W / 2, floorY + CONFIG.floor / 2 + 1);

    // 危険ライン
    const danger = State.dangerTimer / CONFIG.gameOverDelay;
    if (danger > 0.02) {
      const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.dangerLine);
      grad.addColorStop(0, 'rgba(255,90,78,' + (0.28 * danger).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(255,90,78,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, CONFIG.dangerLine);
    }
    ctx.save();
    ctx.setLineDash([11, 9]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = danger > 0.02
      ? 'rgba(255,90,78,' + (0.45 + 0.55 * danger).toFixed(3) + ')'
      : 'rgba(74,47,34,.22)';
    ctx.beginPath();
    ctx.moveTo(CONFIG.wall, CONFIG.dangerLine);
    ctx.lineTo(W - CONFIG.wall, CONFIG.dangerLine);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = danger > 0.02 ? '#FF5A4E' : 'rgba(74,47,34,.35)';
    ctx.font = '700 10px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('DANGER LINE', CONFIG.wall + 4, CONFIG.dangerLine - 5);

    // ガイド＆待機アイテム
    if (State.mode === 'playing') {
      const r = CONFIG.items[State.currentLevel].size / 2;
      ctx.save();
      ctx.setLineDash([5, 7]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(74,47,34,.18)';
      ctx.beginPath();
      ctx.moveTo(State.aimX, CONFIG.dropY + r);
      ctx.lineTo(State.aimX, floorY);
      ctx.stroke();
      ctx.restore();

      const bob = Math.sin(clock / 340) * 2.5;
      const ready = State.canDrop;
      ctx.save();
      ctx.globalAlpha = ready ? 0.16 : 0.07;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(State.aimX, CONFIG.dropY + r + 8 + bob, r * 0.6, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawItemAt(State.currentLevel, State.aimX, CONFIG.dropY + bob, 0, ready ? 1 : 0.86, ready ? 0.95 : 0.4);
    }

    // アイテム
    for (let i = 0; i < State.items.length; i++) {
      const b = State.items[i];
      const scale = 1 + 0.2 * easeOut(b.pop);
      drawItemAt(b.level, b.position.x, b.position.y, b.angle, scale, 1);
    }

    // パーティクル
    for (let i = 0; i < State.particles.length; i++) {
      const p = State.particles[i];
      const a = Math.max(0, Math.min(1, p.life / p.max));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.star) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life / 160);
        ctx.beginPath();
        const s = p.size * 1.5;
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.3, -s * 0.3); ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.3, s * 0.3); ctx.lineTo(0, s); ctx.lineTo(-s * 0.3, s * 0.3);
        ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.3, -s * 0.3);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // スコアポップアップ
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < State.floats.length; i++) {
      const f = State.floats[i];
      const a = Math.max(0, Math.min(1, f.life / f.max));
      ctx.globalAlpha = a;
      ctx.font = '800 17px "Fredoka", "M PLUS Rounded 1c", sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = '#FFD24A';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function easeOut(t) { return t <= 0 ? 0 : 1 - Math.pow(1 - t, 2); }

  /* =======================================================
     11. 操作
     ======================================================= */
  let pointerDown = false;

  function clampAim(x) {
    const r = CONFIG.items[State.currentLevel].size / 2;
    const min = CONFIG.wall + r + 2;
    const max = W - CONFIG.wall - r - 2;
    return Math.max(min, Math.min(max, x));
  }

  function pointerToBoardX(e) {
    const rect = canvas.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * W;
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (State.mode !== 'playing') return;
    Sound.unlock();
    pointerDown = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    State.aimX = clampAim(pointerToBoardX(e));
  });

  canvas.addEventListener('pointermove', function (e) {
    if (State.mode !== 'playing') return;
    if (e.pointerType === 'mouse' || pointerDown) {
      State.aimX = clampAim(pointerToBoardX(e));
    }
  });

  canvas.addEventListener('pointerup', function (e) {
    if (State.mode !== 'playing' || !pointerDown) return;
    pointerDown = false;
    State.aimX = clampAim(pointerToBoardX(e));
    dropItem();
  });

  canvas.addEventListener('pointercancel', function () { pointerDown = false; });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
    if (State.mode !== 'playing') return;
    const step = e.shiftKey ? 24 : 10;
    if (e.key === 'ArrowLeft')  { State.aimX = clampAim(State.aimX - step); e.preventDefault(); }
    if (e.key === 'ArrowRight') { State.aimX = clampAim(State.aimX + step); e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { dropItem(); e.preventDefault(); }
    if (e.key === 'Escape' || e.key === 'p') togglePause();
  });

  function dropItem() {
    if (State.mode !== 'playing' || !State.canDrop) return;
    Sound.unlock();

    createItem(State.currentLevel, State.aimX, CONFIG.dropY);
    Sound.drop();

    State.currentLevel = State.nextLevel;
    State.nextLevel = randomLevel();
    updateNextUI();

    State.canDrop = false;
    State.lastDropAt = clock;
  }

  function randomLevel() {
    const weights = CONFIG.spawnWeights;
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  function updateNextUI() {
    ui.next.textContent = '';
    ui.next.appendChild(itemNode(State.nextLevel, 34));
  }

  /* =======================================================
     12. ゲームオーバー判定
     ======================================================= */
  function checkDanger(dt) {
    const now = clock;
    let over = false;

    for (let i = 0; i < State.items.length; i++) {
      const b = State.items[i];
      const top = b.position.y - b.circleRadius;

      if (!b.entered) {
        const speedSq = b.velocity.x * b.velocity.x + b.velocity.y * b.velocity.y;
        if (top > CONFIG.dangerLine || (speedSq < 0.1 && now - b.bornAt > 1000) || now - b.bornAt > 3500) {
          b.entered = true;
        }
        continue;
      }

      if (top < CONFIG.dangerLine) {
        over = true;
        break;
      }
    }

    if (over) {
      State.dangerTimer += dt;
      if (State.dangerTimer >= CONFIG.gameOverDelay) gameOver();
    } else {
      State.dangerTimer = Math.max(0, State.dangerTimer - dt * 2.5);
    }
  }

  /* =======================================================
     13. メインループ
     ======================================================= */
  let lastTime = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    clock = now;
    let dt = lastTime ? now - lastTime : 16.6;
    lastTime = now;
    if (dt > 100) dt = 100;

    if (State.mode === 'playing') {
      if (engine) {
        // トンネリング防止のためサブステップ実行
        Matter.Engine.update(engine, 1000 / 120);
        Matter.Engine.update(engine, 1000 / 120);
      }

      processMerges();

      if (now - State.scanAt > 300) {
        State.scanAt = now;
        scanOverlaps();
        processMerges();

        for (let i = State.items.length - 1; i >= 0; i--) {
          const b = State.items[i];
          if (b.position.y > floorY + 300 || b.position.x < -300 || b.position.x > W + 300) {
            removeItem(b);
          }
        }
      }

      if (!State.canDrop && now - State.lastDropAt > CONFIG.dropCooldown) State.canDrop = true;
      if (now - State.lastMergeAt > CONFIG.chainWindow) State.chain = 0;

      checkDanger(dt);
    }

    updateEffects(dt);
    draw();
  }
  requestAnimationFrame(loop);

  /* =======================================================
     14. ゲームの開始・終了
     ======================================================= */
  function resetBoard() {
    if (world) {
      for (let i = State.items.length - 1; i >= 0; i--) Composite.remove(world, State.items[i]);
    }
    State.items.length = 0;
    mergeQueue.length = 0;
    State.particles.length = 0;
    State.floats.length = 0;
    State.score = 0;
    State.chain = 0;
    State.lastMergeAt = 0;
    State.dangerTimer = 0;
    State.aimX = W / 2;
    State.canDrop = true;
    State.lastDropAt = clock;
    State.currentLevel = randomLevel();
    State.nextLevel = randomLevel();
    ui.score.textContent = pad5(0);
    ui.best.textContent = pad5(State.best);
    ui.chain.classList.remove('is-on');
    if (ui.fxMax) ui.fxMax.classList.remove('is-on');
    updateNextUI();
  }

  function startGame() {
    if (!world && !initPhysics()) {
      openOverlay('error');
      return;
    }
    closeAllOverlays();
    resetBoard();
    showScreen('game');
    State.mode = 'playing';
  }

  async function gameOver() {
    if (State.mode === 'over') return;
    State.mode = 'over';
    Sound.over();

    const isNew = State.score > loadJSON(KEY.best, 0);
    if (isNew) saveJSON(KEY.best, State.score);
    State.best = Math.max(State.best, State.score);

    await submitScore(State.nickname || 'GUEST', State.score);

    ui.final.textContent = pad5(State.score);
    ui.finalBest.textContent = pad5(State.best);
    ui.newBest.hidden = !isNew;
    ui.tip.textContent = CONFIG.messages[Math.floor(Math.random() * CONFIG.messages.length)];

    setTimeout(function () { openOverlay('gameover'); }, 520);
  }

  function togglePause() {
    if (State.mode === 'playing') {
      State.mode = 'paused';
      openOverlay('pause');
    } else if (State.mode === 'paused') {
      closeOverlay('pause');
      State.mode = 'playing';
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && State.mode === 'playing') togglePause();
  });

  /* =======================================================
     15. 画面初期化
     ======================================================= */
  function buildTitleArt() {
    const box = $('#title-art');
    if (!box) return;
    box.textContent = '';
    CONFIG.items.forEach(function (item, i) {
      const px = Math.round(24 + i * 4.6);
      const node = itemNode(i, px);
      node.style.setProperty('--w', px + 'px');
      node.style.setProperty('--d', (i * 0.13).toFixed(2) + 's');
      box.appendChild(node);
    });
  }

  function buildChainChart() {
    const box = $('#chain-chart');
    if (!box) return;
    box.textContent = '';
    CONFIG.items.forEach(function (item, i) {
      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'arrow';
        arrow.textContent = '▶';
        box.appendChild(arrow);
      }
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.appendChild(itemNode(i, 40));
      const label = document.createElement('span');
      label.textContent = item.name;
      chip.appendChild(label);
      box.appendChild(chip);
    });
  }

  async function buildRanking() {
    const list = await getRanking(10);
    const box = $('#rank-list');
    if (!box) return;
    box.textContent = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'rank-empty';
      li.textContent = 'まだ記録がありません。遊んで1位を取ろう。';
      box.appendChild(li);
      return;
    }
    list.forEach(function (row, i) {
      const li = document.createElement('li');
      const no = document.createElement('span');
      no.className = 'rank-no';
      no.textContent = String(i + 1);
      const name = document.createElement('span');
      name.className = 'rank-name';
      name.textContent = row.name;
      const sc = document.createElement('span');
      sc.className = 'rank-score';
      sc.textContent = pad5(row.score);
      li.appendChild(no); li.appendChild(name); li.appendChild(sc);
      box.appendChild(li);
    });
  }

  /* =======================================================
     16. ボタン操作
     ======================================================= */
  let confirmCallback = null;

  function askConfirm(title, text, onYes) {
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    confirmCallback = onYes;
    openOverlay('confirm');
  }

  function requestPlay() {
    Sound.unlock();
    if (!State.nickname) {
      $('#input-nickname').value = '';
      openOverlay('nickname');
      setTimeout(function () { $('#input-nickname').focus(); }, 60);
    } else {
      startGame();
    }
  }

  const actions = {
    play: requestPlay,
    howto: function () { showScreen('howto'); },
    ranking: async function () {
      await buildRanking();
      closeAllOverlays();
      showScreen('ranking');
      State.mode = 'title';
    },
    top: function () {
      closeAllOverlays();
      showScreen('title');
      State.mode = 'title';
    },
    'top-ask': function () {
      askConfirm('トップへ戻りますか？', 'いまのスコアは記録されません。', function () {
        closeAllOverlays();
        showScreen('title');
        State.mode = 'title';
      });
    },
    'nickname-ok': function () {
      const v = $('#input-nickname').value.trim().slice(0, 10);
      State.nickname = v || 'GUEST';
      saveJSON(KEY.nick, State.nickname);
      startGame();
    },
    'nickname-guest': function () {
      State.nickname = 'GUEST';
      saveJSON(KEY.nick, State.nickname);
      startGame();
    },
    resume: function () { togglePause(); },
    'restart-ask': function () {
      askConfirm('ゲームをやり直しますか？', 'いまのスコアは記録されません。', startGame);
    },
    'confirm-yes': function () {
      closeOverlay('confirm');
      const cb = confirmCallback;
      confirmCallback = null;
      if (cb) cb();
    },
    'confirm-no': function () { closeOverlay('confirm'); },
    retry: startGame
  };

  document.getElementById('frame').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const fn = actions[btn.dataset.action];
    if (!fn) return;
    Sound.unlock();
    Sound.ui();
    fn();
  });

  $('#btn-pause').addEventListener('click', function () {
    if (State.mode === 'playing' || State.mode === 'paused') { Sound.ui(); togglePause(); }
  });

  $('#btn-sound').addEventListener('click', function () {
    Sound.unlock();
    Sound.muted = !Sound.muted;
    saveJSON(KEY.mute, Sound.muted);
    ui.sound.textContent = Sound.muted ? '🔇' : '🔊';
    if (!Sound.muted) Sound.ui();
  });

  $('#input-nickname').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') actions['nickname-ok']();
  });

  /* =======================================================
     17. 起動
     ======================================================= */
  function boot() {
    initPhysics();
    buildTitleArt();
    buildChainChart();
    ui.best.textContent = pad5(State.best);
    ui.sound.textContent = Sound.muted ? '🔇' : '🔊';
    State.currentLevel = randomLevel();
    State.nextLevel = randomLevel();
    updateNextUI();
    showScreen('title');
  }
  boot();

  window.BICHIKU = {
    CONFIG: CONFIG,
    State: State,
    submitScore: submitScore,
    getRanking: getRanking,
    _createItem: createItem
  };

})();