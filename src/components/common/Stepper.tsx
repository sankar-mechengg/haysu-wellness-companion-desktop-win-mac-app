interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
}

/** Compact numeric stepper for settings rows. */
export default function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  label,
  description,
  disabled,
}: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const btn =
    "w-7 h-7 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text-primary dark:text-text-primary-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark disabled:opacity-40 disabled:cursor-not-allowed text-sm leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-haysu-300";
  return (
    <div className={`flex items-center justify-between gap-4 ${disabled ? "opacity-50" : ""}`}>
      {(label || description) && (
        <div className="flex flex-col min-w-0">
          {label && (
            <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
              {description}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          className={btn}
          onClick={() => set(value - step)}
          disabled={disabled || value <= min}
          aria-label="Decrease"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) set(v);
          }}
          className="w-14 text-center text-sm font-semibold tabular-nums rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-haysu-500 py-1 focus:outline-none focus:ring-2 focus:ring-haysu-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={btn}
          onClick={() => set(value + step)}
          disabled={disabled || value >= max}
          aria-label="Increase"
        >
          +
        </button>
        {unit && (
          <span className="text-xs text-text-secondary dark:text-text-secondary-dark w-8">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
