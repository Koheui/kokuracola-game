#!/usr/bin/env node
/* =========================================================
 * genart.js — Gemini (Nano Banana) で画像を生成するCLI
 *
 * 使い方:
 *   node tools/genart.js --out walk_test --prompt "..." [--ref path.png ...] [--n 2]
 *   node tools/genart.js --out bg_river --promptfile tools/prompts/bg_river.txt
 *
 * APIキー: プロジェクト直下の .env の GEMINI_API_KEY=... を読む
 *          (.env は .gitignore 済み。GitHubには上がらない)
 * 出力:   public/gen/<out>_<n>.png
 * ========================================================= */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, 'utf8').match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error('ERROR: GEMINI_API_KEY が見つかりません。.env に GEMINI_API_KEY=AIza... を書いてください');
  process.exit(1);
}

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { refs: [], n: 1, model: 'gemini-2.5-flash-image' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--prompt') o.prompt = a[++i];
    else if (a[i] === '--promptfile') o.prompt = fs.readFileSync(a[++i], 'utf8');
    else if (a[i] === '--ref') o.refs.push(a[++i]);
    else if (a[i] === '--out') o.out = a[++i];
    else if (a[i] === '--n') o.n = parseInt(a[++i], 10) || 1;
    else if (a[i] === '--model') o.model = a[++i];
    else if (a[i] === '--ar') o.ar = a[++i];
  }
  if (!o.prompt || !o.out) {
    console.error('usage: node tools/genart.js --out <name> (--prompt "..." | --promptfile <path>) [--ref img.png ...] [--n 1]');
    process.exit(1);
  }
  return o;
}

function mimeOf(p) {
  const e = path.extname(p).toLowerCase();
  return e === '.jpg' || e === '.jpeg' ? 'image/jpeg' : e === '.webp' ? 'image/webp' : 'image/png';
}

function callGemini(key, model, prompt, refs, ar) {
  const parts = [];
  for (const r of refs) {
    parts.push({ inline_data: { mime_type: mimeOf(r), data: fs.readFileSync(r).toString('base64') } });
  }
  parts.push({ text: prompt });
  const generationConfig = { responseModalities: ['IMAGE'] };
  if (ar) generationConfig.imageConfig = { aspectRatio: ar };
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig,
  });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
        try {
          const j = JSON.parse(data);
          const cand = j.candidates && j.candidates[0];
          const imgPart = cand && cand.content && cand.content.parts &&
            cand.content.parts.find(p => p.inlineData || p.inline_data);
          if (!imgPart) return reject(new Error('画像が返りませんでした: ' + data.slice(0, 400)));
          const inline = imgPart.inlineData || imgPart.inline_data;
          resolve(Buffer.from(inline.data, 'base64'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

(async () => {
  const key = loadKey();
  const o = parseArgs();
  const outDir = path.join(ROOT, 'public', 'gen');
  fs.mkdirSync(outDir, { recursive: true });
  for (let i = 0; i < o.n; i++) {
    process.stderr.write(`generating ${o.out}_${i} ...\n`);
    try {
      const buf = await callGemini(key, o.model, o.prompt, o.refs, o.ar);
      const file = path.join(outDir, `${o.out}_${i}.png`);
      fs.writeFileSync(file, buf);
      console.log(file);
    } catch (e) {
      console.error(`FAILED ${o.out}_${i}: ${e.message}`);
      process.exitCode = 1;
    }
  }
})();
