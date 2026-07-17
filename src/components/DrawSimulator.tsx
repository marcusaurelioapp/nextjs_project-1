import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { countHits, drawNumbers } from '../lib/lotofacil';
import type { SavedGame } from '../lib/storage';
import { GameCard } from './GameCard';
import { NumberBall } from './NumberBall';

interface DrawSimulatorProps {
  generatedGames: number[][];
  savedGames: SavedGame[];
}

const BALL_INTERVAL_MS = 220;

export function DrawSimulator({ generatedGames, savedGames }: DrawSimulatorProps) {
  const [drawn, setDrawn] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const cards = [
    ...generatedGames.map((numbers, i) => ({ label: `Jogo #${i + 1}`, numbers })),
    ...savedGames.map((g, i) => ({ label: `Salvo #${i + 1}`, numbers: g.numbers })),
  ];

  const finished = drawn.length > 0 && revealed === drawn.length;
  const revealedSet = new Set(drawn.slice(0, revealed));

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!finished || cards.length === 0) return;
    const bestHits = Math.max(...cards.map((c) => countHits(c.numbers, drawn)));
    if (bestHits >= 14) {
      confetti({ particleCount: 220, spread: 90, origin: { y: 0.6 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const handleDraw = () => {
    clearInterval(timerRef.current);
    const numbers = drawNumbers();
    setDrawn(numbers);
    setRevealed(0);
    setSpinning(true);

    let count = 0;
    timerRef.current = setInterval(() => {
      count++;
      setRevealed(count);
      if (count >= numbers.length) {
        clearInterval(timerRef.current);
        setSpinning(false);
      }
    }, BALL_INTERVAL_MS);
  };

  return (
    <div>
      <h2 className="section-title">Simulador de Sorteio</h2>
      <p className="section-hint">
        Gire o globo virtual e veja quantos pontos seus cartões fariam neste sorteio.
      </p>

      <div className="actions">
        <button className="btn gold" onClick={handleDraw} disabled={spinning}>
          {spinning ? 'Sorteando…' : '🎱 Simular Sorteio'}
        </button>
      </div>

      <div className="draw-globe">
        {drawn.length === 0 ? (
          <p className="empty-hint">As dezenas sorteadas aparecerão aqui.</p>
        ) : (
          <div className="balls">
            {drawn.slice(0, revealed).map((n) => (
              <NumberBall key={n} value={n} variant="gold" />
            ))}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="empty-hint">
          Gere apostas na aba “Gerador” ou salve jogos em “Meus Jogos” para conferir os pontos.
        </p>
      ) : (
        cards.map((card, index) => {
          const hits = finished ? countHits(card.numbers, drawn) : null;
          return (
            <GameCard
              key={index}
              label={card.label}
              numbers={card.numbers}
              hitNumbers={drawn.length > 0 ? revealedSet : undefined}
              headerExtra={
                hits !== null ? (
                  <span
                    className={`hits-badge ${
                      hits === 15 ? 'jackpot' : hits >= 11 ? 'prize' : ''
                    }`}
                  >
                    {hits} pontos{hits === 15 ? ' 🏆' : hits >= 11 ? ' 💰' : ''}
                  </span>
                ) : undefined
              }
            />
          );
        })
      )}
    </div>
  );
}
