import { useState } from 'react';
import { DEFAULT_FILTERS, type Filters } from './lib/lotofacil';
import { loadSavedGames, removeGame, saveGame } from './lib/storage';
import { GeneratorPanel } from './components/GeneratorPanel';
import { DrawSimulator } from './components/DrawSimulator';
import { MonteCarloPanel } from './components/MonteCarloPanel';
import { SavedGames } from './components/SavedGames';
import { ResultsAdmin } from './components/ResultsAdmin';
import { StatsPanel } from './components/StatsPanel';

const TABS = [
  { id: 'generator', label: 'Gerador' },
  { id: 'draw', label: 'Sorteio' },
  { id: 'montecarlo', label: 'Monte Carlo' },
  { id: 'saved', label: 'Meus Jogos' },
  { id: 'results', label: 'Resultados' },
  { id: 'stats', label: 'Estatísticas' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<TabId>('generator');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [games, setGames] = useState<number[][]>([]);
  const [savedGames, setSavedGames] = useState(loadSavedGames);

  const handleSaveGame = (numbers: number[]) => {
    setSavedGames(saveGame(numbers));
  };

  const handleRemoveGame = (id: string) => {
    setSavedGames(removeGame(id));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>LotoSmart Pro 🎲</h1>
        <p>Gerador Matemático e Simulador para Lotofácil</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
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
          />
        )}
        {tab === 'draw' && <DrawSimulator generatedGames={games} savedGames={savedGames} />}
        {tab === 'montecarlo' && (
          <MonteCarloPanel generatedGames={games} savedGames={savedGames} />
        )}
        {tab === 'saved' && <SavedGames savedGames={savedGames} onRemove={handleRemoveGame} />}
        {tab === 'results' && <ResultsAdmin />}
        {tab === 'stats' && <StatsPanel />}
      </main>
    </div>
  );
}
