import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.LOTOSMART_DB ?? path.join(__dirname, 'lotofacil.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
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

export const BALL_COLUMNS = Array.from({ length: 15 }, (_, i) => `bola${i + 1}`);

export function countResults() {
  return db.prepare('SELECT COUNT(*) AS n FROM resultados').get().n;
}

export function rowToResult(row) {
  return {
    concurso: row.concurso,
    data: row.data,
    dezenas: BALL_COLUMNS.map((c) => row[c]),
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

const upsertStmt = db.prepare(`
  INSERT INTO resultados (concurso, data, ${BALL_COLUMNS.join(', ')})
  VALUES (@concurso, @data, ${BALL_COLUMNS.map((c) => `@${c}`).join(', ')})
  ON CONFLICT(concurso) DO UPDATE SET
    data = excluded.data,
    ${BALL_COLUMNS.map((c) => `${c} = excluded.${c}`).join(',\n    ')}
`);

export function upsertResult({ concurso, data, dezenas }) {
  const sorted = [...dezenas].sort((a, b) => a - b);
  const params = { concurso, data };
  BALL_COLUMNS.forEach((c, i) => {
    params[c] = sorted[i];
  });
  upsertStmt.run(params);
}

export const upsertMany = db.transaction((results) => {
  for (const r of results) upsertResult(r);
});
