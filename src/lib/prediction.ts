import type { DezenaStats } from './api';
import { DEFAULT_FILTERS, GAME_SIZE, validateGame } from './lotofacil';

export interface ScoredDezena {
  dezena: number;
  score: number; // 0..1
}

export interface PredictionWeights {
  frequencia: number;
  recente: number;
  atraso: number;
}

export const DEFAULT_WEIGHTS: PredictionWeights = {
  frequencia: 0.4,
  recente: 0.4,
  atraso: 0.2,
};

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

// Score 0..1 por dezena: mistura de frequência histórica, frequência recente e atraso
export function scoreDezenas(
  stats: DezenaStats[],
  weights: PredictionWeights = DEFAULT_WEIGHTS,
): ScoredDezena[] {
  const freq = normalize(stats.map((s) => s.frequencia));
  const recente = normalize(stats.map((s) => s.frequenciaJanela));
  const atraso = normalize(stats.map((s) => s.atraso));
  const totalWeight = weights.frequencia + weights.recente + weights.atraso;

  return stats
    .map((s, i) => ({
      dezena: s.dezena,
      score:
        (freq[i] * weights.frequencia + recente[i] * weights.recente + atraso[i] * weights.atraso) /
        totalWeight,
    }))
    .sort((a, b) => b.score - a.score);
}

// Amostra 15 dezenas sem reposição, com probabilidade proporcional ao score
function weightedSample(scored: ScoredDezena[], rng: () => number): number[] {
  const pool = scored.map((s) => ({ ...s, weight: s.score + 0.05 }));
  const picked: number[] = [];
  while (picked.length < GAME_SIZE && pool.length > 0) {
    const totalWeight = pool.reduce((acc, p) => acc + p.weight, 0);
    let r = rng() * totalWeight;
    let index = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) {
        index = i;
        break;
      }
    }
    picked.push(pool[index].dezena);
    pool.splice(index, 1);
  }
  return picked.sort((a, b) => a - b);
}

export interface Palpite {
  dezenas: number[];
  aprovadoPelosFiltros: boolean;
}

const MAX_ATTEMPTS = 200;

// Gera um palpite ponderado pelos scores; tenta obter um que também passe nos
// filtros estatísticos padrão do gerador
export function generatePalpite(
  stats: DezenaStats[],
  rng: () => number = Math.random,
): Palpite {
  const scored = scoreDezenas(stats);
  let candidate: number[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    candidate = weightedSample(scored, rng);
    if (validateGame(candidate, DEFAULT_FILTERS)) {
      return { dezenas: candidate, aprovadoPelosFiltros: true };
    }
  }
  return { dezenas: candidate, aprovadoPelosFiltros: false };
}
