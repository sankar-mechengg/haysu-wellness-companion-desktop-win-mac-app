interface AnimatedHProps {
  size?: number;
  loading?: boolean;
  className?: string;
  color?: string;
}

export default function AnimatedH({
  size = 48,
  loading = false,
  className = "",
  color = "#3b93f7",
}: AnimatedHProps) {
  const barWidth = size * 0.14;
  const barHeight = size * 0.55;
  const crossY = size * 0.5 - barWidth * 0.5;
  const leftX = size * 0.25;
  const rightX = size * 0.75 - barWidth;
  const topY = size * 0.5 - barHeight * 0.5;

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={loading ? "animate-spin-h" : ""}
        style={{
          filter: loading ? "none" : "drop-shadow(0 2px 4px rgba(59,147,247,0.25))",
        }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 1}
          fill={color}
          opacity={0.1}
        />

        {/* H lettermark rotated 45 degrees */}
        <g transform={`rotate(-45 ${size / 2} ${size / 2})`}>
          {/* Left vertical bar */}
          <rect
            x={leftX}
            y={topY}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={color}
          />
          {/* Right vertical bar */}
          <rect
            x={rightX}
            y={topY}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={color}
          />
          {/* Horizontal cross bar */}
          <rect
            x={leftX}
            y={crossY}
            width={rightX - leftX + barWidth}
            height={barWidth}
            rx={barWidth / 2}
            fill={color}
          />
        </g>

        {/* Loading pulse ring */}
        {loading && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 2}
            fill="none"
            stroke={color}
            strokeWidth={2}
            opacity={0.3}
            className="animate-pulse-soft"
          />
        )}
      </svg>
    </div>
  );
}
