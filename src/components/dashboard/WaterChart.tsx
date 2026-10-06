import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../common/Card";
import type { DailyStats } from "../../lib/api";
import { formatWaterMl, parseLocalDate, weekdayShort } from "../../lib/format";
import { useChartTheme } from "./chartTheme";

export default function WaterChart({ data, goalMl }: { data: DailyStats[]; goalMl: number }) {
  const t = useChartTheme();
  const rows = data.map((d) => ({
    day: weekdayShort(parseLocalDate(d.date)),
    consumed: d.water_total_ml,
    glasses: d.water_consumed,
  }));
  const max = Math.max(goalMl, ...rows.map((r) => r.consumed)) * 1.1;

  return (
    <Card padding="md">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          💧 Water intake
        </h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
          Dashed line is your daily goal ({formatWaterMl(goalMl)})
        </p>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60b8ff" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#60b8ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={t.tick} axisLine={false} tickLine={false} />
            <YAxis
              tick={t.tick}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(max / 500) * 500]}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}L`}
            />
            <Tooltip
              contentStyle={t.tooltipStyle}
              cursor={{ stroke: t.muted }}
              formatter={(value: number, _n, p) => [
                `${formatWaterMl(value)} (${(p.payload as { glasses: number }).glasses} logged)`,
                "Consumed",
              ]}
            />
            <ReferenceLine y={goalMl} stroke="#60b8ff" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Area
              type="monotone"
              dataKey="consumed"
              stroke="#60b8ff"
              strokeWidth={2.5}
              fill="url(#waterGradient)"
              dot={{ r: 3.5, fill: "#60b8ff", strokeWidth: 2, stroke: t.surface }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
