import { SUM_MAX, SUM_MIN, type Filters } from '../lib/lotofacil';

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  extra?: React.ReactNode;
}

function ToggleRow({ label, description, checked, onToggle, extra }: ToggleRowProps) {
  return (
    <div className="filter-row">
      <div>
        <div className="filter-label">{label}</div>
        <div className="filter-desc">{description}</div>
      </div>
      {extra}
      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={label}
        />
        <span className="slider" />
      </label>
    </div>
  );
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <ToggleRow
        label="Paridade equilibrada"
        description="7 ímpares × 8 pares ou 8 × 7"
        checked={filters.parity}
        onToggle={(parity) => onChange({ ...filters, parity })}
      />
      <ToggleRow
        label="Números primos"
        description="Entre 5 e 6 primos por jogo"
        checked={filters.primes}
        onToggle={(primes) => onChange({ ...filters, primes })}
      />
      <ToggleRow
        label="Soma otimizada"
        description={`Soma das dezenas entre ${SUM_MIN} e ${SUM_MAX}`}
        checked={filters.sum}
        onToggle={(sum) => onChange({ ...filters, sum })}
      />
      <ToggleRow
        label="Sequência máxima"
        description="Limita números consecutivos"
        checked={filters.maxSequence}
        onToggle={(maxSequence) => onChange({ ...filters, maxSequence })}
        extra={
          <select
            className="seq-select"
            value={filters.maxSequenceLimit}
            disabled={!filters.maxSequence}
            onChange={(e) =>
              onChange({ ...filters, maxSequenceLimit: Number(e.target.value) })
            }
            aria-label="Limite de sequência"
          >
            {[3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                até {n}
              </option>
            ))}
          </select>
        }
      />
    </div>
  );
}
