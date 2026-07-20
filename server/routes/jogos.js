import { Router } from 'express';
import { db, initDb } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  await initDb();
  const rs = await db.execute({
    sql: 'SELECT id, numeros, created_at FROM jogos_salvos WHERE usuario_id = ? ORDER BY created_at DESC',
    args: [req.user.sub],
  });
  res.json(
    rs.rows.map((r) => ({
      id: Number(r.id),
      numeros: JSON.parse(r.numeros),
      created_at: r.created_at,
    })),
  );
});

router.post('/', requireAuth, async (req, res) => {
  await initDb();
  const { numeros } = req.body ?? {};

  if (!Array.isArray(numeros) || numeros.length !== 15) {
    return res.status(400).json({ error: 'São necessários exatamente 15 números.' });
  }
  if (numeros.some((n) => !Number.isInteger(n) || n < 1 || n > 25)) {
    return res.status(400).json({ error: 'Cada número deve ser um inteiro entre 1 e 25.' });
  }

  // Verificar limite do plano
  const maxJogos = req.user.permissoes?.maxJogos;
  if (maxJogos !== null && maxJogos !== undefined) {
    const countRs = await db.execute({
      sql: 'SELECT COUNT(*) AS n FROM jogos_salvos WHERE usuario_id = ?',
      args: [req.user.sub],
    });
    const count = Number(countRs.rows[0].n);
    if (count >= maxJogos) {
      return res.status(403).json({
        error: `Limite de ${maxJogos} jogo(s) atingido para o plano Grátis.`,
      });
    }
  }

  const insertRs = await db.execute({
    sql: 'INSERT INTO jogos_salvos (usuario_id, numeros) VALUES (?, ?)',
    args: [req.user.sub, JSON.stringify(numeros)],
  });
  const newId = Number(insertRs.lastInsertRowid);

  const newRs = await db.execute({
    sql: 'SELECT id, numeros, created_at FROM jogos_salvos WHERE id = ?',
    args: [newId],
  });
  const r = newRs.rows[0];
  res.status(201).json({ id: Number(r.id), numeros: JSON.parse(r.numeros), created_at: r.created_at });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await initDb();
  const rs = await db.execute({
    sql: 'DELETE FROM jogos_salvos WHERE id = ? AND usuario_id = ?',
    args: [Number(req.params.id), req.user.sub],
  });
  if (rs.rowsAffected === 0) {
    return res.status(404).json({ error: 'Jogo não encontrado.' });
  }
  res.status(204).end();
});

export default router;
