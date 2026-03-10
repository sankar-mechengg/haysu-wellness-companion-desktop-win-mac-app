import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Card from "../common/Card";
import { DailyStats } from "../../lib/tauriApi";

interface MovementChartProps {
  data: DailyStats[];
}

export default function MovementChart({ data }: MovementChartProps) {
  const chartData = data.map((d) => ({
    day: new Date(d.date).toLocaleDateString("en", { weekday: "short" }),
    completed: d.movement_completed,
    skipped: d.movement_skipped,
    total: d.movement_completed + d.movement_skipped,
  }));

  const maxVal = Math.max(...chartData.map((d) => d.total), 1);

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            🏃 Movement Sessions
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            Completed vs skipped
          </p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              domain={[0, Math.max(maxVal + 1, 5)]}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Bar dataKey="completed" name="Completed" fill="#7dd3a8" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#7dd3a8" />
              ))}
            </Bar>
            <Bar dataKey="skipped" name="Skipped" fill="#e5e7eb" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#d1d5db" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
