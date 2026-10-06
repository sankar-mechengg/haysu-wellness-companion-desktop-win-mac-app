import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "../../common/Card";
import Button from "../../common/Button";
import Segmented from "../../common/Segmented";
import { toast } from "../../common/Toast";
import { useChartTheme } from "../chartTheme";
import { useAdherence, useDiary, useMeasurements } from "../../../hooks/useHealth";
import { api, errorMessage, type MeasurementKind } from "../../../lib/api";
import { addDays, formatTimeOfDay, localDateString } from "../../../lib/format";
import {
  dailySeries,
  formatMeasurement,
  MEASUREMENT_KINDS,
  MEASUREMENT_META,
  measurementSeries,
  topSymptoms,
} from "../../../lib/health";

type Range = 7 | 30 | 90;

export default function TrendsPanel() {
  const t = useChartTheme();
  const [range, setRange] = useState<Range>(30);
  const today = localDateString();
  const from = localDateString(addDays(new Date(), -(range - 1)));
  const { data: entries } = useDiary(from, today);
  const { data: measurements } = useMeasurements(undefined, range);
  const { data: adherence } = useAdherence(range);

  const series = useMemo(() => dailySeries(entries, range), [entries, range]);
  const symptoms = useMemo(() => topSymptoms(entries), [entries]);
  const hasWellbeing = series.some((d) => d.mood != null || d.energy != null);

  const [kind, setKind] = useState<MeasurementKind>("weight");
  const [value, setValue] = useState("");
  const [value2, setValue2] = useState("");
  const meta = MEASUREMENT_META[kind];
  const mSeries = useMemo(() => measurementSeries(measurements, kind), [measurements, kind]);
  const recent = useMemo(() => measurements.slice(0, 8), [measurements]);

  const add = async () => {
    const v = Number(value);
    const v2 = meta.dual ? Number(value2) : null;
    if (
      !Number.isFinite(v) ||
      value === "" ||
      (meta.dual && (!Number.isFinite(v2!) || value2 === ""))
    ) {
      toast.error("Enter a number");
      return;
    }
    try {
      await api.addMeasurement({ kind, value: v, value2: v2 });
      toast.success(`${meta.label} saved`);
      setValue("");
      setValue2("");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const tickEvery = Math.max(1, Math.floor(range / 7));
  const numInput =
    "w-24 px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          How the last {range} days went
        </h3>
        <Segmented<Range>
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: 7, label: "7d" },
            { value: 30, label: "30d" },
            { value: 90, label: "90d" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Mood & energy */}
        <Card padding="md">
          <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            Mood & energy
          </h4>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-3">
            Daily average, 1 (low) to 5 (high)
          </p>
          <div className="h-44">
            {hasWellbeing ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={t.tick}
                    axisLine={false}
                    tickLine={false}
                    interval={tickEvery - 1}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={t.tick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={t.tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    name="Mood"
                    stroke="#3b93f7"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    name="Energy"
                    stroke="#f5b53f"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty>Log mood or energy in the diary to see a trend.</Empty>
            )}
          </div>
        </Card>

        {/* Pain & sleep */}
        <Card padding="md">
          <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            Pain & sleep
          </h4>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-3">
            Pain 0–10 (bars) · sleep hours (line)
          </p>
          <div className="h-44">
            {series.some((d) => d.pain != null || d.sleep != null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={t.tick}
                    axisLine={false}
                    tickLine={false}
                    interval={tickEvery - 1}
                  />
                  <YAxis domain={[0, 10]} tick={t.tick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={t.tooltipStyle} cursor={t.cursor} />
                  <Bar
                    dataKey="pain"
                    name="Pain"
                    fill="#ff7b7b"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                  <Line
                    type="monotone"
                    dataKey="sleep"
                    name="Sleep (h)"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <Empty>Pain levels and sleep hours show up here.</Empty>
            )}
          </div>
        </Card>

        {/* Measurements */}
        <Card padding="md" className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                Vitals & measurements
              </h4>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                A new weight also updates your profile and water goal.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as MeasurementKind)}
                className="px-2 h-9 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
              >
                {MEASUREMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {MEASUREMENT_META[k].icon} {MEASUREMENT_META[k].label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className={numInput}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder={meta.dual ? "systolic" : meta.unit}
                min={meta.min}
                max={meta.max}
                step={meta.step}
              />
              {meta.dual && (
                <input
                  type="number"
                  className={numInput}
                  value={value2}
                  onChange={(e) => setValue2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder="diastolic"
                  min={meta.min}
                  max={meta.max}
                  step={meta.step}
                />
              )}
              <Button size="sm" onClick={add}>
                Add
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-44">
              {mSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mSeries} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={t.grid} vertical={false} />
                    <XAxis dataKey="label" tick={t.tick} axisLine={false} tickLine={false} />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={t.tick}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={t.tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={meta.dual ? "Systolic" : meta.label}
                      stroke="#3b93f7"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    {meta.dual && (
                      <Line
                        type="monotone"
                        dataKey="value2"
                        name="Diastolic"
                        stroke="#5cc99a"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Empty>No {meta.label.toLowerCase()} readings in this range yet.</Empty>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark mb-1">
                Recent
              </p>
              {recent.length === 0 ? (
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">—</p>
              ) : (
                <ul className="divide-y divide-border/50 dark:divide-border-dark/50">
                  {recent.map((m) => (
                    <li key={m.id} className="group flex items-center gap-2 py-1.5 text-xs">
                      <span>{MEASUREMENT_META[m.kind].icon}</span>
                      <span className="flex-1 font-medium text-text-primary dark:text-text-primary-dark">
                        {formatMeasurement(m)}
                      </span>
                      <span className="text-text-secondary dark:text-text-secondary-dark tabular-nums">
                        {new Date(m.measured_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        {formatTimeOfDay(m.measured_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          api.deleteMeasurement(m.id).catch((e) => toast.error(errorMessage(e)))
                        }
                        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-tomato"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* Symptoms & adherence */}
        <Card padding="md">
          <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
            Most logged symptoms
          </h4>
          {symptoms.length === 0 ? (
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              None in this range.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {symptoms.map((s) => (
                <li key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate text-text-primary dark:text-text-primary-dark">
                    {s.name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-border/40 dark:bg-border-dark/40 overflow-hidden">
                    <div
                      className="h-full bg-tomato/70"
                      style={{ width: `${(s.count / symptoms[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-text-secondary dark:text-text-secondary-dark tabular-nums">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
            Medicine adherence
          </h4>
          {!adherence || adherence.scheduled === 0 ? (
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              No doses scheduled in this range.
            </p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-text-primary dark:text-text-primary-dark tabular-nums">
                {adherence.adherence_pct}%
              </div>
              <div className="text-xs text-text-secondary dark:text-text-secondary-dark space-y-0.5">
                <p>
                  <span className="text-move font-medium">{adherence.taken}</span> taken
                </p>
                <p>
                  <span className="text-tomato font-medium">{adherence.missed}</span> missed ·{" "}
                  {adherence.skipped} skipped
                </p>
                <p>{adherence.scheduled} scheduled</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center px-4">
        {children}
      </p>
    </div>
  );
}
