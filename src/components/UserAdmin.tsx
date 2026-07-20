import { useEffect, useState } from 'react';
import {
  createUsuario,
  deleteUsuario,
  listUsuarios,
  updateUsuario,
  type UsuarioRow,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const PERFIS = [
  { slug: 'free', label: 'Grátis' },
  { slug: 'gerador', label: 'Gerador' },
  { slug: 'assinante', label: 'Assinante' },
  { slug: 'gestor', label: 'Gestor' },
];

interface FormState {
  nome: string;
  email: string;
  senha: string;
  perfilSlug: string;
}

function emptyForm(): FormState {
  return { nome: '', email: '', senha: '', perfilSlug: 'free' };
}

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: number };

export function UserAdmin() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>({ kind: 'closed' });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsuarios(await listUsuarios());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setFormError(null);
    setMode({ kind: 'create' });
  }

  function openEdit(u: UsuarioRow) {
    setForm({ nome: u.nome, email: u.email, senha: '', perfilSlug: u.perfil });
    setFormError(null);
    setMode({ kind: 'edit', id: u.id });
  }

  async function handleSubmit() {
    setFormError(null);
    if (!form.nome.trim()) return setFormError('Nome é obrigatório.');
    if (!form.email.trim()) return setFormError('E-mail é obrigatório.');
    if (mode.kind === 'create' && !form.senha) return setFormError('Senha é obrigatória.');
    try {
      if (mode.kind === 'edit') {
        const data: Parameters<typeof updateUsuario>[1] = {
          nome: form.nome.trim(),
          email: form.email.trim(),
          perfilSlug: form.perfilSlug,
        };
        if (form.senha) data.senha = form.senha;
        await updateUsuario(mode.id, data);
      } else {
        await createUsuario({
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          perfilSlug: form.perfilSlug,
        });
      }
      setMode({ kind: 'closed' });
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteUsuario(id);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const formOpen = mode.kind !== 'closed';

  return (
    <div>
      <h2 className="section-title">Administração de Usuários</h2>
      <p className="section-hint">Gerencie os usuários e seus perfis de acesso.</p>

      <div className="actions">
        <button className="btn" onClick={openCreate} disabled={formOpen}>
          ＋ Novo Usuário
        </button>
      </div>

      {formOpen && (
        <div className="filter-panel" style={{ marginBottom: 16 }}>
          <div className="filter-label" style={{ marginBottom: 12 }}>
            {mode.kind === 'edit' ? 'Editar usuário' : 'Novo usuário'}
          </div>
          <div className="form-grid">
            <label className="form-field">
              Nome
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </label>
            <label className="form-field">
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </label>
            <label className="form-field">
              Senha{mode.kind === 'edit' ? ' (deixe vazio para manter)' : ''}
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder={mode.kind === 'edit' ? 'Nova senha (opcional)' : 'Mínimo 6 caracteres'}
              />
            </label>
            <label className="form-field">
              Perfil
              <select
                value={form.perfilSlug}
                onChange={(e) => setForm({ ...form, perfilSlug: e.target.value })}
              >
                {PERFIS.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {formError && (
            <div className="error-box" style={{ marginTop: 12 }}>
              {formError}
            </div>
          )}
          <div className="actions" style={{ marginTop: 12, marginBottom: 0 }}>
            <button className="btn" onClick={handleSubmit}>
              {mode.kind === 'edit' ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
            <button className="btn secondary" onClick={() => setMode({ kind: 'closed' })}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
      {loading && <p className="empty-hint">Carregando…</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table className="user-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{u.email}</td>
                  <td>
                    <span className={`perfil-badge ${u.perfil}`}>{u.perfilNome}</span>
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    {confirmDelete === u.id ? (
                      <span className="confirm-group">
                        <button className="btn danger small" onClick={() => handleDelete(u.id)}>
                          Confirmar
                        </button>
                        <button
                          className="btn secondary small"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Não
                        </button>
                      </span>
                    ) : (
                      <span className="confirm-group">
                        <button
                          className="btn secondary small"
                          onClick={() => openEdit(u)}
                          disabled={formOpen}
                        >
                          Editar
                        </button>
                        <button
                          className="btn danger small"
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? 'Não é possível excluir a própria conta' : undefined}
                          onClick={() => setConfirmDelete(u.id)}
                        >
                          Excluir
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
