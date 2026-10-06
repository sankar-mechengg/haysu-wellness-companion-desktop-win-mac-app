import { useEffect, useState } from "react";
import Button from "../common/Button";
import Slider from "../common/Slider";
import Card from "../common/Card";
import { SectionHeader } from "../common/Section";
import { toast } from "../common/Toast";
import { useUserProfile } from "../../hooks/useUserProfile";
import { calculateDailyWater, formatWaterMl } from "../../lib/format";
import { OCCUPATIONS, WORK_STYLES } from "../../lib/constants";
import type { WorkStyle } from "../../lib/api";

const chip = (active: boolean) =>
  `px-2.5 py-1 rounded-lg text-xs transition-all ${
    active
      ? "bg-haysu-500 text-white shadow-sm"
      : "bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:border-haysu-300"
  }`;

export default function ProfileSettings() {
  const { profile, save, saving } = useUserProfile();
  const [name, setName] = useState("");
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [occupation, setOccupation] = useState("");
  const [workStyle, setWorkStyle] = useState<WorkStyle>("sedentary");

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setAge(profile.age);
    setWeight(profile.weight_kg);
    setHeight(profile.height_cm);
    setOccupation(profile.occupation);
    setWorkStyle(profile.work_style);
  }, [profile]);

  const dirty =
    !!profile &&
    (name !== profile.name ||
      age !== profile.age ||
      weight !== profile.weight_kg ||
      height !== profile.height_cm ||
      occupation !== profile.occupation ||
      workStyle !== profile.work_style);

  const onSave = async () => {
    try {
      await save({
        name,
        age,
        weight_kg: weight,
        height_cm: height,
        occupation,
        work_style: workStyle,
      });
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Profile"
        description="Drives your water goal and which exercises you get."
        action={
          <Button size="sm" onClick={onSave} disabled={!dirty || saving || !name.trim()}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        }
      />

      <Card padding="md" className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
          />
        </div>
        <Slider label="Age" value={age} onChange={setAge} min={13} max={100} unit=" yrs" />
        <div>
          <Slider
            label="Weight"
            value={weight}
            onChange={setWeight}
            min={30}
            max={200}
            unit=" kg"
          />
          <p className="text-xs text-water mt-1">
            💧 Daily water goal:{" "}
            <span className="font-semibold">{formatWaterMl(calculateDailyWater(weight))}</span>
            <span className="text-text-secondary dark:text-text-secondary-dark">
              {" "}
              ({weight} kg × 35 ml)
            </span>
          </p>
        </div>
        <Slider label="Height" value={height} onChange={setHeight} min={120} max={230} unit=" cm" />
      </Card>

      <Card padding="md" className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">
            Occupation
          </label>
          <div className="flex flex-wrap gap-1.5">
            {OCCUPATIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOccupation(o)}
                className={chip(occupation === o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">
            Work style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {WORK_STYLES.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => setWorkStyle(ws.id)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  workStyle === ws.id
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
      </Card>
    </div>
  );
}
