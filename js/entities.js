/* =========================================================
 * entities.js — キャラクター描画 & エンティティロジック
 * 座標系: x=進行方向(ワールド), z=奥行き(0手前..110奥), y=高さ(0=地面)
 * ========================================================= */
const Z_MIN = 6, Z_MAX = 110;
const GROUND_Y = 340, Z_SCALE = 1.7;
function groundY(z) { return GROUND_Y + z * Z_SCALE; }
// 奥行きによる見た目の縮尺(控えめ)
function depthScale(z) { return 0.93 + (z / Z_MAX) * 0.15; }

/* ---------- スプライトシート描画 ----------
 * assets/img/sprites/<name>.png があれば本物の絵で描画する。
 * 呼び出し側で translate(足元) と scale(facing*ds, ds) 済みの前提。
 * targetH = ゲーム内でのキャラの高さ(px)。
 */
function drawFromSheet(x, name, anim, frame, targetH) {
  const def = Assets.spriteDef(name);
  const img = Assets.sprite(name);
  if (!def || !img) return false;
  const rows = Object.keys(def.anims);
  let row = rows.indexOf(anim);
  if (row < 0) { row = 0; anim = rows[0]; }
  const n = def.anims[anim];
  const f = Math.max(0, Math.min(n - 1, frame | 0));
  const k = targetH / def.charH;
  x.imageSmoothingEnabled = false; // ドット絵をくっきり
  x.drawImage(img,
    f * def.fw, row * def.fh, def.fw, def.fh,
    -def.fw * k / 2, -def.feetY * k, def.fw * k, def.fh * k);
  x.imageSmoothingEnabled = true;
  return true;
}

/* ---------- ピクセルアート化パス ----------
 * キャラを低解像度で描き、減色+輪郭線+ドット拡大して
 * 90年代アーケードのドット絵の質感に変換する。
 */
const PIX_RES = 0.5; // 1ドット=2px相当
const _pxc = document.createElement('canvas');
const _pxx = _pxc.getContext('2d', { willReadFrequently: true });

function posterizeOutline(cx, w, h) {
  const id = cx.getImageData(0, 0, w, h);
  const d = id.data;
  const q = 36;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 70) { d[i + 3] = 0; continue; }
    d[i]     = Math.min(255, Math.round(d[i] / q) * q + 6);
    d[i + 1] = Math.min(255, Math.round(d[i + 1] / q) * q + 6);
    d[i + 2] = Math.min(255, Math.round(d[i + 2] / q) * q + 6);
    d[i + 3] = 255;
  }
  const stride = w * 4;
  for (let yy = 1; yy < h - 1; yy++) {
    for (let xx = 1; xx < w - 1; xx++) {
      const i = yy * stride + xx * 4;
      if (d[i + 3] === 0) continue;
      if (d[i - 1] === 0 || d[i + 7] === 0 || d[i + 3 - stride] === 0 || d[i + 3 + stride] === 0) {
        d[i] = 26; d[i + 1] = 19; d[i + 2] = 16;
      }
    }
  }
  cx.putImageData(id, 0, 0);
}

function drawWarrior(x, o) {
  const h = o.h;
  const bw = Math.ceil(3.0 * h), bh = Math.ceil(2.3 * h);
  const sw = Math.ceil(bw * PIX_RES), sh = Math.ceil(bh * PIX_RES);
  if (_pxc.width < sw) _pxc.width = sw;
  if (_pxc.height < sh) _pxc.height = sh;
  _pxx.setTransform(1, 0, 0, 1, 0, 0);
  _pxx.clearRect(0, 0, sw, sh);
  // 足元原点をスクラッチ内に配置して縮小描画
  _pxx.setTransform(PIX_RES, 0, 0, PIX_RES, sw / 2, bh * PIX_RES * 0.86);
  drawWarriorVec(_pxx, o);
  posterizeOutline(_pxx, sw, sh);
  x.imageSmoothingEnabled = false;
  x.drawImage(_pxc, 0, 0, sw, sh, -bw / 2, -bh * 0.86, bw, bh);
  x.imageSmoothingEnabled = true;
}

/* ---------- 汎用:人物の描画(ベクター本体) ----------
 * o: { h, skin, skinD, robe, robeD, hakama, sash, hat, weapon, armor, armorC,
 *      patches, bareChest, face:'grim'|'worried'|'soft', kick,
 *      walk, moving, swing, swing2, thrust, bowDraw, breath,
 *      hurt, downT, lean }
 * 原点=足元中心。facing・奥行き縮尺はctx.scaleで反映済み想定(+xが正面)。
 */
