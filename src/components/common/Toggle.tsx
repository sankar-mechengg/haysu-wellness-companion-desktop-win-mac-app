interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
}: ToggleProps) {
  const track = size === "sm" ? "w-9 h-5" : "w-11 h-6";
  const thumb = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";
  const translate =
    size === "sm"
      ? checked
        ? "translate-x-4"
        : "translate-x-0.5"
      : checked
        ? "translate-x-5"
        : "translate-x-0.5";

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
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex flex-shrink-0 items-center ${track} rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-haysu-300
          ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
          ${checked ? "bg-haysu-500" : "bg-gray-300 dark:bg-gray-600"}
        `}
      >
        <span
          className={`inline-block ${thumb} rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${translate}`}
        />
      </button>
    </div>
  );
}
