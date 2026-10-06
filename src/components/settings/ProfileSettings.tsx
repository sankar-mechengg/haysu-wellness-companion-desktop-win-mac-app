import { useEffect, useState } from "react";
import Button from "../common/Button";
import Slider from "../common/Slider";
import Card from "../common/Card";
import { SectionHeader } from "../common/Section";
import { toast } from "../common/Toast";
import { useUserProfile } from "../../hooks/useUserProfile";
import { calculateDailyWater, formatWaterMl } from "../../lib/format";
import {
  DIET_OPTIONS,
  DRESS_OPTIONS,
  GOAL_OPTIONS,
  OCCUPATIONS,
  WORK_STYLES,
} from "../../lib/constants";
import { api, errorMessage, type GeoLocation, type ProfileInput } from "../../lib/api";
import { useConfig } from "../../store/appStore";
import { useConfigPatch } from "../../hooks/useConfigPatch";

const chip = (active: boolean) =>
  `px-2.5 py-1 rounded-lg text-xs transition-all ${
    active
      ? "bg-haysu-500 text-white shadow-sm"
      : "bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:border-haysu-300"
  }`;
const input =
  "w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300";
const label = "block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5";

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

export function bmi(
  weightKg: number,
  heightCm: number
): { value: number; label: string; cls: string } {
  const m = heightCm / 100;
  const v = m > 0 ? weightKg / (m * m) : 0;
  const r = Math.round(v * 10) / 10;
  if (r < 18.5) return { value: r, label: "underweight", cls: "text-amber" };
  if (r < 25) return { value: r, label: "healthy range", cls: "text-move" };
  if (r < 30) return { value: r, label: "overweight", cls: "text-amber" };
  return { value: r, label: "obese range", cls: "text-tomato" };
}

export function toInput(p: ProfileInput): ProfileInput {
  return {
    name: p.name,
    age: p.age,
    weight_kg: p.weight_kg,
    height_cm: p.height_cm,
    occupation: p.occupation,
    work_style: p.work_style,
    gender: p.gender ?? "",
    diet: p.diet ?? "non_vegetarian",
    diet_notes: p.diet_notes ?? "",
    cuisines: p.cuisines ?? "",
    health_goal: p.health_goal ?? "maintain",
    dress_style: p.dress_style ?? "casual",
    wardrobe_notes: p.wardrobe_notes ?? "",
    about_me: p.about_me ?? "",
  };
}

