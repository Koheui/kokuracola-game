/* =========================================================
 * assets.js — 画像アセット管理
 * assets/img/ に同名PNGを置くと自動でコード生成画像から差し替わる。
 *   背景: mihagino.png / city.png / castle.png  (推奨 1920x540)
 *     ※支給画像がある場合は1枚絵として使用。無い場合は
 *       コード生成の「遠景(_far)+近景(_near)」2層パララックスで描画。
 *   商品: cola.png(ボトル 48x96) / cola_logo.png(ロゴ 400x160)
 *   食品: niku.png / tea.png (48x48)
 * ========================================================= */
const Assets = (() => {
  const images = {};    // name -> HTMLImageElement | HTMLCanvasElement
  const overridden = {}; // name -> true (外部PNGで差し替え済み)
  const external = ['mihagino', 'city', 'castle', 'river', 'shopin', 'cola', 'cola_logo', 'niku', 'tea',
    'title_kojiro', 'portrait_kojiro',
    'portrait_villager', 'portrait_daughter', 'portrait_merchant', 'portrait_stable', 'portrait_zako'];
  const BASE = 340; // 地平線(地面の始まり)

  /* ============================================================
   * スプライトシート定義
   * assets/img/sprites/<名前>.png を置くと、コード描画のキャラが
   * 本物のドット絵/イラストに自動で差し替わる。
   * シートの構成: 縦に「アニメの種類」を並べ、横にコマを並べる。
   * 行の順番は anims の定義順。詳細は docs/asset_spec.md を参照。
   * ============================================================ */
  const SPRITE_DEFS = {
    kojiro_strong: { fw: 288, fh: 224, feetY: 208, charH: 130,
      anims: { idle: 4, walk: 4, attack1: 4, attack2: 4, attack3: 5, jump: 2, hurt: 2, down: 5, special: 8 } },
    kojiro_weak: { fw: 160, fh: 160, feetY: 148, charH: 108,
      anims: { idle: 6, walk: 8, attack1: 5, attack2: 5, attack3: 6, jump: 4, hurt: 3, down: 5 } },
    zakoA: { fw: 144, fh: 144, feetY: 134, charH: 102,
      anims: { idle: 4, walk: 4, windup: 3, strike: 4, hurt: 2, down: 5 } },
    zakoB: { fw: 144, fh: 144, feetY: 134, charH: 112,
      anims: { idle: 4, walk: 4, windup: 3, strike: 4, hurt: 2, down: 5 } },
    bossFist: { fw: 288, fh: 224, feetY: 208, charH: 168,
      anims: { idle: 4, walk: 4, windup: 4, strike: 5, kick: 5, hurt: 2, down: 5 } },
    bossBottle: { fw: 256, fh: 208, feetY: 194, charH: 158,
      anims: { idle: 4, walk: 4, windup: 4, strike: 5, throw: 5, hurt: 2, down: 5 } },
    musashi: { fw: 176, fh: 176, feetY: 164, charH: 124,
      anims: { idle: 6, walk: 8, windup: 3, strike: 5, hurt: 3, down: 5 } },
  };
  const sprites = {}; // name -> HTMLImageElement(読み込み成功時のみ)

  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* ================= 背景パーツ ================= */

  // 山なみ(シルエット)
  function hills(x, base, color, amp, seedShift) {
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(0, base);
    for (let i = 0; i <= 1920; i += 8) {
      const y = base - amp * (0.6 + 0.4 * Math.sin(i * 0.004 + seedShift)) *
        Math.abs(Math.sin(i * 0.0022 + seedShift * 2));
      x.lineTo(i, y);
    }
    x.lineTo(1920, 540); x.lineTo(0, 540);
    x.closePath(); x.fill();
  }

  // 霞(地平線近くの霧)
  function haze(x, base, color) {
    const g = x.createLinearGradient(0, base - 70, 0, base);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, color);
    x.fillStyle = g;
    x.fillRect(0, base - 70, 1920, 70);
  }

  // 雲(横に流れる筋雲)
  function clouds(x, color, rows) {
    x.fillStyle = color;
    for (let i = 0; i < rows; i++) {
      const y = 40 + i * 55 + (i % 3) * 18;
      const w = 240 + (i * 97) % 260;
      const cx = (i * 431) % 1920;
      x.beginPath();
      x.ellipse(cx, y, w, 10 + (i % 2) * 5, 0, 0, 7);
      x.fill();
      x.beginPath();
      x.ellipse(cx + w * 0.5, y + 8, w * 0.6, 8, 0, 0, 7);
      x.fill();
    }
  }

  // 瓦屋根つきの町家(近景用・ディテール多め)
  function machiya(x, bx, by, w, h, wall, wallD, roof, opt) {
    opt = opt || {};
    // 壁(縦板のグラデ)
    const wg = x.createLinearGradient(bx, 0, bx + w, 0);
    wg.addColorStop(0, wallD); wg.addColorStop(0.4, wall); wg.addColorStop(1, wallD);
    x.fillStyle = wg;
    x.fillRect(bx, by - h, w, h);
    // 柱
    x.fillStyle = 'rgba(30,20,12,0.7)';
    x.fillRect(bx, by - h, 7, h);
    x.fillRect(bx + w - 7, by - h, 7, h);
    x.fillRect(bx + w / 2 - 3, by - h, 6, h);
    // 漆喰の上壁
    x.fillStyle = 'rgba(230,222,205,0.25)';
    x.fillRect(bx + 7, by - h, w - 14, h * 0.22);
    // 屋根(反りのある瓦屋根)
    const rh = h * 0.46;
    x.fillStyle = roof;
    x.beginPath();
    x.moveTo(bx - w * 0.14, by - h + 4);
    x.quadraticCurveTo(bx + w * 0.1, by - h - rh * 0.5, bx + w * 0.5, by - h - rh);
    x.quadraticCurveTo(bx + w * 0.9, by - h - rh * 0.5, bx + w * 1.14, by - h + 4);
    x.lineTo(bx + w * 1.1, by - h + 10);
    x.lineTo(bx - w * 0.1, by - h + 10);
    x.closePath(); x.fill();
    // 瓦の筋
    x.strokeStyle = 'rgba(0,0,0,0.3)';
    x.lineWidth = 1.5;
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      x.beginPath();
      x.moveTo(bx - w * 0.14 + w * 1.28 * t, by - h + 6);
      x.lineTo(bx + w * 0.5 + (t - 0.5) * w * 0.32, by - h - rh + 3);
      x.stroke();
    }
    // 棟
    x.fillStyle = 'rgba(255,255,255,0.14)';
    x.fillRect(bx + w * 0.2, by - h - rh, w * 0.6, 4);
    // 格子窓
    x.fillStyle = 'rgba(24,16,10,0.85)';
    const n = Math.max(2, Math.floor(w / 40));
    for (let i = 0; i < n; i++) {
      const wx0 = bx + 12 + i * (w - 24) / n;
      const ww = (w - 24) / n * 0.6;
      x.fillRect(wx0, by - h * 0.62, ww, h * 0.4);
      x.strokeStyle = 'rgba(120,90,60,0.8)';
      x.lineWidth = 2;
      for (let k = 1; k < 4; k++) {
        x.beginPath();
        x.moveTo(wx0 + ww * k / 4, by - h * 0.62);
        x.lineTo(wx0 + ww * k / 4, by - h * 0.22);
        x.stroke();
      }
    }
    // のれん
    if (opt.noren) {
      x.fillStyle = opt.noren;
      x.fillRect(bx + w * 0.16, by - h * 0.66, w * 0.5, h * 0.3);
      x.strokeStyle = 'rgba(0,0,0,0.3)';
      x.lineWidth = 1.5;
      for (let k = 1; k < 3; k++) {
        x.beginPath();
        x.moveTo(bx + w * 0.16 + w * 0.5 * k / 3, by - h * 0.66);
        x.lineTo(bx + w * 0.16 + w * 0.5 * k / 3, by - h * 0.36);
        x.stroke();
      }
      if (opt.mark) {
        x.fillStyle = 'rgba(255,245,225,0.92)';
        x.font = 'bold 20px serif';
        x.textAlign = 'center';
        x.fillText(opt.mark, bx + w * 0.41, by - h * 0.47);
      }
    }
  }

  function tree(x, bx, by, s) {
    x.strokeStyle = '#33241589'; x.lineWidth = 7 * s;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + 3 * s, by - 30 * s); x.stroke();
    x.strokeStyle = '#3a2a1a'; x.lineWidth = 5 * s;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + 4 * s, by - 34 * s); x.stroke();
    for (let i = 0; i < 3; i++) {
      const cx = bx + 4 * s + (i - 1) * 15 * s;
      const cy = by - 42 * s - (i % 2) * 11 * s;
      x.fillStyle = '#24471f';
      x.beginPath(); x.arc(cx + 3 * s, cy + 3 * s, 18 * s, 0, 7); x.fill();
      x.fillStyle = '#2f5e33';
      x.beginPath(); x.arc(cx, cy, 17 * s, 0, 7); x.fill();
      x.fillStyle = '#3f7a42';
      x.beginPath(); x.arc(cx - 5 * s, cy - 6 * s, 10 * s, 0, 7); x.fill();
    }
  }

  function pine(x, bx, by, s) {
    x.strokeStyle = '#2e2015'; x.lineWidth = 6 * s;
    x.beginPath();
    x.moveTo(bx, by);
    x.quadraticCurveTo(bx + 8 * s, by - 30 * s, bx - 2 * s, by - 52 * s);
    x.stroke();
    x.fillStyle = '#1d3d24';
    for (let i = 0; i < 3; i++) {
      const cy = by - 34 * s - i * 15 * s;
      const cw = (34 - i * 8) * s;
      x.beginPath();
      x.ellipse(bx - 2 * s + (i % 2 ? 6 : -6) * s, cy, cw, 8 * s, -0.08, 0, 7);
      x.fill();
    }
  }

  function lantern(x, bx, by, s) {
    s = s || 1;
    x.strokeStyle = '#3a291b'; x.lineWidth = 5 * s;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by - 80 * s); x.stroke();
    x.strokeStyle = '#3a291b'; x.lineWidth = 3 * s;
    x.beginPath(); x.moveTo(bx, by - 80 * s); x.lineTo(bx + 14 * s, by - 80 * s); x.stroke();
    // 灯りのグロー
    const g = x.createRadialGradient(bx + 14 * s, by - 92 * s, 2, bx + 14 * s, by - 92 * s, 34 * s);
    g.addColorStop(0, 'rgba(255,190,90,0.5)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    x.fillStyle = g;
    x.fillRect(bx - 24 * s, by - 130 * s, 76 * s, 76 * s);
    // 提灯本体
    x.fillStyle = '#ff9a3d';
    x.beginPath(); x.ellipse(bx + 14 * s, by - 92 * s, 10 * s, 14 * s, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(120,40,20,0.5)'; x.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      x.beginPath();
      x.ellipse(bx + 14 * s, by - 92 * s + i * 4 * s, 10 * s, 3 * s, 0, 0, 7);
      x.stroke();
    }
  }

  // 幟(のぼり旗)
  function banner(x, bx, by, color, s) {
    s = s || 1;
    x.strokeStyle = '#4a3524'; x.lineWidth = 3 * s;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by - 96 * s); x.stroke();
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(bx + 2 * s, by - 94 * s);
    x.lineTo(bx + 22 * s, by - 94 * s);
    x.quadraticCurveTo(bx + 24 * s, by - 60 * s, bx + 20 * s, by - 26 * s);
    x.lineTo(bx + 2 * s, by - 28 * s);
    x.closePath(); x.fill();
    // 家紋(九曜風)
    x.fillStyle = 'rgba(240,235,220,0.9)';
    x.beginPath(); x.arc(bx + 12 * s, by - 74 * s, 5 * s, 0, 7); x.fill();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      x.beginPath();
      x.arc(bx + 12 * s + Math.cos(a) * 9 * s, by - 74 * s + Math.sin(a) * 9 * s, 2.2 * s, 0, 7);
      x.fill();
    }
  }

  // 木柵
  function fence(x, bx, by, w) {
    x.strokeStyle = '#4a3a28'; x.lineWidth = 4;
    for (let i = 0; i <= w; i += 26) {
      x.beginPath(); x.moveTo(bx + i, by); x.lineTo(bx + i, by - 34); x.stroke();
    }
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(bx, by - 26); x.lineTo(bx + w, by - 26); x.stroke();
    x.beginPath(); x.moveTo(bx, by - 10); x.lineTo(bx + w, by - 10); x.stroke();
  }

  // 小倉城天守
  function castleTower(x, cx, by, s) {
    const floors = 4;
    let w = 200 * s, y = by;
    for (let f = 0; f < floors; f++) {
      const h = (48 - f * 4) * s;
      const wg = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      if (f === 0) { wg.addColorStop(0, '#6a6d78'); wg.addColorStop(0.5, '#8a8d99'); wg.addColorStop(1, '#5d606c'); }
      else { wg.addColorStop(0, '#c9c4b8'); wg.addColorStop(0.45, '#eee9de'); wg.addColorStop(1, '#b6b0a2'); }
      x.fillStyle = wg;
      x.fillRect(cx - w / 2, y - h, w, h);
      x.fillStyle = 'rgba(25,25,35,0.85)';
      const n = Math.max(2, Math.floor(w / (38 * s)));
      for (let i = 0; i < n; i++) {
        x.fillRect(cx - w / 2 + (i + 0.5) * (w / n) - 7 * s, y - h + 13 * s, 14 * s, h * 0.4);
      }
      y -= h;
      // 屋根(反り+陰影)
      const rg = x.createLinearGradient(0, y - 22 * s, 0, y);
      rg.addColorStop(0, '#37634c'); rg.addColorStop(1, '#1d3b2c');
      x.fillStyle = rg;
      x.beginPath();
      x.moveTo(cx - w / 2 - 24 * s, y + 2 * s);
      x.quadraticCurveTo(cx - w / 2, y - 10 * s, cx, y - 15 * s);
      x.quadraticCurveTo(cx + w / 2, y - 10 * s, cx + w / 2 + 24 * s, y + 2 * s);
      x.lineTo(cx + w / 2 - 8 * s, y - 21 * s);
      x.lineTo(cx - w / 2 + 8 * s, y - 21 * s);
      x.closePath(); x.fill();
      y -= 19 * s;
      w *= 0.78;
    }
    x.fillStyle = '#2a5240';
    x.beginPath();
    x.moveTo(cx - w / 2 - 20 * s, y);
    x.quadraticCurveTo(cx, y - 46 * s, cx + w / 2 + 20 * s, y);
    x.closePath(); x.fill();
    // 鯱
    x.fillStyle = '#e0c052';
    x.beginPath();
    x.moveTo(cx - w / 2 + 2 * s, y - 34 * s);
    x.quadraticCurveTo(cx - w / 2 - 4 * s, y - 48 * s, cx - w / 2 + 8 * s, y - 46 * s);
    x.lineTo(cx - w / 2 + 9 * s, y - 34 * s);
    x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(cx + w / 2 - 2 * s, y - 34 * s);
    x.quadraticCurveTo(cx + w / 2 + 4 * s, y - 48 * s, cx + w / 2 - 8 * s, y - 46 * s);
    x.lineTo(cx + w / 2 - 9 * s, y - 34 * s);
    x.closePath(); x.fill();
  }

  /* ================= 遠景レイヤー ================= */

  function makeMihaginoFar() {
    const c = cv(1920, 540), x = c.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, BASE);
    sky.addColorStop(0, '#26355f');
    sky.addColorStop(0.45, '#6f5480');
    sky.addColorStop(0.8, '#c97e5e');
    sky.addColorStop(1, '#e9a468');
    x.fillStyle = sky; x.fillRect(0, 0, 1920, BASE + 4);
    // 夕日
    const sg = x.createRadialGradient(1380, 265, 10, 1380, 265, 130);
    sg.addColorStop(0, 'rgba(255,225,150,0.9)');
    sg.addColorStop(0.35, 'rgba(255,190,110,0.4)');
    sg.addColorStop(1, 'rgba(255,190,110,0)');
    x.fillStyle = sg;
    x.fillRect(1230, 115, 300, 300);
    x.fillStyle = '#ffd98a';
    x.beginPath(); x.arc(1380, 265, 44, 0, 7); x.fill();
    clouds(x, 'rgba(90,60,90,0.35)', 5);
    clouds(x, 'rgba(255,170,120,0.18)', 3);
    // 山なみ2層
    hills(x, 330, '#453a5e', 95, 1.3);
    hills(x, 338, '#332c48', 55, 4.1);
    haze(x, BASE + 4, 'rgba(226,146,95,0.35)');
    // 鳥
    x.strokeStyle = 'rgba(30,20,35,0.8)'; x.lineWidth = 2;
    for (const [bx, by] of [[500, 130], [540, 148], [1120, 100], [1160, 116], [1090, 122]]) {
      x.beginPath();
      x.moveTo(bx - 8, by); x.quadraticCurveTo(bx - 3, by - 6, bx, by);
      x.quadraticCurveTo(bx + 3, by - 6, bx + 8, by);
      x.stroke();
    }
    x.fillStyle = '#3a3040';
    x.fillRect(0, BASE, 1920, 540 - BASE);
    return c;
  }

  function makeMihaginoNear() {
    const c = cv(1920, 540), x = c.getContext('2d');
    // まばらな家並みと木々(街の入り口)
    machiya(x, 60, BASE, 170, 105, '#6b5340', '#54412f', '#3d3129');
    machiya(x, 640, BASE, 140, 90, '#5f4936', '#4a3828', '#38302a');
    machiya(x, 1060, BASE, 190, 118, '#6b5340', '#52402e', '#3d3129', { noren: '#7a3030', mark: '茶' });
    machiya(x, 1620, BASE, 150, 96, '#5f4936', '#4a3828', '#352d26');
    fence(x, 280, BASE, 220);
    fence(x, 1300, BASE, 180);
    tree(x, 330, BASE + 2, 1.4);
    tree(x, 560, BASE + 2, 1.0);
    tree(x, 880, BASE + 2, 1.6);
    tree(x, 1290, BASE + 2, 1.1);
    tree(x, 1540, BASE + 2, 1.5);
    tree(x, 1850, BASE + 2, 1.2);
    // 道標
    x.fillStyle = '#3a2c1c'; x.fillRect(408, BASE - 86, 12, 86);
    x.fillStyle = '#6b5340'; x.fillRect(368, BASE - 88, 92, 30);
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2;
    x.strokeRect(368, BASE - 88, 92, 30);
    x.fillStyle = '#f0e0c0'; x.font = 'bold 19px serif'; x.textAlign = 'center';
    x.fillText('三萩野', 414, BASE - 66);
    // 米俵
    x.fillStyle = '#a08a58';
    for (const [bx, s] of [[755, 1], [782, 1], [768, 0.9]]) {
      x.beginPath();
      x.ellipse(bx, BASE - 12 * s - (s < 1 ? 22 : 0), 20 * s, 12 * s, 0, 0, 7);
      x.fill();
    }
    x.strokeStyle = 'rgba(60,45,20,0.6)'; x.lineWidth = 2;
    for (const [bx, s] of [[755, 1], [782, 1], [768, 0.9]]) {
      x.beginPath();
      x.ellipse(bx, BASE - 12 * s - (s < 1 ? 22 : 0), 20 * s, 12 * s, 0, 0, 7);
      x.stroke();
    }
    return c;
  }

  function makeCityFar() {
    const c = cv(1920, 540), x = c.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, BASE);
    sky.addColorStop(0, '#10162e');
    sky.addColorStop(0.6, '#232048');
    sky.addColorStop(1, '#413357');
    x.fillStyle = sky; x.fillRect(0, 0, 1920, BASE + 4);
    // 星
    x.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      x.globalAlpha = 0.25 + (i * 37 % 10) / 13;
      const sx = (i * 211) % 1920, sy = (i * 97) % 250;
      x.fillRect(sx, sy, 2, 2);
    }
    x.globalAlpha = 1;
    // 月
    const mg = x.createRadialGradient(330, 95, 5, 330, 95, 90);
    mg.addColorStop(0, 'rgba(245,237,210,0.55)');
    mg.addColorStop(1, 'rgba(245,237,210,0)');
    x.fillStyle = mg; x.fillRect(240, 5, 180, 180);
    x.fillStyle = '#f5edd2';
    x.beginPath(); x.arc(330, 95, 36, 0, 7); x.fill();
    x.fillStyle = '#181d3a';
    x.beginPath(); x.arc(345, 86, 31, 0, 7); x.fill();
    clouds(x, 'rgba(25,25,55,0.5)', 4);
    // 遠くの屋根並みシルエット
    x.fillStyle = '#191731';
    x.beginPath();
    x.moveTo(0, 320);
    for (let i = 0; i <= 24; i++) {
      const bx = i * 80;
      x.lineTo(bx + 20, 296 - (i % 3) * 12);
      x.lineTo(bx + 60, 296 - (i % 3) * 12);
      x.lineTo(bx + 80, 322);
    }
    x.lineTo(1920, 540); x.lineTo(0, 540);
    x.closePath(); x.fill();
    haze(x, BASE + 4, 'rgba(60,50,90,0.4)');
    x.fillStyle = '#241f38';
    x.fillRect(0, BASE, 1920, 540 - BASE);
    return c;
  }

  function makeCityNear() {
    const c = cv(1920, 540), x = c.getContext('2d');
    // 連なる商店(のれんと提灯)
    const shops = [
      [0,    195, 128, '#8e3030', '酒'],
      [215,  180, 112, null, null],
      [415,  200, 135, '#2f4e7e', '茶'],
      [635,  185, 118, null, null],
      [840,  205, 140, '#3f6d3a', '飯'],
      [1065, 180, 112, '#8e3030', '呉'],
      [1265, 195, 130, null, null],
      [1480, 200, 138, '#2f4e7e', '薬'],
      [1700, 185, 118, null, null],
    ];
    for (let i = 0; i < shops.length; i++) {
      const [bx, w, h, noren, mark] = shops[i];
      machiya(x, bx, BASE, w, h,
        i % 2 ? '#5d4a38' : '#54432f',
        i % 2 ? '#463626' : '#3e3022',
        '#2b2620',
        noren ? { noren, mark } : {});
    }
    for (let i = 0; i < 8; i++) lantern(x, 130 + i * 245, BASE, 1);
    // 樽と木箱
    x.fillStyle = '#5a4632';
    x.fillRect(560, BASE - 34, 30, 34);
    x.fillRect(594, BASE - 24, 26, 24);
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2;
    x.strokeRect(560, BASE - 34, 30, 34);
    x.strokeRect(594, BASE - 24, 26, 24);
    for (const bx of [1180, 1210]) {
      x.fillStyle = '#6a5138';
      x.beginPath(); x.ellipse(bx, BASE - 20, 15, 20, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.45)';
      x.beginPath(); x.ellipse(bx, BASE - 20, 15, 20, 0, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(bx - 15, BASE - 26); x.lineTo(bx + 15, BASE - 26); x.stroke();
      x.beginPath(); x.moveTo(bx - 15, BASE - 14); x.lineTo(bx + 15, BASE - 14); x.stroke();
    }
    return c;
  }

  function makeCastleFar() {
    const c = cv(1920, 540), x = c.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, BASE);
    sky.addColorStop(0, '#0c102c');
    sky.addColorStop(0.55, '#2c2254');
    sky.addColorStop(0.85, '#63395c');
    sky.addColorStop(1, '#8a4a60');
    x.fillStyle = sky; x.fillRect(0, 0, 1920, BASE + 4);
    x.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      x.globalAlpha = 0.2 + (i * 53 % 10) / 16;
      x.fillRect((i * 307) % 1920, (i * 131) % 190, 2, 2);
    }
    x.globalAlpha = 1;
    clouds(x, 'rgba(40,30,70,0.45)', 4);
    hills(x, 328, '#1d1a38', 75, 2.7);
    // 天守(主役)と脇櫓
    castleTower(x, 700, 336, 1.15);
    castleTower(x, 1500, 336, 0.62);
    castleTower(x, 150, 336, 0.5);
    haze(x, BASE + 4, 'rgba(60,40,70,0.45)');
    x.fillStyle = '#241c30';
    x.fillRect(0, BASE, 1920, 540 - BASE);
    return c;
  }

  function makeCastleNear() {
    const c = cv(1920, 540), x = c.getContext('2d');
    // 石垣+白塀(練塀)が続く
    for (let seg = 0; seg < 6; seg++) {
      const bx = seg * 320;
      // 石垣
      const sg = x.createLinearGradient(0, BASE - 58, 0, BASE);
      sg.addColorStop(0, '#4c505e'); sg.addColorStop(1, '#33363f');
      x.fillStyle = sg;
      x.fillRect(bx, BASE - 58, 320, 58);
      x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        x.strokeRect(bx + (i * 56 + (seg % 2) * 28) % 320, BASE - 58 + (i % 2) * 29, 56, 29);
      }
      // 白塀
      const wg = x.createLinearGradient(0, BASE - 118, 0, BASE - 58);
      wg.addColorStop(0, '#ded8ca'); wg.addColorStop(1, '#b5af9f');
      x.fillStyle = wg;
      x.fillRect(bx + 6, BASE - 118, 308, 60);
      // 瓦の笠木
      x.fillStyle = '#2e3538';
      x.beginPath();
      x.moveTo(bx - 4, BASE - 118);
      x.lineTo(bx + 160, BASE - 130);
      x.lineTo(bx + 324, BASE - 118);
      x.lineTo(bx + 324, BASE - 112);
      x.lineTo(bx - 4, BASE - 112);
      x.closePath(); x.fill();
      // 狭間(のぞき窓)
      x.fillStyle = 'rgba(30,30,40,0.8)';
      for (let i = 0; i < 3; i++) {
        x.fillRect(bx + 60 + i * 90, BASE - 100, 14, 18);
      }
    }
    // 門
    const gx = 940;
    x.fillStyle = '#3a2c20';
    x.fillRect(gx, BASE - 150, 18, 150);
    x.fillRect(gx + 124, BASE - 150, 18, 150);
    const gg = x.createLinearGradient(0, BASE - 190, 0, BASE - 150);
    gg.addColorStop(0, '#37634c'); gg.addColorStop(1, '#1d3b2c');
    x.fillStyle = gg;
    x.beginPath();
    x.moveTo(gx - 30, BASE - 148);
    x.quadraticCurveTo(gx + 71, BASE - 200, gx + 172, BASE - 148);
    x.lineTo(gx + 160, BASE - 168);
    x.lineTo(gx - 18, BASE - 168);
    x.closePath(); x.fill();
    x.fillStyle = '#241a12';
    x.fillRect(gx + 18, BASE - 148, 106, 148);
    x.strokeStyle = 'rgba(200,170,90,0.5)'; x.lineWidth = 2;
    x.strokeRect(gx + 30, BASE - 130, 82, 130);
    // 幟と松
    banner(x, 260, BASE, '#26426e', 1.1);
    banner(x, 640, BASE, '#26426e', 1);
    banner(x, 1320, BASE, '#26426e', 1.1);
    banner(x, 1700, BASE, '#26426e', 1);
    pine(x, 480, BASE + 2, 1.5);
    pine(x, 1180, BASE + 2, 1.3);
    pine(x, 1560, BASE + 2, 1.6);
    return c;
  }

  /* ---- 紫川(昼の川沿い) ---- */
  function makeRiverFar() {
    const c = cv(1920, 540), x = c.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, BASE);
    sky.addColorStop(0, '#6fb0d8');
    sky.addColorStop(0.6, '#a8d2e8');
    sky.addColorStop(1, '#d8ecf2');
    x.fillStyle = sky; x.fillRect(0, 0, 1920, BASE + 4);
    // 太陽
    const sg = x.createRadialGradient(1500, 110, 8, 1500, 110, 90);
    sg.addColorStop(0, 'rgba(255,252,230,0.95)');
    sg.addColorStop(0.4, 'rgba(255,250,220,0.35)');
    sg.addColorStop(1, 'rgba(255,250,220,0)');
    x.fillStyle = sg; x.fillRect(1400, 10, 200, 200);
    clouds(x, 'rgba(255,255,255,0.75)', 5);
    clouds(x, 'rgba(255,255,255,0.4)', 3);
    // 緑の山なみ
    hills(x, 326, '#55794a', 90, 0.8);
    hills(x, 334, '#3f6039', 55, 3.3);
    haze(x, BASE + 4, 'rgba(210,232,225,0.5)');
    // 鳥
    x.strokeStyle = 'rgba(60,70,80,0.7)'; x.lineWidth = 2;
    for (const [bx, by] of [[420, 100], [470, 88], [1150, 140], [1190, 128]]) {
      x.beginPath();
      x.moveTo(bx - 8, by); x.quadraticCurveTo(bx - 3, by - 6, bx, by);
      x.quadraticCurveTo(bx + 3, by - 6, bx + 8, by);
      x.stroke();
    }
    x.fillStyle = '#4a6a52';
    x.fillRect(0, BASE, 1920, 540 - BASE);
    return c;
  }

  function makeRiverNear() {
    const c = cv(1920, 540), x = c.getContext('2d');
    // 対岸の草地
    x.fillStyle = '#5d7a4a';
    x.fillRect(0, 196, 1920, 26);
    x.fillStyle = '#4c663c';
    for (let i = 0; i < 96; i++) {
      x.fillRect(i * 20 + (i % 3) * 4, 196 + (i % 2) * 4, 3, 10);
    }
    // 川面
    const wg = x.createLinearGradient(0, 218, 0, BASE);
    wg.addColorStop(0, '#4a7a92');
    wg.addColorStop(0.6, '#6aa2b8');
    wg.addColorStop(1, '#8fc2d2');
    x.fillStyle = wg;
    x.fillRect(0, 218, 1920, BASE - 218);
    // 流れの筋
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    x.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const wy = 232 + (i * 47) % (BASE - 250);
      const wx = (i * 331) % 1800;
      x.beginPath();
      x.moveTo(wx, wy);
      x.quadraticCurveTo(wx + 45, wy - 3, wx + 90, wy);
      x.stroke();
    }
    // きらめき
    x.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
      x.globalAlpha = 0.3 + (i * 37 % 10) / 16;
      x.fillRect((i * 211) % 1920, 230 + (i * 83) % (BASE - 250), 3, 2);
    }
    x.globalAlpha = 1;
    // 手前の岸辺:葦と紫草
    for (let i = 0; i < 48; i++) {
      const bx = i * 40 + (i % 5) * 7;
      x.strokeStyle = i % 3 ? '#4e6e3a' : '#5d7f45';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(bx, BASE + 2);
      x.quadraticCurveTo(bx + 4, BASE - 20, bx + 2 + (i % 3) * 3, BASE - 34 - (i % 4) * 5);
      x.stroke();
    }
    // 紫草(むらさき)の花
    for (let i = 0; i < 14; i++) {
      const bx = 90 + i * 140 + (i % 3) * 30;
      x.strokeStyle = '#4e6e3a'; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(bx, BASE + 2); x.lineTo(bx + 3, BASE - 26); x.stroke();
      x.fillStyle = '#9a6ac9';
      for (let k = 0; k < 5; k++) {
        const a = k * 1.26;
        x.beginPath();
        x.arc(bx + 3 + Math.cos(a) * 5, BASE - 28 + Math.sin(a) * 5, 3.2, 0, 7);
        x.fill();
      }
      x.fillStyle = '#e8d8f8';
      x.beginPath(); x.arc(bx + 3, BASE - 28, 2.2, 0, 7); x.fill();
    }
    // 岩
    for (const [bx, s] of [[350, 1.2], [820, 0.9], [1400, 1.4], [1750, 0.8]]) {
      x.fillStyle = '#6e7278';
      x.beginPath(); x.ellipse(bx, BASE - 4, 26 * s, 16 * s, 0, Math.PI, 0); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.18)';
      x.beginPath(); x.ellipse(bx - 6 * s, BASE - 12 * s, 12 * s, 6 * s, -0.3, 0, 7); x.fill();
    }
    // 杭と小さな桟橋
    x.fillStyle = '#5a4630';
    for (const bx of [600, 640, 1180, 1220]) {
      x.fillRect(bx, 280, 9, BASE - 280);
    }
    x.fillRect(590, 274, 70, 10);
    x.fillRect(1170, 274, 70, 10);
    return c;
  }

  /* ---- 商店の中(固定アリーナ) ---- */
  function makeShopIn() {
    const c = cv(1920, 540), x = c.getContext('2d');
    // 板壁
    const wall = x.createLinearGradient(0, 0, 0, BASE);
    wall.addColorStop(0, '#3e3020');
    wall.addColorStop(1, '#54432c');
    x.fillStyle = wall; x.fillRect(0, 0, 1920, BASE + 4);
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      x.beginPath(); x.moveTo(i * 50, 0); x.lineTo(i * 50, BASE); x.stroke();
    }
    // 梁
    x.fillStyle = '#2c2114';
    x.fillRect(0, 90, 1920, 26);
    x.fillRect(0, 240, 1920, 18);
    // 提灯の明かり
    for (const bx of [300, 960, 1620]) {
      const lg = x.createRadialGradient(bx, 150, 10, bx, 150, 190);
      lg.addColorStop(0, 'rgba(255,190,90,0.30)');
      lg.addColorStop(1, 'rgba(255,190,90,0)');
      x.fillStyle = lg;
      x.fillRect(bx - 190, 0, 380, 380);
      x.fillStyle = '#ff9a3d';
      x.beginPath(); x.ellipse(bx, 140, 16, 22, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(120,40,20,0.5)'; x.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        x.beginPath(); x.ellipse(bx, 140 + i * 7, 16, 5, 0, 0, 7); x.stroke();
      }
      x.strokeStyle = '#3a291b'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(bx, 90); x.lineTo(bx, 118); x.stroke();
    }
    // 棚と商品
    for (let s = 0; s < 5; s++) {
      const bx = 120 + s * 380;
      x.fillStyle = '#2c2114';
      x.fillRect(bx, 128, 260, 104);
      x.fillStyle = '#4a3a24';
      x.fillRect(bx + 6, 134, 248, 42);
      x.fillRect(bx + 6, 184, 248, 42);
      // 壺・徳利・箱
      for (let i = 0; i < 5; i++) {
        const ix = bx + 24 + i * 48;
        if ((i + s) % 3 === 0) {
          x.fillStyle = '#7a5a3a';
          x.beginPath(); x.ellipse(ix, 166, 12, 14, 0, 0, 7); x.fill();
          x.fillRect(ix - 4, 146, 8, 8);
        } else if ((i + s) % 3 === 1) {
          x.fillStyle = '#5e6e5a';
          x.beginPath(); x.ellipse(ix, 168, 14, 11, 0, 0, 7); x.fill();
        } else {
          x.fillStyle = '#6a5138';
          x.fillRect(ix - 12, 152, 24, 22);
        }
        // 下段は箱と俵
        if (i % 2 === 0) {
          x.fillStyle = '#6a5138';
          x.fillRect(ix - 13, 200, 26, 24);
          x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1.5;
          x.strokeRect(ix - 13, 200, 26, 24);
        } else {
          x.fillStyle = '#a08a58';
          x.beginPath(); x.ellipse(ix, 214, 15, 10, 0, 0, 7); x.fill();
        }
      }
    }
    // のれん(入口)
    x.fillStyle = '#8e3030';
    x.fillRect(880, 92, 160, 90);
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      x.beginPath(); x.moveTo(880 + i * 40, 92); x.lineTo(880 + i * 40, 182); x.stroke();
    }
    x.fillStyle = 'rgba(255,245,225,0.9)';
    x.font = 'bold 30px serif'; x.textAlign = 'center';
    x.fillText('商', 960, 148);
    // 床際の樽と米俵
    for (const [bx, s] of [[80, 1], [1840, 1.1], [700, 0.9]]) {
      x.fillStyle = '#6a5138';
      x.beginPath(); x.ellipse(bx, BASE - 26 * s, 20 * s, 27 * s, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 2;
      x.beginPath(); x.ellipse(bx, BASE - 26 * s, 20 * s, 27 * s, 0, 0, 7); x.stroke();
      x.beginPath(); x.moveTo(bx - 20 * s, BASE - 34 * s); x.lineTo(bx + 20 * s, BASE - 34 * s); x.stroke();
      x.beginPath(); x.moveTo(bx - 20 * s, BASE - 18 * s); x.lineTo(bx + 20 * s, BASE - 18 * s); x.stroke();
    }
    for (const bx of [1350, 1395]) {
      x.fillStyle = '#a08a58';
      x.beginPath(); x.ellipse(bx, BASE - 14, 22, 13, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(60,45,20,0.6)'; x.lineWidth = 2;
      x.beginPath(); x.ellipse(bx, BASE - 14, 22, 13, 0, 0, 7); x.stroke();
    }
    return c;
  }

  /* ---- 地面テクスチャ(土・草・石・板の質感) ---- */
  function makeGroundTex(style) {
    const c = cv(320, 160), x = c.getContext('2d');
    // 細かい斑点(土の粒・照りのムラ)
    for (let i = 0; i < 950; i++) {
      const px = Math.random() * 320, py = Math.random() * 160;
      const d = Math.random();
      x.fillStyle = d < 0.55 ? `rgba(10,5,0,${0.05 + Math.random() * 0.09})`
                             : `rgba(255,250,235,${0.03 + Math.random() * 0.06})`;
      const s = 1 + Math.random() * 2.4;
      x.fillRect(px, py, s, s * 0.7);
    }
    if (style === 'dirt' || style === 'grass') {
      // 小石
      for (let i = 0; i < 26; i++) {
        const px = Math.random() * 320, py = Math.random() * 160;
        const s = 2 + Math.random() * 4;
        x.fillStyle = 'rgba(30,22,14,0.25)';
        x.beginPath(); x.ellipse(px + 1, py + 1, s, s * 0.6, 0, 0, 7); x.fill();
        x.fillStyle = `rgba(${150 + Math.random() * 40 | 0},${135 + Math.random() * 30 | 0},${115 + Math.random() * 25 | 0},0.35)`;
        x.beginPath(); x.ellipse(px, py, s, s * 0.6, 0, 0, 7); x.fill();
      }
      // 土の色ムラ
      for (let i = 0; i < 18; i++) {
        x.fillStyle = `rgba(${40 + Math.random() * 30 | 0},${28 + Math.random() * 20 | 0},${12 + Math.random() * 10 | 0},0.10)`;
        x.beginPath();
        x.ellipse(Math.random() * 320, Math.random() * 160, 14 + Math.random() * 30, 6 + Math.random() * 12, Math.random(), 0, 7);
        x.fill();
      }
    }
    if (style === 'grass') {
      // 草の茂み
      for (let i = 0; i < 90; i++) {
        const px = Math.random() * 320, py = Math.random() * 160;
        x.strokeStyle = `rgba(${60 + Math.random() * 40 | 0},${110 + Math.random() * 50 | 0},${45 + Math.random() * 25 | 0},0.5)`;
        x.lineWidth = 1.6;
        for (let k = -1; k <= 1; k++) {
          x.beginPath();
          x.moveTo(px, py);
          x.quadraticCurveTo(px + k * 2, py - 4, px + k * 3.5, py - 6 - Math.random() * 3);
          x.stroke();
        }
      }
    }
    if (style === 'stone') {
      // 石畳の割れ・欠け
      for (let i = 0; i < 30; i++) {
        const px = Math.random() * 320, py = Math.random() * 160;
        x.strokeStyle = 'rgba(15,15,22,0.28)';
        x.lineWidth = 1.4;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + (Math.random() - 0.5) * 22, py + (Math.random() - 0.5) * 14);
        x.lineTo(px + (Math.random() - 0.5) * 30, py + (Math.random() - 0.5) * 20);
        x.stroke();
      }
    }
    if (style === 'wood') {
      // 板の木目
      for (let i = 0; i < 20; i++) {
        const py = Math.random() * 160;
        x.strokeStyle = `rgba(40,25,10,${0.12 + Math.random() * 0.12})`;
        x.lineWidth = 1.3;
        x.beginPath();
        x.moveTo(0, py);
        x.quadraticCurveTo(160, py + (Math.random() - 0.5) * 10, 320, py + (Math.random() - 0.5) * 6);
        x.stroke();
      }
      for (let i = 0; i < 10; i++) {
        // 節
        const px = Math.random() * 320, py = Math.random() * 160;
        x.strokeStyle = 'rgba(40,25,10,0.3)'; x.lineWidth = 1.2;
        x.beginPath(); x.ellipse(px, py, 3 + Math.random() * 3, 2, 0, 0, 7); x.stroke();
      }
    }
    return c;
  }

  /* ================= アイテム ================= */

  function makeCola() {
    const c = cv(48, 96), x = c.getContext('2d');
    x.translate(24, 0);
    x.fillStyle = '#3d2113';
    x.beginPath();
    x.moveTo(-7, 6); x.lineTo(7, 6);
    x.lineTo(7, 26); x.quadraticCurveTo(17, 34, 17, 48);
    x.lineTo(17, 86); x.quadraticCurveTo(17, 92, 10, 92);
    x.lineTo(-10, 92); x.quadraticCurveTo(-17, 92, -17, 86);
    x.lineTo(-17, 48); x.quadraticCurveTo(-17, 34, -7, 26);
    x.closePath(); x.fill();
    x.fillStyle = '#c9a227'; x.fillRect(-8, 0, 16, 8);
    x.fillStyle = '#c0242b'; x.fillRect(-17, 52, 34, 26);
    x.fillStyle = '#fff';
    x.font = 'bold 11px serif'; x.textAlign = 'center';
    x.fillText('小倉', 0, 63);
    x.fillText('コーラ', 0, 75);
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.fillRect(-13, 30, 5, 56);
    return c;
  }

  function makeColaLogo() {
    const c = cv(400, 160), x = c.getContext('2d');
    x.fillStyle = '#c0242b';
    x.beginPath();
    if (x.roundRect) x.roundRect(10, 20, 380, 120, 18); else x.rect(10, 20, 380, 120);
    x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 4;
    x.beginPath();
    if (x.roundRect) x.roundRect(20, 30, 360, 100, 12); else x.rect(20, 30, 360, 100);
    x.stroke();
    x.fillStyle = '#fff';
    x.font = 'bold 56px "Hiragino Mincho ProN", serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('小倉コーラ', 200, 84);
    return c;
  }

  function makeNiku() {
    const c = cv(48, 48), x = c.getContext('2d');
    x.translate(24, 26);
    x.fillStyle = '#2e4d8e';
    x.beginPath(); x.moveTo(-20, 0); x.lineTo(20, 0); x.lineTo(13, 18); x.lineTo(-13, 18);
    x.closePath(); x.fill();
    x.fillStyle = '#f2e6c8';
    x.beginPath(); x.ellipse(0, -2, 20, 8, 0, 0, 7); x.fill();
    x.fillStyle = '#8a4b22';
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.ellipse(-11 + i * 7.5, -5 - (i % 2) * 3, 6, 4, 0.4, 0, 7);
      x.fill();
    }
    x.fillStyle = '#4f9e46';
    x.fillRect(-6, -11, 4, 3); x.fillRect(3, -8, 4, 3);
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-6, -14); x.quadraticCurveTo(-10, -19, -6, -24); x.stroke();
    x.beginPath(); x.moveTo(6, -14); x.quadraticCurveTo(2, -19, 6, -24); x.stroke();
    return c;
  }

  function makeTea() {
    const c = cv(48, 48), x = c.getContext('2d');
    x.translate(24, 24);
    x.fillStyle = '#3b3b45';
    x.beginPath(); x.moveTo(-14, -8); x.lineTo(14, -8); x.lineTo(11, 18); x.lineTo(-11, 18);
    x.closePath(); x.fill();
    x.fillStyle = '#5e9e3f';
    x.beginPath(); x.ellipse(0, -8, 14, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#7fc25c';
    x.beginPath(); x.ellipse(0, -8, 10, 3.4, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-4, -14); x.quadraticCurveTo(-8, -19, -4, -24); x.stroke();
    x.beginPath(); x.moveTo(5, -14); x.quadraticCurveTo(1, -19, 5, -24); x.stroke();
    return c;
  }

  /* ================= 読み込み ================= */

  function load(done) {
    images.mihagino_far = makeMihaginoFar();
    images.mihagino_near = makeMihaginoNear();
    images.city_far = makeCityFar();
    images.city_near = makeCityNear();
    images.castle_far = makeCastleFar();
    images.castle_near = makeCastleNear();
    images.river_far = makeRiverFar();
    images.river_near = makeRiverNear();
    images.shopin_far = makeShopIn();
    images.tex_mihagino = makeGroundTex('dirt');
    images.tex_city = makeGroundTex('stone');
    images.tex_castle = makeGroundTex('stone');
    images.tex_river = makeGroundTex('grass');
    images.tex_shopin = makeGroundTex('wood');
    images.cola = makeCola();
    images.cola_logo = makeColaLogo();
    images.niku = makeNiku();
    images.tea = makeTea();

    const spriteNames = Object.keys(SPRITE_DEFS);
    let pending = external.length + spriteNames.length;
    if (pending === 0) return done();
    external.forEach(name => {
      const img = new Image();
      img.onload = () => { images[name] = img; overridden[name] = true; if (--pending === 0) done(); };
      img.onerror = () => { if (--pending === 0) done(); };
      img.src = 'assets/img/' + name + '.png';
    });
    // スプライトシート(あれば読み込む)
    spriteNames.forEach(name => {
      const img = new Image();
      img.onload = () => { sprites[name] = img; if (--pending === 0) done(); };
      img.onerror = () => { if (--pending === 0) done(); };
      img.src = 'assets/img/sprites/' + name + '.png';
    });
  }

  return {
    load,
    img: n => images[n],
    isExternal: n => !!overridden[n],
    sprite: n => sprites[n] || null,
    spriteDef: n => SPRITE_DEFS[n] || null,
  };
})();
