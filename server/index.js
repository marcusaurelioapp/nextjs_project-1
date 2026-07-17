import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BALL_COLUMNS, countResults, db, rowToResult, validateResult } from './db.js';
import { importSpreadsheet } from './import-xlsx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3001;

// Auto-seed: importa a planilha na primeira execução (banco vazio)
if (countResults() === 0) {
  console.log('Banco vazio — importando data/lotofacil.xlsx…');
  const { imported } = importSpreadsheet();
  console.log(`Importados ${imported} concursos.`);
}

const app = express();
app.use(express.json());

const listStmt = db.prepare(
  'SELECT * FROM resultados ORDER BY concurso DESC LIMIT ? OFFSET ?',
);
const listSearchStmt = db.prepare(
  "SELECT * FROM resultados WHERE CAST(concurso AS TEXT) LIKE ? ORDER BY concurso DESC LIMIT ? OFFSET ?",
);
const countSearchStmt = db.prepare(
  "SELECT COUNT(*) AS n FROM resultados WHERE CAST(concurso AS TEXT) LIKE ?",
);
const getStmt = db.prepare('SELECT * FROM resultados WHERE concurso = ?');
const insertStmt = db.prepare(`
  INSERT INTO resultados (concurso, data, ${BALL_COLUMNS.join(', ')})
  VALUES (?, ?, ${BALL_COLUMNS.map(() => '?').join(', ')})
`);
const updateStmt = db.prepare(`
  UPDATE resultados SET data = ?, ${BALL_COLUMNS.map((c) => `${c} = ?`).join(', ')}
  WHERE concurso = ?
`);
const deleteStmt = db.prepare('DELETE FROM resultados WHERE concurso = ?');

function parseBody(req, res) {
  const { concurso, data, dezenas } = req.body ?? {};
  const result = { concurso: Number(concurso), data, dezenas };
  const error = validateResult(result);
  if (error) {
    res.status(400).json({ error });
    return null;
  }
  result.dezenas = [...result.dezenas].sort((a, b) => a - b);
  return result;
}

app.get('/api/resultados', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = String(req.query.search ?? '').trim();
  const offset = (page - 1) * limit;

  let rows;
  let total;
  if (search) {
    const like = `%${search}%`;
    rows = listSearchStmt.all(like, limit, offset);
    total = countSearchStmt.get(like).n;
  } else {
    rows = listStmt.all(limit, offset);
    total = countResults();
  }

  res.json({
    items: rows.map(rowToResult),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

app.get('/api/resultados/:concurso', (req, res) => {
  const row = getStmt.get(Number(req.params.concurso));
  if (!row) return res.status(404).json({ error: 'Concurso não encontrado.' });
  res.json(rowToResult(row));
});

app.post('/api/resultados', (req, res) => {
  const result = parseBody(req, res);
  if (!result) return;
  if (getStmt.get(result.concurso)) {
    return res.status(409).json({ error: `Concurso ${result.concurso} já existe.` });
  }
  insertStmt.run(result.concurso, result.data, ...result.dezenas);
  res.status(201).json(result);
});

app.put('/api/resultados/:concurso', (req, res) => {
  const concurso = Number(req.params.concurso);
  if (!getStmt.get(concurso)) {
    return res.status(404).json({ error: 'Concurso não encontrado.' });
  }
  const result = parseBody(req, res);
  if (!result) return;
  if (result.concurso !== concurso) {
    return res.status(400).json({ error: 'O número do concurso não pode ser alterado.' });
  }
  updateStmt.run(result.data, ...result.dezenas, concurso);
  res.json(result);
});

app.delete('/api/resultados/:concurso', (req, res) => {
  const info = deleteStmt.run(Number(req.params.concurso));
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Concurso não encontrado.' });
  }
  res.status(204).end();
});

// Em produção, serve o build da PWA (dist/) com fallback de SPA
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`LotoSmart Pro API rodando em http://localhost:${PORT} (${countResults()} concursos)`);
});
