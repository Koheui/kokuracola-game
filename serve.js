// 開発用の簡易静的サーバー: node serve.js → http://localhost:8765
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8765;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  // 開発用: ブラウザで加工した画像を assets/img/ に保存する
  if (req.method === 'POST' && p === '/save') {
    const q = new URLSearchParams(req.url.split('?')[1] || '');
    const name = path.basename(q.get('name') || '');
    if (!/^[\w.-]+\.png$/.test(name)) { res.writeHead(400); return res.end('bad name'); }
    const dir = q.get('dir') === 'sprites' ? path.join(ROOT, 'assets/img/sprites') : path.join(ROOT, 'assets/img');
    fs.mkdirSync(dir, { recursive: true });
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
      res.writeHead(200); res.end('saved ' + name);
    });
    return;
  }
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('http://localhost:' + PORT));
