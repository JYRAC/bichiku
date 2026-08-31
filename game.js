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
    dangerLine: 155,

    gameOverDelay: 1500,
    dropCooldown: 400,
    chainWindow: 800,

    chainMultipliers: [1.0, 1.0, 1.3, 1.7, 2.2, 3.0, 4.0],
    spawnWeights: [45, 32, 18, 5],

    physics: {
      gravity: 0.95,
      restitution: 0.05,
      friction: 0.08,
      frictionStatic: 0.12,
      density: 0.003,
      airFriction: 0.008,
      slop: 0.02
    },

    maxParticles: 150,

    items: [
      { 
        key: 'bandage', name: '絆創膏', short: '絆創膏', size: 45, score: 5, color: '#F6C89B',
        tip: '小さなキズの保護に。避難ポーチに常備必須！',
        zukan: '避難時の靴擦れや小さなケガの応急処置に欠かせません。防水タイプが便利です。'
      },
      { 
        key: 'firstaid', name: '救急セット', short: '救急', size: 55, score: 15, color: '#F4645C',
        tip: '常備薬やハサミ・ガーゼも一緒にまとめておこう！',
        zukan: '消毒液・ガーゼ・包帯・持病の常備薬・お薬手帳のコピーをひとまとめに保管しましょう。'
      },
      { 
        key: 'light', name: 'ライト', short: 'ライト', size: 65, score: 40, color: '#F9CE5F',
        tip: '停電時は足元の安全確保！枕元と玄関に常備。',
        zukan: '停電時の移動用。両手が自由に使えるヘッドライトやランタン型も非常におすすめです。'
      },
      { 
        key: 'battery', name: 'モバイルバッテリー', short: 'バッテリー', size: 75, score: 90, color: '#F6A8AF',
        tip: 'スマホは命綱。月1回の定期充電を忘れずに！',
        zukan: '災害時の情報収集・安否確認の要。自然放電するため、月に1度は満充電にしておきます。'
      },
      { 
        key: 'food', name: '非常食セット', short: '非常食', size: 90, score: 200, color: '#A6C486',
        tip: '普段食べるものを少し多めに買い置くローリングストック！',
        zukan: 'アルファ米・レトルト食品・缶詰など。食べ慣れた味を備えておくことが心の安定にも繋がります。'
      },
      { 
        key: 'backpack', name: '防災リュック', short: 'リュック', size: 105, score: 450, color: '#F0574E',
        tip: '重さは体重の15〜20%！背負って走れる重さに。',
        zukan: '一次避難用。貴重品・水・携帯トイレ・雨具などを入れ、玄関や寝室のすぐ近くに置きます。'
      },
      { 
        key: 'home-stockpile', name: '家庭備蓄', short: '家庭備蓄', size: 125, score: 1000, color: '#E0AE79',
        tip: '水は1人1日3L×最低3日分（できれば1週間分）！',
        zukan: '自宅避難（在宅避難）用の備蓄。カセットコンロ・トイレットペーパー・生活用水も備えます。'
      },
      { 
        key: 'community-stockpile', name: '地域備蓄庫', short: '地域備蓄', size: 150, score: 2500, color: '#F2A03D',
        tip: '地域の備蓄倉庫・避難所の場所をハザードマップで確認！',
        zukan: '自治体や自治会が管理する倉庫。大型発電機や救出工具、避難生活用の物資が保管されています。'
      },
      { 
        key: 'city-hall', name: '防災拠点役所', short: '防災拠点', size: 175, score: 6000, color: '#6AAFE6',
        tip: 'デマに注意！災害時は役所や自治体の一次情報を確認。',
        zukan: '災害対策本部が置かれる地域の司令塔。避難所開設や物資配分、正確な情報発信を行います。'
      }
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
      '自分の地域の備蓄倉庫と役所の防災拠点がどこにあるか、知っていますか。'
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
     3. ランキング API (GAS / 署名付き通信)
     ======================================================= */
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzjT8FHlrCMwiST03ZqELqq1TcQ7xbnVx10B84PA6HpH4lK31S85tLzGeQv08tfzTqA/exec';
  const API_SECRET = 'BICHIKU_2026_SECRET_KEY';

  async function generateSignature(name, score, startTime) {
    const text = `${name}:${score}:${startTime}:${API_SECRET}`;
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function submitScore(name, score) {
    if (!GAS_URL || GAS_URL.includes('ここにデプロイID')) return false;
    try {
      const playerName = name || 'GUEST';
      const signature = await generateSignature(playerName, score, State.gameStartedAt);

      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          name: playerName,
          score: score,
          startTime: State.gameStartedAt,
          signature: signature
        })
      });
      return true;
    } catch (e) {
      console.error('GAS submit error:', e);
      return false;
    }
  }

  async function getRanking(limit) {
    if (!GAS_URL || GAS_URL.includes('ここにデプロイID')) return [];
    try {
      const res = await fetch(GAS_URL);
      const list = await res.json();
      return Array.isArray(list) ? list.slice(0, limit || 10) : [];
    } catch (e) {
      console.error('GAS fetch ranking error:', e);
      return [];
    }
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
    max()      { [523, 659, 784, 1047, 1318].forEach((f, i) =>
                   this.tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.14, delay: i * 0.09 })); },
    clearMax() { [523, 659, 784, 1047, 1318, 1568].forEach((f, i) =>
                   this.tone({ freq: f, dur: 0.4, type: 'square', vol: 0.14, delay: i * 0.08 })); },
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
    zukan:   $('#s-zukan'),
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
    rankBadge: $('#ui-rank-badge'),
    tip:       $('#ui-tip'),
    toast:     $('#ui-toast'),
    chain:     $('#fx-chain'),
    fxMax:     $('#fx-max'),
    fxMaxJp:   $('#fx-max-text-jp'),
    fxMaxEn:   $('#fx-max-text-en'),
    sound:     $('#btn-sound')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) screens[k].classList.toggle('is-active', k === name);
    });
  }
  function openOverlay(name) { if (overlays[name]) overlays[name].classList.add('is-active'); }
  function closeOverlay(name) { if (overlays[name]) overlays[name].classList.remove('is-active'); }
  function closeAllOverlays() {
    Object.keys(overlays).forEach(function (k) { if (overlays[k]) overlays[k].classList.remove('is-active'); });
  }

  function pad5(n) { return String(Math.floor(n)).padStart(5, '0'); }

  function bump(el) {
    if (!el) return;
    el.classList.remove('is-bump');
    void el.offsetWidth;
    el.classList.add('is-bump');
  }

  let toastTimer = null;
  function showToast(text) {
    if (!ui.toast) return;
    ui.toast.textContent = '💡 ' + text;
    ui.toast.classList.add('is-active');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      ui.toast.classList.remove('is-active');
    }, 2800);
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
    gameStartedAt: 0,
    currentLevel: 0,
    nextLevel: 0,
    highestLevel: 0,
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

    const staticOpts = { isStatic: true, friction: 0.1, restitution: 0.05, label: 'wall' };
    const wallThickness = 400;
    const floorThickness = 400;

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
    const visualR = item.size / 2;
    const colliderR = visualR * 0.90;
    const p = CONFIG.physics;
    
    const body = Bodies.circle(x, y, colliderR, {
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
    body.visualRadius = visualR;
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
        const clearGain = Math.round(10000 * mult);
        addScore(clearGain);
        State.floats.push({ x: x, y: y, text: 'PERFECT! +' + clearGain, life: 1300, max: 1300 });
        burst(x, y, '#6AAFE6', MAX_LEVEL + 2);
        celebrateClearMax(x, y);
      } else {
        const level = currentLevel + 1;
        if (level > State.highestLevel) {
          State.highestLevel = level;
          showToast(CONFIG.items[level].tip);
        }

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
    if (ui.score) {
      ui.score.textContent = pad5(State.score);
      bump(ui.score);
    }
    if (State.score > State.best) {
      State.best = State.score;
      if (ui.best) ui.best.textContent = pad5(State.best);
    }
  }

  function showChain(n) {
    if (!ui.chain) return;
    ui.chain.textContent = 'CHAIN ×' + n;
    ui.chain.classList.remove('is-on');
    void ui.chain.offsetWidth;
    ui.chain.classList.add('is-on');
  }

  function celebrateMax(x, y) {
    Sound.max();
    if (ui.fxMaxJp) ui.fxMaxJp.textContent = '防災拠点 役所 完成！';
    if (ui.fxMaxEn) ui.fxMaxEn.textContent = 'DISASTER HQ COMPLETED!';
    if (ui.fxMax) {
      ui.fxMax.classList.remove('is-on');
      void ui.fxMax.offsetWidth;
      ui.fxMax.classList.add('is-on');
      setTimeout(function () { ui.fxMax.classList.remove('is-on'); }, 2100);
    }

    const colors = ['#6AAFE6', '#FFD24A', '#FF9B2F', '#FFF7E8'];
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 6;
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
    if (ui.fxMaxJp) ui.fxMaxJp.textContent = '地域防災 完全制覇！ PERFECT!';
    if (ui.fxMaxEn) ui.fxMaxEn.textContent = 'ALL HQ CLEARED! +10000';
    if (ui.fxMax) {
      ui.fxMax.classList.remove('is-on');
      void ui.fxMax.offsetWidth;
      ui.fxMax.classList.add('is-on');
      setTimeout(function () { ui.fxMax.classList.remove('is-on'); }, 2100);
    }

    const colors = ['#6AAFE6', '#FFD24A', '#FF5A4E', '#8FBF6E', '#FFFDF7'];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 7;
      State.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
        life: 1100 + Math.random() * 600, max: 1700,
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
    const n = Math.min(8 + level * 2, 24);
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
    if (!screens.game || !screens.game.classList.contains('is-active')) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 背景
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#FFFCF3');
    g.addColorStop(1, '#FFF2DC');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 床
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
    
    State.canDrop = false;
    State.lastDropAt = clock;
    Sound.unlock();

    // 1. 今手元にある currentLevel を確実に落とす
    const dropLv = State.currentLevel;
    createItem(dropLv, State.aimX, CONFIG.dropY);
    Sound.drop();

    // 2. NEXTに表示されていたアイテムを手元へ昇格
    State.currentLevel = State.nextLevel;

    // 3. 次のNEXTアイテムを新規抽選してUI更新
    State.nextLevel = randomLevel();
    updateNextUI();
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
    if (!ui.next) return;
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
      const top = b.position.y - (b.visualRadius || b.circleRadius);

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
  function getRankBadge(level) {
    if (level >= 8) return '🎖️ 地域防災リーダー（役所開設）';
    if (level >= 7) return '📦 地区備蓄エキスパート（地域倉庫）';
    if (level >= 6) return '🏠 家庭備蓄マスター（1週間分達成）';
    if (level >= 4) return '🎒 おうち避難準備マスター';
    return '🌱 そなえビギナー（携帯防災ポーチ）';
  }

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
    State.highestLevel = 0;
    State.gameStartedAt = Date.now();

    State.currentLevel = randomLevel();
    State.nextLevel = randomLevel();

    if (ui.score) ui.score.textContent = pad5(0);
    if (ui.best) ui.best.textContent = pad5(State.best);
    if (ui.chain) ui.chain.classList.remove('is-on');
    if (ui.fxMax) ui.fxMax.classList.remove('is-on');

    updateNextUI();

    State.canDrop = true;
    State.lastDropAt = clock;
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

    if (ui.final) ui.final.textContent = pad5(State.score);
    if (ui.finalBest) ui.finalBest.textContent = pad5(State.best);
    if (ui.newBest) ui.newBest.hidden = !isNew;
    if (ui.rankBadge) ui.rankBadge.textContent = getRankBadge(State.highestLevel);
    if (ui.tip) ui.tip.textContent = CONFIG.messages[Math.floor(Math.random() * CONFIG.messages.length)];

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
      const px = Math.round(22 + i * 4.2);
      const node = itemNode(i, px);
      node.style.setProperty('--w', px + 'px');
      node.style.setProperty('--d', (i * 0.12).toFixed(2) + 's');
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
      chip.appendChild(itemNode(i, 36));
      const label = document.createElement('span');
      label.textContent = item.name;
      chip.appendChild(label);
      box.appendChild(chip);
    });
  }

  function buildZukan() {
    const box = $('#zukan-list');
    if (!box) return;
    box.textContent = '';
    CONFIG.items.forEach(function (item, i) {
      const card = document.createElement('div');
      card.className = 'zukan-card';
      
      const icon = document.createElement('div');
      icon.className = 'zukan-icon';
      icon.appendChild(itemNode(i, 46));
      
      const info = document.createElement('div');
      info.className = 'zukan-info';
      
      const title = document.createElement('div');
      title.className = 'zukan-title';
      title.textContent = `Lv.${i + 1} ${item.name}`;
      
      const desc = document.createElement('div');
      desc.className = 'zukan-desc';
      desc.textContent = item.zukan;
      
      info.appendChild(title);
      info.appendChild(desc);
      card.appendChild(icon);
      card.appendChild(info);
      box.appendChild(card);
    });
  }

  async function buildRanking() {
    const box = $('#rank-list');
    if (!box) return;
    box.textContent = '';
    
    const loadingLi = document.createElement('li');
    loadingLi.className = 'rank-empty';
    loadingLi.textContent = 'ランキングを取得中...';
    box.appendChild(loadingLi);

    const list = await getRanking(10);
    box.textContent = '';

    if (!list || !list.length) {
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
    if ($('#confirm-title')) $('#confirm-title').textContent = title;
    if ($('#confirm-text')) $('#confirm-text').textContent = text;
    confirmCallback = onYes;
    openOverlay('confirm');
  }

  function requestPlay() {
    Sound.unlock();
    if (!State.nickname) {
      if ($('#input-nickname')) $('#input-nickname').value = '';
      openOverlay('nickname');
      setTimeout(function () { if ($('#input-nickname')) $('#input-nickname').focus(); }, 60);
    } else {
      startGame();
    }
  }

  const actions = {
    play: requestPlay,
    howto: function () { showScreen('howto'); },
    zukan: function () {
      buildZukan();
      showScreen('zukan');
    },
    ranking: async function () {
      closeAllOverlays();
      showScreen('ranking');
      State.mode = 'title';
      await buildRanking();
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
      const v = $('#input-nickname') ? $('#input-nickname').value.trim().slice(0, 10) : '';
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

  const pauseBtn = $('#btn-pause');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      if (State.mode === 'playing' || State.mode === 'paused') { Sound.ui(); togglePause(); }
    });
  }

  const soundBtn = $('#btn-sound');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      Sound.unlock();
      Sound.muted = !Sound.muted;
      saveJSON(KEY.mute, Sound.muted);
      if (ui.sound) ui.sound.textContent = Sound.muted ? '🔇' : '🔊';
      if (!Sound.muted) Sound.ui();
    });
  }

  const inputNick = $('#input-nickname');
  if (inputNick) {
    inputNick.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') actions['nickname-ok']();
    });
  }

  /* =======================================================
     17. 起動
     ======================================================= */
  function boot() {
    initPhysics();
    buildTitleArt();
    buildChainChart();
    if (ui.best) ui.best.textContent = pad5(State.best);
    if (ui.sound) ui.sound.textContent = Sound.muted ? '🔇' : '🔊';
    
    resetBoard();
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
