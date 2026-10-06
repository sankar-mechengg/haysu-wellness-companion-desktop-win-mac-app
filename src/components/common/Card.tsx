import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "water" | "move" | "tomato" | "transparent";
  padding?: "sm" | "md" | "lg" | "none";
  hoverable?: boolean;
}

const variantClasses = {
  default: "bg-surface border border-border dark:bg-surface-dark dark:border-border-dark",
  water: "bg-water-light border border-water/20 dark:bg-water/10 dark:border-water/20",
  move: "bg-move-light border border-move/20 dark:bg-move/10 dark:border-move/20",
  tomato: "bg-tomato-light border border-tomato/20 dark:bg-tomato/10 dark:border-tomato/20",
  transparent: "bg-transparent border-none",
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  children,
  variant = "default",
  padding = "md",
  hoverable = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl transition-all duration-200
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hoverable ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : "shadow-sm"}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
