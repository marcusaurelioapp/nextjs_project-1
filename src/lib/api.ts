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

const BASE = '/api/resultados';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
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
