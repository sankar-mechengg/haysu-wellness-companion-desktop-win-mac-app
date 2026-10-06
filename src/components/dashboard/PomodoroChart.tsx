import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../common/Card";
import type { DailyStats } from "../../lib/api";
import { formatMinutes, parseLocalDate, weekdayShort } from "../../lib/format";
import { useChartTheme } from "./chartTheme";

export default function PomodoroChart({ data }: { data: DailyStats[] }) {
  const t = useChartTheme();
  const rows = data.map((d) => ({
    day: weekdayShort(parseLocalDate(d.date)),
    minutes: d.pomodoro_total_minutes,
    sessions: d.pomodoro_work_completed,
  }));
  const total = rows.reduce((s, r) => s + r.minutes, 0);
  const sessions = rows.reduce((s, r) => s + r.sessions, 0);

  return (
    <Card padding="md">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          🍅 Focus time
        </h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
          {sessions} sessions · {formatMinutes(total)} this week
        </p>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <XAxis dataKey="day" tick={t.tick} axisLine={false} tickLine={false} />
            <YAxis
              tick={t.tick}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tickFormatter={(v: number) => `${v}m`}
            />
            <Tooltip
              contentStyle={t.tooltipStyle}
              cursor={t.cursor}
              formatter={(value: number, _n, p) => [
                `${formatMinutes(value)} · ${(p.payload as { sessions: number }).sessions} sessions`,
                "Focus",
              ]}
            />
            <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={30}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.minutes > 0 ? "#ff7b7b" : t.muted} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
