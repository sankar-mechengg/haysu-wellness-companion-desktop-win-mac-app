interface Option<T extends string | number> {
  value: T;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface SegmentedProps<T extends string | number> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  ariaLabel?: string;
}

export default function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = "md",
  fullWidth = false,
  ariaLabel,
}: SegmentedProps<T>) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex gap-0.5 p-0.5 rounded-xl bg-surface-hover dark:bg-surface-hover-dark ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`${pad} ${fullWidth ? "flex-1" : ""} rounded-[10px] font-medium transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-haysu-300
              disabled:opacity-40 disabled:cursor-not-allowed
              ${
                active
                  ? "bg-surface dark:bg-surface-dark text-text-primary dark:text-text-primary-dark shadow-sm"
                  : "text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark"
              }`}
          >
            {o.icon && <span className="mr-1">{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
