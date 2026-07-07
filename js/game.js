/* =========================================================
 * game.js — ゲーム本体:ストーリー進行・戦闘・ミニゲーム
 * 流れ: タイトル → 会話 → 紫川(戦闘) → 会話 → 馬借町・商店(固定戦闘)
 *       → 会話 → ミニゲーム(山椒の実あつめ) → つづく
 * ========================================================= */
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 960, H = 540;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const FONT = '"Hiragino Mincho ProN", "Yu Mincho", serif';

  /* ---------- ステージ定義 ---------- */
  const GROUNDS = {
    mihagino: ['#7a6248', '#6a5540'],
    city:     ['#565060', '#484350'],
    castle:   ['#4d515e', '#414450'],
    river:    ['#6d7a4c', '#5c693e'],
    shopin:   ['#8a6f4a', '#755d3d'],
  };

  const STAGES = {
    river: {
      name: '紫川', sub: '其の一', bg: 'river', len: 3400,
      waves: [
        { at: 180,  spawn: [['zakoA', 1, 45, { flank: 1 }], ['zakoA', -1, 80, { flank: -1 }]] },
        { at: 560,  spawn: [['zakoA', 1, 35], ['zakoB', 1, 70], ['zakoA', -1, 55, { drop: 'cola' }]] },
        { at: 980,  spawn: [['zakoA', 1, 40], ['zakoA', 1, 85], ['zakoB', -1, 60]] },
        { at: 1420, spawn: [['zakoB', 1, 35, { drop: 'tea' }], ['zakoA', 1, 75], ['zakoA', -1, 50]] },
        { at: 1900, spawn: [['zakoA', 1, 30], ['zakoA', 1, 60], ['zakoB', 1, 90, { drop: 'cola' }], ['zakoA', -1, 45]] },
        { at: 2440, boss: true, bossName: '悪党の頭・鬼瓦の権三', line: '「誰だ貴様は！野郎どもやっちまえ！！」',
          spawn: [['bossFist', 1, 60, { name: '悪党の頭・鬼瓦の権三', drop: 'niku' }], ['zakoA', 1, 30], ['zakoA', -1, 80]] },
      ],
      items: [{ kind: 'cola', x: 1250, z: 85 }, { kind: 'tea', x: 2250, z: 30 }],
      daughter: true,
    },
    shop: {
      name: '馬借町・商店', sub: '其の二', bg: 'shopin', len: 960, arena: true,
      waves: [
        { at: 0, spawn: [
          ['zakoA', 1, 40, { pair: 'p1', flank: 1, drop: 'cola' }],
          ['zakoA', -1, 40, { pair: 'p1', flank: -1 }],
          ['zakoB', 1, 85, { pair: 'p2', flank: 1 }],
          ['zakoA', -1, 85, { pair: 'p2', flank: -1, drop: 'cola' }]] },
        { at: 0, boss: true, bossName: '大男・徳利の岩五郎', line: '「野郎どもがやられただと？なら俺様が相手だ！」',
          spawn: [
            ['bossBottle', 1, 60, { name: '大男・徳利の岩五郎', drop: 'niku' }],
            ['zakoA', 1, 30, { flank: 1, drop: 'cola' }],
            ['zakoB', -1, 40, { flank: -1 }],
            ['zakoA', 1, 70, { flank: 1 }],
            ['zakoB', -1, 80, { flank: -1, drop: 'cola' }],
            ['zakoA', 1, 100, { flank: 1 }],
            ['zakoA', -1, 55, { flank: -1 }]] },
      ],
      items: [],
    },
  };

  /* ---------- ストーリー(会話)定義 ---------- */
  const CUTSCENES = {
    cs_intro: [
      { bg: 'mihagino', actors: ['kojiroWeak'], sp: null,
        t: ['非番の日。', '小次郎は村の茶屋で、のんびり茶をすすっていた。'] },
      { bg: 'mihagino', actors: ['kojiroWeak', 'villager'], sp: '村人',
        t: ['「小次郎先生、助けて下さい！', '　娘が、娘が、悪党どもに', '　連れ去られてしまって…！」'] },
      { bg: 'mihagino', actors: ['kojiroWeak', 'villager'], sp: '小次郎',
        t: ['「な、なんと…！', '　と、とにかく案内してくれ！」'] },
      { bg: 'river', actors: [], sp: null,
        t: ['小次郎は村人に連れられ、', '悪党のアジトがある紫川へと向かった。'] },
      { bg: 'river', actors: ['kojiroWeak', 'zako'], sp: '悪党のザコ',
        t: ['「誰だテメェは！', '　ぶっ殺すぞ！」'] },
      { bg: 'river', actors: ['kojiroWeak', 'villager'], sp: '村人',
        t: ['「小次郎先生、どうぞこれを！」', '', '小倉コーラを受け取った！'], item: 'cola' },
      { bg: 'river', actors: ['kojiro'], sp: null,
        t: ['ゴクッ、ゴクッ……！', '', '体中に力が漲り——', '秘剣『燕返し』に開眼した！'], transform: true },
      { bg: 'river', actors: ['kojiro'], sp: '小次郎',
        t: ['「————悪党ども、', '　その娘を返してもらおう。」'] },
    ],
    cs_kusa: [
      { bg: 'river', actors: ['kojiro', 'daughter'], sp: null,
        t: ['悪党どもを蹴散らし、', '娘を無事に助け出した！'] },
      { bg: 'river', actors: ['kojiroWeak', 'villager', 'daughter'], sp: '村人',
        t: ['「小次郎先生、本当に', '　ありがとうございました！', '　お礼に、これをお納めください」', '', '『紫草』を手に入れた！'], item: 'kusa' },
      { bg: 'river', actors: ['kojiroWeak', 'villager', 'daughter'], sp: '村人',
        t: ['「これは紫川に生えている', '　『紫草』という植物です。', '　着物を染めると、うつくしい紫色に', '　染まり、とても丈夫になるんですよ」'] },
      { bg: 'river', actors: ['kojiroWeak', 'villager', 'daughter'], sp: '村人',
        t: ['「ぜひ、この川の上流にある', '　春吉の眼鏡橋まで行って、', '　せがれの又八に会ってみて下さい」'] },
    ],
    cs_uma: [
      { bg: 'city', actors: ['kojiroWeak'], sp: '小次郎',
        t: ['「春吉かぁ、少し距離があるな。', '　馬を借りて向かうか」'] },
      { bg: 'city', actors: [], sp: null,
        t: ['小次郎は『天狗印』の馬借町へ向かった。'] },
      { bg: 'city', actors: ['kojiroWeak', 'zako'], sp: null,
        t: ['すると——', '悪党どもが店を荒らしている！'] },
      { bg: 'city', actors: ['kojiroWeak', 'zako'], sp: '悪党',
        t: ['「こっちは腹が減ってるんだよ、', '　食えるものをもってこい！」'] },
      { bg: 'city', actors: ['kojiroWeak', 'zako'], sp: '小次郎',
        t: ['「や、やめろ！」'] },
      { bg: 'city', actors: ['kojiroWeak', 'zako'], sp: '悪党',
        t: ['「なんだ貴様は！', '　俺たちに歯向かおうってのか！', '　お前ら、やっちまえ！」'] },
    ],
    cs_butaman: [
      { bg: 'shopin', actors: ['kojiroWeak', 'merchant'], sp: '店主',
        t: ['「おぉ、これは小次郎先生。', '　悪党どもを成敗してくださり、', '　ありがとうございました」'] },
      { bg: 'shopin', actors: ['kojiroWeak', 'merchant'], sp: '店主',
        t: ['「お礼といってはなんですが、', '　うちにはこれしかありません。', '　どうぞお好きなだけお召し上がりください」', '', '『揚子江の豚まん』を手に入れた！'], item: 'butaman' },
      { bg: 'shopin', actors: ['kojiroWeak', 'merchant'], sp: null,
        t: ['もぐもぐ、もぐもぐ……', '', '体力の底力が上がった！'], hpUp: true },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '小次郎',
        t: ['「馬をお借りできないだろうか？」'] },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '馬屋の店主',
        t: ['「あぁ、これはどうもありがとうございます。', '　1頭3万円になります」'] },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '小次郎',
        t: ['「今日はお金を持ってきておらぬ。', '　ツケということにならんか？」'] },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '馬屋の店主',
        t: ['「小次郎先生にはお世話になっているので', '　無料でお貸ししたいところなんですが、', '　私どもも生活に困っておりまして…」'] },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '馬屋の店主',
        t: ['「あ、そうだ。先生にひとつ仕事を', '　お願いしてもよろしいでしょうか？', '　やっていただけたら', '　無料で馬をお貸しいたします」'] },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '小次郎',
        t: ['「よかろう、どんな仕事だ？」'] },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '馬屋の店主',
        t: ['「こちらでございます。', '　山椒の実をカゴいっぱい', '　採ってきてくだされ」'] },
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '馬屋の店主',
        t: ['「山椒の実は小倉コーラに必要な', '　スパイスでございまして、', '　フューチャースタジオの岡さんの所に', '　持っていけば買い取って下さいます」'] },
      { bg: 'river', actors: [], sp: null,
        t: ['〜 ミニゲーム:山椒の実あつめ 〜', '', '制限時間内に 山椒の実を8つ 集めよう！', '足場から落ちないようにジャンプ！', '馬糞を踏むと滑ってしまうぞ！'] },
    ],
    cs_end: [
      { bg: 'city', actors: ['kojiroWeak', 'stable'], sp: '馬屋の店主',
        t: ['「おぉ、たくさん採れましたね！', '　これで馬をお貸しできます」'] },
      { bg: 'city', actors: [], sp: null,
        t: ['馬を借りた小次郎は、', '春吉の眼鏡橋へと向かうのだった——'] },
      { tsuzuku: true },
    ],
  };

  const FLOW = ['cs_intro', 'stage:river', 'cs_kusa', 'cs_uma', 'stage:shop', 'cs_butaman', 'mini', 'cs_end'];

  // 会話シーンの登場人物
  function actorLook(key) {
    if (key === 'kojiro') return { ...kojiroLook(true), portrait: 'portrait_kojiro' };
    if (key === 'kojiroWeak') return { ...kojiroLook(), portrait: 'portrait_kojiro' }; // 変身廃止: 常に同じ小次郎
    if (key === 'zako') {
      const c = ENEMY_TYPES.zakoA;
      return { h: c.h, skin: c.colors.skin, skinD: '#b08a60', robe: c.colors.robe, robeD: c.colors.robeD,
        hakama: c.colors.hakama, sash: c.colors.sash, hat: c.hat, weapon: c.weapon, patches: true, face: 'grim',
        portrait: 'portrait_zako' };
    }
    return { ...NPC_PRESETS[key], portrait: 'portrait_' + key };
  }

  /* ---------- ゲーム状態 ---------- */
  const g = {
    state: 'loading',
    flowIdx: -1,
    maxHpBase: 100,
    stage: null,
    player: null,
    enemies: [], arrows: [], items: [], fx: [],
    npcs: [],
    camX: 0, camLocked: false, lockX: 0,
    waveIdx: 0, placedItems: [],
    worldLen: 3400,
    hitstop: 0, shakeT: 0, flashT: 0,
    banner: null, bannerT: 0,
    kills: 0,
    boss: null,
    clearT: 0,
    titleT: 0,
    stateDelay: 0,
    cs: null, csPage: 0, csAnimT: 0,
    mini: null,

    addFx(f) { this.fx.push(f); },

    onKill(e) {
      this.kills++;
      if (e.drop) this.items.push(new Item(e.drop, e.x, e.z));
      else if (!e.cfg.boss && Math.random() < 0.16) this.items.push(new Item('cola', e.x, e.z));
      if (e.cfg.boss) {
        this.boss = null;
        this.banner = { text: '成敗！！', sub: '' }; this.bannerT = 90;
        AudioFX.bgm('field');
        AudioFX.sfx.win();
      }
    },

    pickup(item) {
      const p = this.player;
      const def = ITEM_DEFS[item.kind];
      if (item.kind === 'cola') {
        p.transform(this);
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + 20); // 小回復
        const healed = p.hp - before;
        this.addFx(new Fx('text', p.x, p.z, 50, { text: def.label, color: def.color, size: 24, life: 70 }));
        if (healed > 0) this.addFx(new Fx('text', p.x, p.z, 78, { text: '体力+' + healed, color: '#5ecf6b', size: 18, life: 60 }));
      } else {
        const heal = item.kind === 'niku' ? 60 : 25;
        p.hp = Math.min(p.maxHp, p.hp + heal);
        AudioFX.sfx.pickup();
        this.addFx(new Fx('text', p.x, p.z, 50, { text: def.label, color: def.color, size: 20, life: 60 }));
      }
    },

    onPlayerDead() {
      if (this.state === 'play') {
        this.state = 'continue';
        AudioFX.bgm(null);
        this.stateDelay = 30;
      }
    },

    advanceFlow() {
      this.flowIdx++;
      const step = FLOW[this.flowIdx];
      if (!step) { this.state = 'title'; this.titleT = 0; return; }
      if (step.startsWith('cs_')) this.startCutscene(step);
      else if (step.startsWith('stage:')) this.startStage(step.slice(6));
      else if (step === 'mini') this.startMini();
    },

    startCutscene(id) {
      this.cs = CUTSCENES[id];
      this.csPage = 0;
      this.csAnimT = 0;
      this.state = 'cutscene';
      this.stateDelay = 15;
      AudioFX.bgm(null);
      this.applyPageFx();
    },

    applyPageFx() {
      const page = this.cs[this.csPage];
      if (!page) return;
      if (page.transform) { this.flashT = 10; AudioFX.sfx.cola(); }
      if (page.item) AudioFX.sfx.pickup();
      if (page.hpUp) { this.csAnimT = 0; }
    },

    startStage(key) {
      const st = STAGES[key];
      this.stage = st;
      this.worldLen = st.len;
      this.player = new Player(this.maxHpBase);
      if (key === 'river') this.player.tsubame = 1; // 直前にコーラを飲んで燕返し1回ぶんストック
      this.enemies = []; this.arrows = []; this.items = []; this.fx = [];
      this.npcs = [];
      if (st.daughter) this.npcs.push({ preset: 'daughter', x: st.len - 90, z: 28 });
      this.camX = 0; this.camLocked = !!st.arena; this.lockX = 0;
      this.waveIdx = 0;
      this.waves = st.waves.map(w => ({ ...w, done: false }));
      this.placedItems = st.items.map(i => ({ ...i, done: false }));
      this.boss = null;
      this.banner = { text: st.name, sub: st.sub }; this.bannerT = 130;
      this.clearT = 0;
      this.state = 'play';
      AudioFX.bgm('field');
    },

    startMini() {
      const plats = [];
      let x = -60;
      const total = 9600;
      let top = 470;
      plats.push({ x: -60, w: 660, top: 470 });
      x = 600;
      while (x < total) {
        x += 70 + Math.random() * 70;                 // 谷間
        const w = 150 + Math.random() * 190;
        const tops = [470, 410, 350].filter(t => Math.abs(t - top) <= 70);
        top = tops[Math.floor(Math.random() * tops.length)];
        plats.push({ x, w, top });
        x += w;
      }
      const trees = [], dungs = [];
      for (let i = 2; i < plats.length; i++) {
        const p = plats[i];
        if (p.w >= 160 && Math.random() < 0.78) {
          trees.push({ x: p.x + p.w * (0.35 + Math.random() * 0.3), top: p.top, picked: false });
        }
        if (p.w >= 150 && Math.random() < 0.4) {
          const dx = p.x + p.w * (0.15 + Math.random() * 0.7);
          if (!trees.length || Math.abs(trees[trees.length - 1].x - dx) > 70) {
            dungs.push({ x: dx, top: p.top, hit: false });
          }
        }
      }
      this.mini = {
        camX: 0, t: 0, time: 3600, quota: 8, count: 0, hearts: 3,
        px: 160, py: 470, vy: 0, jumps: 0, invuln: 0, walk: 0,
        slashT: 0, facing: 1, moving: false,
        plats, trees, dungs,
        result: null, resultT: 0,
      };
      this.fx = [];
      this.state = 'mini';
      AudioFX.bgm('field');
    },
  };

  /* ---------- 戦闘の更新 ---------- */
  function updatePlay(dt) {
    if (g.hitstop > 0) { g.hitstop -= dt; return; }
    const st = g.stage;
    const CAM_MAX = st.len - W;

    // ウェーブは順番に:前のウェーブが全滅してから次
    if (g.waveIdx < g.waves.length) {
      const w = g.waves[g.waveIdx];
      const prevCleared = g.enemies.every(e => e.dead);
      if (!w.done && g.camX >= w.at - 1 && (g.waveIdx === 0 || prevCleared)) {
        w.done = true;
        g.camLocked = true; g.lockX = Math.min(w.at, CAM_MAX);
        for (const [type, side, z, opt] of w.spawn) {
          const ex = side > 0 ? g.lockX + W + 60 + Math.random() * 60 : g.lockX - 70 - Math.random() * 40;
          const e = new Enemy(type, ex, z, opt);
          g.enemies.push(e);
          if (ENEMY_TYPES[type].boss) {
            g.boss = e;
            g.banner = { text: e.name, sub: w.line || '' };
            g.bannerT = 150;
            AudioFX.sfx.bossIn();
            AudioFX.bgm('boss');
          }
        }
        g.waveIdx++;
      }
    }
    // ロック解除(アリーナは常時ロック)
    if (g.camLocked && !st.arena && g.enemies.every(e => e.dead) && g.waveIdx >= g.waves.length) g.camLocked = false;
    if (g.camLocked && !st.arena && g.enemies.every(e => e.dead)) g.camLocked = false;

    for (const pi of g.placedItems) {
      if (!pi.done && pi.x < g.camX + W + 40) {
        pi.done = true;
        g.items.push(new Item(pi.kind, pi.x, pi.z));
      }
    }

    g.player.update(dt, g);
    for (const e of g.enemies) e.update(dt, g);
    for (const a of g.arrows) a.update(dt, g);
    for (const i of g.items) i.update(dt, g);
    g.enemies = g.enemies.filter(e => !e.dead || e.deadT < 50);
    g.arrows = g.arrows.filter(a => !a.dead);
    g.items = g.items.filter(i => !i.dead);

    const target = Math.max(0, Math.min(g.player.x - 380, g.camLocked ? g.lockX : CAM_MAX));
    if (target > g.camX) g.camX = Math.min(g.camX + Math.max(1, (target - g.camX) * 0.08) * dt, target);

    // ステージクリア
    if (g.waveIdx >= g.waves.length && g.enemies.every(e => e.dead)) {
      g.clearT += dt;
      if (g.clearT > 100) {
        AudioFX.bgm(null);
        g.advanceFlow();
      }
    }
  }

  function updateFx(dt) {
    for (const f of g.fx) f.update(dt);
    g.fx = g.fx.filter(f => !f.dead);
    if (g.shakeT > 0) g.shakeT -= dt;
    if (g.flashT > 0) g.flashT -= dt;
    if (g.bannerT > 0) g.bannerT -= dt;
  }

  /* ---------- 背景描画 ---------- */
  function persp(wx, z, camX) {
    const m = 0.85 + (z / Z_MAX) * 0.29;
    return (wx - camX - W / 2) * m + W / 2;
  }

  function drawStageLayers(bg, camX) {
    if (Assets.isExternal(bg)) {
      const img = Assets.img(bg);
      const scale = H / img.height;
      const w = img.width * scale;
      for (let xx = -((camX * 0.5) % w); xx < W; xx += w) ctx.drawImage(img, xx, 0, w, H);
      return;
    }
    const far = Assets.img(bg + '_far');
    const near = Assets.img(bg + '_near');
    for (let xx = -((camX * 0.18) % 1920); xx < W; xx += 1920) ctx.drawImage(far, xx, 0);
    if (near) {
      for (let xx = -((camX * 0.55) % 1920); xx < W; xx += 1920) ctx.drawImage(near, xx, 0);
    }
  }

  function drawGround(bg, camX) {
    const gc = GROUNDS[bg] || GROUNDS.mihagino;
    ctx.fillStyle = gc[0];
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    const dg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    dg.addColorStop(0, 'rgba(15,10,22,0.52)');
    dg.addColorStop(0.45, 'rgba(15,10,22,0.14)');
    dg.addColorStop(1, 'rgba(15,10,22,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    const sp = 160;
    const first = Math.floor((camX - W * 0.3) / sp) * sp;
    const last = camX + W * 1.3;

    ctx.fillStyle = gc[1];
    const bandZ = [0, 27, 55, 82, 110];
    for (let bi = 0; bi < 4; bi++) {
      const z0 = bandZ[bi], z1 = bandZ[bi + 1];
      for (let gx = first; gx < last; gx += sp) {
        if ((Math.round(gx / sp) + bi) % 2 === 0) continue;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(persp(gx, z0, camX), groundY(z0));
        ctx.lineTo(persp(gx + sp, z0, camX), groundY(z0));
        ctx.lineTo(persp(gx + sp, z1, camX), groundY(z1));
        ctx.lineTo(persp(gx, z1, camX), groundY(z1));
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // 質感テクスチャ(奥は細かく、手前は粗く=遠近)
    const tex = Assets.img('tex_' + bg);
    if (tex) {
      const tBands = [0, 20, 42, 70, 110];
      for (let bi = 0; bi < 4; bi++) {
        const z0 = tBands[bi], z1 = tBands[bi + 1];
        const mMid = 0.85 + ((z0 + z1) / 2 / Z_MAX) * 0.29;
        const y0 = groundY(z0), hh = groundY(z1) - y0;
        const tw = 320 * mMid;
        ctx.globalAlpha = 0.5 + bi * 0.1;
        for (let xx = -((camX * mMid) % tw) - tw; xx < W; xx += tw) {
          ctx.drawImage(tex, xx, y0, tw, hh * (bi < 2 ? 1.4 : 1));
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    for (let k = 0; k <= 6; k++) {
      const t = Math.pow(k / 6, 1.45);
      const z = t * Z_MAX;
      ctx.lineWidth = 1 + t * 1.8;
      ctx.beginPath();
      ctx.moveTo(0, groundY(z)); ctx.lineTo(W, groundY(z));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    for (let gx = first; gx < last; gx += sp) {
      const x0 = persp(gx, 0, camX), x1 = persp(gx, Z_MAX, camX);
      if (Math.max(x0, x1) < -40 || Math.min(x0, x1) > W + 40) continue;
      const ext = (x1 - x0) * 13 / (groundY(Z_MAX) - GROUND_Y);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, GROUND_Y);
      ctx.lineTo(x1 + ext, H);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, GROUND_Y - 3, W, 4);
  }

  const vignette = (() => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
    grad.addColorStop(0, 'rgba(5,5,15,0)');
    grad.addColorStop(1, 'rgba(5,5,15,0.4)');
    x.fillStyle = grad;
    x.fillRect(0, 0, W, H);
    return c;
  })();

  /* ---------- 戦闘の描画 ---------- */
  function drawEntities() {
    const list = [...g.items, ...g.enemies, g.player,
      ...g.npcs.map(n => ({
        z: n.z,
        draw(x, camX) {
          const sx = n.x - camX;
          if (sx < -100 || sx > 1060) return;
          const gy = groundY(n.z);
          const ds = depthScale(n.z);
          x.fillStyle = 'rgba(0,0,0,0.3)';
          x.beginPath(); x.ellipse(sx, gy, 16 * ds, 6 * ds, 0, 0, 7); x.fill();
          x.save();
          x.translate(sx, gy);
          x.scale(-ds, ds);
          drawWarrior(x, { ...NPC_PRESETS[n.preset], walk: 0, moving: false, breath: Date.now() * 0.005 });
          x.restore();
        },
      })),
    ];
    list.sort((a, b) => a.z - b.z);
    for (const e of list) e.draw(ctx, g.camX);
    for (const a of g.arrows) a.draw(ctx, g.camX);
    for (const f of g.fx) f.draw(ctx, g.camX);
  }

  function barBox(x, y, w, h, ratio, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
  }

  function drawHud() {
    const p = g.player;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
    ctx.strokeText('佐々木小次郎', 18, 26);
    ctx.fillText('佐々木小次郎', 18, 26);
    barBox(18, 33, p.maxHp * 2.2, 13, p.hp / p.maxHp, p.hp > 30 ? '#5ecf6b' : '#e05a4a');

    // 燕返しストック(コーラ1本=1回)
    if (p.tsubame > 0) {
      const img = Assets.img('cola');
      const bw = img && img.width ? 26 * img.width / img.height : 13;
      ctx.font = `bold 12px ${FONT}`;
      const blink = p.specialCd <= 0 && Math.floor(Date.now() / 350) % 2 === 0;
      ctx.fillStyle = blink ? '#ffffff' : '#8fd4ff';
      ctx.textAlign = 'left';
      ctx.fillText('秘剣・燕返し(C)', 18, 60);
      // ストック分の瓶アイコン
      for (let i = 0; i < p.tsubame; i++) {
        ctx.drawImage(img, 128 + i * (bw + 4), 48, bw, 26);
      }
    } else if (Math.floor(Date.now() / 600) % 2 === 0) {
      ctx.fillStyle = '#ffb37a';
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('小倉コーラで燕返しが使える!', 18, 60);
    }

    // ステージ名
    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(`${g.stage.sub} ${g.stage.name}`, W - 18, 26);
    ctx.fillText(`${g.stage.sub} ${g.stage.name}`, W - 18, 26);
    if (!g.stage.arena) {
      barBox(W - 238, 33, 220, 6, g.player.x / g.stage.len, '#d9b23c');
      ctx.font = `11px ${FONT}`;
      ctx.fillText('すすみぐあい', W - 18, 52);
    }

    if (g.boss && !g.boss.dead) {
      ctx.textAlign = 'center';
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = '#ffd0c0';
      ctx.strokeText(g.boss.name, W / 2, H - 40);
      ctx.fillText(g.boss.name, W / 2, H - 40);
      barBox(W / 2 - 200, H - 32, 400, 12, g.boss.hp / g.boss.maxHp, '#c0392b');
    }

    const wavesLeft = g.waveIdx < g.waves.length;
    if (!g.camLocked && wavesLeft && g.enemies.every(e => e.dead) &&
        Math.floor(Date.now() / 400) % 2 === 0) {
      ctx.textAlign = 'right';
      ctx.font = `bold 34px ${FONT}`;
      ctx.fillStyle = '#ffd76b';
      ctx.strokeText('進め ▶▶', W - 24, H / 2 - 60);
      ctx.fillText('進め ▶▶', W - 24, H / 2 - 60);
    }

    if (g.bannerT > 0 && g.banner) {
      const a = Math.min(1, g.bannerT / 20, (150 - g.bannerT) / 12 + 0.2);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H / 2 - 64, W, 96);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e6d2';
      ctx.font = `16px ${FONT}`;
      ctx.fillText(g.banner.sub || '', W / 2, H / 2 - 34);
      ctx.font = `bold 40px ${FONT}`;
      ctx.fillText(g.banner.text, W / 2, H / 2 + 10);
      ctx.restore();
    }
  }

  function drawFlash() {
    if (g.flashT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${g.flashT / 10})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawWorld(dt) {
    if (dt > 0) {
      updatePlay(dt);
      updateFx(dt);
    }
    ctx.save();
    if (g.shakeT > 0) {
      ctx.translate((Math.random() - 0.5) * g.shakeT, (Math.random() - 0.5) * g.shakeT * 0.7);
    }
    drawStageLayers(g.stage.bg, g.camX);
    drawGround(g.stage.bg, g.camX);
    drawEntities();
    ctx.restore();
    ctx.drawImage(vignette, 0, 0);
    drawHud();
    drawFlash();
  }

  /* ---------- 会話シーン ---------- */
  function drawItemIcon(kind, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === 'cola') {
      const img = Assets.img('cola');
      const ih = 86, iw = img.width ? ih * img.width / img.height : 40;
      ctx.drawImage(img, -iw / 2, -ih / 2 - 2, iw, ih);
    } else if (kind === 'kusa') {
      // 紫草(染料になる紫根が主役。花はなし)
      // 緑の葉(地上部)
      ctx.fillStyle = '#4e7e3a';
      const leaf = (ang, len) => {
        ctx.save(); ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, -len, 4.5, len, 0, 0, 7);
        ctx.fill();
        ctx.restore();
      };
      ctx.save(); ctx.translate(0, -8);
      leaf(-0.5, 26); leaf(-0.15, 32); leaf(0.2, 30); leaf(0.55, 24);
      ctx.strokeStyle = '#3a6630'; ctx.lineWidth = 1.2;
      [[-0.5,26],[-0.15,32],[0.2,30],[0.55,24]].forEach(([a,l]) => {
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -l * 1.9); ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
      // 根の付け根(株)
      ctx.fillStyle = '#8a5a3a';
      ctx.beginPath(); ctx.ellipse(0, -6, 8, 5, 0, 0, 7); ctx.fill();
      // 太い紫の主根 + 枝分かれ(これが染料)
      const rootMain = '#6e2c58', rootLight = '#9a3f7e';
      ctx.strokeStyle = rootMain; ctx.lineCap = 'round';
      // 主根
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(-3, 22, 3, 46); ctx.stroke();
      // 枝根
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-1, 8); ctx.quadraticCurveTo(-16, 18, -20, 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, 14); ctx.quadraticCurveTo(18, 22, 22, 44); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, 26); ctx.quadraticCurveTo(-8, 36, -9, 52); ctx.stroke();
      // 細いひげ根
      ctx.strokeStyle = rootLight; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(3, 40); ctx.lineTo(8, 54); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-18, 38); ctx.lineTo(-22, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, 42); ctx.lineTo(26, 52); ctx.stroke();
      // 主根のハイライト
      ctx.strokeStyle = rootLight; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-1, 2); ctx.quadraticCurveTo(-3, 20, 1, 40); ctx.stroke();
    } else if (kind === 'butaman') {
      // 豚まん
      ctx.fillStyle = '#f2e8d8';
      ctx.beginPath(); ctx.arc(0, 0, 30, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 12, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(160,130,90,0.6)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + i * (Math.PI / 5.5) + 0.15;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 22);
        ctx.quadraticCurveTo(Math.cos(a) * 8, Math.sin(a) * 6 - 8, 0, -24);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, -30); ctx.quadraticCurveTo(-14, -37, -8, -42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -30); ctx.quadraticCurveTo(4, -37, 10, -42); ctx.stroke();
    }
    ctx.restore();
  }

  // 角丸パス
  function rrPath(x0, y0, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, w, h, r);
    else ctx.rect(x0, y0, w, h);
  }

  // ロゴ描画:元画像の縦横比を保ったまま指定の高さで中央に。
  // plate=true で黒ロゴが暗い背景でも読めるようクリーム色の下地を敷く。
  function drawLogo(cx, cy, targetH, plate) {
    const logo = Assets.img('cola_logo');
    if (!logo) return;
    const ar = (logo.width || 1) / (logo.height || 1);
    const h = targetH, w = h * ar;
    if (plate) {
      const pad = w * 0.16 + 10;
      rrPath(cx - w / 2 - pad, cy - h / 2 - pad * 0.6, w + pad * 2, h + pad * 1.2, 12);
      ctx.fillStyle = '#f4ecd8';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,40,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
  }

  // 話者の顔(なければ最初の登場人物)
  function dialogFace(page) {
    const actors = page.actors || [];
    if (page.sp) {
      if (page.sp.includes('小次郎')) {
        const k = actors.find(a => a.startsWith('kojiro'));
        if (k) return actorLook(k);
      } else {
        const o = actors.find(a => !a.startsWith('kojiro'));
        if (o) return actorLook(o);
      }
    }
    if (actors.length) return actorLook(actors[0]);
    return null;
  }

  // 顔グラフィック(枠内に上半身をクリップ表示)
  function drawFacePortrait(look, bx, by, s) {
    rrPath(bx, by, s, s, 8);
    const bg = ctx.createLinearGradient(bx, by, bx, by + s);
    bg.addColorStop(0, '#42597e');
    bg.addColorStop(1, '#1a2236');
    ctx.fillStyle = bg; ctx.fill();
    ctx.save();
    rrPath(bx, by, s, s, 8); ctx.clip();
    if (look.portrait && Assets.isExternal(look.portrait)) {
      // 生成アートの顔グラ(カバーフィット・上寄せ)
      const img = Assets.img(look.portrait);
      const k = Math.max(s / img.width, s / img.height);
      const dw = img.width * k, dh = img.height * k;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, bx + (s - dw) / 2, by, dw, dh);
      ctx.imageSmoothingEnabled = true;
    } else {
      const scale = s / look.h * 1.32;
      ctx.translate(bx + s / 2 + s * 0.05, by + s * 1.5);
      ctx.scale(scale, scale);
      drawWarrior(ctx, { ...look, walk: 0, moving: false, breath: Date.now() * 0.005, lean: 0 });
    }
    ctx.restore();
    rrPath(bx, by, s, s, 8);
    ctx.strokeStyle = 'rgba(217,178,60,0.85)'; ctx.lineWidth = 3; ctx.stroke();
  }

  // 日本語テキストを枠幅で折り返し
  function wrapLines(lines, maxW, font) {
    ctx.font = font;
    const out = [];
    for (const line of lines) {
      if (line === '') { out.push(''); continue; }
      let cur = '';
      for (const ch of line) {
        if (cur && ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; }
        else cur += ch;
      }
      out.push(cur);
    }
    return out;
  }

  function drawCutscene(dt) {
    const page = g.cs[g.csPage];
    if (!page) { g.advanceFlow(); return; }
    g.csAnimT += dt;

    // 「つづく」ページ
    if (page.tsuzuku) {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, W, H);
      drawLogo(W / 2, 120, 150, true);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e6d2';
      ctx.font = `bold 54px ${FONT}`;
      ctx.fillText('つづく', W / 2, 280);
      ctx.font = `18px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('次回 「春吉・眼鏡橋の又八」', W / 2, 330);
      ctx.font = `14px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`退治した悪党の数: ${g.kills}人`, W / 2, 380);
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#ffd76b';
        ctx.font = `18px ${FONT}`;
        ctx.fillText(Input.isTouch ? 'タップでタイトルへ' : 'ENTERでタイトルへ', W / 2, 460);
      }
      if (g.stateDelay > 0) { g.stateDelay -= dt; return; }
      if (Input.state.startHit || Input.state.attackHit) {
        AudioFX.sfx.select();
        g.state = 'title'; g.titleT = 0;
      }
      return;
    }

    // 背景
    drawStageLayers(page.bg, 0);
    drawGround(page.bg, 0);
    ctx.drawImage(vignette, 0, 0);

    // シーンを暗くして会話パネルを主役にする
    ctx.fillStyle = 'rgba(6,5,12,0.5)';
    ctx.fillRect(0, 0, W, H);

    // 変身演出
    if (page.transform && g.csAnimT < 20) {
      ctx.fillStyle = `rgba(255,255,255,${1 - g.csAnimT / 20})`;
      ctx.fillRect(0, 0, W, H);
    }

    // アイテム表示
    if (page.item) {
      const bob = Math.sin(g.csAnimT * 0.08) * 5;
      ctx.save();
      ctx.globalAlpha = 0.85;
      const gl = ctx.createRadialGradient(W / 2, 190 + bob, 6, W / 2, 190 + bob, 70);
      gl.addColorStop(0, 'rgba(255,230,150,0.7)');
      gl.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(W / 2 - 70, 120 + bob, 140, 140);
      ctx.restore();
      drawItemIcon(page.item, W / 2, 190 + bob);
    }

    // 体力アップ演出
    let hpUpDone = true;
    if (page.hpUp) {
      const t = Math.min(1, g.csAnimT / 90);
      hpUpDone = t >= 1;
      const oldW = 100 * 2.2, newW = 130 * 2.2;
      const wNow = oldW + (newW - oldW) * t;
      ctx.textAlign = 'center';
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillStyle = '#fff';
      ctx.fillText('体力', W / 2, 165);
      barBox(W / 2 - newW / 2, 175, wNow, 16, 1, t >= 1 ? '#ffd76b' : '#5ecf6b');
      if (t >= 1 && Math.floor(Date.now() / 200) % 2 === 0) {
        ctx.fillStyle = '#ffd76b';
        ctx.font = `bold 20px ${FONT}`;
        ctx.fillText('最大体力アップ!!', W / 2, 230);
      }
      if (t >= 1 && g.maxHpBase < 130) {
        g.maxHpBase = 130;
        AudioFX.sfx.gauge();
      }
    }

    // 会話パネル(全画面・大きな文字)
    const PX = 40, PW = W - 80, PY = 300, PH = 214;
    rrPath(PX, PY, PW, PH, 14);
    ctx.fillStyle = 'rgba(12,10,20,0.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(217,178,60,0.75)';
    ctx.lineWidth = 3; ctx.stroke();

    // 顔グラフィック
    const face = dialogFace(page);
    let textX = PX + 34;
    if (face) {
      const FS = 150, fx = PX + 22, fy = PY + (PH - FS) / 2;
      drawFacePortrait(face, fx, fy, FS);
      textX = fx + FS + 30;
    }

    // 話者名タブ
    if (page.sp) {
      ctx.font = `bold 22px ${FONT}`;
      const tw = ctx.measureText(page.sp).width + 34;
      rrPath(textX - 6, PY - 20, tw, 38, 8);
      ctx.fillStyle = '#2c2438';
      ctx.strokeStyle = 'rgba(217,178,60,0.75)'; ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd76b';
      ctx.textAlign = 'left';
      ctx.fillText(page.sp, textX + 11, PY + 7);
    }

    // 文字送り(枠幅で自動折り返し)
    const maxTextW = PX + PW - textX - 26;
    const bodyFont = `26px ${FONT}`;
    const wrapped = wrapLines(page.t, maxTextW, bodyFont);
    const total = wrapped.reduce((s, l) => s + l.length, 0);
    const shown = Math.floor(g.csAnimT * 1.6);
    ctx.fillStyle = '#f4ecdc';
    ctx.textAlign = 'left';
    ctx.font = bodyFont;
    const lineH = wrapped.length > 4 ? 36 : 42;
    const startY = PY + 34 + (PH - 34 - wrapped.length * lineH) / 2;
    let used = 0;
    wrapped.forEach((line, i) => {
      const take = Math.max(0, Math.min(line.length, shown - used));
      ctx.fillText(line.slice(0, take), textX, startY + i * lineH + 22);
      used += line.length;
    });
    const fullyShown = shown >= total;

    if (fullyShown && hpUpDone && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#ffd76b';
      ctx.textAlign = 'right';
      ctx.font = `20px ${FONT}`;
      ctx.fillText('▼', PX + PW - 22, PY + PH - 18);
    }

    drawFlash();
    if (g.flashT > 0) g.flashT -= dt;

    if (g.stateDelay > 0) { g.stateDelay -= dt; return; }
    if (Input.state.startHit || Input.state.attackHit) {
      if (!fullyShown) { g.csAnimT += 999; return; } // 文字送りスキップ
      if (!hpUpDone) return;
      AudioFX.sfx.select();
      g.csPage++;
      g.csAnimT = 0;
      g.stateDelay = 10;
      if (g.csPage >= g.cs.length) g.advanceFlow();
      else g.applyPageFx();
    }
  }

  /* ---------- コンティニュー ---------- */
  function drawContinue(dt) {
    drawWorld(0);
    ctx.fillStyle = 'rgba(10,5,5,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e08b7b';
    ctx.font = `34px ${FONT}`;
    ctx.fillText('小次郎、力尽きる……', W / 2, 200);
    ctx.fillStyle = '#f0e6d2';
    ctx.font = `18px ${FONT}`;
    ctx.fillText('だが、まだやられるわけにはいかない！', W / 2, 260);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#ffd76b';
      ctx.font = `22px ${FONT}`;
      ctx.fillText(Input.isTouch ? 'タップで立ち上がる' : 'ENTERで立ち上がる', W / 2, 350);
    }
    if (g.stateDelay > 0) { g.stateDelay -= dt; return; }
    if (Input.state.startHit || Input.state.attackHit) {
      AudioFX.sfx.select();
      const p = g.player;
      p.hp = p.maxHp; p.deadWait = 0;
      p.state = 'normal'; p.invulnT = 120;
      p.tsubame = Math.max(p.tsubame, 1); // 立ち上がりに一口=燕返し1回ぶん
      for (const e of g.enemies) { if (!e.dead) { e.atkCool = 90; e.state = 'chase'; } }
      g.state = 'play';
      AudioFX.bgm(g.boss ? 'boss' : 'field');
    }
  }

  /* ---------- ミニゲーム:山椒の実あつめ ---------- */
  function updateMini(dt) {
    const m = g.mini;
    const I = Input.state;
    if (m.result) {
      m.resultT += dt;
      if (m.resultT > 30 && (I.startHit || I.attackHit)) {
        AudioFX.sfx.select();
        if (m.result === 'clear') g.advanceFlow();
        else g.startMini(); // もう一度
      }
      return;
    }

    m.t += dt;
    m.time -= dt;
    if (m.invuln > 0) m.invuln -= dt;
    if (m.slashT > 0) m.slashT -= dt;

    // 自動スクロール
    m.camX += 2.3 * dt;

    // 操作
    let dx = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    m.moving = dx !== 0;
    if (dx !== 0) { m.facing = dx; m.walk += dt * 0.34; }
    m.px += dx * 3.3 * dt;
    m.px = Math.max(m.camX + 30, Math.min(m.camX + 910, m.px));

    // ジャンプ(2段まで)
    if (I.jumpHit && m.jumps < 2) {
      m.vy = m.jumps === 0 ? -10.8 : -9.2;
      m.jumps++;
      AudioFX.sfx.jump();
    }
    // 斬る
    if (I.attackHit && m.slashT <= 0) {
      m.slashT = 12;
      AudioFX.sfx.slash();
      g.addFx(new Fx('slash', m.px + m.facing * 26, 0, m.py - 40, {
        flat: true, facing: m.facing, r: 52, life: 9, color: 'rgba(220,240,255,0.6)',
      }));
      for (const tr of m.trees) {
        if (!tr.picked && Math.abs(tr.x - m.px) < 60 && Math.abs(tr.top - m.py) < 100) {
          tr.picked = true;
          m.count++;
          AudioFX.sfx.pickup();
          g.addFx(new Fx('text', tr.x, 0, tr.top - 90, { flat: true, text: '山椒の実 +1', color: '#9be07c', size: 18, life: 40 }));
        }
      }
    }

    // 物理
    const prevPy = m.py;
    m.vy += 0.55 * dt;
    m.py += m.vy * dt;
    let onPlat = false;
    if (m.vy >= 0) {
      for (const p of m.plats) {
        if (m.px > p.x - 8 && m.px < p.x + p.w + 8 &&
            prevPy <= p.top + 1 && m.py >= p.top) {
          m.py = p.top; m.vy = 0; m.jumps = 0; onPlat = true;
          break;
        }
      }
    }
    // 馬糞
    if (onPlat && m.invuln <= 0) {
      for (const d of m.dungs) {
        if (!d.hit && Math.abs(d.x - m.px) < 17 && Math.abs(d.top - m.py) < 6) {
          d.hit = true;
          m.hearts--;
          m.invuln = 80;
          m.vy = -5;
          AudioFX.sfx.hurt();
          g.shakeT = 8;
          g.addFx(new Fx('text', m.px, 0, m.py - 80, { flat: true, text: 'うわっ、滑った!!', color: '#e08b7b', size: 18, life: 44 }));
        }
      }
    }
    // 落下
    if (m.py > 620) {
      m.hearts--;
      AudioFX.sfx.hurt();
      const next = m.plats.find(p => p.x + p.w > m.camX + 320);
      if (next) { m.px = Math.max(m.camX + 200, next.x + 30); m.py = next.top - 120; m.vy = 0; }
      m.invuln = 90;
      g.shakeT = 8;
    }

    updateFx(dt);

    // 判定
    if (m.count >= m.quota) {
      m.result = 'clear'; m.resultT = 0;
      AudioFX.sfx.win();
      AudioFX.bgm(null);
    } else if (m.time <= 0 || m.hearts <= 0) {
      m.result = 'fail'; m.resultT = 0;
      AudioFX.bgm(null);
    }
  }

  function drawMini(dt) {
    if (dt > 0) updateMini(dt);
    const m = g.mini;

    // 空(川辺の遠景)
    const far = Assets.img('river_far');
    for (let xx = -((m.camX * 0.2) % 1920); xx < W; xx += 1920) ctx.drawImage(far, xx, 0);
    // 奥の林
    ctx.fillStyle = 'rgba(40,70,45,0.55)';
    for (let i = 0; i < 14; i++) {
      const tx = (i * 160 - (m.camX * 0.4) % 160) - 40;
      ctx.beginPath();
      ctx.arc(tx, 330 - (i % 3) * 20, 46, 0, 7);
      ctx.fill();
    }

    ctx.save();
    if (g.shakeT > 0) ctx.translate((Math.random() - 0.5) * g.shakeT, 0);

    // 足場
    for (const p of m.plats) {
      const sx = p.x - m.camX;
      if (sx + p.w < -40 || sx > W + 40) continue;
      // 土
      const eg = ctx.createLinearGradient(0, p.top, 0, p.top + 90);
      eg.addColorStop(0, '#7a5f42');
      eg.addColorStop(1, '#4c3a28');
      ctx.fillStyle = eg;
      ctx.fillRect(sx, p.top, p.w, Math.min(90, H - p.top + 40));
      ctx.fillRect(sx, p.top + 90, p.w, H);
      ctx.fillStyle = '#4c3a28';
      ctx.fillRect(sx, p.top + 90, p.w, H - p.top - 90);
      // 草の縁
      ctx.fillStyle = '#5d8a4a';
      ctx.fillRect(sx - 3, p.top - 6, p.w + 6, 10);
      ctx.fillStyle = '#487038';
      for (let i = 0; i < p.w; i += 14) {
        ctx.fillRect(sx + i, p.top - 10, 3, 7);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
      ctx.strokeRect(sx - 3, p.top - 6, p.w + 6, 10);
    }

    // 山椒の低木(実はグリーン)
    for (const tr of m.trees) {
      const sx = tr.x - m.camX;
      if (sx < -60 || sx > W + 60) continue;
      // 短い幹
      ctx.strokeStyle = '#5a3f26'; ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sx, tr.top);
      ctx.lineTo(sx - 1, tr.top - 16);
      ctx.stroke();
      if (!tr.picked) {
        // こんもりした茂み(低木)
        ctx.fillStyle = '#3f7a35';
        ctx.beginPath();
        ctx.arc(sx - 16, tr.top - 24, 16, 0, 7);
        ctx.arc(sx + 2, tr.top - 32, 19, 0, 7);
        ctx.arc(sx + 18, tr.top - 22, 14, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#57a047';
        ctx.beginPath(); ctx.arc(sx - 6, tr.top - 34, 12, 0, 7); ctx.fill();
        // 山椒の実(緑の粒の房)
        ctx.fillStyle = '#8fd44a';
        ctx.strokeStyle = 'rgba(30,60,20,0.5)'; ctx.lineWidth = 1;
        for (let k = 0; k < 8; k++) {
          const a = k * 0.8;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(a) * 17, tr.top - 27 + Math.sin(a) * 9, 3.4, 0, 7);
          ctx.fill(); ctx.stroke();
        }
      } else {
        // 収穫後のしぼんだ茂み
        ctx.fillStyle = '#3f6a35';
        ctx.beginPath();
        ctx.arc(sx - 8, tr.top - 16, 10, 0, 7);
        ctx.arc(sx + 8, tr.top - 18, 11, 0, 7);
        ctx.fill();
      }
    }

    // 馬糞
    for (const d of m.dungs) {
      const sx = d.x - m.camX;
      if (sx < -30 || sx > W + 30 || d.hit) continue;
      ctx.fillStyle = '#5a4426';
      ctx.beginPath(); ctx.ellipse(sx, d.top - 5, 13, 7, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx - 4, d.top - 11, 8, 5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + 5, d.top - 10, 6, 4, 0, 0, 7); ctx.fill();
      // 湯気
      ctx.strokeStyle = 'rgba(200,190,160,0.5)'; ctx.lineWidth = 2;
      const wob = Math.sin(Date.now() * 0.006 + d.x) * 2;
      ctx.beginPath();
      ctx.moveTo(sx - 3, d.top - 18);
      ctx.quadraticCurveTo(sx - 6 + wob, d.top - 26, sx - 3, d.top - 34);
      ctx.stroke();
    }

    // 小次郎(横スクロール用)
    ctx.save();
    ctx.translate(m.px - m.camX, m.py);
    if (m.invuln > 0 && Math.floor(m.invuln / 3) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.scale(m.facing * 0.92, 0.92);
    let swing = null;
    if (m.slashT > 0) {
      const p = 1 - m.slashT / 12;
      swing = p < 0.35 ? -2.0 : -1.9 + (p - 0.35) * 4.6;
    } else if (m.vy !== 0) swing = -1.6;
    drawWarrior(ctx, {
      ...kojiroLook(false),
      walk: m.walk, moving: m.moving && m.vy === 0,
      breath: Date.now() * 0.006,
      swing,
    });
    ctx.restore();

    for (const f of g.fx) f.draw(ctx, m.camX);
    ctx.restore();

    ctx.drawImage(vignette, 0, 0);

    // HUD
    ctx.textAlign = 'left';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
    ctx.strokeText('山椒の実あつめ', 18, 28);
    ctx.fillText('山椒の実あつめ', 18, 28);
    // 残り時間
    barBox(18, 38, 220, 10, m.time / 3600, m.time < 900 ? '#e05a4a' : '#d9b23c');
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`のこり ${Math.ceil(m.time / 60)}秒`, 18, 66);
    // カウント
    ctx.textAlign = 'right';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillStyle = '#9be07c';
    ctx.strokeText(`山椒の実  ${m.count} / ${m.quota}`, W - 18, 34);
    ctx.fillText(`山椒の実  ${m.count} / ${m.quota}`, W - 18, 34);
    // ハート
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < m.hearts ? '#e05a5a' : 'rgba(255,255,255,0.2)';
      const hx = W - 40 - i * 30, hy = 56;
      ctx.beginPath();
      ctx.arc(hx - 5, hy, 6, 0, 7);
      ctx.arc(hx + 5, hy, 6, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 10, hy + 2);
      ctx.lineTo(hx, hy + 14);
      ctx.lineTo(hx + 10, hy + 2);
      ctx.closePath(); ctx.fill();
    }
    // 操作ヒント(最初の5秒)
    if (m.t < 300) {
      ctx.textAlign = 'center';
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(Input.isTouch ? '跳=ジャンプ(2段) 斬=木を斬って実を取る' : 'X=ジャンプ(2段)  Z=木を斬って実を取る', W / 2, 100);
    }

    // 結果
    if (m.result) {
      ctx.fillStyle = 'rgba(10,8,15,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      if (m.result === 'clear') {
        ctx.fillStyle = '#9be07c';
        ctx.font = `bold 42px ${FONT}`;
        ctx.fillText('カゴいっぱいになった！', W / 2, 240);
      } else {
        ctx.fillStyle = '#e08b7b';
        ctx.font = `bold 42px ${FONT}`;
        ctx.fillText(m.hearts <= 0 ? 'ケガをしてしまった…' : '時間切れ…', W / 2, 240);
        ctx.fillStyle = '#f0e6d2';
        ctx.font = `18px ${FONT}`;
        ctx.fillText('もう一度挑戦しよう', W / 2, 290);
      }
      if (m.resultT > 30 && Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#ffd76b';
        ctx.font = `20px ${FONT}`;
        ctx.fillText(Input.isTouch ? 'タップでつづける' : 'ENTERでつづける', W / 2, 380);
      }
    }
    drawFlash();
  }

  /* ---------- タイトル ---------- */
  function drawTitle(dt) {
    g.titleT += dt;
    const off = g.titleT * 0.35;
    if (Assets.isExternal('castle')) {
      const img = Assets.img('castle');
      const w = img.width * (H / img.height);
      ctx.drawImage(img, -((off * 0.5) % w), 0, w, H);
    } else {
      const far = Assets.img('castle_far');
      const near = Assets.img('castle_near');
      for (let xx = -((off * 0.3) % 1920); xx < W; xx += 1920) ctx.drawImage(far, xx, 0);
      for (let xx = -(off % 1920); xx < W; xx += 1920) ctx.drawImage(near, xx, 0);
      ctx.fillStyle = '#3b3e4a';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    }
    ctx.drawImage(vignette, 0, 0);
    ctx.fillStyle = 'rgba(8,8,20,0.5)';
    ctx.fillRect(0, 0, W, H);

    // 小次郎(変身後) — 生成アートがあればそれを使う
    if (Assets.isExternal('title_kojiro')) {
      const art = Assets.img('title_kojiro');
      const bob = Math.sin(g.titleT * 0.03) * 4;
      const ah = 430, aw = art.width * ah / art.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(art, 715 - aw / 2, 520 - ah + bob, aw, ah);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.save();
      ctx.translate(720, 470);
      ctx.scale(1.6, 1.6);
      drawWarrior(ctx, {
        ...kojiroLook(true),
        walk: 0, moving: false,
        breath: g.titleT * 0.05,
        swing: -1.5 + Math.sin(g.titleT * 0.02) * 0.06,
      });
      ctx.restore();
    }

    drawLogo(W / 2, 78, 122, true);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText('presents', W / 2, 188);

    ctx.save();
    ctx.translate(W / 2 - 90, 288);
    ctx.rotate(-0.03);
    ctx.textAlign = 'center';
    ctx.font = `bold 92px ${FONT}`;
    ctx.fillStyle = '#1a1a24';
    ctx.fillText('武蔵がくる', 6, 8);
    ctx.fillStyle = '#f0e6d2';
    ctx.fillText('武蔵がくる', 0, 0);
    ctx.fillStyle = '#c0242b';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('— 第一幕・紫川の悪党ども —', 0, 42);
    ctx.restore();

    if (Math.floor(g.titleT / 40) % 2 === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd76b';
      ctx.font = `22px ${FONT}`;
      ctx.fillText(Input.isTouch ? '画面をタップしてスタート' : 'ENTERキーでスタート', W / 2, 420);
    }
    if (!Input.isTouch) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = `14px ${FONT}`;
      ctx.fillText('移動: 矢印キー/WASD　　攻撃: Z　　ジャンプ: X　　燕返し: C(コーラ効果中)', W / 2, 500);
    }

    if (Input.state.startHit && g.titleT > 30) {
      AudioFX.sfx.select();
      g.maxHpBase = 100;
      g.kills = 0;
      g.flowIdx = -1;
      g.advanceFlow();
    }
  }

  /* ---------- メインループ ---------- */
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / (1000 / 60);
    last = now;
    dt = Math.max(0.1, Math.min(2.5, dt));

    switch (g.state) {
      case 'title': drawTitle(dt); break;
      case 'cutscene': drawCutscene(dt); break;
      case 'play': drawWorld(dt); break;
      case 'continue': updateFx(dt); drawContinue(dt); break;
      case 'mini': drawMini(dt); break;
    }

    Input.endFrame();
    requestAnimationFrame(frame);
  }

  document.getElementById('mute-btn').addEventListener('pointerdown', e => {
    e.stopPropagation();
    const m = AudioFX.toggleMute();
    document.getElementById('mute-btn').classList.toggle('muted', m);
  });

  window.__G = g; // デバッグ用

  Assets.load(() => {
    g.state = 'title';
    requestAnimationFrame(frame);
  });
})();
