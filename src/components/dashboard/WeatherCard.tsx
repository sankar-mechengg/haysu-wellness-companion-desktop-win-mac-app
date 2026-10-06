import Card from "../common/Card";
import { useWeather } from "../../hooks/useCare";
import { api } from "../../lib/api";
import { useConfig } from "../../store/appStore";

/** Today's weather with a shortcut to outfit advice. */
export default function WeatherCard({ onOutfit }: { onOutfit?: () => void }) {
  const config = useConfig();
  const hasLocation = !!config?.location_lat;
  const { weather, loading } = useWeather(hasLocation);

  if (!hasLocation) {
    return (
      <Card padding="md" className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-surface-hover dark:bg-surface-hover-dark">
          🌤️
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Add your city
          </p>
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
            Weather powers outfit advice and the daily briefing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => api.showWindow("settings")}
          className="text-xs text-haysu-500 hover:text-haysu-600 font-medium"
        >
          Settings
        </button>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card padding="md" className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-surface-hover dark:bg-surface-hover-dark">
          {loading ? "⏳" : "🌫️"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {loading ? "Fetching weather…" : "Weather unavailable"}
          </p>
          <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
            {config?.location_name}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md" className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-water/15">
        {weather.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
          {Math.round(weather.temp_c)}°C · {weather.description}
          <span className="text-text-secondary dark:text-text-secondary-dark font-normal">
            {" "}
            · feels {Math.round(weather.feels_like_c)}°
          </span>
        </p>
        <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark truncate">
          {weather.location_name} · {Math.round(weather.temp_min_c)}–
          {Math.round(weather.temp_max_c)}° · rain {weather.precipitation_prob}% · UV{" "}
          {Math.round(weather.uv_index)} · humidity {weather.humidity}%
        </p>
      </div>
      {onOutfit && (
        <button
          type="button"
          onClick={onOutfit}
          className="h-8 px-3 rounded-lg text-xs font-semibold bg-water/15 text-water hover:bg-water/25"
          title="Ask Haysu AI what to wear"
        >
          👕 Outfit
        </button>
      )}
    </Card>
  );
}
