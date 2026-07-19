import { describe, expect, it } from 'vitest';
import type { DezenaStats } from './api';
import { generatePalpite, scoreDezenas } from './prediction';
import { GAME_SIZE, MAX_NUMBER, MIN_NUMBER } from './lotofacil';

function makeStats(): DezenaStats[] {
  return Array.from({ length: 25 }, (_, i) => ({
    dezena: i + 1,
    frequencia: 2000 + i * 10,
    percentual: 60,
    frequenciaJanela: 30 - i,
    atraso: i % 5,
    maiorAtraso: 10,
  }));
}

describe('scoreDezenas', () => {
  it('retorna 25 scores entre 0 e 1, ordenados do maior para o menor', () => {
    const scored = scoreDezenas(makeStats());
    expect(scored).toHaveLength(25);
    for (const s of scored) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  it('dá score máximo à dezena dominante em todos os índices', () => {
    const stats = makeStats();
    stats[24] = {
      dezena: 25,
      frequencia: 99999,
      percentual: 100,
      frequenciaJanela: 999,
      atraso: 999,
      maiorAtraso: 999,
    };
    const scored = scoreDezenas(stats);
    expect(scored[0].dezena).toBe(25);
    expect(scored[0].score).toBeCloseTo(1, 5);
  });

  it('empata tudo em 0.5 quando os índices são uniformes', () => {
    const uniform = makeStats().map((s) => ({
      ...s,
      frequencia: 100,
      frequenciaJanela: 10,
      atraso: 2,
    }));
    const scored = scoreDezenas(uniform);
    for (const s of scored) expect(s.score).toBeCloseTo(0.5, 5);
  });
});

describe('generatePalpite', () => {
  it('gera 15 dezenas únicas entre 1 e 25, ordenadas', () => {
    for (let i = 0; i < 20; i++) {
      const { dezenas } = generatePalpite(makeStats());
      expect(dezenas).toHaveLength(GAME_SIZE);
      expect(new Set(dezenas).size).toBe(GAME_SIZE);
      expect(Math.min(...dezenas)).toBeGreaterThanOrEqual(MIN_NUMBER);
      expect(Math.max(...dezenas)).toBeLessThanOrEqual(MAX_NUMBER);
      expect(dezenas).toEqual([...dezenas].sort((a, b) => a - b));
    }
  });

  it('é determinístico com RNG fixo', () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const a = generatePalpite(makeStats(), rng);
    seed = 42;
    const b = generatePalpite(makeStats(), rng);
    expect(a).toEqual(b);
  });
});
