import { useId } from 'react';

interface SliderProps {
  label: string;
  unit?: string;
  hint?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}

export function Slider({
  label,
  unit,
  hint,
  min,
  max,
  step = 1,
  value,
  onChange,
  format,
  disabled,
}: SliderProps) {
  const id = useId();
  return (
    <div className="ctrl">
      <div className="ctrl-top">
        <label className="ctrl-label" htmlFor={id}>
          {label}
          {unit && <span>{unit}</span>}
        </label>
        <output className="ctrl-val" htmlFor={id}>
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
      {hint && <div className="ctrl-hint">{hint}</div>}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="toggle" data-on={checked} title={hint}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      {label}
    </label>
  );
}
