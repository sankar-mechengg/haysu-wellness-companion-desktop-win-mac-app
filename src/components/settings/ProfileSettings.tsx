import { useState, useEffect, useCallback } from "react";
import Button from "../common/Button";
import Slider from "../common/Slider";
import Card from "../common/Card";
import { useUserProfile } from "../../hooks/useUserProfile";
import { calculateDailyWater, formatWaterMl } from "../../lib/waterCalc";
import { OCCUPATIONS } from "../../lib/constants";

export default function ProfileSettings() {
  const { profile, loading, updateProfile } = useUserProfile();
  const [name, setName] = useState("");
  const [age, setAge] = useState(25);
  const [weightKg, setWeightKg] = useState(70);
  const [heightCm, setHeightCm] = useState(170);
  const [occupation, setOccupation] = useState("");
  const [workStyle, setWorkStyle] = useState("sedentary");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAge(profile.age);
      setWeightKg(profile.weight_kg);
      setHeightCm(profile.height_cm);
      setOccupation(profile.occupation);
      setWorkStyle(profile.work_style);
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        name,
        age,
        weight_kg: weightKg,
        height_cm: heightCm,
        occupation,
        work_style: workStyle,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save profile:", e);
    } finally {
      setSaving(false);
    }
  }, [name, age, weightKg, heightCm, occupation, workStyle, updateProfile]);

  if (loading) {
    return <p className="text-sm text-text-secondary dark:text-text-secondary-dark py-4">Loading profile...</p>;
  }

  const waterGoal = calculateDailyWater(weightKg);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Profile</h3>
        <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
          Your profile affects water goals and exercise recommendations
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
        />
      </div>

      <Slider label="Age" value={age} onChange={setAge} min={16} max={80} unit=" yrs" />

      <div>
        <Slider label="Weight" value={weightKg} onChange={setWeightKg} min={30} max={150} unit=" kg" />
        <p className="text-xs text-water mt-1">
          💧 Daily goal: <span className="font-semibold">{formatWaterMl(waterGoal)}</span>
        </p>
      </div>

      <Slider label="Height" value={heightCm} onChange={setHeightCm} min={120} max={220} unit=" cm" />

      {/* Occupation chips */}
      <div>
        <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">Occupation</label>
        <div className="flex flex-wrap gap-1.5">
          {OCCUPATIONS.map((occ) => (
            <button
              key={occ}
              onClick={() => setOccupation(occ)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                occupation === occ
                  ? "bg-haysu-500 text-white"
                  : "bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark hover:border-haysu-300"
              }`}
            >
              {occ}
            </button>
          ))}
        </div>
      </div>

      {/* Work style */}
      <div>
        <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-1.5">Work Style</label>
        <div className="flex gap-2">
          {(["sedentary", "moderate", "active"] as const).map((ws) => (
            <button
              key={ws}
              onClick={() => setWorkStyle(ws)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                workStyle === ws
                  ? "bg-haysu-500 text-white shadow-sm"
                  : "bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark border border-border dark:border-border-dark"
              }`}
            >
              {ws === "sedentary" ? "🪑" : ws === "moderate" ? "🚶" : "🏃"} {ws}
            </button>
          ))}
        </div>
      </div>

      <Button variant="primary" size="md" fullWidth onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
      </Button>
    </div>
  );
}
