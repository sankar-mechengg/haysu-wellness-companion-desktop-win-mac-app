import { useCallback, useEffect, useMemo, useState } from "react";
import PopupContainer, { type PopupAction } from "./PopupContainer";
import ProgressRing from "../common/ProgressRing";
import { api } from "../../lib/api";
import { formatWaterMl, waterProgress } from "../../lib/format";
import { randomMessage, WATER_MESSAGES, WATER_QUICK_AMOUNTS } from "../../lib/constants";
import { useConfig, useProfile } from "../../store/appStore";

const ACCENT = "#60b8ff";

export default function WaterPopup({ onDone }: { onDone: () => void }) {
  const config = useConfig();
  const profile = useProfile();
  const [message] = useState(() => randomMessage(WATER_MESSAGES));
  const [todayMl, setTodayMl] = useState(0);
  const [logged, setLogged] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);

  const defaultAmount = config?.water_amount_ml ?? 250;
  const goal = profile?.daily_water_ml ?? 2450;
  const amounts = useMemo(() => {
    const set = new Set<number>([defaultAmount, ...WATER_QUICK_AMOUNTS]);
    return [...set].sort((a, b) => a - b).slice(0, 4);
  }, [defaultAmount]);

  useEffect(() => {
    api
      .getWaterToday()
      .then((rows) =>
        setTodayMl(rows.filter((r) => r.consumed).reduce((s, r) => s + r.amount_ml, 0))
      )
      .catch(() => {});
  }, []);

  const finish = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(onDone, 700);
  }, [closing, onDone]);

  const log = useCallback(
    async (ml: number) => {
      if (logged !== null) return;
      setLogged(ml);
      setTodayMl((t) => t + ml);
      try {
        await api.logWater(true, ml);
      } catch (e) {
        console.error(e);
      }
      finish();
    },
    [logged, finish]
  );

  const skip = useCallback(async () => {
    if (logged !== null) return;
    setLogged(0);
    try {
      await api.logWater(false, 0);
    } catch (e) {
      console.error(e);
    }
    onDone();
  }, [logged, onDone]);

  const snooze = useCallback(async () => {
    await api.snoozeReminder("water").catch(() => {});
    onDone();
  }, [onDone]);

  const actions: PopupAction[] =
    logged === null
      ? [
          {
            label: `I drank ${formatWaterMl(defaultAmount)}`,
            onClick: () => log(defaultAmount),
            hotkey: "Enter",
          },
          {
            label: `Snooze ${config?.snooze_minutes ?? 5}m`,
            onClick: snooze,
            variant: "ghost",
            hotkey: "s",
          },
          { label: "Skip", onClick: skip, variant: "ghost", hotkey: "Escape" },
        ]
      : [{ label: "Done", onClick: finish, hotkey: "Enter" }];

  const progress = waterProgress(todayMl, goal);

  return (
    <PopupContainer accent={ACCENT} onDone={onDone} actions={actions}>
      <div className="flex items-start gap-4">
        <ProgressRing
          progress={progress}
          size={60}
          strokeWidth={5}
          color={ACCENT}
          trackColor="#e8f4ff"
        >
          <span className="text-base">💧</span>
        </ProgressRing>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
            {logged ? "Logged. Keep it up 💪" : "Water reminder"}
          </h3>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5 leading-relaxed">
            {logged ? `+${formatWaterMl(logged)} added to today.` : message}
          </p>
          <p className="text-xs font-medium text-water mt-1.5 tabular-nums">
            {formatWaterMl(todayMl)} / {formatWaterMl(goal)} today · {progress}%
          </p>
        </div>
      </div>

      {logged === null && (
        <div className="flex gap-1.5 mt-3">
          {amounts.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => log(ml)}
              className={`flex-1 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                ml === defaultAmount
                  ? "bg-water/20 text-water"
                  : "bg-surface-hover dark:bg-surface-hover-dark text-text-secondary dark:text-text-secondary-dark hover:text-water"
              }`}
            >
              {ml} ml
            </button>
          ))}
        </div>
      )}
    </PopupContainer>
  );
}
