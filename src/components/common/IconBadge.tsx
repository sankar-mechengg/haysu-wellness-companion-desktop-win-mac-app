import { ReactNode } from "react";

type BadgeColor = "water" | "move" | "tomato" | "purple" | "amber" | "default";
type BadgeSize = "sm" | "md" | "lg";

interface IconBadgeProps {
  icon: ReactNode;
  color?: BadgeColor;
  size?: BadgeSize;
  className?: string;
  pulse?: boolean;
}

const colorClasses: Record<BadgeColor, string> = {
  water: "bg-water-light text-water dark:bg-water/15 dark:text-water",
  move: "bg-move-light text-move dark:bg-move/15 dark:text-move",
  tomato: "bg-tomato-light text-tomato dark:bg-tomato/15 dark:text-tomato",
  purple: "bg-purple-100 text-purple-500 dark:bg-purple-500/15 dark:text-purple-400",
  amber: "bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400",
  default: "bg-gray-100 text-gray-500 dark:bg-gray-600/20 dark:text-gray-400",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-lg",
  lg: "w-14 h-14 text-2xl",
};

export default function IconBadge({
  icon,
  color = "default",
  size = "md",
  className = "",
  pulse = false,
}: IconBadgeProps) {
  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-xl
        ${colorClasses[color]}
        ${sizeClasses[size]}
        ${pulse ? "animate-pulse-soft" : ""}
        ${className}
      `}
    >
      {icon}
    </div>
  );
}
