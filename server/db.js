import { createClient } from '@libsql/client';
import { randomBytes, scrypt } from 'node:crypto';
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

// Permissões por perfil
const PERFIS_SEED = [
  {
    nome: 'Grátis',
    slug: 'free',
    permissoes: JSON.stringify({ tabs: ['generator'], resultadosWrite: false, maxJogos: 1 }),
  },
  {
    nome: 'Gerador',
    slug: 'gerador',
    permissoes: JSON.stringify({ tabs: ['generator', 'draw', 'saved'], resultadosWrite: false, maxJogos: null }),
  },
  {
    nome: 'Assinante',
    slug: 'assinante',
    permissoes: JSON.stringify({
      tabs: ['generator', 'draw', 'montecarlo', 'saved', 'results', 'stats'],
      resultadosWrite: false,
      maxJogos: null,
    }),
  },
  {
    nome: 'Gestor',
    slug: 'gestor',
    permissoes: JSON.stringify({ tabs: ['results', 'admin'], resultadosWrite: true, maxJogos: null }),
  },
];

function hashPasswordPromise(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(buf.toString('hex'));
    });
  });
}

async function seedDb() {
  // Inserir perfis (idempotente)
  for (const p of PERFIS_SEED) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO perfis (nome, slug, permissoes) VALUES (?, ?, ?)',
      args: [p.nome, p.slug, p.permissoes],
    });
  }

  // Só criar usuário admin se não houver nenhum usuário cadastrado
  const existing = await db.execute('SELECT id FROM usuarios LIMIT 1');
  if (existing.rows.length > 0) return;

  // Buscar id do perfil gestor
  const perfilRs = await db.execute({
    sql: "SELECT id FROM perfis WHERE slug = 'gestor'",
    args: [],
  });
  const perfilId = Number(perfilRs.rows[0].id);

  // Hash da senha padrão
  const salt = randomBytes(16).toString('hex');
  const hash = await hashPasswordPromise('admin123', salt);

  await db.execute({
    sql: 'INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, senha_salt, perfil_id) VALUES (?, ?, ?, ?, ?)',
    args: ['Administrador', 'admin@lotosmart.com', hash, salt, perfilId],
  });

  console.log('[db] Usuário admin criado: admin@lotosmart.com / admin123');
}

// Garante o schema uma única vez por processo/cold start
export function initDb() {
  readyPromise ??= (async () => {
    await db.batch(
      [
        {
          sql: `CREATE TABLE IF NOT EXISTS resultados (
            concurso INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            bola1 INTEGER NOT NULL, bola2 INTEGER NOT NULL, bola3 INTEGER NOT NULL,
            bola4 INTEGER NOT NULL, bola5 INTEGER NOT NULL, bola6 INTEGER NOT NULL,
            bola7 INTEGER NOT NULL, bola8 INTEGER NOT NULL, bola9 INTEGER NOT NULL,
            bola10 INTEGER NOT NULL, bola11 INTEGER NOT NULL, bola12 INTEGER NOT NULL,
            bola13 INTEGER NOT NULL, bola14 INTEGER NOT NULL, bola15 INTEGER NOT NULL
          )`,
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS perfis (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nome       TEXT NOT NULL,
            slug       TEXT NOT NULL UNIQUE,
            permissoes TEXT NOT NULL DEFAULT '{}'
          )`,
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS usuarios (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nome       TEXT NOT NULL,
            email      TEXT NOT NULL UNIQUE,
            senha_hash TEXT NOT NULL,
            senha_salt TEXT NOT NULL,
            perfil_id  INTEGER NOT NULL REFERENCES perfis(id),
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
          )`,
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS jogos_salvos (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            numeros    TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
          )`,
        },
      ],
      'write',
    );
    await seedDb();
    console.log('[db] Banco inicializado.');
  })();
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
