// Launcher local: auto-seed + serve o build da PWA junto com a API.
// Na Vercel, a função api/index.js usa apenas server/app.js.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
import { countResults } from './db.js';
import { importSpreadsheet } from './import-xlsx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3001;

if ((await countResults()) === 0) {
  console.log('Banco vazio — importando data/lotofacil.xlsx…');
  const { imported } = await importSpreadsheet();
  console.log(`Importados ${imported} concursos.`);
}

// Em produção local, serve o build da PWA (dist/) com fallback de SPA
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(
    `LotoSmart Pro API rodando em http://localhost:${PORT} (${await countResults()} concursos)`,
  );
});
