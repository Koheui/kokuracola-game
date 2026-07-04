/* =========================================================
 * input.js — キーボード + タッチ(仮想パッド)入力
 *  PC:  矢印/WASD 移動, Z/J 攻撃, X/K ジャンプ, C/L 必殺技, Enter 決定
 *  スマホ: 左下十字パッド, 右下 上から ジャンプ/攻撃/必殺技
 * ========================================================= */
const Input = (() => {
  const state = {
    left: false, right: false, up: false, down: false,
    attack: false, jump: false, special: false,
    // 押した瞬間だけtrue(毎フレーム消費)
    attackHit: false, jumpHit: false, specialHit: false, startHit: false,
  };

  const keymap = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    z: 'attack', Z: 'attack', j: 'attack', J: 'attack',
    x: 'jump', X: 'jump', k: 'jump', K: 'jump', ' ': 'jump',
    c: 'special', C: 'special', l: 'special', L: 'special',
  };

  function press(name) {
    if (!state[name]) {
      if (name === 'attack') state.attackHit = true;
      if (name === 'jump') state.jumpHit = true;
      if (name === 'special') state.specialHit = true;
    }
    state[name] = true;
  }
  function release(name) { state[name] = false; }

  window.addEventListener('keydown', e => {
    AudioFX.ensure();
    if (e.key === 'Enter') { state.startHit = true; }
    const name = keymap[e.key];
    if (name) { press(name); e.preventDefault(); }
    if (e.key === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    const name = keymap[e.key];
    if (name) release(name);
  });

  /* ---- タッチ ---- */
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) document.body.classList.add('touch');

  function bindBtn(id, name) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = e => { e.preventDefault(); AudioFX.ensure(); el.classList.add('pressed');
                      press(name); state.startHit = true; };
    const off = e => { e.preventDefault(); el.classList.remove('pressed'); release(name); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  }

  function bindPad() {
    const pad = document.getElementById('pad');
    const stick = document.getElementById('pad-stick');
    if (!pad) return;
    let active = null; // touch identifier

    function update(t) {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const max = r.width * 0.42;
      if (dist > max) { dx *= max / dist; dy *= max / dist; }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = r.width * 0.11;
      state.left = dx < -dead; state.right = dx > dead;
      state.up = dy < -dead; state.down = dy > dead;
    }
    function reset() {
      stick.style.transform = '';
      state.left = state.right = state.up = state.down = false;
      active = null;
    }

    pad.addEventListener('touchstart', e => {
      e.preventDefault(); AudioFX.ensure();
      active = e.changedTouches[0].identifier;
      state.startHit = true;
      update(e.changedTouches[0]);
    }, { passive: false });
    pad.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === active) update(t);
    }, { passive: false });
    pad.addEventListener('touchend', e => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === active) reset();
    }, { passive: false });
    pad.addEventListener('touchcancel', reset, { passive: false });
  }

  bindBtn('btn-attack', 'attack');
  bindBtn('btn-jump', 'jump');
  bindBtn('btn-special', 'special');
  bindPad();

  // 画面タップでも開始できるように
  window.addEventListener('pointerdown', () => { AudioFX.ensure(); state.startHit = true; });

  // 毎フレーム末尾に呼んで単発フラグを消す
  function endFrame() {
    state.attackHit = state.jumpHit = state.specialHit = state.startHit = false;
  }

  return { state, endFrame, isTouch };
})();
