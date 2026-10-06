import { useState } from "react";
import Segmented from "../../common/Segmented";
import MedicinesPanel from "./MedicinesPanel";
import DiaryPanel from "./DiaryPanel";
import TrendsPanel from "./TrendsPanel";
import FoodPanel from "./FoodPanel";
import CarePanel from "./CarePanel";
import type { AiKind } from "../../../lib/api";

type Sub = "medicines" | "diary" | "trends" | "food" | "care";

export default function HealthView({ onAsk }: { onAsk: (kind: AiKind) => void }) {
  const [sub, setSub] = useState<Sub>("medicines");
  return (
    <div className="space-y-4 animate-fade-in">
      <Segmented<Sub>
        value={sub}
        onChange={setSub}
        size="sm"
        ariaLabel="Health section"
        options={[
          { value: "medicines", label: "Medicines", icon: "💊" },
          { value: "diary", label: "Diary", icon: "📓" },
          { value: "trends", label: "Trends", icon: "📈" },
          { value: "food", label: "Food", icon: "🥗" },
          { value: "care", label: "Care", icon: "🪥" },
        ]}
      />
      {sub === "medicines" && <MedicinesPanel />}
      {sub === "diary" && <DiaryPanel />}
      {sub === "trends" && <TrendsPanel />}
      {sub === "food" && <FoodPanel onPlanMeals={() => onAsk("meals")} />}
      {sub === "care" && <CarePanel onOpenCamera={() => onAsk("posture")} />}
    </div>
  );
}
