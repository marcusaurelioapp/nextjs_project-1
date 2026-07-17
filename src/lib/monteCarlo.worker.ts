import { GAME_SIZE, MAX_NUMBER, generateRandomGame } from './lotofacil';
import {
  emptyTierCounts,
  type MonteCarloMessage,
  type MonteCarloRequest,
  type PrizeTier,
  type TierCounts,
} from './monteCarlo';

// Converte um jogo em máscara de bits (dezenas 1..25 cabem em 25 bits)
function toMask(numbers: number[]): number {
  let mask = 0;
  for (const n of numbers) {
    mask |= 1 << (n - 1);
  }
  return mask;
}

function popcount(v: number): number {
  v = v - ((v >> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
  return (((v + (v >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

// Sorteio via Fisher-Yates parcial, direto em máscara de bits
const pool = new Uint8Array(MAX_NUMBER);
function drawMask(): number {
  for (let i = 0; i < MAX_NUMBER; i++) pool[i] = i + 1;
  let mask = 0;
  for (let i = 0; i < GAME_SIZE; i++) {
    const j = i + Math.floor(Math.random() * (MAX_NUMBER - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
    mask |= 1 << (pool[i] - 1);
  }
  return mask;
}

function tally(cardMasks: number[], drawnMask: number, counts: TierCounts): void {
  for (const cardMask of cardMasks) {
    const hits = popcount(cardMask & drawnMask);
    if (hits >= 11) counts[hits as PrizeTier]++;
  }
}

self.onmessage = (event: MessageEvent<MonteCarloRequest>) => {
  const { draws, smartCards } = event.data;
  const start = performance.now();

  const smartMasks = smartCards.map(toMask);
  // Palpites 100% aleatórios em mesma quantidade, para comparação justa
  const randomMasks = smartCards.map(() => toMask(generateRandomGame()));

  const smart = emptyTierCounts();
  const random = emptyTierCounts();

  const progressStep = Math.max(1, Math.floor(draws / 50));

  for (let i = 0; i < draws; i++) {
    const drawnMask = drawMask();
    tally(smartMasks, drawnMask, smart);
    tally(randomMasks, drawnMask, random);

    if ((i + 1) % progressStep === 0) {
      const progress: MonteCarloMessage = { type: 'progress', done: i + 1, total: draws };
      self.postMessage(progress);
    }
  }

  const result: MonteCarloMessage = {
    type: 'result',
    draws,
    cardCount: smartCards.length,
    smart,
    random,
    elapsedMs: performance.now() - start,
  };
  self.postMessage(result);
};
