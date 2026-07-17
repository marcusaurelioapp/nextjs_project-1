import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  GAME_SIZE,
  MAX_NUMBER,
  MIN_NUMBER,
  SUM_MAX,
  SUM_MIN,
  countHits,
  countOdds,
  countPrimes,
  gameStats,
  generateRandomGame,
  generateSmartGame,
  maxConsecutive,
  sumOf,
  validateGame,
} from './lotofacil';

describe('generateRandomGame', () => {
  it('gera 15 dezenas únicas entre 1 e 25, ordenadas', () => {
    for (let i = 0; i < 50; i++) {
      const game = generateRandomGame();
      expect(game).toHaveLength(GAME_SIZE);
      expect(new Set(game).size).toBe(GAME_SIZE);
      expect(Math.min(...game)).toBeGreaterThanOrEqual(MIN_NUMBER);
      expect(Math.max(...game)).toBeLessThanOrEqual(MAX_NUMBER);
      expect(game).toEqual([...game].sort((a, b) => a - b));
    }
  });
});

describe('funções de estatística', () => {
  const game = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  it('conta ímpares', () => {
    expect(countOdds(game)).toBe(8);
  });

  it('conta primos', () => {
    expect(countPrimes(game)).toBe(6); // 2, 3, 5, 7, 11, 13
  });

  it('soma as dezenas', () => {
    expect(sumOf(game)).toBe(120);
  });

  it('mede a maior sequência consecutiva', () => {
    expect(maxConsecutive(game)).toBe(15);
    expect(maxConsecutive([1, 2, 4, 5, 6, 10, 12, 14, 20, 25])).toBe(3);
    expect(maxConsecutive([1, 3, 5, 7, 9])).toBe(1);
  });
});

describe('validateGame', () => {
  it('rejeita soma fora da faixa quando o filtro de soma está ativo', () => {
    const lowSum = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // soma 120
    expect(validateGame(lowSum, { ...DEFAULT_FILTERS })).toBe(false);
    expect(
      validateGame(lowSum, {
        parity: false,
        primes: false,
        sum: true,
        maxSequence: false,
        maxSequenceLimit: 5,
      }),
    ).toBe(false);
  });

  it('valida paridade 8x7 / 7x8', () => {
    const filters = {
      parity: true,
      primes: false,
      sum: false,
      maxSequence: false,
      maxSequenceLimit: 5,
    };
    const eightOdds = [1, 3, 5, 7, 9, 11, 13, 15, 2, 4, 6, 8, 10, 12, 14];
    expect(validateGame(eightOdds, filters)).toBe(true);
    const allButOneOdd = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 2, 4];
    expect(validateGame(allButOneOdd, filters)).toBe(false);
  });

  it('valida limite de sequência', () => {
    const filters = {
      parity: false,
      primes: false,
      sum: false,
      maxSequence: true,
      maxSequenceLimit: 4,
    };
    const seq5 = [1, 2, 3, 4, 5, 10, 12, 14, 16, 18, 20, 21, 23, 24, 25].sort((a, b) => a - b);
    expect(validateGame(seq5, filters)).toBe(false);
    const seq4 = [1, 2, 3, 4, 10, 12, 14, 16, 18, 20, 22, 23, 24, 6, 25].sort((a, b) => a - b);
    expect(validateGame(seq4, filters)).toBe(true);
  });

  it('aceita tudo com filtros desligados', () => {
    const anyGame = generateRandomGame();
    expect(
      validateGame(anyGame, {
        parity: false,
        primes: false,
        sum: false,
        maxSequence: false,
        maxSequenceLimit: 5,
      }),
    ).toBe(true);
  });
});

describe('generateSmartGame', () => {
  it('respeita todos os filtros padrão', () => {
    for (let i = 0; i < 30; i++) {
      const game = generateSmartGame(DEFAULT_FILTERS);
      const stats = gameStats(game);
      expect([7, 8]).toContain(stats.odds);
      expect([5, 6]).toContain(stats.primes);
      expect(stats.sum).toBeGreaterThanOrEqual(SUM_MIN);
      expect(stats.sum).toBeLessThanOrEqual(SUM_MAX);
      expect(stats.maxSeq).toBeLessThanOrEqual(DEFAULT_FILTERS.maxSequenceLimit);
    }
  });
});

describe('countHits', () => {
  it('conta acertos entre cartão e sorteio', () => {
    const card = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    expect(countHits(card, card)).toBe(15);
    const draw = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    expect(countHits(card, draw)).toBe(5);
  });
});
