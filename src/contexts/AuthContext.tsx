import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type AuthUser,
  clearToken,
  createMeuJogo,
  getMe,
  getToken,
  login as apiLogin,
  setToken,
} from '../lib/api';
import { loadSavedGames } from '../lib/storage';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  hasTab: (tabId: string) => boolean;
  canWrite: () => boolean;
  maxJogos: number | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

async function migrateLocalStorage(): Promise<void> {
  const local = loadSavedGames();
  if (local.length === 0) return;
  for (const game of local) {
    try {
      await createMeuJogo(game.numbers);
    } catch {
      // Limite atingido ou outro erro — ignora silenciosamente
    }
  }
  localStorage.removeItem('lotosmart:games');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, senha: string): Promise<void> {
    const data = await apiLogin(email, senha);
    setToken(data.token);
    await migrateLocalStorage();
    setUser(data.user);
  }

  function logout(): void {
    clearToken();
    setUser(null);
  }

  function hasTab(tabId: string): boolean {
    return user?.permissoes.tabs.includes(tabId) ?? false;
  }

  function canWrite(): boolean {
    return user?.permissoes.resultadosWrite ?? false;
  }

  const maxJogos = user?.permissoes.maxJogos ?? null;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasTab, canWrite, maxJogos }}>
      {children}
    </AuthContext.Provider>
  );
}
