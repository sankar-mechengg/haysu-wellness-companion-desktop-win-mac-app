import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import Card from "../common/Card";
import { DailyStats } from "../../lib/tauriApi";
import { formatWaterMl } from "../../lib/waterCalc";

interface WaterChartProps {
  data: DailyStats[];
  goalMl?: number;
}

export default function WaterChart({ data, goalMl = 2450 }: WaterChartProps) {
  const chartData = data.map((d) => ({
    day: new Date(d.date).toLocaleDateString("en", { weekday: "short" }),
    consumed: d.water_total_ml,
    goal: goalMl,
    glasses: d.water_consumed,
    skipped: d.water_skipped,
  }));

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            💧 Water Intake
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            Goal: {formatWaterMl(goalMl)}/day
          </p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60b8ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60b8ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}L`}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.95)",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number) => [formatWaterMl(value), "Consumed"]}
            />
            <ReferenceLine
              y={goalMl}
              stroke="#60b8ff"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="consumed"
              stroke="#60b8ff"
              strokeWidth={2.5}
              fill="url(#waterGradient)"
              dot={{ r: 4, fill: "#60b8ff", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
