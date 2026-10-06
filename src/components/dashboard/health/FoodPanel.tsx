import { useMemo, useState } from "react";
import Card from "../../common/Card";
import Button from "../../common/Button";
import Segmented from "../../common/Segmented";
import { toast } from "../../common/Toast";
import { useFood } from "../../../hooks/useHealth";
import { api, errorMessage, type Meal } from "../../../lib/api";
import { MEAL_OPTIONS } from "../../../lib/constants";
import { formatTimeOfDay, relativeDay } from "../../../lib/format";
import { useProfile } from "../../../store/appStore";

function mealForNow(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 20) return "dinner";
  return "snack";
}

export default function FoodPanel({ onPlanMeals }: { onPlanMeals: () => void }) {
  const profile = useProfile();
  const { data: entries } = useFood(14);
  const [meal, setMeal] = useState<Meal>(mealForNow());
  const [text, setText] = useState("");
  const [calories, setCalories] = useState("");
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const todayKcal = useMemo(() => {
    const today = grouped[0];
    if (!today) return 0;
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (today[0] !== key) return 0;
    return today[1].reduce((s, e) => s + (e.calories ?? 0), 0);
  }, [grouped]);

  const add = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.addFood({
        meal,
        description: text.trim(),
        calories: calories ? Number(calories) : null,
      });
      setText("");
      setCalories("");
      toast.success("Logged");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const dietLabel = profile?.diet ? profile.diet.replace("_", "-") : "diet not set";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 space-y-4">
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              What did you have?
            </h3>
            <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark capitalize">
              {dietLabel}
              {todayKcal > 0 && ` · ~${todayKcal} kcal today`}
            </span>
          </div>
          <Segmented<Meal>
            size="sm"
            fullWidth
            value={meal}
            onChange={setMeal}
            options={MEAL_OPTIONS.map((m) => ({ value: m.id, label: m.label, icon: m.emoji }))}
          />
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="e.g. Oats with banana and a coffee"
              maxLength={300}
              className="flex-1 px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
            />
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="kcal"
              min={0}
              max={5000}
              className="w-20 px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button size="md" onClick={add} disabled={saving || !text.trim()}>
              Log
            </Button>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-2">
            Last 14 days
          </h3>
          {grouped.length === 0 ? (
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark text-center py-6">
              Nothing logged yet. Even "coffee and toast" helps Haysu AI plan the rest of your day.
            </p>
          ) : (
            <div className="space-y-3">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <p className="text-[11px] uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark mb-1">
                    {relativeDay(date)}
                    {(() => {
                      const k = items.reduce((s, e) => s + (e.calories ?? 0), 0);
                      return k ? ` · ~${k} kcal` : "";
                    })()}
                  </p>
                  <ul className="divide-y divide-border/50 dark:divide-border-dark/50">
                    {items.map((e) => {
                      const m = MEAL_OPTIONS.find((x) => x.id === e.meal);
                      return (
                        <li key={e.id} className="group flex items-center gap-2 py-1.5 text-xs">
                          <span className="w-5 text-center">{m?.emoji}</span>
                          <span className="w-16 text-text-secondary dark:text-text-secondary-dark">
                            {m?.label}
                          </span>
                          <span className="flex-1 text-text-primary dark:text-text-primary-dark">
                            {e.description}
                          </span>
                          {e.calories != null && (
                            <span className="text-text-secondary dark:text-text-secondary-dark tabular-nums">
                              {e.calories} kcal
                            </span>
                          )}
                          <span className="text-text-secondary dark:text-text-secondary-dark tabular-nums">
                            {formatTimeOfDay(e.timestamp)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              api.deleteFood(e.id).catch((err) => toast.error(errorMessage(err)))
                            }
                            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-tomato"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="xl:col-span-2 space-y-4">
        <Card padding="md" className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            🥗 Meal ideas
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
            Haysu AI plans around your diet ({dietLabel}), goal, allergies, what you already ate and
            the weather.
          </p>
          <Button size="sm" fullWidth onClick={onPlanMeals}>
            Plan my meals with Haysu AI
          </Button>
          {!profile?.diet && (
            <p className="text-[11px] text-amber">
              Set your diet in Settings → Profile for suggestions that fit.
            </p>
          )}
        </Card>
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
            Tips
          </h3>
          <ul className="text-xs text-text-secondary dark:text-text-secondary-dark space-y-1 list-disc pl-4">
            <li>Calories are optional; descriptions matter more to the AI.</li>
            <li>Log drinks too: coffee and sugary drinks explain a lot of energy dips.</li>
            <li>Ask "why am I sluggish after lunch?" in Haysu AI with a few days logged.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
