import { scrypt, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const DEV_SECRET = 'lotosmart-dev-secret-inseguro';

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[auth] AVISO: JWT_SECRET não definido — usando chave de desenvolvimento insegura. ' +
        'Defina JWT_SECRET no arquivo .env para produção.',
    );
  }
  return DEV_SECRET;
}

export function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      else resolve(buf.toString('hex'));
    });
  });
}

export async function verifyPassword(password, salt, storedHash) {
  const hash = await hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Autenticação necessária.' });
  }
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function requirePerfil(...slugs) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Autenticação necessária.' });
    if (!slugs.includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Acesso negado para este perfil.' });
    }
    next();
  };
}