function drawWarriorVec(x, o) {
  const h = o.h;
  const hipY = -0.45 * h, shY = -0.70 * h, headY = -0.84 * h, headR = 0.115 * h;
  const OUT = 'rgba(24,16,10,0.65)';
  const ow = Math.max(1.1, 0.02 * h);
  x.save();

  if (o.downT > 0) {
    x.rotate(-Math.PI / 2 * Math.min(1, o.downT));
    x.translate(0.15 * h * Math.min(1, o.downT), 0);
  } else if (o.hurt) {
    x.rotate(-0.18);
  } else if (o.lean) {
    x.rotate(o.lean);
  }
  // 呼吸(待機中の上下動)
  if (o.breath != null && o.downT <= 0 && !o.hurt && !o.moving) {
    x.scale(1, 1 + Math.sin(o.breath) * 0.013);
  }
  // 歩行の弾み(足を踏み出すたびに体が上下する)
  if (o.moving && o.downT <= 0 && !o.hurt) {
    x.translate(0, -Math.abs(Math.sin(o.walk)) * 0.035 * o.h);
  }

  const swing = (o.moving && o.downT <= 0) ? Math.sin(o.walk) : 0;
  const liftF = (o.moving) ? Math.max(0, Math.sin(o.walk + 1.6)) * 0.055 * h : 0;
  const liftB = (o.moving) ? Math.max(0, Math.sin(o.walk + 1.6 + Math.PI)) * 0.055 * h : 0;
  x.lineCap = 'round'; x.lineJoin = 'round';

  /* --- 輪郭付きの太い肢体(カプセル) --- */
  function capsule(x1, y1, x2, y2, r, color, back) {
    x.strokeStyle = OUT;
    x.lineWidth = r * 2 + ow * 1.7;
    x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
    x.strokeStyle = color;
    x.lineWidth = r * 2;
    x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
    if (back) {
      x.strokeStyle = 'rgba(0,0,0,0.24)';
      x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
    }
  }

  /* --- 脚(太腿・ふくらはぎの筋肉・草鞋) --- */
  function leg(footX, lift, back) {
    const kneeX = footX * 0.45 + 0.05 * h;
    const kneeY = -0.22 * h - lift * 0.4;
    const footY = -lift - 0.02 * h;
    const skin = o.skinD || '#b08a60';
    // 腿(袴・太い)
    capsule(0, -0.4 * h, kneeX, kneeY, 0.062 * h, o.hakama, back);
    // ふくらはぎ:膝側が太く、足首へ絞る
    const mx = (kneeX + footX) / 2, my = (kneeY + footY) / 2 + 0.012 * h;
    capsule(kneeX, kneeY, mx, my, 0.047 * h, skin, back);
    capsule(mx, my, footX, footY, 0.031 * h, skin, back);
    // 草鞋
    x.fillStyle = '#3a2e20';
    x.beginPath(); x.ellipse(footX + 0.048 * h, footY + 0.006 * h, 0.074 * h, 0.03 * h, 0, 0, 7); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow * 0.7; x.stroke();
    if (back) {
      x.fillStyle = 'rgba(0,0,0,0.24)';
      x.beginPath(); x.ellipse(footX + 0.048 * h, footY + 0.006 * h, 0.074 * h, 0.03 * h, 0, 0, 7); x.fill();
    }
  }
  const footF = 0.07 * h + swing * 0.18 * h;
  const footB = -0.07 * h - swing * 0.18 * h;
  leg(footB, liftB, true);
  if (o.kick > 0) {
    // 蹴り:前脚を高く突き出す
    leg(0.52 * h * o.kick, 0.34 * h * o.kick, false);
  } else {
    leg(footF, liftF, false);
  }

  /* --- 袴(裾) --- */
  const flare = 0.19 * h + Math.abs(swing) * 0.05 * h;
  x.fillStyle = o.hakama;
  x.beginPath();
  x.moveTo(-0.15 * h, hipY);
  x.lineTo(0.15 * h, hipY);
  x.lineTo(flare, -0.17 * h);
  x.lineTo(-flare, -0.17 * h);
  x.closePath(); x.fill();
  const hg = x.createLinearGradient(0, hipY, 0, -0.17 * h);
  hg.addColorStop(0, 'rgba(255,255,255,0.09)');
  hg.addColorStop(1, 'rgba(0,0,0,0.24)');
  x.fillStyle = hg;
  x.fill();
  x.strokeStyle = OUT; x.lineWidth = ow; x.stroke();
  // 襞(ひだ)
  x.strokeStyle = 'rgba(0,0,0,0.22)';
  x.lineWidth = ow;
  for (const px of [-0.06, 0.03]) {
    x.beginPath();
    x.moveTo(px * h, hipY - 0.01 * h);
    x.lineTo(px * h * 1.8, -0.18 * h);
    x.stroke();
  }

  /* --- 胴(着物+陰影、広い肩幅) --- */
  const tg = x.createLinearGradient(-0.21 * h, 0, 0.21 * h, 0);
  tg.addColorStop(0, o.robeD);
  tg.addColorStop(0.5, o.robe);
  tg.addColorStop(1, o.robe);
  x.fillStyle = tg;
  x.beginPath();
  x.moveTo(-0.145 * h, hipY);
  x.quadraticCurveTo(-0.225 * h, hipY - 0.13 * h, -0.21 * h, shY + 0.01 * h);
  x.quadraticCurveTo(-0.1 * h, shY - 0.035 * h, 0, shY - 0.03 * h);
  x.quadraticCurveTo(0.12 * h, shY - 0.035 * h, 0.21 * h, shY + 0.01 * h);
  x.quadraticCurveTo(0.225 * h, hipY - 0.13 * h, 0.145 * h, hipY);
  x.closePath(); x.fill();
  x.strokeStyle = OUT; x.lineWidth = ow; x.stroke();
  // 首
  capsule(0.01 * h, shY - 0.02 * h, 0.015 * h, headY + headR * 0.5, 0.042 * h, o.skin);
  // はだけた胸(筋骨隆々)
  if (o.bareChest) {
    x.fillStyle = o.skin;
    x.beginPath();
    x.moveTo(-0.02 * h, shY - 0.02 * h);
    x.lineTo(0.17 * h, shY + 0.01 * h);
    x.lineTo(0.1 * h, hipY - 0.06 * h);
    x.lineTo(-0.06 * h, hipY - 0.03 * h);
    x.closePath(); x.fill();
    x.strokeStyle = 'rgba(120,60,30,0.55)'; x.lineWidth = ow;
    x.beginPath(); x.moveTo(0, shY + 0.07 * h); x.quadraticCurveTo(0.08 * h, shY + 0.11 * h, 0.15 * h, shY + 0.06 * h); x.stroke();
    x.beginPath(); x.moveTo(0.03 * h, shY + 0.14 * h); x.lineTo(0.1 * h, shY + 0.14 * h); x.stroke();
    x.beginPath(); x.moveTo(0.02 * h, shY + 0.19 * h); x.lineTo(0.09 * h, shY + 0.19 * h); x.stroke();
  }
  // リムライト(正面側の縁)
  x.strokeStyle = 'rgba(255,240,215,0.25)';
  x.lineWidth = ow;
  x.beginPath();
  x.moveTo(0.13 * h, hipY - 0.005 * h);
  x.lineTo(0.168 * h, shY + 0.015 * h);
  x.stroke();
  // 衿
  x.strokeStyle = o.robeD;
  x.lineWidth = 0.035 * h;
  x.beginPath();
  x.moveTo(0.1 * h, shY + 0.02 * h);
  x.lineTo(-0.02 * h, hipY - 0.04 * h);
  x.stroke();
  // ボロの継ぎ当て(悪党)
  if (o.patches) {
    x.fillStyle = 'rgba(90,75,55,0.85)';
    x.fillRect(-0.1 * h, shY + 0.12 * h, 0.09 * h, 0.08 * h);
    x.fillStyle = 'rgba(60,55,70,0.85)';
    x.fillRect(0.02 * h, hipY - 0.16 * h, 0.08 * h, 0.07 * h);
    x.strokeStyle = 'rgba(30,25,20,0.6)'; x.lineWidth = ow * 0.7;
    x.strokeRect(-0.1 * h, shY + 0.12 * h, 0.09 * h, 0.08 * h);
    x.strokeRect(0.02 * h, hipY - 0.16 * h, 0.08 * h, 0.07 * h);
    // ほつれ
    x.strokeStyle = o.robeD; x.lineWidth = ow * 0.8;
    x.beginPath(); x.moveTo(-0.16 * h, shY + 0.05 * h); x.lineTo(-0.2 * h, shY + 0.12 * h); x.stroke();
  }

  /* --- 鎧(胴丸+草摺) --- */
  if (o.armor) {
    const ac = o.armorC || '#4c3b28';
    x.fillStyle = ac;
    x.beginPath();
    x.moveTo(-0.145 * h, hipY - 0.02 * h);
    x.lineTo(-0.165 * h, shY + 0.06 * h);
    x.lineTo(0.165 * h, shY + 0.06 * h);
    x.lineTo(0.145 * h, hipY - 0.02 * h);
    x.closePath(); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow; x.stroke();
    x.strokeStyle = 'rgba(255,220,160,0.28)';
    x.lineWidth = ow;
    for (let i = 1; i <= 3; i++) {
      const yy = shY + 0.06 * h + (hipY - 0.08 * h - shY) * i / 3.4;
      x.beginPath(); x.moveTo(-0.15 * h, yy); x.lineTo(0.15 * h, yy); x.stroke();
    }
    x.fillStyle = ac;
    for (const px of [-0.13, -0.01, 0.11]) {
      x.beginPath();
      x.moveTo(px * h - 0.045 * h, hipY);
      x.lineTo(px * h + 0.065 * h, hipY);
      x.lineTo(px * h + 0.075 * h, hipY + 0.1 * h);
      x.lineTo(px * h - 0.055 * h, hipY + 0.1 * h);
      x.closePath(); x.fill();
      x.strokeStyle = OUT; x.stroke();
    }
  }
  // 帯
  x.fillStyle = o.sash;
  x.fillRect(-0.145 * h, hipY - 0.055 * h, 0.29 * h, 0.055 * h);

  /* --- 腕と武器 --- */
  const shX = 0.06 * h;
  const armLen = 0.3 * h;

  function arm(ax, ang, len) {
    const L = len || armLen;
    const sy0 = shY + 0.04 * h;
    // 肘で少し曲げて筋肉の流れを出す
    const ex = ax + Math.cos(ang - 0.18) * L * 0.52;
    const ey = sy0 + Math.sin(ang - 0.18) * L * 0.52;
    const hx = ax + Math.cos(ang) * L;
    const hy = sy0 + Math.sin(ang) * L;
    // 肩(三角筋)
    x.fillStyle = o.robeD;
    x.beginPath(); x.arc(ax, sy0, 0.062 * h, 0, 7); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow * 0.8; x.stroke();
    // 上腕(袖・太い)
    capsule(ax, sy0, ex, ey, 0.05 * h, o.robeD);
    // 前腕(肌・手首へ絞る)
    const mx = (ex + hx) / 2, my = (ey + hy) / 2;
    capsule(ex, ey, mx, my, 0.041 * h, o.skin);
    capsule(mx, my, hx, hy, 0.029 * h, o.skin);
    // 手(大きめ)
    x.fillStyle = o.skin;
    x.beginPath(); x.arc(hx, hy, 0.052 * h, 0, 7); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow * 0.8; x.stroke();
    return [hx, hy];
  }

  function blade(hx, hy, ang, len, w, dull) {
    x.save();
    x.translate(hx, hy);
    x.rotate(ang);
    const sag = len * 0.09;
    const tsuka = Math.max(len * 0.18, w * 3.2);
    x.strokeStyle = '#191410'; x.lineWidth = w * 1.6;
    x.beginPath(); x.moveTo(-tsuka, w * 0.1); x.lineTo(0, 0); x.stroke();
    if (!dull) {
      x.strokeStyle = '#7a6844'; x.lineWidth = w * 0.45;
      for (let i = 1; i <= 3; i++) {
        const tx = -tsuka * i / 4;
        x.beginPath(); x.moveTo(tx - w * 0.4, -w * 0.6); x.lineTo(tx + w * 0.4, w * 0.72); x.stroke();
      }
    }
    x.fillStyle = '#3d342a';
    x.beginPath(); x.arc(-tsuka, w * 0.1, w * 0.75, 0, 7); x.fill();
    x.fillStyle = '#2e2820';
    x.beginPath(); x.ellipse(0, 0, w * 0.75, w * 2.0, 0, 0, 7); x.fill();
    x.strokeStyle = dull ? '#5a5040' : '#9a8340'; x.lineWidth = Math.max(1, w * 0.22);
    x.stroke();
    const bg = x.createLinearGradient(0, -w * 1.1, 0, w * 1.1);
    if (dull) {
      bg.addColorStop(0, '#4a4e50'); bg.addColorStop(0.5, '#8a9297'); bg.addColorStop(1, '#c9d0d4');
    } else {
      bg.addColorStop(0, '#59626b'); bg.addColorStop(0.45, '#b9c4cf');
      bg.addColorStop(0.8, '#eef4f9'); bg.addColorStop(1, '#ffffff');
    }
    x.fillStyle = bg;
    x.beginPath();
    x.moveTo(w * 0.5, -w * 0.5);
    x.quadraticCurveTo(len * 0.55, -sag - w * 0.55, len * 0.97, -sag - w * 0.1);
    x.quadraticCurveTo(len * 1.03, -sag + w * 0.05, len * 0.92, -sag + w * 0.3);
    x.quadraticCurveTo(len * 0.5, -sag * 0.5 + w * 0.78, w * 0.5, w * 0.62);
    x.closePath(); x.fill();
    x.strokeStyle = 'rgba(30,32,40,0.55)'; x.lineWidth = Math.max(0.8, w * 0.16);
    x.stroke();
    if (!dull) {
      x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = Math.max(0.8, w * 0.2);
      x.beginPath();
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const px = w * 0.7 + (len * 0.88 - w * 0.7) * t;
        const py = -sag * t * 0.85 + w * (0.3 + Math.sin(t * 17) * 0.13);
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.9)';
      x.beginPath(); x.arc(len * 0.95, -sag, w * 0.3, 0, 7); x.fill();
    }
    x.restore();
  }

  const W = o.weapon;

  if (W === 'none') {
    arm(-shX, 1.25);
    arm(shX, 1.05);
  } else if (W === 'spear') {
    const t = o.thrust || 0;
    const ex = t * 0.34 * h;
    const [hx, hy] = arm(shX, 0.25 - t * 0.25);
    arm(-shX, 0.45 - t * 0.2);
    x.save();
    x.translate(hx + ex, hy);
    x.strokeStyle = '#26201a'; x.lineWidth = 0.055 * h;
    x.beginPath(); x.moveTo(-0.5 * h, 0); x.lineTo(0.75 * h, -0.03 * h); x.stroke();
    x.strokeStyle = '#7a5a35'; x.lineWidth = 0.04 * h;
    x.beginPath(); x.moveTo(-0.5 * h, 0); x.lineTo(0.75 * h, -0.03 * h); x.stroke();
    x.fillStyle = '#e8edf2';
    x.beginPath();
    x.moveTo(0.75 * h, -0.03 * h);
    x.lineTo(0.97 * h, -0.05 * h);
    x.lineTo(0.77 * h, 0.035 * h);
    x.closePath(); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow * 0.8; x.stroke();
    x.fillStyle = '#8e2f2f';
    x.beginPath(); x.arc(0.73 * h, -0.02 * h, 0.035 * h, 0, 7); x.fill();
    x.restore();
  } else if (W === 'fist') {
    // 素手:待機は構え、攻撃は正拳突き
    const a = (o.swing == null) ? -0.5 : o.swing;
    const punch = o.swing != null && o.swing > -0.5;
    const ext = punch ? Math.min(1, (a + 0.5) / 1.2) : 0;
    arm(-shX, -0.35 + ext * 0.25, armLen * (0.9 + 0 * ext));
    const [hx, hy] = arm(shX, -0.1 + (1 - ext) * -0.5, armLen * (0.85 + ext * 0.55));
    // 大きな拳
    x.fillStyle = o.skin;
    x.beginPath(); x.arc(hx, hy, 0.075 * h, 0, 7); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow; x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = ow * 0.7;
    x.beginPath(); x.moveTo(hx - 0.05 * h, hy - 0.02 * h); x.lineTo(hx + 0.05 * h, hy - 0.02 * h); x.stroke();
  } else if (W === 'bottle') {
    // 徳利(酒瓶)を持つ
    const a = (o.swing == null) ? -1.0 : o.swing;
    arm(-shX, a * 0.4 + 0.3);
    const [hx, hy] = arm(shX, a * 0.6);
    x.save();
    x.translate(hx, hy); x.rotate(a + 1.2);
    x.fillStyle = '#7a5a3a';
    x.beginPath();
    x.ellipse(0, -0.09 * h, 0.05 * h, 0.075 * h, 0, 0, 7);
    x.fill();
    x.fillRect(-0.016 * h, -0.2 * h, 0.032 * h, 0.06 * h);
    x.strokeStyle = OUT; x.lineWidth = ow * 0.8;
    x.beginPath(); x.ellipse(0, -0.09 * h, 0.05 * h, 0.075 * h, 0, 0, 7); x.stroke();
    x.fillStyle = '#e8e2d2';
    x.fillRect(-0.03 * h, -0.1 * h, 0.06 * h, 0.03 * h);
    x.restore();
  } else if (W === 'stick') {
    // 木の棍棒
    const a = (o.swing == null) ? -1.15 : o.swing;
    arm(-shX, a * 0.55 + 0.2);
    const [hx, hy] = arm(shX, a * 0.6);
    x.save();
    x.translate(hx, hy); x.rotate(a);
    x.strokeStyle = OUT; x.lineWidth = 0.1 * h;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0.52 * h, -0.03 * h); x.stroke();
    const cg = x.createLinearGradient(0, -0.05 * h, 0, 0.05 * h);
    cg.addColorStop(0, '#8a6a42'); cg.addColorStop(1, '#5a4028');
    x.strokeStyle = cg; x.lineWidth = 0.08 * h;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0.52 * h, -0.03 * h); x.stroke();
    // 節
    x.fillStyle = '#3e2c18';
    x.beginPath(); x.arc(0.2 * h, -0.035 * h, 0.018 * h, 0, 7); x.fill();
    x.beginPath(); x.arc(0.38 * h, 0.01 * h, 0.018 * h, 0, 7); x.fill();
    x.restore();
  } else if (W === 'club') {
    const a = (o.swing == null) ? -1.15 : o.swing;
    arm(-shX, a * 0.55 + 0.2);
    const [hx, hy] = arm(shX, a * 0.6);
    x.save();
    x.translate(hx, hy); x.rotate(a);
    x.strokeStyle = OUT; x.lineWidth = 0.125 * h;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0.62 * h, -0.04 * h); x.stroke();
    const cg = x.createLinearGradient(0, -0.06 * h, 0, 0.06 * h);
    cg.addColorStop(0, '#6a6a75'); cg.addColorStop(0.5, '#4a4a52'); cg.addColorStop(1, '#33333a');
    x.strokeStyle = cg; x.lineWidth = 0.105 * h;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0.62 * h, -0.04 * h); x.stroke();
    x.fillStyle = '#9a9aa5';
    for (let i = 1; i <= 4; i++) {
      x.fillRect(0.14 * h * i, -0.105 * h, 0.032 * h, 0.032 * h);
      x.fillRect(0.14 * h * i, 0.05 * h, 0.032 * h, 0.032 * h);
    }
    x.restore();
  } else if (W === 'dual') {
    const a1 = (o.swing == null) ? -1.3 : o.swing;
    const a2 = (o.swing2 == null) ? -0.9 : o.swing2;
    const [bx2, by2] = arm(-shX, a2 * 0.6);
    blade(bx2, by2, a2, 0.5 * h, 0.035 * h);
    const [bx1, by1] = arm(shX, a1 * 0.6);
    blade(bx1, by1, a1, 0.5 * h, 0.035 * h);
  } else if (W === 'knife') {
    // ドス(短刀・逆手気味)
    const a = (o.swing == null) ? -0.8 : o.swing;
    arm(-shX, a * 0.4 + 0.5);
    const [hx, hy] = arm(shX, a * 0.6);
    blade(hx, hy, a, 0.32 * h, 0.042 * h, true);
  } else { // katana / nodachi(待機は上段・八相の構え)
    const len = W === 'nodachi' ? 0.88 * h : 0.54 * h;
    const a = (o.swing == null) ? (W === 'nodachi' ? -1.35 : -1.15) : o.swing;
    arm(-shX, a * 0.45 + 0.35);
    const [hx, hy] = arm(shX, a * 0.55);
    blade(hx, hy, a, len, (W === 'nodachi' ? 0.05 : 0.045) * h);
  }

  /* --- 頭(あご付き) --- */
  x.fillStyle = o.skin;
  x.beginPath(); x.arc(0.02 * h, headY, headR, 0, 7); x.fill();
  x.beginPath();
  x.ellipse(0.02 * h + headR * 0.15, headY + headR * 0.5, headR * 0.72, headR * 0.55, -0.12, 0, 7);
  x.fill();
  x.strokeStyle = OUT; x.lineWidth = ow;
  x.beginPath(); x.arc(0.02 * h, headY, headR, Math.PI * 0.75, Math.PI * 2.3); x.stroke();
  x.beginPath();
  x.ellipse(0.02 * h + headR * 0.15, headY + headR * 0.5, headR * 0.72, headR * 0.55, -0.12, -0.6, Math.PI * 0.9);
  x.stroke();
  // 頬の陰影
  x.fillStyle = 'rgba(120,70,40,0.14)';
  x.beginPath(); x.arc(0.02 * h - headR * 0.35, headY + headR * 0.2, headR * 0.5, 0, 7); x.fill();

  const face = o.face || 'grim';
  if (face === 'grim') {
    // 吊り眉+睨み
    x.strokeStyle = '#241c14'; x.lineWidth = ow * 1.2;
    x.beginPath();
    x.moveTo(0.02 * h + headR * 0.12, headY - headR * 0.42);
    x.lineTo(0.02 * h + headR * 0.78, headY - headR * 0.22);
    x.stroke();
    x.fillStyle = '#f6f1e6';
    x.beginPath();
    x.ellipse(0.02 * h + headR * 0.48, headY - headR * 0.05, headR * 0.3, headR * 0.19, -0.1, 0, 7);
    x.fill();
    x.fillStyle = '#141210';
    x.fillRect(0.02 * h + headR * 0.52, headY - headR * 0.18, headR * 0.26, headR * 0.28);
    x.strokeStyle = 'rgba(90,40,30,0.85)'; x.lineWidth = ow;
    x.beginPath();
    x.moveTo(0.02 * h + headR * 0.3, headY + headR * 0.52);
    x.quadraticCurveTo(0.02 * h + headR * 0.55, headY + headR * 0.62, 0.02 * h + headR * 0.78, headY + headR * 0.45);
    x.stroke();
  } else if (face === 'worried') {
    // 困り眉
    x.strokeStyle = '#241c14'; x.lineWidth = ow;
    x.beginPath();
    x.moveTo(0.02 * h + headR * 0.15, headY - headR * 0.25);
    x.lineTo(0.02 * h + headR * 0.75, headY - headR * 0.45);
    x.stroke();
    x.fillStyle = '#141210';
    x.beginPath(); x.arc(0.02 * h + headR * 0.5, headY - headR * 0.02, headR * 0.13, 0, 7); x.fill();
    x.strokeStyle = 'rgba(90,40,30,0.8)'; x.lineWidth = ow;
    x.beginPath();
    x.moveTo(0.02 * h + headR * 0.35, headY + headR * 0.5);
    x.quadraticCurveTo(0.02 * h + headR * 0.55, headY + headR * 0.62, 0.02 * h + headR * 0.72, headY + headR * 0.55);
    x.stroke();
  } else { // soft
    x.strokeStyle = '#241c14'; x.lineWidth = ow;
    x.beginPath();
    x.moveTo(0.02 * h + headR * 0.2, headY - headR * 0.35);
    x.lineTo(0.02 * h + headR * 0.7, headY - headR * 0.35);
    x.stroke();
    x.fillStyle = '#141210';
    x.beginPath(); x.arc(0.02 * h + headR * 0.5, headY - headR * 0.05, headR * 0.12, 0, 7); x.fill();
    x.strokeStyle = 'rgba(90,40,30,0.8)'; x.lineWidth = ow;
    x.beginPath();
    x.arc(0.02 * h + headR * 0.5, headY + headR * 0.38, headR * 0.22, 0.3, Math.PI - 0.3);
    x.stroke();
  }

  const hat = o.hat;
  if (hat === 'jingasa') {
    x.fillStyle = '#54462c';
    x.beginPath();
    x.moveTo(0.02 * h - headR * 1.85, headY - headR * 0.25);
    x.quadraticCurveTo(0.02 * h - headR * 0.5, headY - headR * 1.2, 0.02 * h, headY - headR * 1.85);
    x.quadraticCurveTo(0.02 * h + headR * 0.5, headY - headR * 1.2, 0.02 * h + headR * 1.85, headY - headR * 0.25);
    x.closePath(); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow; x.stroke();
    x.strokeStyle = '#d8cdb2'; x.lineWidth = ow * 0.8;
    x.beginPath();
    x.moveTo(0.02 * h - headR * 0.8, headY - headR * 0.2);
    x.lineTo(0.02 * h, headY + headR * 0.9);
    x.lineTo(0.02 * h + headR * 0.8, headY - headR * 0.2);
    x.stroke();
  } else if (hat === 'hachimaki') {
    x.fillStyle = '#2c2620';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.25, headR * 1.02, Math.PI, Math.PI * 2); x.fill();
    x.fillStyle = '#e8e2d2';
    x.fillRect(0.02 * h - headR * 1.05, headY - headR * 0.72, headR * 2.1, headR * 0.4);
    x.strokeStyle = OUT; x.lineWidth = ow * 0.8;
    x.strokeRect(0.02 * h - headR * 1.05, headY - headR * 0.72, headR * 2.1, headR * 0.4);
    x.strokeStyle = '#e8e2d2'; x.lineWidth = ow * 1.4;
    x.beginPath();
    x.moveTo(0.02 * h - headR * 1.05, headY - headR * 0.5);
    x.lineTo(0.02 * h - headR * 1.7, headY - headR * 0.1);
    x.stroke();
  } else if (hat === 'bald') {
    x.strokeStyle = '#5a4534'; x.lineWidth = ow;
    x.beginPath(); x.arc(0.02 * h, headY + headR * 0.45, headR * 0.6, 0.3, Math.PI - 0.3); x.stroke();
    x.strokeStyle = '#a05a4a'; x.lineWidth = ow;
    x.beginPath();
    x.moveTo(0.02 * h - headR * 0.5, headY - headR * 0.7);
    x.lineTo(0.02 * h - headR * 0.1, headY - headR * 0.2);
    x.stroke();
    // 無精髭
    x.fillStyle = 'rgba(50,40,32,0.45)';
    x.beginPath(); x.arc(0.02 * h + headR * 0.1, headY + headR * 0.55, headR * 0.5, 0, 7); x.fill();
  } else if (hat === 'ragged') {
    // ボサボサの蓬髪+無精髭(悪党)
    x.fillStyle = '#2a2320';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.3, headR * 1.12, Math.PI * 0.9, Math.PI * 2.1); x.fill();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.95 + i * 0.28);
      const bx = 0.02 * h + Math.cos(a) * headR * 1.05;
      const by = headY - headR * 0.3 + Math.sin(a) * headR * 1.05;
      x.beginPath();
      x.moveTo(bx, by);
      x.lineTo(bx + Math.cos(a) * headR * 0.55, by + Math.sin(a) * headR * 0.55 - headR * 0.1);
      x.lineTo(bx + Math.cos(a + 0.4) * headR * 0.3, by + Math.sin(a + 0.4) * headR * 0.3);
      x.closePath(); x.fill();
    }
    x.fillStyle = 'rgba(50,40,32,0.5)';
    x.beginPath(); x.arc(0.02 * h + headR * 0.12, headY + headR * 0.55, headR * 0.52, 0, 7); x.fill();
  } else if (hat === 'wild') {
    x.fillStyle = '#1d1a18';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.3, headR * 1.18, Math.PI * 0.88, Math.PI * 2.12); x.fill();
    x.beginPath();
    x.moveTo(0.02 * h - headR, headY - headR * 0.4);
    x.lineTo(0.02 * h - headR * 2.2, headY + headR * 0.9);
    x.lineTo(0.02 * h - headR * 0.7, headY + headR * 0.4);
    x.closePath(); x.fill();
    x.fillStyle = 'rgba(40,32,26,0.5)';
    x.beginPath(); x.arc(0.02 * h + headR * 0.15, headY + headR * 0.55, headR * 0.5, 0, 7); x.fill();
  } else if (hat === 'kojiro') {
    x.fillStyle = '#2a2f4a';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.25, headR * 1.08, Math.PI * 0.95, Math.PI * 2.05); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow * 0.8; x.stroke();
    x.strokeStyle = '#2a2f4a'; x.lineWidth = 0.05 * h;
    x.beginPath();
    x.moveTo(0.02 * h - headR * 0.8, headY - headR * 0.5);
    x.quadraticCurveTo(0.02 * h - headR * 2.4, headY + headR * 1.2, 0.02 * h - headR * 1.9, headY + headR * 3.2);
    x.stroke();
    // 髪の艶
    x.strokeStyle = 'rgba(160,180,220,0.35)'; x.lineWidth = ow;
    x.beginPath();
    x.arc(0.02 * h, headY - headR * 0.25, headR * 0.85, Math.PI * 1.15, Math.PI * 1.5);
    x.stroke();
  } else if (hat === 'weak') {
    // 頼りない小次郎:乱れた小さな髷+後れ毛
    x.fillStyle = '#3a3630';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.3, headR * 1.02, Math.PI, Math.PI * 2); x.fill();
    x.fillRect(0.02 * h - headR * 0.14, headY - headR * 1.5, headR * 0.28, headR * 0.55);
    x.strokeStyle = '#3a3630'; x.lineWidth = ow;
    x.beginPath();
    x.moveTo(0.02 * h - headR * 0.9, headY - headR * 0.35);
    x.quadraticCurveTo(0.02 * h - headR * 1.3, headY + headR * 0.4, 0.02 * h - headR * 1.05, headY + headR * 0.9);
    x.stroke();
    x.beginPath();
    x.moveTo(0.02 * h - headR * 0.15, headY - headR * 1.5);
    x.lineTo(0.02 * h - headR * 0.5, headY - headR * 1.75);
    x.stroke();
  } else if (hat === 'old') {
    // 老人:白髪の小さな髷
    x.fillStyle = '#c9c4b6';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.3, headR * 1.0, Math.PI, Math.PI * 2); x.fill();
    x.fillRect(0.02 * h - headR * 0.14, headY - headR * 1.45, headR * 0.28, headR * 0.5);
    // しわ
    x.strokeStyle = 'rgba(90,60,40,0.4)'; x.lineWidth = ow * 0.8;
    x.beginPath();
    x.moveTo(0.02 * h + headR * 0.1, headY - headR * 0.6);
    x.lineTo(0.02 * h + headR * 0.6, headY - headR * 0.6);
    x.stroke();
  } else if (hat === 'girl') {
    // 娘:長い黒髪
    x.fillStyle = '#241f1d';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.2, headR * 1.1, Math.PI * 0.9, Math.PI * 2.1); x.fill();
    x.strokeStyle = '#241f1d'; x.lineWidth = 0.09 * h;
    x.beginPath();
    x.moveTo(0.02 * h - headR * 0.75, headY - headR * 0.3);
    x.quadraticCurveTo(0.02 * h - headR * 1.15, headY + headR * 1.6, 0.02 * h - headR * 0.95, headY + headR * 3.4);
    x.stroke();
    // 赤い髪飾り
    x.fillStyle = '#c04a52';
    x.beginPath(); x.arc(0.02 * h + headR * 0.55, headY - headR * 0.95, headR * 0.22, 0, 7); x.fill();
  } else { // topknot
    x.fillStyle = '#26221e';
    x.beginPath(); x.arc(0.02 * h, headY - headR * 0.3, headR * 1.05, Math.PI, Math.PI * 2); x.fill();
    x.strokeStyle = OUT; x.lineWidth = ow * 0.7; x.stroke();
    x.fillStyle = '#26221e';
    x.fillRect(0.02 * h - headR * 0.18, headY - headR * 1.6, headR * 0.36, headR * 0.7);
  }

  x.restore();
}

