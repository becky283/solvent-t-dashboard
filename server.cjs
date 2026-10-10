const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'dist');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const files = new Set(['index.html','app.js','model.js','styles.css','charts.js','charts-runtime.js','THIRD_PARTY_NOTICES.txt']);
http.createServer((req,res)=>{
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if(!files.has(name)){res.writeHead(404);return res.end('Not found');}
  fs.readFile(path.join(root,name),(error,data)=>{
    if(error){res.writeHead(500);return res.end('Cannot read file');}
    res.writeHead(200,{'Content-Type':mime[path.extname(name)],'Cache-Control':'no-store'});res.end(data);
  });
}).listen(4173, '127.0.0.1', ()=>console.log('SOLVENT T: http://127.0.0.1:4173'));
