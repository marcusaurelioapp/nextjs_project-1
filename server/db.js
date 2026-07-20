import { createClient } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local: arquivo SQLite. Produção (Vercel): banco Turso via env vars.
export const usingTurso = Boolean(process.env.TURSO_DATABASE_URL);
export const isServerless = Boolean(process.env.VERCEL);

const url =
  process.env.TURSO_DATABASE_URL ?? `file:${path.join(__dirname, 'lotofacil.db')}`;

export const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const BALL_COLUMNS = Array.from({ length: 15 }, (_, i) => `bola${i + 1}`);

let readyPromise;

// Garante o schema uma única vez por processo/cold start
export function initDb() {
  readyPromise ??= db.execute(`
    CREATE TABLE IF NOT EXISTS resultados (
      concurso INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      bola1 INTEGER NOT NULL, bola2 INTEGER NOT NULL, bola3 INTEGER NOT NULL,
      bola4 INTEGER NOT NULL, bola5 INTEGER NOT NULL, bola6 INTEGER NOT NULL,
      bola7 INTEGER NOT NULL, bola8 INTEGER NOT NULL, bola9 INTEGER NOT NULL,
      bola10 INTEGER NOT NULL, bola11 INTEGER NOT NULL, bola12 INTEGER NOT NULL,
      bola13 INTEGER NOT NULL, bola14 INTEGER NOT NULL, bola15 INTEGER NOT NULL
    )
  `);
  return readyPromise;
}

export async function countResults() {
  await initDb();
  const rs = await db.execute('SELECT COUNT(*) AS n FROM resultados');
  return Number(rs.rows[0].n);
}

export function rowToResult(row) {
  return {
    concurso: Number(row.concurso),
    data: row.data,
    dezenas: BALL_COLUMNS.map((c) => Number(row[c])),
  };
}

// Valida { concurso, data, dezenas } e retorna mensagem de erro ou null
export function validateResult({ concurso, data, dezenas }) {
  if (!Number.isInteger(concurso) || concurso <= 0) {
    return 'Concurso deve ser um número inteiro positivo.';
  }
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(Date.parse(data))) {
    return 'Data deve estar no formato YYYY-MM-DD.';
  }
  if (!Array.isArray(dezenas) || dezenas.length !== 15) {
    return 'São necessárias exatamente 15 dezenas.';
  }
  if (dezenas.some((n) => !Number.isInteger(n) || n < 1 || n > 25)) {
    return 'Cada dezena deve ser um inteiro entre 1 e 25.';
  }
  if (new Set(dezenas).size !== 15) {
    return 'As dezenas não podem se repetir.';
  }
  return null;
}

const UPSERT_SQL = `
  INSERT INTO resultados (concurso, data, ${BALL_COLUMNS.join(', ')})
  VALUES (${Array.from({ length: 17 }, () => '?').join(', ')})
  ON CONFLICT(concurso) DO UPDATE SET
    data = excluded.data,
    ${BALL_COLUMNS.map((c) => `${c} = excluded.${c}`).join(',\n    ')}
`;

function upsertArgs({ concurso, data, dezenas }) {
  return [concurso, data, ...[...dezenas].sort((a, b) => a - b)];
}

export async function upsertMany(results) {
  await initDb();
  const CHUNK = 500;
  for (let i = 0; i < results.length; i += CHUNK) {
    const chunk = results.slice(i, i + CHUNK);
    await db.batch(
      chunk.map((r) => ({ sql: UPSERT_SQL, args: upsertArgs(r) })),
      'write',
    );
  }
}
