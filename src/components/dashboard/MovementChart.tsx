import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../common/Card";
import type { DailyStats } from "../../lib/api";
import { parseLocalDate, weekdayShort } from "../../lib/format";
import { useChartTheme } from "./chartTheme";

export default function MovementChart({ data }: { data: DailyStats[] }) {
  const t = useChartTheme();
  const rows = data.map((d) => ({
    day: weekdayShort(parseLocalDate(d.date)),
    Completed: d.movement_completed,
    Skipped: d.movement_skipped,
  }));
  const max = Math.max(1, ...rows.map((r) => r.Completed + r.Skipped));

  return (
    <Card padding="md">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          🏃 Movement breaks
        </h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
          Completed vs skipped
        </p>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 6, left: -18, bottom: 0 }} barGap={3}>
            <XAxis dataKey="day" tick={t.tick} axisLine={false} tickLine={false} />
            <YAxis
              tick={t.tick}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              domain={[0, Math.max(max + 1, 4)]}
            />
            <Tooltip contentStyle={t.tooltipStyle} cursor={t.cursor} />
            <Bar
              dataKey="Completed"
              stackId="a"
              fill="#5cc99a"
              radius={[0, 0, 0, 0]}
              maxBarSize={30}
            />
            <Bar
              dataKey="Skipped"
              stackId="a"
              fill={t.muted}
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
