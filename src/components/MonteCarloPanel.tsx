import { useEffect, useRef, useState } from 'react';
import { DRAWS_PER_YEAR } from '../lib/lotofacil';
import {
  PRIZE_TIERS,
  type MonteCarloMessage,
  type MonteCarloRequest,
  type MonteCarloResult,
} from '../lib/monteCarlo';
import type { SavedGame } from '../lib/storage';

interface MonteCarloPanelProps {
  generatedGames: number[][];
  savedGames: SavedGame[];
}

const DRAW_OPTIONS = [10_000, 100_000];

function formatYears(draws: number, count: number): string {
  if (count === 0) return 'não ocorreu';
  const years = draws / count / DRAWS_PER_YEAR;
  if (years < 1 / 12) return 'menos de 1 mês';
  if (years < 1) return `~${Math.max(1, Math.round(years * 12))} meses`;
  return `~${years.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos`;
}

export function MonteCarloPanel({ generatedGames, savedGames }: MonteCarloPanelProps) {
  const [drawCount, setDrawCount] = useState(DRAW_OPTIONS[0]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const workerRef = useRef<Worker>();

  const cards = [...generatedGames, ...savedGames.map((g) => g.numbers)];

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const handleRun = () => {
    if (cards.length === 0 || running) return;

    workerRef.current?.terminate();
    const worker = new Worker(new URL('../lib/monteCarlo.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    setRunning(true);
    setProgress(0);
    setResult(null);

    worker.onmessage = (event: MessageEvent<MonteCarloMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        setProgress(msg.done / msg.total);
      } else {
        setResult(msg);
        setRunning(false);
        worker.terminate();
      }
    };

    const request: MonteCarloRequest = { draws: drawCount, smartCards: cards };
    worker.postMessage(request);
  };

  return (
    <div>
      <h2 className="section-title">Simulador Monte Carlo</h2>
      <p className="section-hint">
        Rode milhares de sorteios virtuais e veja em quanto tempo suas combinações inteligentes
        atingiriam cada faixa de premiação, comparadas a palpites 100% aleatórios.
      </p>

      <div className="qty-group">
        <span className="qty-label">Sorteios:</span>
        {DRAW_OPTIONS.map((n) => (
          <button
            key={n}
            className={`qty-btn ${n === drawCount ? 'active' : ''}`}
            style={{ width: 'auto', padding: '0 12px' }}
            onClick={() => setDrawCount(n)}
          >
            {n.toLocaleString('pt-BR')}
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn" onClick={handleRun} disabled={running || cards.length === 0}>
          {running ? 'Simulando…' : '⚡ Rodar Simulação'}
        </button>
      </div>

      {cards.length === 0 && (
        <p className="empty-hint">
          Gere apostas na aba “Gerador” ou salve jogos para rodar a simulação.
        </p>
      )}

      {running && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {result && (
        <div className="filter-panel">
          <div className="filter-label">
            {result.draws.toLocaleString('pt-BR')} sorteios × {result.cardCount}{' '}
            {result.cardCount === 1 ? 'cartão' : 'cartões'} — concluído em{' '}
            {(result.elapsedMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}s
          </div>
          <table className="mc-table">
            <thead>
              <tr>
                <th>Pontos</th>
                <th>Inteligente</th>
                <th>Aleatório</th>
                <th>Tempo p/ acertar*</th>
              </tr>
            </thead>
            <tbody>
              {PRIZE_TIERS.map((tier) => (
                <tr key={tier}>
                  <td>{tier}</td>
                  <td>{result.smart[tier].toLocaleString('pt-BR')}×</td>
                  <td>{result.random[tier].toLocaleString('pt-BR')}×</td>
                  <td>{formatYears(result.draws, result.smart[tier])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mc-note">
            * Estimativa jogando estes {result.cardCount}{' '}
            {result.cardCount === 1 ? 'cartão' : 'cartões'} em todos os concursos (~
            {DRAWS_PER_YEAR} por ano). Lembre-se: cada sorteio é independente — filtros
            estatísticos organizam as apostas, mas não alteram a probabilidade matemática de
            cada combinação.
          </p>
        </div>
      )}
    </div>
  );
}
