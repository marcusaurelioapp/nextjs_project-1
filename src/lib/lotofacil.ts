// Constantes matemáticas da Lotofácil
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 25;
export const GAME_SIZE = 15;
export const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23];

// Na Lotofácil real, mais de 78% dos sorteios históricos têm a soma das dezenas entre 175 e 215
export const SUM_MIN = 175;
export const SUM_MAX = 215;

// Faixas de premiação oficiais
export const PRIZE_TIERS = [11, 12, 13, 14, 15] as const;
export type PrizeTier = (typeof PRIZE_TIERS)[number];

// ~300 concursos por ano (sorteios de segunda a sábado)
export const DRAWS_PER_YEAR = 300;

export interface Filters {
  parity: boolean; // 7x8 ou 8x7 entre ímpares e pares
  primes: boolean; // 5 ou 6 números primos
  sum: boolean; // soma total entre SUM_MIN e SUM_MAX
  maxSequence: boolean; // limita números consecutivos
  maxSequenceLimit: number; // tamanho máximo permitido de sequência
}

export const DEFAULT_FILTERS: Filters = {
  parity: true,
  primes: true,
  sum: true,
  maxSequence: true,
  maxSequenceLimit: 5,
};

export function countOdds(numbers: number[]): number {
  return numbers.filter((n) => n % 2 !== 0).length;
}

export function countPrimes(numbers: number[]): number {
  return numbers.filter((n) => PRIMES.includes(n)).length;
}

export function sumOf(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}

// Maior quantidade de números consecutivos no jogo (espera entrada ordenada)
export function maxConsecutive(sorted: number[]): number {
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

export function validateGame(sorted: number[], filters: Filters): boolean {
  if (filters.parity) {
    const odds = countOdds(sorted);
    const evens = GAME_SIZE - odds;
    const hasGoodParity = (odds === 8 && evens === 7) || (odds === 7 && evens === 8);
    if (!hasGoodParity) return false;
  }

  if (filters.primes) {
    const primesCount = countPrimes(sorted);
    if (primesCount !== 5 && primesCount !== 6) return false;
  }

  if (filters.sum) {
    const total = sumOf(sorted);
    if (total < SUM_MIN || total > SUM_MAX) return false;
  }

  if (filters.maxSequence) {
    if (maxConsecutive(sorted) > filters.maxSequenceLimit) return false;
  }

  return true;
}

// Sorteia 15 dezenas distintas entre 1 e 25, ordenadas
export function generateRandomGame(): number[] {
  const candidate = new Set<number>();
  while (candidate.size < GAME_SIZE) {
    candidate.add(Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER);
  }
  return Array.from(candidate).sort((a, b) => a - b);
}

export const drawNumbers = generateRandomGame;

const MAX_ATTEMPTS = 200_000;

// Gera jogos até um passar no crivo dos filtros ativos
export function generateSmartGame(filters: Filters): number[] {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateRandomGame();
    if (validateGame(candidate, filters)) {
      return candidate;
    }
  }
  throw new Error(
    'Não foi possível gerar um jogo com os filtros atuais. Tente relaxar algum filtro.',
  );
}

export function countHits(card: number[], draw: number[]): number {
  const drawn = new Set(draw);
  let hits = 0;
  for (const n of card) {
    if (drawn.has(n)) hits++;
  }
  return hits;
}

export interface GameStats {
  odds: number;
  evens: number;
  primes: number;
  sum: number;
  maxSeq: number;
}

export function gameStats(sorted: number[]): GameStats {
  const odds = countOdds(sorted);
  return {
    odds,
    evens: GAME_SIZE - odds,
    primes: countPrimes(sorted),
    sum: sumOf(sorted),
    maxSeq: maxConsecutive(sorted),
  };
}

export function formatNumber(n: number): string {
  return n.toString().padStart(2, '0');
}