export function LocationPicker() {
  const config = useConfig();
  const patch = useConfigPatch();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      api
        .weatherSearch(q.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const choose = async (loc: GeoLocation | null) => {
    try {
      await api.weatherSetLocation(loc);
      setQ("");
      setResults([]);
      toast.success(loc ? `Location set to ${loc.name}` : "Location cleared");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <label className={label}>City (for weather, outfit advice and the briefing)</label>
      {config?.location_name ? (
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 rounded-lg text-xs bg-water/15 text-water font-medium">
            📍 {config.location_name}
          </span>
          <button
            type="button"
            onClick={() => choose(null)}
            className="text-[11px] text-text-secondary hover:text-tomato"
          >
            Clear
          </button>
          {!config.ai_share_location && (
            <button
              type="button"
              onClick={() => patch({ ai_share_location: true })}
              className="text-[11px] text-haysu-500"
              title="Haysu AI is not allowed to use the location yet"
            >
              Let Haysu AI use it
            </button>
          )}
        </div>
      ) : null}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={config?.location_name ? "Change city…" : "Search a city, e.g. Bengaluru"}
          className={input}
        />
        {(results.length > 0 || searching) && (
          <ul className="absolute z-10 mt-1 w-full rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-lg overflow-hidden">
            {searching && results.length === 0 && (
              <li className="px-3 py-2 text-xs text-text-secondary dark:text-text-secondary-dark">
                Searching…
              </li>
            )}
            {results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover dark:hover:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark"
                >
                  {r.name}
                  <span className="text-text-secondary dark:text-text-secondary-dark">
                    {r.admin && `, ${r.admin}`}
                    {r.country && ` · ${r.country}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ProfileSettings() {
  const { profile, save, saving } = useUserProfile();
  const [form, setForm] = useState<ProfileInput | null>(null);
  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  useEffect(() => {
    if (profile) setForm(toInput(profile));
  }, [profile]);

  if (!form) return null;

  const dirty = !!profile && JSON.stringify(toInput(profile)) !== JSON.stringify(form);
  const b = bmi(form.weight_kg, form.height_cm);

  const onSave = async () => {
    try {
      await save({ ...form, name: form.name.trim() });
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Profile"
        description="Everything here stays on this computer and shapes reminders, meals, outfits and Haysu AI."
        action={
          <Button size="sm" onClick={onSave} disabled={!dirty || saving || !form.name.trim()}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        }
      />

      <Card padding="md" className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={40}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Gender (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", form.gender === g ? "" : g)}
                  className={chip(form.gender === g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Slider
          label="Age"
          value={form.age}
          onChange={(v) => set("age", v)}
          min={13}
          max={100}
          unit=" yrs"
        />
        <div>
          <Slider
            label="Weight"
            value={form.weight_kg}
            onChange={(v) => set("weight_kg", v)}
            min={30}
            max={200}
            unit=" kg"
          />
          <p className="text-xs text-water mt-1">
            💧 Daily water goal:{" "}
            <span className="font-semibold">
              {formatWaterMl(calculateDailyWater(form.weight_kg))}
            </span>
            <span className="text-text-secondary dark:text-text-secondary-dark">
              {" "}
              ({form.weight_kg} kg × 35 ml)
            </span>
          </p>
        </div>
        <div>
          <Slider
            label="Height"
            value={form.height_cm}
            onChange={(v) => set("height_cm", v)}
            min={120}
            max={230}
            unit=" cm"
          />
          <p className="text-xs mt-1">
            <span className="text-text-secondary dark:text-text-secondary-dark">BMI </span>
            <span className={`font-semibold ${b.cls}`}>{b.value}</span>
            <span className="text-text-secondary dark:text-text-secondary-dark">
              {" "}
              · {b.label}. Log weight in Health → Trends to track it.
            </span>
          </p>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <div>
          <label className={label}>Occupation</label>
          <div className="flex flex-wrap gap-1.5">
            {OCCUPATIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => set("occupation", o)}
                className={chip(form.occupation === o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Work style</label>
          <div className="grid grid-cols-3 gap-2">
            {WORK_STYLES.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => set("work_style", ws.id)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  form.work_style === ws.id
                    ? "border-haysu-500 bg-haysu-50 dark:bg-haysu-500/10"
                    : "border-border dark:border-border-dark bg-surface dark:bg-surface-dark hover:border-haysu-300"
                }`}
              >
                <div className="text-sm">
                  {ws.emoji}{" "}
                  <span className="font-medium text-text-primary dark:text-text-primary-dark">
                    {ws.label}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark mt-0.5 leading-snug">
                  {ws.description}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Main goal</label>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => set("health_goal", g.id)}
                className={chip(form.health_goal === g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          🍽️ Food
        </h4>
        <div>
          <label className={label}>Diet</label>
          <div className="flex flex-wrap gap-1.5">
            {DIET_OPTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => set("diet", d.id)}
                className={chip(form.diet === d.id)}
              >
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Allergies, dislikes, religious rules</label>
            <input
              value={form.diet_notes}
              onChange={(e) => set("diet_notes", e.target.value)}
              placeholder="e.g. no peanuts, lactose intolerant"
              maxLength={300}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Favourite cuisines</label>
            <input
              value={form.cuisines}
              onChange={(e) => set("cuisines", e.target.value)}
              placeholder="e.g. South Indian, Mediterranean"
              maxLength={200}
              className={input}
            />
          </div>
        </div>
      </Card>

      <Card padding="md" className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          👕 Style & weather
        </h4>
        <div>
          <label className={label}>Usual dress style</label>
          <div className="flex flex-wrap gap-1.5">
            {DRESS_OPTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => set("dress_style", d.id)}
                className={chip(form.dress_style === d.id)}
              >
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Wardrobe notes</label>
          <input
            value={form.wardrobe_notes}
            onChange={(e) => set("wardrobe_notes", e.target.value)}
            placeholder="e.g. office is cold, I cycle to work, prefer earth tones"
            maxLength={300}
            className={input}
          />
        </div>
        <LocationPicker />
      </Card>

      <Card padding="md" className="space-y-2">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
          ✨ About me
        </h4>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
          Anything Haysu AI should always keep in mind: routines, family, training, what motivates
          you.
        </p>
        <textarea
          value={form.about_me}
          onChange={(e) => set("about_me", e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. I train for a half marathon on weekends, I fast on Tuesdays, I get migraines when I skip lunch."
          className={`${input} resize-none`}
        />
      </Card>
    </div>
  );
}
