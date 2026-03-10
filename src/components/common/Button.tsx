import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "water" | "move" | "tomato";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-haysu-500 text-white hover:bg-haysu-600 active:bg-haysu-600 shadow-sm",
  secondary:
    "bg-surface text-text-primary border border-border hover:bg-surface-hover dark:bg-surface-dark dark:text-text-primary-dark dark:border-border-dark dark:hover:bg-surface-hover-dark",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-hover dark:text-text-secondary-dark dark:hover:bg-surface-hover-dark",
  danger:
    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
  water:
    "bg-water text-white hover:opacity-90 active:opacity-80",
  move:
    "bg-move text-white hover:opacity-90 active:opacity-80",
  tomato:
    "bg-tomato text-white hover:opacity-90 active:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 ease-out
        focus:outline-none focus:ring-2 focus:ring-haysu-300 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