/* ---------- 会話シーン用の人物プリセット ---------- */
const NPC_PRESETS = {
  villager: {
    h: 70, skin: '#dcc09a', skinD: '#b89a72',
    robe: '#7a6a4f', robeD: '#5a4c38', hakama: '#4e463a', sash: '#3a3226',
    hat: 'old', face: 'worried', weapon: 'none',
  },
  daughter: {
    h: 64, skin: '#f0d6b6', skinD: '#d0b28e',
    robe: '#c9899e', robeD: '#a3667e', hakama: '#8a4a5e', sash: '#e0b93c',
    hat: 'girl', face: 'soft', weapon: 'none',
  },
  merchant: {
    h: 72, skin: '#e0bd92', skinD: '#bf9c70',
    robe: '#4f5e6e', robeD: '#39485a', hakama: '#3c3c34', sash: '#8a793a',
    hat: 'topknot', face: 'soft', weapon: 'none',
  },
  stable: {
    h: 72, skin: '#d8ae80', skinD: '#b78e62',
    robe: '#5e5a3f', robeD: '#46422c', hakama: '#3a382c', sash: '#2c2a20',
    hat: 'hachimaki', face: 'soft', weapon: 'none',
  },
};

// 小次郎の見た目(弱い/変身後)
function kojiroLook(strong) {
  return strong ? {
    h: 96, skin: '#e8c298', skinD: '#caa27a',
    robe: '#7fa8c9', robeD: '#54748f', hakama: '#e8e4da', sash: '#5a3a6b',
    hat: 'kojiro', face: 'grim', weapon: 'nodachi',
  } : {
    h: 88, skin: '#e3c096', skinD: '#c49e74',
    robe: '#8a7a63', robeD: '#655742', hakama: '#57503f', sash: '#3e3626',
    hat: 'weak', face: 'worried', weapon: 'katana',
  };
}

