export interface SavedGame {
  id: string;
  numbers: number[];
  createdAt: string;
}

const STORAGE_KEY = 'lotosmart:games';

export function loadSavedGames(): SavedGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g): g is SavedGame =>
        g && typeof g.id === 'string' && Array.isArray(g.numbers) && g.numbers.length > 0,
    );
  } catch {
    return [];
  }
}

function persist(games: SavedGame[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function saveGame(numbers: number[]): SavedGame[] {
  const games = loadSavedGames();
  const game: SavedGame = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    numbers,
    createdAt: new Date().toISOString(),
  };
  const next = [game, ...games];
  persist(next);
  return next;
}

export function removeGame(id: string): SavedGame[] {
  const next = loadSavedGames().filter((g) => g.id !== id);
  persist(next);
  return next;
}
