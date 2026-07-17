import type { SavedGame } from '../lib/storage';
import { GameCard } from './GameCard';

interface SavedGamesProps {
  savedGames: SavedGame[];
  onRemove: (id: string) => void;
}

export function SavedGames({ savedGames, onRemove }: SavedGamesProps) {
  return (
    <div>
      <h2 className="section-title">Meus Jogos</h2>
      <p className="section-hint">
        Combinações salvas no armazenamento local do seu aparelho — permanecem mesmo depois de
        fechar o app.
      </p>

      {savedGames.length === 0 ? (
        <p className="empty-hint">
          Nenhum jogo salvo. Gere apostas na aba “Gerador” e toque em “Salvar”. 💾
        </p>
      ) : (
        savedGames.map((game, index) => (
          <GameCard
            key={game.id}
            label={`Salvo #${index + 1} — ${new Date(game.createdAt).toLocaleDateString('pt-BR')}`}
            numbers={game.numbers}
            showStats
            actions={
              <button className="btn danger small" onClick={() => onRemove(game.id)}>
                Excluir
              </button>
            }
          />
        ))
      )}
    </div>
  );
}