/* ---------- エフェクト ---------- */
class Fx {
  constructor(kind, x, z, y, opt) {
    this.kind = kind; this.x = x; this.z = z; this.y = y;
    this.t = 0; this.dead = false;
    Object.assign(this, opt || {});
  }
  update(dt) {
    this.t += dt;
    const life = this.life || 18;
    if (this.t >= life) this.dead = true;
    if (this.kind === 'spark' || this.kind === 'poof') this.y += (this.vy || 0) * dt;
  }
  draw(x, camX) {
    const sx = this.x - camX;
    const sy = (this.flat ? this.y : groundY(this.z) - this.y);
    const life = this.life || 18;
    const p = this.t / life;
    x.save();
    if (this.kind === 'slash') {
      x.translate(sx, sy);
      x.scale(this.facing || 1, 1);
      x.rotate(this.rot || 0);
      const R = this.r || 60;
      const a0 = -2.0, a1 = 1.05;
      const sweep = a0 + (a1 - a0) * Math.min(1, p * 1.7);
      x.globalAlpha = (1 - p) * 0.95;
      const grad = x.createRadialGradient(0, 0, R * 0.3, 0, 0, R);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.7, this.color || 'rgba(215,240,255,0.55)');
      grad.addColorStop(0.94, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = grad;
      x.beginPath();
      x.arc(0, 0, R, a0, sweep);
      x.arc(0, 0, R * 0.28, sweep, a0, true);
      x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.95)';
      x.lineWidth = 2.5;
      x.beginPath();
      x.arc(0, 0, R * 0.97, Math.max(a0, sweep - 0.9), sweep);
      x.stroke();
    } else if (this.kind === 'cut') {
      x.translate(sx, sy - (this.hy != null ? this.hy : 38));
      x.rotate(this.rot != null ? this.rot : -0.5);
      const L = (this.len || 55) * (0.5 + Math.min(1, p * 2.4) * 0.5);
      const T = Math.max(0.5, 7 * (1 - p));
      x.globalAlpha = (1 - p) * 0.6;
      x.fillStyle = this.color || '#9fd8ff';
      x.beginPath();
      x.moveTo(-L * 1.15, 0); x.quadraticCurveTo(0, -T * 2.8, L * 1.15, 0);
      x.quadraticCurveTo(0, T * 2.8, -L * 1.15, 0);
      x.closePath(); x.fill();
      x.globalAlpha = 1 - p;
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(-L, 0); x.quadraticCurveTo(0, -T, L, 0);
      x.quadraticCurveTo(0, T, -L, 0);
      x.closePath(); x.fill();
      x.fillStyle = '#e8f4ff';
      for (let i = 0; i < 4; i++) {
        const a = 0.8 + i * 1.5;
        const d = 10 + p * 34;
        x.fillRect(Math.cos(a) * d, Math.sin(a) * d * 0.5 - 2, 3, 3);
      }
    } else if (this.kind === 'spark') {
      x.globalAlpha = 1 - p;
      x.fillStyle = this.color || '#ffd76b';
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + this.t * 0.3;
        const d = p * (this.r || 26);
        x.fillRect(sx + Math.cos(a) * d - 2, sy - 30 + Math.sin(a) * d - 2, 4, 4);
      }
    } else if (this.kind === 'ring') {
      x.globalAlpha = (1 - p) * 0.8;
      x.strokeStyle = this.color || '#fff';
      x.lineWidth = 6 * (1 - p) + 1;
      x.beginPath();
      x.ellipse(sx, sy, (this.r || 170) * p, (this.r || 170) * p * 0.45, 0, 0, 7);
      x.stroke();
    } else if (this.kind === 'text') {
      x.globalAlpha = Math.min(1, 2 - p * 2);
      x.fillStyle = this.color || '#fff';
      x.strokeStyle = 'rgba(0,0,0,0.7)';
      x.lineWidth = 4;
      x.font = `bold ${this.size || 20}px "Hiragino Mincho ProN", serif`;
      x.textAlign = 'center';
      const ty = sy - 70 - p * 30;
      x.strokeText(this.text, sx, ty);
      x.fillText(this.text, sx, ty);
    } else if (this.kind === 'poof') {
      x.globalAlpha = (1 - p) * 0.6;
      x.fillStyle = '#cfd4dd';
      x.beginPath(); x.arc(sx, sy - 20, 10 + p * 22, 0, 7); x.fill();
    } else if (this.kind === 'dust') {
      x.globalAlpha = (1 - p) * 0.4;
      x.fillStyle = '#b8a88f';
      x.beginPath();
      x.ellipse(sx - (this.dir || 0) * p * 10, sy - 3 - p * 6, 4 + p * 9, 2.5 + p * 4, 0, 0, 7);
      x.fill();
    } else if (this.kind === 'splash') {
      // 酒瓶が割れた飛沫
      x.globalAlpha = (1 - p) * 0.8;
      x.fillStyle = '#d8c9a0';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 - 2.6;
        const d = p * 34;
        x.fillRect(sx + Math.cos(a) * d - 2, sy - 6 + Math.sin(a) * d * 0.6 - p * 14, 4, 4);
      }
      x.fillStyle = '#7a5a3a';
      for (let i = 0; i < 4; i++) {
        const a = i * 1.5 - 2;
        const d = p * 26;
        x.fillRect(sx + Math.cos(a) * d - 2, sy - 4 + Math.sin(a) * d * 0.5 - p * 10, 3, 3);
      }
    }
    x.restore();
  }
}

