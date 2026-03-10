interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  showValue?: boolean;
  disabled?: boolean;
}

export default function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit = "",
  showValue = true,
  disabled = false,
}: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div className={`w-full ${disabled ? "opacity-50" : ""}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-haysu-500">
              {value}{unit}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-haysu-300
            disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #3b93f7 0%, #3b93f7 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
          {min}{unit}
        </span>
        <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
          {max}{unit}
        </span>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #3b93f7;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #3b93f7;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
