import { formatNumber } from '../lib/lotofacil';

interface NumberBallProps {
  value: number;
  variant?: 'default' | 'hit' | 'gold';
}

export function NumberBall({ value, variant = 'default' }: NumberBallProps) {
  const className = variant === 'default' ? 'ball' : `ball ${variant}`;
  return <span className={className}>{formatNumber(value)}</span>;
}
