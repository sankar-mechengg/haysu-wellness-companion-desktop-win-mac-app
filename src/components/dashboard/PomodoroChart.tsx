import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Card from "../common/Card";
import { DailyStats } from "../../lib/tauriApi";

interface PomodoroChartProps {
  data: DailyStats[];
}

export default function PomodoroChart({ data }: PomodoroChartProps) {
  const chartData = data.map((d) => ({
    day: new Date(d.date).toLocaleDateString("en", { weekday: "short" }),
    sessions: d.pomodoro_work_completed,
    minutes: d.pomodoro_total_minutes,
  }));

  const totalSessions = chartData.reduce((s, d) => s + d.sessions, 0);
  const totalMinutes = chartData.reduce((s, d) => s + d.minutes, 0);

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            🍅 Pomodoro Focus
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            {totalSessions} sessions · {totalMinutes} min this week
          </p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
            />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number, name: string) => {
                if (name === "minutes") return [`${value} min`, "Focus Time"];
                return [value, "Sessions"];
              }}
            />
            <Bar
              dataKey="sessions"
              name="Sessions"
              fill="#ff7b7b"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.sessions > 0 ? "#ff7b7b" : "#f3f4f6"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini focus time bar below */}
      <div className="mt-3 flex gap-1">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <div
              className="h-1.5 rounded-full mx-auto transition-all"
              style={{
                backgroundColor: d.minutes > 0 ? "#ff7b7b" : "#f3f4f6",
                opacity: d.minutes > 0 ? Math.min(1, d.minutes / 120 + 0.3) : 0.3,
              }}
            />
            <p className="text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1">
              {d.minutes > 0 ? `${d.minutes}m` : "—"}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
