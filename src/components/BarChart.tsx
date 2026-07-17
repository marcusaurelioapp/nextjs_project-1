export interface BarDatum {
  key: string;
  label: string;
  value: number;
  display?: string; // texto do valor (default: value formatado)
  muted?: boolean; // barra fora de destaque (ex.: fora da faixa no histograma)
  hint?: string; // tooltip
}

interface BarChartProps {
  data: BarDatum[];
  color: string;
  maxValue?: number;
}

// Barras horizontais em HTML puro: rótulo | trilha | valor.
// Marcas finas com ponta arredondada só no lado do dado; valores em tinta de texto.
export function BarChart({ data, color, maxValue }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="chart" role="img">
      {data.map((d) => (
        <div className="chart-row" key={d.key} title={d.hint ?? `${d.label}: ${d.value}`}>
          <span className="chart-label">{d.label}</span>
          <span className="chart-track">
            <span
              className="chart-fill"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.muted ? 'var(--border)' : color,
              }}
            />
          </span>
          <span className="chart-value">
            {d.display ?? d.value.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
}
