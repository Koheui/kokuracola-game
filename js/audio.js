/* =========================================================
 * audio.js — WebAudioによる効果音とBGM(外部ファイル不要)
 * ========================================================= */
const AudioFX = (() => {
  let ctx = null;
  let muted = false;
  let bgmTimer = null;
  let bgmStep = 0;
  let bgmMode = 'field'; // 'field' | 'boss' | null

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slide) {
    if (muted || !ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, when, hp) {
    if (muted || !ctx) return;
    const t = ctx.currentTime + (when || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = s;
    if (hp) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp;
      s.connect(f); node = f;
    }
    node.connect(g); g.connect(ctx.destination);
    s.start(t);
  }

  /* ---- 効果音 ---- */
  const sfx = {
    slash()   { noise(0.05, 0.07, 0, 6000); noise(0.11, 0.13, 0.015, 2400);
                tone(1700, 0.08, 'sawtooth', 0.035, 0, 350); },
    hit()     { noise(0.06, 0.18, 0, 1200); tone(230, 0.08, 'square', 0.12, 0, 70);
                tone(2600, 0.05, 'sine', 0.06, 0, 900); },
    kill()    { noise(0.09, 0.22, 0, 2800); tone(2900, 0.28, 'sine', 0.09, 0.01, 2100);
                tone(150, 0.22, 'sawtooth', 0.12, 0.03, 40); noise(0.25, 0.1, 0.06, 500); },
    hurt()    { tone(180, 0.18, 'square', 0.14, 0, 70); noise(0.1, 0.1, 0, 400); },
    jump()    { tone(300, 0.14, 'square', 0.07, 0, 600); },
    pickup()  { tone(660, 0.08, 'square', 0.09); tone(990, 0.12, 'square', 0.09, 0.08); },
    cola()    { tone(523, 0.09, 'square', 0.1); tone(659, 0.09, 'square', 0.1, 0.09);
                tone(784, 0.09, 'square', 0.1, 0.18); tone(1047, 0.22, 'square', 0.12, 0.27);
                noise(0.35, 0.06, 0, 3000); },
    special() { noise(0.5, 0.22, 0, 300);
                for (let i = 0; i < 6; i++) tone(400 + i * 180, 0.12, 'sawtooth', 0.09, i * 0.05); },
    gauge()   { tone(880, 0.1, 'triangle', 0.1); tone(1320, 0.16, 'triangle', 0.1, 0.1); },
    select()  { tone(880, 0.07, 'square', 0.08); },
    bossIn()  { tone(90, 0.5, 'sawtooth', 0.16, 0, 45); noise(0.4, 0.2, 0, 200);
                tone(70, 0.6, 'sawtooth', 0.16, 0.4, 40); },
    win()     { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.16)); },
  };

  /* ---- BGM:簡易シーケンサ(和風ペンタトニック) ---- */
  // 音階: D F G A C
  const scale = [147, 175, 196, 220, 262, 294, 349, 392];
  const fieldSeq = [5, -1, 3, 4, 5, -1, 7, 6, 5, 3, -1, 2, 3, 4, -1, 1];
  const bossSeq  = [0, 0, 3, 0, 0, 4, 3, 2, 0, 0, 5, 4, 3, 2, 1, 0];

  function bgmTick() {
    if (!ctx || muted || !bgmMode) return;
    const boss = bgmMode === 'boss';
    const seq = boss ? bossSeq : fieldSeq;
    const n = seq[bgmStep % 16];
    // 琴風の音
    if (n >= 0) {
      tone(scale[n] * (boss ? 1 : 2), 0.28, 'triangle', boss ? 0.07 : 0.05);
    }
    // 太鼓
    if (bgmStep % 4 === 0) tone(65, 0.18, 'sine', boss ? 0.2 : 0.13, 0, 40);
    if (boss && bgmStep % 8 === 6) noise(0.06, 0.08, 0, 4000);
    bgmStep++;
  }

  function bgm(mode) {
    if (bgmMode === mode) return;
    bgmMode = mode;
    bgmStep = 0;
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    if (mode) {
      const iv = mode === 'boss' ? 150 : 210;
      bgmTimer = setInterval(bgmTick, iv);
    }
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return { ensure, sfx, bgm, toggleMute, get muted() { return muted; } };
})();
