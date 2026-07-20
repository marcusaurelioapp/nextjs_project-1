import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { db, initDb } from '../db.js';
import { hashPassword, requireAuth, requirePerfil } from '../auth.js';

const router = Router();

const onlyGestor = [requireAuth, requirePerfil('gestor')];

function rowToUser(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    email: row.email,
    perfil: row.perfil,
    perfilNome: row.perfilNome,
    created_at: row.created_at,
  };
}

router.get('/', ...onlyGestor, async (_req, res) => {
  await initDb();
  const rs = await db.execute(
    `SELECT u.id, u.nome, u.email, u.created_at,
            p.slug AS perfil, p.nome AS perfilNome
     FROM usuarios u
     JOIN perfis p ON p.id = u.perfil_id
     ORDER BY u.created_at DESC`,
  );
  res.json(rs.rows.map(rowToUser));
});

router.post('/', ...onlyGestor, async (req, res) => {
  await initDb();
  const { nome, email, senha, perfilSlug } = req.body ?? {};

  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }
  if (!senha || String(senha).length < 6) {
    return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
  }
  const slugsValidos = ['free', 'gerador', 'assinante', 'gestor'];
  if (!perfilSlug || !slugsValidos.includes(perfilSlug)) {
    return res.status(400).json({ error: 'Perfil inválido.' });
  }

  const perfilRs = await db.execute({
    sql: 'SELECT id FROM perfis WHERE slug = ?',
    args: [perfilSlug],
  });
  if (!perfilRs.rows[0]) return res.status(400).json({ error: 'Perfil não encontrado.' });
  const perfilId = Number(perfilRs.rows[0].id);

  const emailNorm = String(email).toLowerCase().trim();
  const dupCheck = await db.execute({
    sql: 'SELECT id FROM usuarios WHERE email = ?',
    args: [emailNorm],
  });
  if (dupCheck.rows.length > 0) {
    return res.status(409).json({ error: 'E-mail já cadastrado.' });
  }

  const salt = randomBytes(16).toString('hex');
  const hash = await hashPassword(String(senha), salt);

  const insertRs = await db.execute({
    sql: 'INSERT INTO usuarios (nome, email, senha_hash, senha_salt, perfil_id) VALUES (?, ?, ?, ?, ?)',
    args: [nome.trim(), emailNorm, hash, salt, perfilId],
  });
  const newId = Number(insertRs.lastInsertRowid);

  const newUserRs = await db.execute({
    sql: `SELECT u.id, u.nome, u.email, u.created_at, p.slug AS perfil, p.nome AS perfilNome
          FROM usuarios u JOIN perfis p ON p.id = u.perfil_id WHERE u.id = ?`,
    args: [newId],
  });
  res.status(201).json(rowToUser(newUserRs.rows[0]));
});

router.get('/:id', ...onlyGestor, async (req, res) => {
  await initDb();
  const rs = await db.execute({
    sql: `SELECT u.id, u.nome, u.email, u.created_at, p.slug AS perfil, p.nome AS perfilNome
          FROM usuarios u JOIN perfis p ON p.id = u.perfil_id WHERE u.id = ?`,
    args: [Number(req.params.id)],
  });
  const row = rs.rows[0];
  if (!row) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(rowToUser(row));
});

router.put('/:id', ...onlyGestor, async (req, res) => {
  await initDb();
  const id = Number(req.params.id);
  const { nome, email, senha, perfilSlug } = req.body ?? {};

  const existing = await db.execute({
    sql: 'SELECT id FROM usuarios WHERE id = ?',
    args: [id],
  });
  if (!existing.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }
  const slugsValidos = ['free', 'gerador', 'assinante', 'gestor'];
  if (!perfilSlug || !slugsValidos.includes(perfilSlug)) {
    return res.status(400).json({ error: 'Perfil inválido.' });
  }

  // Impede que o próprio gestor se rebaixe de perfil
  if (req.user.sub === id && perfilSlug !== 'gestor') {
    return res.status(403).json({ error: 'Você não pode alterar o próprio perfil.' });
  }

  const perfilRs = await db.execute({
    sql: 'SELECT id FROM perfis WHERE slug = ?',
    args: [perfilSlug],
  });
  if (!perfilRs.rows[0]) return res.status(400).json({ error: 'Perfil não encontrado.' });
  const perfilId = Number(perfilRs.rows[0].id);

  const emailNorm = String(email).toLowerCase().trim();
  const dupCheck = await db.execute({
    sql: 'SELECT id FROM usuarios WHERE email = ? AND id != ?',
    args: [emailNorm, id],
  });
  if (dupCheck.rows.length > 0) {
    return res.status(409).json({ error: 'E-mail já cadastrado para outro usuário.' });
  }

  if (senha) {
    if (String(senha).length < 6) {
      return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
    }
    const salt = randomBytes(16).toString('hex');
    const hash = await hashPassword(String(senha), salt);
    await db.execute({
      sql: `UPDATE usuarios SET nome = ?, email = ?, senha_hash = ?, senha_salt = ?, perfil_id = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      args: [nome.trim(), emailNorm, hash, salt, perfilId, id],
    });
  } else {
    await db.execute({
      sql: `UPDATE usuarios SET nome = ?, email = ?, perfil_id = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      args: [nome.trim(), emailNorm, perfilId, id],
    });
  }

  const updatedRs = await db.execute({
    sql: `SELECT u.id, u.nome, u.email, u.created_at, p.slug AS perfil, p.nome AS perfilNome
          FROM usuarios u JOIN perfis p ON p.id = u.perfil_id WHERE u.id = ?`,
    args: [id],
  });
  res.json(rowToUser(updatedRs.rows[0]));
});

router.delete('/:id', ...onlyGestor, async (req, res) => {
  await initDb();
  const id = Number(req.params.id);

  if (req.user.sub === id) {
    return res.status(403).json({ error: 'Você não pode excluir a própria conta.' });
  }

  const rs = await db.execute({
    sql: 'DELETE FROM usuarios WHERE id = ?',
    args: [id],
  });
  if (rs.rowsAffected === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  res.status(204).end();
});

export default router;
