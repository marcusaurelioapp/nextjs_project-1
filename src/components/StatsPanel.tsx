import { useCallback, useEffect, useState } from 'react';
import { getEstatisticas, type Estatisticas } from '../lib/api';
import { formatNumber } from '../lib/lotofacil';
import { generatePalpite, scoreDezenas, type Palpite } from '../lib/prediction';
import { BarChart, type BarDatum } from './BarChart';
import { GameCard } from './GameCard';

const JANELAS = [25, 50, 100];
const CHART_GREEN = 'var(--chart-green)';
const CHART_GOLD = 'var(--chart-gold)';

export function StatsPanel() {
  const [janela, setJanela] = useState(50);
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freqMode, setFreqMode] = useState<'todas' | 'janela'>('todas');
  const [palpite, setPalpite] = useState<Palpite | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEstatisticas(janela);
      setStats(data);
      setPalpite(generatePalpite(data.dezenas));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [janela]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="empty-hint">Carregando estatísticas…</p>;
  }
  if (error || !stats) {
    return <div className="error-box">{error ?? 'Erro ao carregar estatísticas.'}</div>;
  }

  const freqData: BarDatum[] = [...stats.dezenas]
    .sort((a, b) =>
      freqMode === 'todas'
        ? b.frequencia - a.frequencia
        : b.frequenciaJanela - a.frequenciaJanela,
    )
    .map((d) => ({
      key: String(d.dezena),
      label: formatNumber(d.dezena),
      value: freqMode === 'todas' ? d.frequencia : d.frequenciaJanela,
      display:
        freqMode === 'todas'
          ? `${d.frequencia.toLocaleString('pt-BR')} (${d.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`
          : `${d.frequenciaJanela}×`,
      hint:
        freqMode === 'todas'
          ? `Dezena ${formatNumber(d.dezena)}: sorteada ${d.frequencia.toLocaleString('pt-BR')} vezes (${d.percentual.toFixed(1)}% dos concursos)`
          : `Dezena ${formatNumber(d.dezena)}: ${d.frequenciaJanela} vezes nos últimos ${stats.janela} concursos`,
    }));

  const atrasoData: BarDatum[] = [...stats.dezenas]
    .sort((a, b) => b.atraso - a.atraso)
    .slice(0, 10)
    .map((d) => ({
      key: String(d.dezena),
      label: formatNumber(d.dezena),
      value: d.atraso,
      display: d.atraso === 0 ? 'saiu no último' : `${d.atraso}`,
      hint: `Dezena ${formatNumber(d.dezena)}: ${d.atraso} concursos sem sair (recorde histórico: ${d.maiorAtraso})`,
    }));

  const imparesData: BarDatum[] = stats.distribuicoes.impares.map((d) => ({
    key: String(d.qtd),
    label: `${d.qtd}í`,
    value: d.concursos,
    hint: `${d.qtd} ímpares × ${15 - d.qtd} pares: ${d.concursos.toLocaleString('pt-BR')} concursos`,
  }));

  const primosData: BarDatum[] = stats.distribuicoes.primos.map((d) => ({
    key: String(d.qtd),
    label: `${d.qtd}p`,
    value: d.concursos,
    hint: `${d.qtd} primos: ${d.concursos.toLocaleString('pt-BR')} concursos`,
  }));

  const { faixa, bins } = stats.distribuicoes.soma;
  const somaData: BarDatum[] = bins.map((b) => ({
    key: String(b.de),
    label: `${b.de}`,
    value: b.concursos,
    muted: b.ate < faixa.min || b.de > faixa.max,
    hint: `Soma ${b.de}–${b.ate}: ${b.concursos.toLocaleString('pt-BR')} concursos`,
  }));

  const scores = new Map(scoreDezenas(stats.dezenas).map((s) => [s.dezena, s.score]));

  return (
    <div>
      <h2 className="section-title">Estatísticas</h2>
      <p className="section-hint">
        Índices calculados sobre os {stats.totalConcursos.toLocaleString('pt-BR')} concursos do
        banco local.
      </p>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-tile-value">
            {stats.totalConcursos.toLocaleString('pt-BR')}
          </span>
          <span className="stat-tile-label">concursos</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-value">{stats.ultimoConcurso.concurso}</span>
          <span className="stat-tile-label">
            último — {new Date(`${stats.ultimoConcurso.data}T12:00:00`).toLocaleDateString('pt-BR')}
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-value">
            {faixa.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </span>
          <span className="stat-tile-label">
            somas entre {faixa.min}–{faixa.max}
          </span>
        </div>
      </div>

      <div className="filter-panel">
        <div className="chart-header">
          <div>
            <div className="filter-label">Dezenas mais e menos sorteadas</div>
            <div className="filter-desc">
              {freqMode === 'todas'
                ? 'Todas as épocas, da mais frequente à menos frequente'
                : `Últimos ${stats.janela} concursos`}
            </div>
          </div>
          <div className="confirm-group">
            <button
              className={`qty-btn wide ${freqMode === 'todas' ? 'active' : ''}`}
              onClick={() => setFreqMode('todas')}
            >
              Todas
            </button>
            <button
              className={`qty-btn wide ${freqMode === 'janela' ? 'active' : ''}`}
              onClick={() => setFreqMode('janela')}
            >
              Últimos {stats.janela}
            </button>
          </div>
        </div>
        {freqMode === 'janela' && (
          <div className="qty-group" style={{ marginBottom: 8 }}>
            <span className="qty-label">Janela:</span>
            {JANELAS.map((j) => (
              <button
                key={j}
                className={`qty-btn wide ${j === janela ? 'active' : ''}`}
                onClick={() => setJanela(j)}
              >
                {j}
              </button>
            ))}
          </div>
        )}
        <BarChart data={freqData} color={CHART_GREEN} />
      </div>

      <div className="filter-panel">
        <div className="filter-label">Dezenas mais atrasadas</div>
        <div className="filter-desc">Concursos consecutivos sem a dezena ser sorteada (top 10)</div>
        <BarChart data={atrasoData} color={CHART_GOLD} />
      </div>

      <div className="filter-panel">
        <div className="filter-label">Ímpares por concurso</div>
        <div className="filter-desc">
          Quantos concursos saíram com cada quantidade de dezenas ímpares
        </div>
        <BarChart data={imparesData} color={CHART_GREEN} />
      </div>

      <div className="filter-panel">
        <div className="filter-label">Primos por concurso</div>
        <div className="filter-desc">
          Quantos concursos saíram com cada quantidade de números primos
        </div>
        <BarChart data={primosData} color={CHART_GREEN} />
      </div>

      <div className="filter-panel">
        <div className="filter-label">Distribuição da soma das dezenas</div>
        <div className="filter-desc">
          Faixas de 10 em 10 — em verde, a faixa otimizada {faixa.min}–{faixa.max} (
          {faixa.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos
          concursos)
        </div>
        <BarChart data={somaData} color={CHART_GREEN} />
      </div>

      <h2 className="section-title">Palpite para o próximo sorteio</h2>
      <p className="section-hint">
        Combinação sugerida pelos índices acima: frequência histórica (40%), frequência recente
        (40%) e atraso (20%).
      </p>
      {palpite && (
        <GameCard
          label={`Palpite — concurso ${stats.ultimoConcurso.concurso + 1}`}
          numbers={palpite.dezenas}
          showStats
          headerExtra={
            palpite.aprovadoPelosFiltros ? (
              <span className="hits-badge prize">filtros ✓</span>
            ) : undefined
          }
          actions={
            <button className="btn secondary small" onClick={() => setPalpite(generatePalpite(stats.dezenas))}>
              Gerar novo
            </button>
          }
        />
      )}
      {palpite && (
        <p className="mc-note">
          Scores das dezenas escolhidas:{' '}
          {palpite.dezenas
            .map((d) => `${formatNumber(d)} (${((scores.get(d) ?? 0) * 100).toFixed(0)})`)
            .join(' · ')}
        </p>
      )}
      <p className="mc-note">
        ⚠️ Palpite baseado em padrões históricos. Cada sorteio é independente — toda combinação
        de 15 dezenas tem exatamente a mesma probabilidade real de ser sorteada.
      </p>
    </div>
  );
}
