import Card from "../common/Card";
import ProgressRing from "../common/ProgressRing";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  progress?: number;
  variant?: "water" | "move" | "tomato" | "default";
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color,
  progress,
  variant = "default",
}: StatsCardProps) {
  return (
    <Card variant={variant} padding="md" className="flex items-center gap-3 min-w-0">
      {progress !== undefined ? (
        <ProgressRing progress={progress} size={48} strokeWidth={4} color={color}>
          <span className="text-sm">{icon}</span>
        </ProgressRing>
      ) : (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${color}22` }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          {title}
        </p>
        <p className="text-xl font-bold text-text-primary dark:text-text-primary-dark leading-tight tabular-nums">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark truncate">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
