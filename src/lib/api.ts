export interface Resultado {
  concurso: number;
  data: string; // YYYY-MM-DD
  dezenas: number[];
}

export interface ResultadoPage {
  items: Resultado[];
  total: number;
  page: number;
  pages: number;
}

export interface DezenaStats {
  dezena: number;
  frequencia: number;
  percentual: number;
  frequenciaJanela: number;
  atraso: number;
  maiorAtraso: number;
}

export interface Estatisticas {
  totalConcursos: number;
  janela: number;
  ultimoConcurso: Resultado;
  dezenas: DezenaStats[];
  distribuicoes: {
    impares: { qtd: number; concursos: number }[];
    primos: { qtd: number; concursos: number }[];
    soma: {
      bins: { de: number; ate: number; concursos: number }[];
      faixa: { min: number; max: number; percentual: number };
    };
  };
}

export interface Permissoes {
  tabs: string[];
  resultadosWrite: boolean;
  maxJogos: number | null;
}

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  perfil: 'free' | 'gerador' | 'assinante' | 'gestor';
  permissoes: Permissoes;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface UsuarioRow {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  perfilNome: string;
  created_at: string;
}

export interface SavedGameRemote {
  id: number;
  numeros: number[];
  created_at: string;
}

// ---------- Token helpers ----------

export const TOKEN_KEY = 'lotosmart:token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------- Core fetch ----------

const BASE = '/api/resultados';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
  } catch {
    throw new Error(
      'Não foi possível conectar à API. Verifique se o servidor está rodando (npm run server).',
    );
  }
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------- Resultados ----------

export function listResultados(page: number, search: string): Promise<ResultadoPage> {
  const params = new URLSearchParams({ page: String(page), limit: '10' });
  if (search) params.set('search', search);
  return request<ResultadoPage>(`${BASE}?${params}`);
}

export function createResultado(resultado: Resultado): Promise<Resultado> {
  return request<Resultado>(BASE, { method: 'POST', body: JSON.stringify(resultado) });
}

export function updateResultado(resultado: Resultado): Promise<Resultado> {
  return request<Resultado>(`${BASE}/${resultado.concurso}`, {
    method: 'PUT',
    body: JSON.stringify(resultado),
  });
}

export function deleteResultado(concurso: number): Promise<void> {
  return request<void>(`${BASE}/${concurso}`, { method: 'DELETE' });
}

export function getEstatisticas(janela: number): Promise<Estatisticas> {
  return request<Estatisticas>(`/api/estatisticas?janela=${janela}`);
}

// ---------- Auth ----------

export function login(email: string, senha: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/me');
}

// ---------- Usuários (Gestor) ----------

export function listUsuarios(): Promise<UsuarioRow[]> {
  return request<UsuarioRow[]>('/api/usuarios');
}

export function createUsuario(data: {
  nome: string;
  email: string;
  senha: string;
  perfilSlug: string;
}): Promise<UsuarioRow> {
  return request<UsuarioRow>('/api/usuarios', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUsuario(
  id: number,
  data: Partial<{ nome: string; email: string; senha: string; perfilSlug: string }>,
): Promise<UsuarioRow> {
  return request<UsuarioRow>(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteUsuario(id: number): Promise<void> {
  return request<void>(`/api/usuarios/${id}`, { method: 'DELETE' });
}

// ---------- Meus Jogos (backend) ----------

export function listMeusJogos(): Promise<SavedGameRemote[]> {
  return request<SavedGameRemote[]>('/api/meus-jogos');
}

export function createMeuJogo(numeros: number[]): Promise<SavedGameRemote> {
  return request<SavedGameRemote>('/api/meus-jogos', {
    method: 'POST',
    body: JSON.stringify({ numeros }),
  });
}

export function deleteMeuJogo(id: number): Promise<void> {
  return request<void>(`/api/meus-jogos/${id}`, { method: 'DELETE' });
}
