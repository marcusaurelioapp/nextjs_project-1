import { useState } from 'react';
import { generateSmartGame, type Filters } from '../lib/lotofacil';
import { FilterPanel } from './FilterPanel';
import { GameCard } from './GameCard';

interface GeneratorPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  games: number[][];
  onGamesChange: (games: number[][]) => void;
  onSaveGame: (numbers: number[]) => void;
  maxSavedGames?: number | null;
  savedCount?: number;
}

const QUANTITIES = [1, 3, 5, 7];

export function GeneratorPanel({
  filters,
  onFiltersChange,
  games,
  onGamesChange,
  onSaveGame,
  maxSavedGames = null,
  savedCount = 0,
}: GeneratorPanelProps) {
  const atLimit = maxSavedGames !== null && savedCount >= maxSavedGames;
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());

  const handleGenerate = () => {
    setError(null);
    try {
      const newGames: number[][] = [];
      for (let i = 0; i < quantity; i++) {
        newGames.push(generateSmartGame(filters));
      }
      onGamesChange(newGames);
      setSavedIndexes(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = (index: number) => {
    onSaveGame(games[index]);
    setSavedIndexes((prev) => new Set(prev).add(index));
  };

  return (
    <div>
      <h2 className="section-title">Gerador Estatístico</h2>
      <p className="section-hint">
        Ligue e desligue os filtros matemáticos e gere apostas que passam no crivo estatístico.
      </p>

      <FilterPanel filters={filters} onChange={onFiltersChange} />

      <div className="qty-group">
        <span className="qty-label">Quantidade:</span>
        {QUANTITIES.map((q) => (
          <button
            key={q}
            className={`qty-btn ${q === quantity ? 'active' : ''}`}
            onClick={() => setQuantity(q)}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn" onClick={handleGenerate}>
          Gerar {quantity === 1 ? '1 Jogo' : `Combo (${quantity})`}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {games.length === 0 && !error && (
        <p className="empty-hint">Nenhum jogo gerado ainda. Toque em “Gerar” para começar. 🎲</p>
      )}

      {games.map((numbers, index) => (
        <GameCard
          key={index}
          label={`Jogo #${index + 1}`}
          numbers={numbers}
          showStats
          actions={
            <button
              className="btn secondary small"
              disabled={savedIndexes.has(index) || atLimit}
              onClick={() => handleSave(index)}
              title={atLimit && !savedIndexes.has(index) ? `Limite de ${maxSavedGames} jogo(s) atingido` : undefined}
            >
              {savedIndexes.has(index) ? 'Salvo ✓' : atLimit ? 'Limite atingido' : 'Salvar'}
            </button>
          }
        />
      ))}
    </div>
  );
}
