import { useEffect, useState } from 'react';
import { DEFAULT_FILTERS, type Filters } from './lib/lotofacil';
import { listMeusJogos, createMeuJogo, deleteMeuJogo, getToken } from './lib/api';
import { loadSavedGames, removeGame, saveGame, type SavedGame } from './lib/storage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GeneratorPanel } from './components/GeneratorPanel';
import { DrawSimulator } from './components/DrawSimulator';
import { MonteCarloPanel } from './components/MonteCarloPanel';
import { SavedGames } from './components/SavedGames';
import { ResultsAdmin } from './components/ResultsAdmin';
import { StatsPanel } from './components/StatsPanel';
import { LoginPage } from './components/LoginPage';
import { UserAdmin } from './components/UserAdmin';

const ALL_TABS = [
  { id: 'generator', label: 'Gerador' },
  { id: 'draw', label: 'Sorteio' },
  { id: 'montecarlo', label: 'Monte Carlo' },
  { id: 'saved', label: 'Meus Jogos' },
  { id: 'results', label: 'Resultados' },
  { id: 'stats', label: 'Estatísticas' },
  { id: 'admin', label: 'Admin Usuários' },
] as const;

type TabId = (typeof ALL_TABS)[number]['id'];

const PERFIL_LABELS: Record<string, string> = {
  free: 'Grátis',
  gerador: 'Gerador',
  assinante: 'Assinante',
  gestor: 'Gestor',
};

function AppShell() {
  const { user, loading, logout, hasTab, canWrite, maxJogos } = useAuth();

  const [tab, setTab] = useState<TabId>('generator');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [games, setGames] = useState<number[][]>([]);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);

  // Carrega jogos salvos (backend se autenticado, localStorage caso contrário)
  useEffect(() => {
    if (loading) return;
    if (user && getToken()) {
      listMeusJogos()
        .then((remote) =>
          setSavedGames(
            remote.map((r) => ({ id: String(r.id), numbers: r.numeros, createdAt: r.created_at })),
          ),
        )
        .catch(() => setSavedGames(loadSavedGames()));
    } else {
      setSavedGames(loadSavedGames());
    }
  }, [user, loading]);

  // Navega para a primeira aba permitida quando o perfil muda
  useEffect(() => {
    if (!user) return;
    if (!hasTab(tab)) {
      const first = ALL_TABS.find((t) => hasTab(t.id));
      if (first) setTab(first.id);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveGame(numbers: number[]) {
    if (user && getToken()) {
      try {
        const remote = await createMeuJogo(numbers);
        setSavedGames((prev) => [
          { id: String(remote.id), numbers: remote.numeros, createdAt: remote.created_at },
          ...prev,
        ]);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao salvar jogo.');
      }
    } else {
      setSavedGames(saveGame(numbers));
    }
  }

  async function handleRemoveGame(id: string) {
    if (user && getToken()) {
      try {
        await deleteMeuJogo(Number(id));
        setSavedGames((prev) => prev.filter((g) => g.id !== id));
      } catch {
        // ignora
      }
    } else {
      setSavedGames(removeGame(id));
    }
  }

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>LotoSmart Pro 🎲</h1>
        </header>
        <div className="content" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p style={{ color: 'var(--text-dim)' }}>Carregando…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <header className="header">
          <h1>LotoSmart Pro 🎲</h1>
          <p>Gerador Matemático e Simulador para Lotofácil</p>
        </header>
        <LoginPage />
      </div>
    );
  }

  const visibleTabs = ALL_TABS.filter((t) => hasTab(t.id));

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div>
            <h1>LotoSmart Pro 🎲</h1>
            <p>Gerador Matemático e Simulador para Lotofácil</p>
          </div>
          <div className="header-user">
            <span className={`perfil-badge ${user.perfil}`}>
              {PERFIL_LABELS[user.perfil] ?? user.perfil}
            </span>
            <span className="header-user-name">{user.nome}</span>
            <button className="btn-sair" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <nav className="tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'generator' && (
          <GeneratorPanel
            filters={filters}
            onFiltersChange={setFilters}
            games={games}
            onGamesChange={setGames}
            onSaveGame={handleSaveGame}
            maxSavedGames={maxJogos}
            savedCount={savedGames.length}
          />
        )}
        {tab === 'draw' && <DrawSimulator generatedGames={games} savedGames={savedGames} />}
        {tab === 'montecarlo' && (
          <MonteCarloPanel generatedGames={games} savedGames={savedGames} />
        )}
        {tab === 'saved' && <SavedGames savedGames={savedGames} onRemove={handleRemoveGame} />}
        {tab === 'results' && <ResultsAdmin readonly={!canWrite()} />}
        {tab === 'stats' && <StatsPanel />}
        {tab === 'admin' && <UserAdmin />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