/* ---------- 飛び道具:酒瓶(放物線) ---------- */
class Bottle {
  constructor(x, z, y, vx, vy) {
    this.x = x; this.z = z; this.y = y;
    this.vx = vx; this.vy = vy;
    this.t = 0;
    this.dead = false;
  }
  update(dt, g) {
    this.t += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy -= 0.35 * dt;
    const p = g.player;
    const hitPlayer = p.invulnT <= 0 && p.state !== 'down' && p.state !== 'special' &&
      Math.abs(this.x - p.x) < 20 && Math.abs(this.z - p.z) < 16 &&
      this.y > p.y && this.y < p.y + 72;
    if (hitPlayer) {
      p.takeDamage(12, Math.sign(this.vx) || 1, g);
      this.smash(g);
      return;
    }
    if (this.y <= 0) {
      if (Math.abs(this.x - p.x) < 36 && Math.abs(this.z - p.z) < 18 && p.y < 20 &&
          p.invulnT <= 0 && p.state !== 'down' && p.state !== 'special') {
        p.takeDamage(10, Math.sign(this.vx) || 1, g);
      }
      this.smash(g);
    }
    if (this.x < g.camX - 80 || this.x > g.camX + 1040) this.dead = true;
  }
  smash(g) {
    this.dead = true;
    AudioFX.sfx.hit();
    g.addFx(new Fx('splash', this.x, this.z, Math.max(0, this.y), { life: 16 }));
  }
  draw(x, camX) {
    const sx = this.x - camX, sy = groundY(this.z) - this.y;
    // 影
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(sx, groundY(this.z), 8, 3, 0, 0, 7); x.fill();
    x.save();
    x.translate(sx, sy);
    x.rotate(this.t * 0.35);
    x.fillStyle = '#7a5a3a';
    x.beginPath(); x.ellipse(0, 0, 7, 10, 0, 0, 7); x.fill();
    x.fillRect(-2.5, -16, 5, 8);
    x.strokeStyle = 'rgba(24,16,10,0.6)'; x.lineWidth = 1.5;
    x.beginPath(); x.ellipse(0, 0, 7, 10, 0, 0, 7); x.stroke();
    x.fillStyle = '#e8e2d2';
    x.fillRect(-4.5, -2, 9, 5);
    x.restore();
  }
}

/* ---------- アイテム ---------- */
const ITEM_DEFS = {
  cola: { img: 'cola', label: '小倉コーラ!一流剣士に変身!!', color: '#ff6b5e' },
  niku: { img: 'niku', label: '娘娘の肉焼飯!大回復!', color: '#ffd76b' },
  tea:  { img: 'tea',  label: '辻利のグリーンティー!回復!', color: '#9be07c' },
};
class Item {
  constructor(kind, x, z) {
    this.kind = kind; this.x = x; this.z = z;
    this.t = Math.random() * 6; this.dead = false;
  }
  update(dt, g) {
    this.t += dt * 0.1;
    const p = g.player;
    if (Math.abs(this.x - p.x) < 34 && Math.abs(this.z - p.z) < 22 && p.y < 30) {
      this.dead = true;
      g.pickup(this);
    }
  }
  draw(x, camX) {
    const sx = this.x - camX;
    const sy = groundY(this.z);
    const ds = depthScale(this.z);
    const bob = Math.sin(this.t) * 4;
    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.beginPath(); x.ellipse(sx, sy, 14 * ds, 5 * ds, 0, 0, 7); x.fill();
    x.save();
    x.globalAlpha = 0.5 + Math.sin(this.t * 2) * 0.3;
    x.fillStyle = ITEM_DEFS[this.kind].color;
    x.beginPath(); x.arc(sx, sy - 28 + bob, 26 * ds, 0, 7); x.globalAlpha *= 0.25; x.fill();
    x.restore();
    const img = Assets.img(ITEM_DEFS[this.kind].img);
    let w = (this.kind === 'cola' ? 26 : 36) * ds;
    const h = (this.kind === 'cola' ? 54 : 36) * ds;
    if (this.kind === 'cola' && img.width) w = h * img.width / img.height; // 実比率
    x.drawImage(img, sx - w / 2, sy - h - 6 + bob, w, h);
  }
}

/* ---------- プレイヤー:佐々木小次郎 ---------- */
class Player {
  constructor(maxHp) {
    this.x = 120; this.z = 60; this.y = 0;
    this.vy = 0; this.facing = 1;
    this.maxHp = maxHp || 100; this.hp = this.maxHp;
    this.gauge = 0;
    this.colaT = 0;          // 変身の残りフレーム(20秒=1200)
    this.state = 'normal';
    this.stateT = 0;
    this.atkIndex = 0; this.atkBuffered = false;
    this.hitSet = new Set();
    this.invulnT = 0;
    this.walk = 0; this.moving = false;
    this.deadWait = 0;
  }

