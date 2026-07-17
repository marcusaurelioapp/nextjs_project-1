import { PRIZE_TIERS, type PrizeTier } from './lotofacil';

export type TierCounts = Record<PrizeTier, number>;

export interface MonteCarloRequest {
  draws: number;
  smartCards: number[][];
}

export interface MonteCarloProgress {
  type: 'progress';
  done: number;
  total: number;
}

export interface MonteCarloResult {
  type: 'result';
  draws: number;
  cardCount: number;
  smart: TierCounts;
  random: TierCounts;
  elapsedMs: number;
}

export type MonteCarloMessage = MonteCarloProgress | MonteCarloResult;

export function emptyTierCounts(): TierCounts {
  return { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
}

export { PRIZE_TIERS };
export type { PrizeTier };
