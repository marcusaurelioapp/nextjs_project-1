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

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (manifest + service worker)
- [canvas-confetti](https://github.com/catdad/canvas-confetti)
- [Vitest](https://vitest.dev/) para os testes da lógica estatística

## Como rodar

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm test         # testes da lógica (Vitest)
npm run build    # build de produção (dist/)
npm run preview  # serve o build de produção
```

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