  get strong() { return this.colaT > 0; }
  get speed() { return this.strong ? 3.9 : 3.0; }

  transform(g) {
    const was = this.strong;
    this.colaT = 1200; // 20秒
    AudioFX.sfx.cola();
    g.flashT = 6;
    if (!was) {
      g.addFx(new Fx('ring', this.x, this.z, 0, { r: 110, color: '#9fd8ff', life: 26 }));
      g.addFx(new Fx('ring', this.x, this.z, 0, { r: 110, color: '#fff', life: 36 }));
    }
  }

  takeDamage(dmg, fromDir, g, heavy) {
    if (this.invulnT > 0 || this.state === 'down' || this.state === 'special') return;
    this.hp = Math.max(0, this.hp - dmg);
    AudioFX.sfx.hurt();
    g.addFx(new Fx('spark', this.x, this.z, this.y + 30, { color: '#ff7b6b' }));
    g.shakeT = Math.max(g.shakeT, heavy ? 10 : 6);
    this.facing = -fromDir;
    if (this.hp <= 0 || heavy) {
      this.state = 'down'; this.stateT = 0;
      this.vy = heavy ? 7 : 5; this.y = Math.max(this.y, 1);
      this.kbX = fromDir * (heavy ? 5.5 : 3);
    } else {
      this.state = 'hurt'; this.stateT = 0;
      this.kbX = fromDir * 2.4;
      this.invulnT = 40;
    }
  }

  startAttack(g) {
    this.state = 'attack'; this.stateT = 0;
    this.hitSet.clear();
    this.atkBuffered = false;
    AudioFX.sfx.slash();
    const heavy = this.atkIndex === 2;
    g.addFx(new Fx('slash', this.x + this.facing * 34, this.z, 42, {
      facing: this.facing,
      r: (heavy ? 88 : 70) * (this.strong ? 1 : 0.62),
      rot: this.atkIndex === 1 ? 0.45 : -0.15,
      color: this.strong ? 'rgba(215,240,255,0.6)' : 'rgba(220,220,210,0.45)',
      life: 9,
    }));
  }

  update(dt, g) {
    const I = Input.state;
    this.stateT += dt;
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.colaT > 0) {
      this.colaT -= dt;
      if (this.colaT <= 0) {
        g.addFx(new Fx('text', this.x, this.z, 0, { text: '効果が切れた…', color: '#aaa', size: 16 }));
        g.addFx(new Fx('poof', this.x, this.z, 40, { life: 20 }));
      }
      if (Math.random() < 0.25) {
        g.addFx(new Fx('spark', this.x + (Math.random() - 0.5) * 30, this.z, this.y + Math.random() * 60,
          { color: '#9fd8ff', r: 13, life: 13 }));
      }
    }

    if (this.y > 0 || this.vy > 0) {
      this.y += this.vy * dt;
      this.vy -= 0.5 * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
    }

    switch (this.state) {
      case 'normal': {
        let dx = (I.right ? 1 : 0) - (I.left ? 1 : 0);
        let dz = (I.down ? 1 : 0) - (I.up ? 1 : 0);
        this.moving = dx !== 0 || dz !== 0;
        if (dx !== 0) this.facing = dx;
        this.x += dx * this.speed * dt;
        this.z += dz * 2.3 * dt;
        if (this.moving) {
          // 歩行位相は実際の移動距離に同期(足が地面と合う)
          const travel = Math.hypot(dx * this.speed, dz * 2.3) * dt;
          this.walk += travel * 0.045;
          if (this.y === 0 && Math.random() < 0.09) {
            g.addFx(new Fx('dust', this.x - this.facing * 12, this.z, 0, { dir: this.facing, life: 14 }));
          }
        }
        if (I.jumpHit && this.y === 0) { this.vy = 9.4; AudioFX.sfx.jump(); }
        if (I.attackHit) { this.atkIndex = 0; this.startAttack(g); }
        else if (I.specialHit && this.gauge >= 100 && this.y === 0 && this.strong) this.startSpecial(g);
        break;
      }
      case 'attack': {
        const heavy = this.atkIndex === 2;
        const dur = this.y > 0 ? 18 : (heavy ? 24 : 16);
        if (this.stateT < dur * 0.45) this.x += this.facing * (this.strong ? 2.4 : 1.6) * dt;
        if (this.stateT > dur * 0.3 && this.stateT < dur * 0.55) {
          const reach = (heavy ? 100 : 86) * (this.strong ? 1 : 0.72);
          const dmg = this.strong ? (heavy ? 25 : 15) : (heavy ? 12 : 7);
          for (const e of g.enemies) {
            if (e.dead || this.hitSet.has(e)) continue;
            const dxE = (e.x - this.x) * this.facing;
            if (dxE > -14 && dxE < reach && Math.abs(e.z - this.z) < 30 &&
                e.y < this.y + 75 && e.y + e.height > this.y) {
              this.hitSet.add(e);
              e.takeHit(dmg, this.facing, g, heavy || this.y > 0);
              this.gauge = Math.min(100, this.gauge + 2);
              g.hitstop = Math.max(g.hitstop, heavy ? 7 : 4);
            }
          }
          for (const a of g.arrows) {
            const dxA = (a.x - this.x) * this.facing;
            if (!a.dead && dxA > -10 && dxA < 90 && Math.abs(a.z - this.z) < 26) {
              if (a.smash) a.smash(g); else a.dead = true;
              g.addFx(new Fx('poof', a.x, a.z, a.y, {}));
            }
          }
        }
        if (I.attackHit && this.stateT > dur * 0.35 && this.atkIndex < 2) this.atkBuffered = true;
        if (this.stateT >= dur) {
          if (this.atkBuffered && this.y === 0) {
            this.atkIndex++;
            this.startAttack(g);
          } else {
            this.state = 'normal'; this.atkIndex = 0;
          }
        }
        break;
      }
      case 'special': {
        const dur = 48;
        this.invulnT = 2;
        if (this.stateT > 8 && !this.specialHitDone) {
          this.specialHitDone = true;
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.abs(e.x - this.x) < 190 && Math.abs(e.z - this.z) < 60) {
              e.takeHit(70, e.x >= this.x ? 1 : -1, g, true);
            }
          }
          for (const a of g.arrows) a.dead = true;
          g.shakeT = 14;
        }
        if (this.stateT >= dur) { this.state = 'normal'; }
        break;
      }
      case 'hurt': {
        this.x += (this.kbX || 0) * dt;
        this.kbX *= Math.pow(0.9, dt);
        if (this.stateT >= 20) this.state = 'normal';
        break;
      }
      case 'down': {
        this.x += (this.kbX || 0) * dt;
        this.kbX *= Math.pow(0.92, dt);
        if (this.y === 0 && this.stateT > 30) {
          if (this.hp <= 0) {
            this.deadWait += dt;
            if (this.deadWait > 60) g.onPlayerDead();
          } else if (this.stateT > 55) {
            this.state = 'normal';
            this.invulnT = 60;
          }
        }
        break;
      }
      case 'win': {
        this.moving = false;
        break;
      }
    }

    this.z = Math.max(Z_MIN, Math.min(Z_MAX, this.z));
    const minX = g.camX + 25;
    const maxX = g.camLocked ? g.camX + 935 : Math.min(g.worldLen - 25, g.camX + 935);
    this.x = Math.max(minX, Math.min(maxX, this.x));
  }

  startSpecial(g) {
    this.state = 'special'; this.stateT = 0;
    this.gauge = 0;
    this.specialHitDone = false;
    AudioFX.sfx.special();
    g.addFx(new Fx('ring', this.x, this.z, 0, { r: 190, color: '#bfe3ff', life: 26 }));
    g.addFx(new Fx('ring', this.x, this.z, 0, { r: 190, color: '#fff', life: 36 }));
    g.addFx(new Fx('text', this.x, this.z, 40, { text: '巌流旋風斬り!!', color: '#bfe3ff', size: 30, life: 50 }));
    g.flashT = 8;
  }

  draw(x, camX) {
    const sx = this.x - camX;
    const gy = groundY(this.z);
    const ds = depthScale(this.z);
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.beginPath(); x.ellipse(sx, gy, 22 * ds, 7 * ds, 0, 0, 7); x.fill();

    // 変身中のオーラ
    if (this.strong) {
      x.save();
      const a = 0.2 + Math.sin(Date.now() * 0.02) * 0.08;
      const grad = x.createRadialGradient(sx, gy - 40, 10, sx, gy - 40, 70);
      grad.addColorStop(0, `rgba(120,190,255,${a})`);
      grad.addColorStop(1, 'rgba(120,190,255,0)');
      x.fillStyle = grad;
      x.fillRect(sx - 70, gy - 115, 140, 130);
      x.restore();
    }

    x.save();
    x.translate(sx, gy - this.y * ds);
    if (this.invulnT > 0 && this.state !== 'special' && Math.floor(this.invulnT / 3) % 2 === 0) {
      x.globalAlpha = 0.45;
    }
    x.scale(this.facing * ds, ds);

    // スプライトシートがあれば本物の絵で描画
    const sheetName = this.strong ? 'kojiro_strong' : 'kojiro_weak';
    const sheetDef = Assets.sprite(sheetName) && Assets.spriteDef(sheetName);
    if (sheetDef) {
      let anim = 'idle', frame = 0;
      if (this.state === 'attack') {
        anim = 'attack' + (this.atkIndex + 1);
        const dur = this.y > 0 ? 18 : (this.atkIndex === 2 ? 24 : 16);
        frame = this.stateT / dur * (sheetDef.anims[anim] || 1);
      } else if (this.state === 'special' && sheetDef.anims.special) {
        anim = 'special'; frame = this.stateT / 48 * sheetDef.anims.special;
      } else if (this.state === 'hurt') {
        anim = 'hurt'; frame = this.stateT / 20 * sheetDef.anims.hurt;
      } else if (this.state === 'down') {
        anim = 'down'; frame = this.stateT / 40 * sheetDef.anims.down;
      } else if (this.y > 0) {
        anim = 'jump'; frame = this.vy > 3 ? 0 : this.vy > 0 ? 1 : this.vy > -4 ? 2 : 3;
      } else if (this.moving && this.state === 'normal') {
        anim = 'walk'; frame = Math.floor(this.walk * 1.27) % sheetDef.anims.walk;
      } else {
        anim = 'idle'; frame = Math.floor(Date.now() / 130) % sheetDef.anims.idle;
      }
      drawFromSheet(x, sheetName, anim, frame, this.strong ? 116 : 106);
      x.restore();
      return;
    }

    let swing = null, lean = 0;
    if (this.state === 'attack') {
      const heavy = this.atkIndex === 2;
      const dur = this.y > 0 ? 18 : (heavy ? 24 : 16);
      const p = Math.min(1, this.stateT / dur);
      if (p < 0.3) { swing = -2.1 + p * 0.5; lean = -0.06; }
      else if (p < 0.55) { swing = -1.95 + (p - 0.3) / 0.25 * 3.1; lean = 0.18; }
      else { swing = 1.15 - (p - 0.55) * 0.5; lean = 0.14; }
    } else if (this.state === 'special') {
      swing = (this.stateT * 0.9) % (Math.PI * 2) - Math.PI;
    } else if (this.y > 0) {
      swing = -1.6;
    }
    // 頼りない時は少し猫背
    if (!this.strong && this.state === 'normal') lean = 0.07;

    drawWarrior(x, {
      ...kojiroLook(this.strong),
      walk: this.walk, moving: this.moving && this.state === 'normal' && this.y === 0,
      breath: Date.now() * 0.006,
      swing,
      lean,
      hurt: this.state === 'hurt',
      downT: this.state === 'down' ? Math.min(1, this.stateT / 14) : 0,
    });

    if (this.state === 'special') {
      const p = this.stateT / 48;
      x.globalAlpha = 0.75 * (1 - p * 0.5);
      x.strokeStyle = '#dff0ff';
      for (let i = 0; i < 3; i++) {
        const a = this.stateT * 0.55 + i * 2.09;
        x.lineWidth = 7 - i;
        x.beginPath();
        x.arc(0, -40, 65 + i * 38 * p, a, a + 2.0);
        x.stroke();
      }
    }
    x.restore();
  }
}

