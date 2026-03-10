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
    <Card variant={variant} padding="md" className="flex items-center gap-4">
      {progress !== undefined ? (
        <ProgressRing
          progress={progress}
          size={48}
          strokeWidth={4}
          color={color}
        >
          <span className="text-sm">{icon}</span>
        </ProgressRing>
      ) : (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `${color}18` }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{title}</p>
        <p className="text-xl font-bold text-text-primary dark:text-text-primary-dark mt-0.5">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
