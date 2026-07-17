# LotoSmart Pro 🎲

PWA de geração inteligente e simulação de jogos da **Lotofácil**. Roda no navegador (desktop ou
celular) e pode ser instalada na tela de início como um app nativo.

> Material de origem do projeto (conversa no Gemini): [`docs/gemini-origem.md`](docs/gemini-origem.md)

## Funcionalidades

- **Gerador Estatístico com Filtros Customizáveis** — ligue/desligue em tempo real:
  - Paridade equilibrada (7 ímpares × 8 pares ou 8 × 7)
  - Números primos (5 ou 6 por jogo)
  - Soma otimizada (entre 175 e 215 — faixa de ~78% dos sorteios históricos)
  - Sequência máxima de números consecutivos (limite configurável)
- **Simulador de Sorteio em Tempo Real** — gire o globo virtual, veja as dezenas douradas
  aparecerem uma a uma e os pontos de cada cartão calculados na hora (com confete para 14/15
  pontos 🎉).
- **Simulador Monte Carlo** — rode 10.000 ou 100.000 sorteios virtuais em um Web Worker e
  compare em quantos anos suas combinações inteligentes atingiriam 11/12/13/14/15 pontos versus
  palpites 100% aleatórios.
- **Meus Jogos** — salve suas melhores combinações no `localStorage` do aparelho.
- **Resultados Oficiais (CRUD)** — banco **SQLite local** com todos os concursos históricos da
  Lotofácil (3.737 sorteios importados de `data/lotofacil.xlsx`), administrado por uma API REST
  e uma aba de gerenciamento no app (listar, buscar, adicionar, editar e excluir concursos).

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (manifest + service worker)
- [canvas-confetti](https://github.com/catdad/canvas-confetti)
- [Vitest](https://vitest.dev/) para os testes da lógica estatística
- [Express](https://expressjs.com/) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
  para a API de resultados (banco SQLite em `server/lotofacil.db`)

## Como rodar

```bash
npm install
npm run dev:full # API (porta 3001) + app (porta 5173) juntos
npm test         # testes da lógica (Vitest)
npm run build    # build de produção (dist/)
```

Scripts individuais:

```bash
npm run server    # só a API REST (na primeira execução importa a planilha automaticamente)
npm run dev       # só o front (proxy /api → localhost:3001)
npm run db:import # (re)importa data/lotofacil.xlsx para o banco SQLite
npm run preview   # serve o build de produção (proxy /api → localhost:3001)
```

Em produção, `npm run server` também serve o build da pasta `dist/` — ou seja, API + PWA em um
único processo na porta 3001.

### API REST

| Método | Rota                        | Descrição                                  |
| ------ | --------------------------- | ------------------------------------------ |
| GET    | `/api/resultados`           | Lista paginada (`page`, `limit`, `search`) |
| GET    | `/api/resultados/:concurso` | Busca um concurso                          |
| POST   | `/api/resultados`           | Cria (409 se o concurso já existe)         |
| PUT    | `/api/resultados/:concurso` | Atualiza data/dezenas                      |
| DELETE | `/api/resultados/:concurso` | Exclui                                     |

Payload: `{ "concurso": 3737, "data": "2026-07-16", "dezenas": [2,3,5,...] }` — o servidor
valida 15 dezenas distintas entre 1 e 25.

## Instalar como app no celular

1. Abra o site no navegador do celular (Chrome/Safari).
2. Menu do navegador → **"Adicionar à tela de início"**.
3. O LotoSmart Pro abre em tela cheia, como um app instalado.

## Estrutura

```
src/
  lib/lotofacil.ts           # constantes e lógica estatística (filtros, sorteio, acertos)
  lib/monteCarlo.worker.ts   # simulação Monte Carlo em Web Worker (bitmask + popcount)
  lib/storage.ts             # persistência de jogos no localStorage
  components/                # Gerador, Simulador de Sorteio, Monte Carlo, Meus Jogos
```

## Aviso

Este app é uma ferramenta de estudo e entretenimento. Filtros estatísticos organizam as
apostas segundo padrões históricos, mas **não alteram a probabilidade matemática** de nenhuma
combinação ser sorteada. Jogue com responsabilidade.