/* ---------- 敵(悪党) ---------- */
const ENEMY_TYPES = {
  zakoA: {
    name: '破落戸', hp: 12, spd: 1.5, reach: 58, dmg: 8,
    windup: 26, strikeT: 7, recover: 44, gauge: 12, h: 84,
    weapon: 'knife', hat: 'ragged', patches: true,
    colors: { skin: '#d9a97e', robe: '#6e6152', robeD: '#4e4438', hakama: '#4a4034', sash: '#8a6a3a' },
  },
  zakoB: {
    name: 'ごろつき', hp: 14, spd: 1.2, reach: 68, dmg: 10,
    windup: 32, strikeT: 8, recover: 50, gauge: 14, h: 94,
    weapon: 'stick', hat: 'ragged', patches: true,
    colors: { skin: '#c9915e', robe: '#5a4a4f', robeD: '#3e3236', hakama: '#3c3630', sash: '#6a5a3a' },
  },
  bossFist: {
    name: '悪党の頭', hp: 300, spd: 1.2, reach: 74, dmg: 18,
    windup: 34, strikeT: 8, recover: 42, gauge: 60, h: 134,
    boss: true, heavyHit: true, fists: true, bareChest: true,
    weapon: 'fist', hat: 'bald', patches: true,
    colors: { skin: '#d89f76', robe: '#7a4438', robeD: '#59302a', hakama: '#463028', sash: '#c9a227' },
  },
  bossBottle: {
    name: '大男', hp: 280, spd: 1.0, reach: 80, dmg: 14,
    windup: 38, strikeT: 8, recover: 50, gauge: 60, h: 128,
    boss: true, thrower: true, keepDist: 280,
    weapon: 'bottle', hat: 'ragged', patches: true,
    colors: { skin: '#cf9468', robe: '#4e4a5e', robeD: '#383446', hakama: '#3c3830', sash: '#8a3a30' },
  },
  musashi: {
    name: '宮本武蔵', hp: 520, spd: 2.3, reach: 78, dmg: 13,
    windup: 22, strikeT: 7, recover: 26, gauge: 0, h: 100,
    boss: true, dual: true,
    weapon: 'dual', hat: 'wild',
    colors: { skin: '#dcb18a', robe: '#2c2733', robeD: '#1c1822', hakama: '#3a3145', sash: '#7a2430' },
  },
};

class Enemy {
  constructor(type, x, z, opt) {
    opt = opt || {};
    const c = ENEMY_TYPES[type];
    this.type = type; this.cfg = c;
    this.x = x; this.z = z; this.y = 0; this.vy = 0;
    this.hp = c.hp * (opt.hpMul || 1);
    this.maxHp = this.hp;
    this.name = opt.name || c.name;
    this.height = c.h;
    this.facing = -1;
    this.state = 'chase'; this.stateT = 0;
    this.walk = Math.random() * 6; this.moving = false;
    this.dead = false; this.deadT = 0;
    this.hurtCount = 0;
    this.atkCool = 30 + Math.random() * 50;
    this.drop = opt.drop || null;
    this.entered = false;
    // 散開:プレイヤーを挟む側と奥行きのクセ
    this.flank = opt.flank != null ? opt.flank : (Math.random() < 0.5 ? -1 : 1);
    this.zBias = (Math.random() - 0.5) * 36;
    this.pairId = opt.pair || null; // 挟み撃ちの相方
    this.kickAtk = false;
  }

  takeHit(dmg, dir, g, heavy) {
    if (this.dead) return;
    this.hp -= dmg;
    AudioFX.sfx.hit();
    g.addFx(new Fx('cut', this.x, this.z, 0, {
      hy: this.height * 0.55,
      rot: (dir > 0 ? -1 : 1) * (0.35 + Math.random() * 0.5),
      len: 40 + dmg * 1.4, life: 12,
    }));
    g.addFx(new Fx('spark', this.x, this.z, this.y + this.height * 0.5, { r: 18, life: 12 }));
    g.addFx(new Fx('text', this.x, this.z, this.height * 0.4,
      { text: String(dmg), color: '#ffd76b', size: 17, life: 24 }));
    this.facing = -dir;
    if (this.hp <= 0) {
      this.dead = true; this.deadT = 0;
      AudioFX.sfx.kill();
      g.onKill(this);
      g.hitstop = Math.max(g.hitstop, 8);
      g.addFx(new Fx('cut', this.x, this.z, 0, {
        hy: this.height * 0.5,
        rot: (dir > 0 ? -1 : 1) * 0.6,
        len: 95, life: 16, color: '#cfeaff',
      }));
      this.kbX = dir * 5; this.vy = 6; this.y = Math.max(this.y, 1);
      return;
    }
    this.hurtCount++;
    const armor = this.cfg.boss && (this.state === 'windup' || this.state === 'strike') && this.hurtCount % 4 !== 0;
    if (!armor) {
      this.state = heavy ? 'downed' : 'hurt';
      this.stateT = 0;
      this.kbX = dir * (heavy ? 3 : 1.6) * (this.cfg.boss ? 0.4 : 1);
      if (heavy && !this.cfg.boss) { this.vy = 4.5; this.y = Math.max(this.y, 1); }
    }
  }

  partner(g) {
    if (!this.pairId) return null;
    return g.enemies.find(o => o !== this && o.pairId === this.pairId && !o.dead) || null;
  }

