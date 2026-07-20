import { useCallback, useEffect, useState } from 'react';
import {
  createResultado,
  deleteResultado,
  listResultados,
  updateResultado,
  type Resultado,
  type ResultadoPage,
} from '../lib/api';
import { GAME_SIZE, MAX_NUMBER, MIN_NUMBER, formatNumber } from '../lib/lotofacil';
import { GameCard } from './GameCard';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; original: Resultado };

interface FormState {
  concurso: string;
  data: string;
  dezenas: Set<number>;
}

const ALL_NUMBERS = Array.from({ length: MAX_NUMBER }, (_, i) => i + MIN_NUMBER);

function emptyForm(): FormState {
  return { concurso: '', data: '', dezenas: new Set() };
}

export function ResultsAdmin({ readonly = false }: { readonly?: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<ResultadoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>({ kind: 'closed' });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await listResultados(page, search));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setMode({ kind: 'create' });
  };

  const openEdit = (r: Resultado) => {
    setForm({ concurso: String(r.concurso), data: r.data, dezenas: new Set(r.dezenas) });
    setFormError(null);
    setMode({ kind: 'edit', original: r });
  };

  const toggleDezena = (n: number) => {
    setForm((prev) => {
      const dezenas = new Set(prev.dezenas);
      if (dezenas.has(n)) {
        dezenas.delete(n);
      } else if (dezenas.size < GAME_SIZE) {
        dezenas.add(n);
      }
      return { ...prev, dezenas };
    });
  };

  const handleSubmit = async () => {
    setFormError(null);
    const concurso = Number(form.concurso);
    if (!Number.isInteger(concurso) || concurso <= 0) {
      setFormError('Informe o número do concurso.');
      return;
    }
    if (!form.data) {
      setFormError('Informe a data do sorteio.');
      return;
    }
    if (form.dezenas.size !== GAME_SIZE) {
      setFormError(`Selecione exatamente ${GAME_SIZE} dezenas (${form.dezenas.size} marcadas).`);
      return;
    }
    const payload: Resultado = {
      concurso,
      data: form.data,
      dezenas: Array.from(form.dezenas).sort((a, b) => a - b),
    };
    try {
      if (mode.kind === 'edit') {
        await updateResultado(payload);
      } else {
        await createResultado(payload);
      }
      setMode({ kind: 'closed' });
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (concurso: number) => {
    try {
      await deleteResultado(concurso);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const formOpen = mode.kind !== 'closed';

  return (
    <div>
      <h2 className="section-title">Resultados Oficiais</h2>
      <p className="section-hint">
        {readonly
          ? 'Consulte o histórico de sorteios oficiais da Lotofácil.'
          : 'Banco SQL local com o histórico de sorteios da Lotofácil. Adicione, corrija ou exclua concursos.'}
      </p>

      {!readonly && (
        <div className="actions">
          <button className="btn" onClick={openCreate} disabled={formOpen}>
            ＋ Novo Resultado
          </button>
        </div>
      )}

      {!readonly && formOpen && (
        <div className="filter-panel">
          <div className="filter-label" style={{ marginBottom: 10 }}>
            {mode.kind === 'edit'
              ? `Editar concurso ${mode.kind === 'edit' ? mode.original.concurso : ''}`
              : 'Novo resultado'}
          </div>
          <div className="form-grid">
            <label className="form-field">
              Concurso
              <input
                type="number"
                min={1}
                value={form.concurso}
                disabled={mode.kind === 'edit'}
                onChange={(e) => setForm({ ...form, concurso: e.target.value })}
              />
            </label>
            <label className="form-field">
              Data do sorteio
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </label>
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            Dezenas ({form.dezenas.size}/{GAME_SIZE})
          </div>
          <div className="pick-grid">
            {ALL_NUMBERS.map((n) => (
              <button
                key={n}
                className={`ball pick ${form.dezenas.has(n) ? 'hit' : ''}`}
                onClick={() => toggleDezena(n)}
              >
                {formatNumber(n)}
              </button>
            ))}
          </div>
          {formError && (
            <div className="error-box" style={{ marginTop: 12 }}>
              {formError}
            </div>
          )}
          <div className="actions" style={{ marginTop: 12, marginBottom: 0 }}>
            <button className="btn" onClick={handleSubmit}>
              {mode.kind === 'edit' ? 'Salvar Alterações' : 'Adicionar'}
            </button>
            <button className="btn secondary" onClick={() => setMode({ kind: 'closed' })}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <input
        className="search-input"
        type="search"
        placeholder="Buscar pelo número do concurso…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {error && <div className="error-box">{error}</div>}
      {loading && <p className="empty-hint">Carregando…</p>}

      {!loading && !error && result && (
        <>
          <p className="section-hint">
            {result.total.toLocaleString('pt-BR')} concursos no banco — página {result.page} de{' '}
            {result.pages.toLocaleString('pt-BR')}
          </p>
          {result.items.length === 0 && (
            <p className="empty-hint">Nenhum concurso encontrado.</p>
          )}
          {result.items.map((r) => (
            <GameCard
              key={r.concurso}
              label={`Concurso ${r.concurso} — ${new Date(`${r.data}T12:00:00`).toLocaleDateString('pt-BR')}`}
              numbers={r.dezenas}
              actions={
                readonly ? undefined : confirmDelete === r.concurso ? (
                  <span className="confirm-group">
                    <button className="btn danger small" onClick={() => handleDelete(r.concurso)}>
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
                    <button className="btn secondary small" onClick={() => openEdit(r)}>
                      Editar
                    </button>
                    <button
                      className="btn danger small"
                      onClick={() => setConfirmDelete(r.concurso)}
                    >
                      Excluir
                    </button>
                  </span>
                )
              }
            />
          ))}
          {result.pages > 1 && (
            <div className="pagination">
              <button
                className="btn secondary small"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Anterior
              </button>
              <span className="qty-label">
                {result.page} / {result.pages.toLocaleString('pt-BR')}
              </span>
              <button
                className="btn secondary small"
                disabled={page >= result.pages}
                onClick={() => setPage(page + 1)}
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
