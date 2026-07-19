import express from 'express';
import {
  BALL_COLUMNS,
  countResults,
  db,
  initDb,
  rowToResult,
  validateResult,
} from './db.js';

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23];
const SUM_RANGE = { min: 175, max: 215 };

const app = express();
app.use(express.json());
app.use(async (_req, _res, next) => {
  await initDb();
  next();
});

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

async function getByConcurso(concurso) {
  const rs = await db.execute({
    sql: 'SELECT * FROM resultados WHERE concurso = ?',
    args: [concurso],
  });
  return rs.rows[0] ?? null;
}

app.get('/api/resultados', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = String(req.query.search ?? '').trim();
  const offset = (page - 1) * limit;

  let rows;
  let total;
  if (search) {
    const like = `%${search}%`;
    const [listRs, countRs] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM resultados WHERE CAST(concurso AS TEXT) LIKE ? ORDER BY concurso DESC LIMIT ? OFFSET ?',
        args: [like, limit, offset],
      }),
      db.execute({
        sql: 'SELECT COUNT(*) AS n FROM resultados WHERE CAST(concurso AS TEXT) LIKE ?',
        args: [like],
      }),
    ]);
    rows = listRs.rows;
    total = Number(countRs.rows[0].n);
  } else {
    const rs = await db.execute({
      sql: 'SELECT * FROM resultados ORDER BY concurso DESC LIMIT ? OFFSET ?',
      args: [limit, offset],
    });
    rows = rs.rows;
    total = await countResults();
  }

  res.json({
    items: rows.map(rowToResult),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

app.get('/api/estatisticas', async (req, res) => {
  const janela = Math.min(1000, Math.max(5, Number(req.query.janela) || 50));
  const rs = await db.execute('SELECT * FROM resultados ORDER BY concurso ASC');
  const rows = rs.rows;
  const total = rows.length;
  if (total === 0) {
    return res.status(404).json({ error: 'Banco vazio — importe os resultados primeiro.' });
  }

  const freq = new Array(26).fill(0);
  const freqJanela = new Array(26).fill(0);
  const lastSeen = new Array(26).fill(-1);
  const maiorAtraso = new Array(26).fill(0);
  const prevSeen = new Array(26).fill(-1);
  const impares = {};
  const primos = {};
  const somaBins = {};
  let somaNaFaixa = 0;

  rows.forEach((row, idx) => {
    const dezenas = BALL_COLUMNS.map((c) => Number(row[c]));
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

  res.json({
    totalConcursos: total,
    janela,
    ultimoConcurso: rowToResult(rows[total - 1]),
    dezenas,
    distribuicoes: {
      impares: toSortedPairs(impares),
      primos: toSortedPairs(primos),
      soma: {
        bins: Object.entries(somaBins)
          .map(([k, v]) => ({ de: Number(k), ate: Number(k) + 9, concursos: v }))
          .sort((a, b) => a.de - b.de),
        faixa: { ...SUM_RANGE, percentual: (somaNaFaixa / total) * 100 },
      },
    },
  });
});

app.get('/api/resultados/:concurso', async (req, res) => {
  const row = await getByConcurso(Number(req.params.concurso));
  if (!row) return res.status(404).json({ error: 'Concurso não encontrado.' });
  res.json(rowToResult(row));
});

app.post('/api/resultados', async (req, res) => {
  const result = parseBody(req, res);
  if (!result) return;
  if (await getByConcurso(result.concurso)) {
    return res.status(409).json({ error: `Concurso ${result.concurso} já existe.` });
  }
  await db.execute({
    sql: `INSERT INTO resultados (concurso, data, ${BALL_COLUMNS.join(', ')})
          VALUES (${Array.from({ length: 17 }, () => '?').join(', ')})`,
    args: [result.concurso, result.data, ...result.dezenas],
  });
  res.status(201).json(result);
});

app.put('/api/resultados/:concurso', async (req, res) => {
  const concurso = Number(req.params.concurso);
  if (!(await getByConcurso(concurso))) {
    return res.status(404).json({ error: 'Concurso não encontrado.' });
  }
  const result = parseBody(req, res);
  if (!result) return;
  if (result.concurso !== concurso) {
    return res.status(400).json({ error: 'O número do concurso não pode ser alterado.' });
  }
  await db.execute({
    sql: `UPDATE resultados SET data = ?, ${BALL_COLUMNS.map((c) => `${c} = ?`).join(', ')}
          WHERE concurso = ?`,
    args: [result.data, ...result.dezenas, concurso],
  });
  res.json(result);
});

app.delete('/api/resultados/:concurso', async (req, res) => {
  const rs = await db.execute({
    sql: 'DELETE FROM resultados WHERE concurso = ?',
    args: [Number(req.params.concurso)],
  });
  if (rs.rowsAffected === 0) {
    return res.status(404).json({ error: 'Concurso não encontrado.' });
  }
  res.status(204).end();
});

// Erros não tratados das rotas async viram 500 JSON
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

export default app;
