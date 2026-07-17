import type { ReactNode } from 'react';
import { gameStats } from '../lib/lotofacil';
import { NumberBall } from './NumberBall';

interface GameCardProps {
  label: string;
  numbers: number[];
  hitNumbers?: Set<number>;
  showStats?: boolean;
  actions?: ReactNode;
  headerExtra?: ReactNode;
}

export function GameCard({
  label,
  numbers,
  hitNumbers,
  showStats = false,
  actions,
  headerExtra,
}: GameCardProps) {
  const stats = showStats ? gameStats(numbers) : null;

  return (
    <div className="game-card">
      <div className="game-card-header">
        <span className="game-label">{label}</span>
        {headerExtra}
        {actions}
      </div>
      <div className="balls">
        {numbers.map((n) => (
          <NumberBall key={n} value={n} variant={hitNumbers?.has(n) ? 'hit' : 'default'} />
        ))}
      </div>
      {stats && (
        <div className="stats-row">
          <span className="stat-badge">
            {stats.odds} ímpares × {stats.evens} pares
          </span>
          <span className="stat-badge">{stats.primes} primos</span>
          <span className="stat-badge">soma {stats.sum}</span>
          <span className="stat-badge">seq. máx. {stats.maxSeq}</span>
        </div>
      )}
    </div>
  );
}