  update(dt, g) {
    const c = this.cfg, p = g.player;
    this.stateT += dt;

    if (this.dead) {
      this.deadT += dt;
      this.x += (this.kbX || 0) * dt;
      if (this.y > 0 || this.vy > 0) { this.y += this.vy * dt; this.vy -= 0.5 * dt; if (this.y < 0) this.y = 0; }
      return;
    }

    if (this.y > 0 || this.vy > 0) {
      this.y += this.vy * dt; this.vy -= 0.5 * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
    }

    const spd = c.spd;
    const dx = p.x - this.x, dz = p.z - this.z;
    const adx = Math.abs(dx);
    this.moving = false;
    if (this.state !== 'hurt' && this.state !== 'downed') this.facing = dx >= 0 ? 1 : -1;
    if (this.atkCool > 0) this.atkCool -= dt;

    switch (this.state) {
      case 'chase': {
        if (c.thrower) {
          // 酒瓶投げ:距離を保ち、近づかれたら殴る
          let mx = 0;
          if (!this.entered) mx = Math.sign(dx);
          else if (adx < c.keepDist - 70) mx = -Math.sign(dx);
          else if (adx > c.keepDist + 70) mx = Math.sign(dx);
          this.x += mx * spd * dt;
          if (Math.abs(dz) > 8) this.z += Math.sign(dz) * spd * 0.7 * dt;
          this.moving = mx !== 0 || Math.abs(dz) > 8;
          if (this.entered && this.atkCool <= 0) {
            if (adx < 100 && Math.abs(dz) < 14) { this.state = 'windup'; this.stateT = 0; this.melee = true; }
            else if (adx > 160 && Math.abs(dz) < 30) { this.state = 'windup'; this.stateT = 0; this.melee = false; }
          }
        } else {
          // 散開:割り当てられた側に回り込む
          const tx = p.x + this.flank * c.reach * 0.8;
          const tz = Math.max(Z_MIN, Math.min(Z_MAX, p.z + this.zBias * 0.3));
          const fdx = tx - this.x, fdz = tz - this.z;
          const wantX = Math.abs(fdx) > 12;
          const wantZ = Math.abs(fdz) > 8;
          if (wantX) this.x += Math.sign(fdx) * spd * dt;
          if (wantZ) this.z += Math.sign(fdz) * spd * 0.75 * dt;
          this.moving = wantX || wantZ;
          // 攻撃判定
          if (this.atkCool <= 0 && adx < c.reach && Math.abs(dz) < 12) {
            const buddy = this.partner(g);
            if (buddy) {
              // 挟み撃ち:相方も準備できたら同時に仕掛ける
              const bAdx = Math.abs(p.x - buddy.x);
              if (buddy.state === 'chase' && buddy.atkCool <= 0 && bAdx < buddy.cfg.reach * 1.3) {
                this.state = 'windup'; this.stateT = 0;
                buddy.state = 'windup'; buddy.stateT = 0;
              } else if (buddy.state === 'windup' || buddy.state === 'strike') {
                this.state = 'windup'; this.stateT = 0;
              }
            } else {
              this.state = 'windup'; this.stateT = 0;
            }
          }
          if (this.type === 'musashi' && adx > 260 && this.atkCool <= 0) {
            this.x += Math.sign(dx) * spd * 1.8 * dt;
          }
        }
        if (this.moving) this.walk += dt * 0.28;
        break;
      }
      case 'windup': {
        if (c.fists && this.stateT === dt) this.kickAtk = !this.kickAtk;
        if (this.stateT >= c.windup) {
          this.state = 'strike'; this.stateT = 0;
          if (c.thrower && !this.melee) {
            // 放物線で酒瓶を投げる
            const T = 46;
            const vx = (p.x - this.x) / T;
            const vy = 0.35 * T / 2;
            g.arrows.push(new Bottle(this.x + this.facing * 20, this.z, 62, vx, vy));
            AudioFX.sfx.jump();
          } else {
            AudioFX.sfx.slash();
            if (c.fists) {
              g.addFx(new Fx('slash', this.x + this.facing * 30, this.z, c.h * 0.4, {
                facing: this.facing, r: c.h * 0.5, life: 8,
                color: 'rgba(255,190,150,0.45)',
              }));
            } else {
              g.addFx(new Fx('slash', this.x + this.facing * 28, this.z, c.h * 0.45, {
                facing: this.facing, r: c.h * 0.58, life: 8,
                color: 'rgba(255,205,185,0.5)',
              }));
            }
          }
        }
        break;
      }
      case 'strike': {
        const isMelee = !c.thrower || this.melee;
        if (isMelee && this.stateT < c.strikeT) {
          const reach = c.reach;
          const ddx = (p.x - this.x) * this.facing;
          if (ddx > -10 && ddx < reach && Math.abs(p.z - this.z) < 26 && p.y < 55) {
            p.takeDamage(c.dmg, this.facing, g, c.heavyHit);
          }
        }
        if (this.stateT >= c.strikeT) {
          this.state = 'recover'; this.stateT = 0;
          this.atkCool = c.recover + Math.random() * 40;
          if (c.dual && Math.random() < 0.5) {
            this.state = 'windup'; this.stateT = c.windup * 0.55;
          }
        }
        break;
      }
      case 'recover': {
        if (this.stateT >= 18) { this.state = 'chase'; this.stateT = 0; }
        break;
      }
      case 'hurt': {
        this.x += (this.kbX || 0) * dt; this.kbX *= Math.pow(0.88, dt);
        if (this.stateT >= 18) { this.state = 'chase'; this.hurtCount = 0; }
        break;
      }
      case 'downed': {
        this.x += (this.kbX || 0) * dt; this.kbX *= Math.pow(0.9, dt);
        if (this.y === 0 && this.stateT > (this.cfg.boss ? 26 : 46)) {
          this.state = 'chase'; this.hurtCount = 0;
          this.atkCool = 20;
        }
        break;
      }
    }

    // 仲間同士の重なりを避ける(反発)
    if (!this.dead && (this.state === 'chase' || this.state === 'recover')) {
      for (const o of g.enemies) {
        if (o === this || o.dead) continue;
        const ddx = this.x - o.x, ddz = this.z - o.z;
        if (Math.abs(ddx) < 38 && Math.abs(ddz) < 14) {
          this.x += (ddx === 0 ? (Math.random() - 0.5) : Math.sign(ddx)) * 0.7 * dt;
          this.z += (ddz === 0 ? (Math.random() - 0.5) : Math.sign(ddz)) * 0.55 * dt;
        }
      }
    }

    this.z = Math.max(Z_MIN, Math.min(Z_MAX, this.z));
    if (!this.entered && this.x > g.camX + 30 && this.x < g.camX + 930) this.entered = true;
    if (this.entered) {
      this.x = Math.max(g.camX + 20, Math.min(g.camX + 940, this.x));
    } else {
      this.x = Math.max(g.camX - 80, Math.min(g.camX + 1050, this.x));
    }
  }

  draw(x, camX) {
    const c = this.cfg;
    const sx = this.x - camX;
    const gy = groundY(this.z);
    const ds = depthScale(this.z);
    if (sx < -120 || sx > 1080) return;

    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.beginPath();
    x.ellipse(sx, gy, c.h * 0.28 * ds, c.h * 0.09 * ds, 0, 0, 7);
    x.fill();

    x.save();
    x.translate(sx, gy - this.y * ds);
    if (this.dead) {
      x.globalAlpha = Math.max(0, 1 - this.deadT / 40);
      if (this.y > 0) x.rotate(-this.facing * this.deadT * 0.12);
    }
    x.scale(this.facing * ds, ds);

    // スプライトシートがあれば本物の絵で描画
    const eDef = Assets.sprite(this.type) && Assets.spriteDef(this.type);
    if (eDef) {
      let anim = 'idle', frame = 0;
      if (this.state === 'windup') {
        anim = 'windup'; frame = this.stateT / c.windup * eDef.anims.windup;
      } else if (this.state === 'strike') {
        anim = (c.fists && this.kickAtk && eDef.anims.kick) ? 'kick'
             : (c.thrower && !this.melee && eDef.anims.throw) ? 'throw' : 'strike';
        frame = this.stateT / c.strikeT * (eDef.anims[anim] || 1);
      } else if (this.state === 'hurt') {
        anim = 'hurt'; frame = this.stateT / 18 * eDef.anims.hurt;
      } else if (this.state === 'downed' || this.dead) {
        anim = 'down'; frame = (this.dead ? this.deadT : this.stateT) / 30 * eDef.anims.down;
      } else if (this.moving) {
        anim = 'walk'; frame = Math.floor(this.walk * 2.2) % eDef.anims.walk;
      } else {
        anim = 'idle'; frame = Math.floor(Date.now() / 140 + this.walk * 10) % eDef.anims.idle;
      }
      drawFromSheet(x, this.type, anim, frame, c.h);
      if (this.state === 'windup' && this.stateT > c.windup - 10) {
        // 攻撃予兆:頭上に赤い「!」
        x.fillStyle = '#e83c2e';
        x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 3;
        x.font = `bold ${Math.round(c.h * 0.24)}px serif`;
        x.textAlign = 'center';
        x.strokeText('!', 0, -c.h * 1.12);
        x.fillText('!', 0, -c.h * 1.12);
      }
      x.restore();
      if (!c.boss && !this.dead && this.hp < this.maxHp) {
        const w = 44;
        x.fillStyle = 'rgba(0,0,0,0.55)';
        x.fillRect(sx - w / 2, gy - this.y - c.h - 14, w, 5);
        x.fillStyle = '#e05a4a';
        x.fillRect(sx - w / 2, gy - this.y - c.h - 14, w * this.hp / this.maxHp, 5);
      }
      return;
    }

    let swing = null, thrust = 0, swing2 = null, lean = 0, kick = 0;
    if (this.state === 'windup') {
      const pw = Math.min(1, this.stateT / c.windup);
      if (c.fists) {
        if (this.kickAtk) lean = -0.12 * pw;
        else swing = -0.5 - pw * 0.6;
      } else if (c.thrower && !this.melee) {
        swing = -1.0 - pw * 1.2;
      } else {
        swing = -1.2 - pw * 1.0;
      }
    } else if (this.state === 'strike') {
      const ps = Math.min(1, this.stateT / c.strikeT);
      if (c.fists) {
        if (this.kickAtk) { kick = Math.sin(ps * Math.PI); lean = -0.18; }
        else { swing = -0.5 + ps * 1.4; lean = 0.14; } // 正拳突き
      } else if (c.thrower && !this.melee) {
        swing = -2.2 + ps * 2.6; // 投げ切り
      } else {
        swing = -2.2 + ps * 3.1;
        lean = 0.12;
      }
      if (c.dual) { swing2 = -1.0 + ps * 2.4; }
    }

    drawWarrior(x, {
      h: c.h,
      skin: c.colors.skin, skinD: '#b08a60',
      robe: c.colors.robe, robeD: c.colors.robeD,
      hakama: c.colors.hakama, sash: c.colors.sash,
      hat: c.hat, weapon: c.weapon,
      armor: c.armor, armorC: c.armorC,
      patches: c.patches, bareChest: c.bareChest,
      walk: this.walk, moving: this.moving,
      breath: Date.now() * 0.005 + this.walk,
      swing, swing2, thrust, lean, kick,
      hurt: this.state === 'hurt',
      downT: (this.state === 'downed' || this.dead) ? Math.min(1, (this.dead ? this.deadT : this.stateT) / 12) : 0,
    });

    if (this.state === 'windup' && this.stateT > c.windup - 10) {
      // 攻撃予兆:頭上に赤い「!」
      x.fillStyle = '#e83c2e';
      x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 3;
      x.font = `bold ${Math.round(c.h * 0.24)}px serif`;
      x.textAlign = 'center';
      x.strokeText('!', 0, -c.h * 1.12);
      x.fillText('!', 0, -c.h * 1.12);
    }
    x.restore();

    if (!c.boss && !this.dead && this.hp < this.maxHp) {
      const w = 44;
      x.fillStyle = 'rgba(0,0,0,0.55)';
      x.fillRect(sx - w / 2, gy - this.y - c.h - 14, w, 5);
      x.fillStyle = '#e05a4a';
      x.fillRect(sx - w / 2, gy - this.y - c.h - 14, w * this.hp / this.maxHp, 5);
    }
  }
}
