# LotoSmart Pro — Material de origem (conversa no Gemini)

Conteúdo gerado em uma conversa no Gemini (link original: https://share.gemini.google/kObAlULx5nbN)
e trazido para este repositório como ponto de partida do projeto.

---

## Parte 1 — Protótipo React Native (Expo)

> Para fazermos isso virar um app de celular de forma rápida, moderna e limpa, a melhor escolha é
> usar o React Native com Expo. Como você provavelmente já domina o ecossistema do React, vai se
> sentir totalmente em casa: o código faz sentido, a estilização roda direto no TypeScript e a
> gente consegue estruturar a lógica dos filtros matemáticos perfeitamente.
>
> Abaixo, estruturei o código completo do componente principal (App.tsx) para um aplicativo
> gerador de apostas inteligentes.
>
> Ele roda a lógica que combinamos: gera os números aleatoriamente e aplica um "filtro de
> qualidade" (só aprova o jogo se ele tiver o equilíbrio correto de pares/ímpares e números primos).

### Estrutura do Código (App.tsx)

```tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, StatusBar } from 'react-native';

// Configurações e constantes matemáticas da Lotofácil
const TOTAL_NUMBERS = 15;
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23];

export default function App() {
  const [games, setGames] = useState<number[][]>([]);

  // Lógica de validação estocástica
  const validateGame = (numbers: number[]): boolean => {
    const odds = numbers.filter(n => n % 2 !== 0).length;
    const evens = TOTAL_NUMBERS - odds;
    const primesCount = numbers.filter(n => PRIMES.includes(n)).length;

    // Regra 1: Equilíbrio de Pares e Ímpares (8x7 ou 7x8)
    const hasGoodParity = (odds === 8 && evens === 7) || (odds === 7 && evens === 8);

    // Regra 2: Quantidade de Primos ideal (geralmente entre 5 e 6 no histórico)
    const hasGoodPrimes = primesCount === 5 || primesCount === 6;

    return hasGoodParity && hasGoodPrimes;
  };

  const generateSmartGame = (): number[] => {
    while (true) {
      const candidate: Set<number> = new Set();

      while (candidate.size < TOTAL_NUMBERS) {
        const randomNum = Math.floor(Math.random() * 25) + 1;
        candidate.add(randomNum);
      }

      const sortedCandidate = Array.from(candidate).sort((a, b) => a - b);

      // Se passar no crivo das regras estatísticas, retorna o jogo
      if (validateGame(sortedCandidate)) {
        return sortedCandidate;
      }
    }
  };

  const handleGenerateGames = (quantity: number) => {
    const newGames: number[][] = [];
    for (let i = 0; i < quantity; i++) {
      newGames.push(generateSmartGame());
    }
    setGames(newGames);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>LotoSmart 🎲</Text>
        <Text style={styles.subtitle}>Gerador Matemático para Lotofácil</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={() => handleGenerateGames(1)}>
          <Text style={styles.buttonText}>Gerar 1 Jogo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => handleGenerateGames(3)}>
          <Text style={styles.buttonText}>Gerar Combo (3)</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={games}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item, index }) => (
          <View style={styles.gameCard}>
            <Text style={styles.gameLabel}>Jogo #{index + 1}</Text>
            <View style={styles.ballsContainer}>
              {item.map((num) => (
                <View key={num} style={styles.ball}>
                  <Text style={styles.ballText}>{num.toString().padStart(2, '0')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#29292e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00b37e',
  },
  subtitle: {
    fontSize: 14,
    color: '#8d8d99',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  button: {
    backgroundColor: '#00875f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#202024',
    borderWidth: 1,
    borderColor: '#00b37e',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  gameCard: {
    backgroundColor: '#202024',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00b37e',
  },
  gameLabel: {
    color: '#8d8d99',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ballsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ball: {
    backgroundColor: '#29292e',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#323238',
  },
  ballText: {
    color: '#e1e1e6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
```

---

## Parte 2 — Especificação da PWA "LotoSmart Pro"

> Para darmos esse passo adiante, vamos transformar aquela lógica simples do aplicativo em uma
> ferramenta robusta, visualmente incrível e totalmente interativa.
>
> Desenvolvi uma Progressive Web App (PWA) completa de simulação e geração inteligente chamada
> LotoSmart Pro. Ela foi projetada com foco na experiência mobile (mas roda perfeitamente no
> desktop) e traz recursos avançados que vão muito além de um gerador comum:
>
> - **Gerador Estatístico com Filtros Customizáveis:** Você pode ligar e desligar filtros em tempo
>   real (Paridade Ímpar/Par, Números Primos, Sequências Máximas e até a Soma Total das dezenas).
> - **Simulador de Sorteio em Tempo Real:** Gere suas apostas, clique em "Simular Sorteio" e veja
>   o algoritmo sortear as dezenas dinamicamente, calculando na hora quantos pontos você faria em
>   cada cartão (com direito a efeito de confete para prêmios altos!).
> - **Simulador de Monte Carlo (Testar em Larga Escala):** Um painel onde você pode rodar 10.000
>   ou até 100.000 sorteios virtuais instantâneos para ver estatisticamente em quantos anos você
>   atingiria as premiações de 11, 12, 13, 14 ou 15 pontos usando suas combinações inteligentes
>   comparadas a palpites totalmente aleatórios.
> - **Gerenciador de Cartões (Meus Jogos):** Salve suas melhores combinações no armazenamento
>   local (localStorage) do celular/navegador para não perdê-las.
>
> ### O que mudamos para tornar o aplicativo incrível:
>
> - **Filtro de Soma Otimizado:** Agora o app calcula a soma total dos 15 números gerados. Na
>   Lotofácil real, mais de 78% dos sorteios históricos têm a soma das dezenas entre 175 e 215.
>   Jogar fora desse intervalo é, estatisticamente, queimar dinheiro. O app impede isso!
> - **Integração com Armazenamento Local (localStorage):** Os jogos que você salvar permanecerão
>   salvos na memória do seu aparelho mesmo se você fechar a aba ou desligar o telefone.
> - **Simulação Prática e Lúdica:** Você pode "girar o globo virtual" e o sistema gera bolinhas
>   douradas dinamicamente na tela, calculando os prêmios na hora com animações.
> - **Simulador Monte Carlo:** Se quiser testar o poder de sobrevivência estatística dos seus
>   cartões de forma séria, o gerador de Monte Carlo roda 10.000 sorteios de banco de dados em
>   frações de segundo para mostrar o retorno real do jogo.

> Dica: No celular, você pode selecionar "Adicionar à tela de início" nas opções do navegador
> para deixá-lo com cara de aplicativo nativo instalado!

---

**Nota:** o código HTML da PWA citada na conversa não foi compartilhado; apenas a especificação
acima. A implementação neste repositório (Vite + React + TypeScript) foi construída a partir
desta especificação.
