import { useEffect, useState } from "react";

interface SliderProps {
  value: number;
  /** Fires continuously while dragging. */
  onChange?: (value: number) => void;
  /** Fires once the user lets go (pointer up / key up). Use this to persist. */
  onChangeEnd?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  format?: (value: number) => string;
  disabled?: boolean;
}

export default function Slider({
  value,
  onChange,
  onChangeEnd,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = "",
  format,
  disabled = false,
}: SliderProps) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const progress = max > min ? ((local - min) / (max - min)) * 100 : 0;
  const display = format ? format(local) : `${local}${unit}`;

  const commit = () => {
    if (local !== value) onChangeEnd?.(local);
  };

  return (
    <div className={`w-full ${disabled ? "opacity-50" : ""}`}>
      {(label || display) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {label}
            </span>
          )}
          <span className="text-sm font-semibold text-haysu-500 tabular-nums">{display}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          onChange?.(v);
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="w-full cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, var(--color-haysu-500) 0%, var(--color-haysu-500) ${progress}%, var(--color-border) ${progress}%, var(--color-border) 100%)`,
        }}
      />
      <div className="flex justify-between mt-1 text-[11px] text-text-secondary dark:text-text-secondary-dark">
        <span>{format ? format(min) : `${min}${unit}`}</span>
        <span>{format ? format(max) : `${max}${unit}`}</span>
      </div>
    </div>
  );
}
