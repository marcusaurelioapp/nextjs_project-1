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

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23];
const SUM_RANGE = { min: 175, max: 215 };
const allAscStmt = db.prepare('SELECT * FROM resultados ORDER BY concurso ASC');

app.get('/api/estatisticas', (req, res) => {
  const janela = Math.min(1000, Math.max(5, Number(req.query.janela) || 50));
  const rows = allAscStmt.all();
  const total = rows.length;
  if (total === 0) {
    return res.status(404).json({ error: 'Banco vazio — importe os resultados primeiro.' });
  }

  const freq = new Array(26).fill(0);
  const freqJanela = new Array(26).fill(0);
  const lastSeen = new Array(26).fill(-1); // índice da última aparição
  const maiorAtraso = new Array(26).fill(0);
  const prevSeen = new Array(26).fill(-1);
  const impares = {};
  const primos = {};
  const somaBins = {};
  let somaNaFaixa = 0;

  rows.forEach((row, idx) => {
    const dezenas = BALL_COLUMNS.map((c) => row[c]);
    let odds = 0;
    let primes = 0;
    let soma = 0;
    for (const n of dezenas) {
      freq[n]++;
      if (idx >= total - janela) freqJanela[n]++;
      if (prevSeen[n] >= 0) {
        maiorAtraso[n] = Math.max(maiorAtraso[n], idx - prevSeen[n] - 1);
      }
      prevSeen[n] = idx;
      lastSeen[n] = idx;
      if (n % 2 !== 0) odds++;
      if (PRIMES.includes(n)) primes++;
      soma += n;
    }
    impares[odds] = (impares[odds] ?? 0) + 1;
    primos[primes] = (primos[primes] ?? 0) + 1;
    const bin = Math.floor(soma / 10) * 10;
    somaBins[bin] = (somaBins[bin] ?? 0) + 1;
    if (soma >= SUM_RANGE.min && soma <= SUM_RANGE.max) somaNaFaixa++;
  });

  const dezenas = [];
  for (let n = 1; n <= 25; n++) {
    const atraso = lastSeen[n] < 0 ? total : total - 1 - lastSeen[n];
    dezenas.push({
      dezena: n,
      frequencia: freq[n],
      percentual: (freq[n] / total) * 100,
      frequenciaJanela: freqJanela[n],
      atraso,
      maiorAtraso: Math.max(maiorAtraso[n], atraso),
    });
  }

  const toSortedPairs = (obj) =>
    Object.entries(obj)
      .map(([k, v]) => ({ qtd: Number(k), concursos: v }))
      .sort((a, b) => a.qtd - b.qtd);

  const last = rows[total - 1];
  res.json({
    totalConcursos: total,
    janela,
    ultimoConcurso: rowToResult(last),
    dezenas,
    distribuicoes: {
      impares: toSortedPairs(impares),
      primos: toSortedPairs(primos),
      soma: {
        bins: Object.entries(somaBins)
          .map(([k, v]) => ({
            de: Number(k),
            ate: Number(k) + 9,
            concursos: v,
          }))
          .sort((a, b) => a.de - b.de),
        faixa: { ...SUM_RANGE, percentual: (somaNaFaixa / total) * 100 },
      },
    },
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
