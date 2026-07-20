import { Router } from 'express';
import { db, initDb } from '../db.js';
import { verifyPassword, signToken, requireAuth } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  await initDb();
  const { email, senha } = req.body ?? {};
  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const rs = await db.execute({
    sql: `SELECT u.id, u.nome, u.email, u.senha_hash, u.senha_salt,
                 p.slug AS perfil, p.permissoes
          FROM usuarios u
          JOIN perfis p ON p.id = u.perfil_id
          WHERE u.email = ?`,
    args: [String(email).toLowerCase().trim()],
  });

  const row = rs.rows[0];
  if (!row) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const valid = await verifyPassword(String(senha), row.senha_salt, row.senha_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const permissoes = JSON.parse(row.permissoes);
  const payload = {
    sub: Number(row.id),
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
    permissoes,
  };
  const token = signToken(payload);
  const user = { id: Number(row.id), nome: row.nome, email: row.email, perfil: row.perfil, permissoes };
  res.json({ token, user });
});

router.post('/logout', (_req, res) => {
  // Stateless JWT — invalidação é client-side
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  await initDb();
  const rs = await db.execute({
    sql: `SELECT u.id, u.nome, u.email, p.slug AS perfil, p.permissoes
          FROM usuarios u
          JOIN perfis p ON p.id = u.perfil_id
          WHERE u.id = ?`,
    args: [req.user.sub],
  });
  const row = rs.rows[0];
  if (!row) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  res.json({
    id: Number(row.id),
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
    permissoes: JSON.parse(row.permissoes),
  });
});

export default router;
