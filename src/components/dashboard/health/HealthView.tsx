import { useState } from "react";
import Segmented from "../../common/Segmented";
import MedicinesPanel from "./MedicinesPanel";
import DiaryPanel from "./DiaryPanel";
import TrendsPanel from "./TrendsPanel";

type Sub = "medicines" | "diary" | "trends";

export default function HealthView() {
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
          { value: "diary", label: "Health diary", icon: "📓" },
          { value: "trends", label: "Trends & vitals", icon: "📈" },
        ]}
      />
      {sub === "medicines" && <MedicinesPanel />}
      {sub === "diary" && <DiaryPanel />}
      {sub === "trends" && <TrendsPanel />}
    </div>
  );
}
