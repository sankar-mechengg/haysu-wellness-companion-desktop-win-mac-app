import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import Card from "../common/Card";
import Toggle from "../common/Toggle";
import Button from "../common/Button";
import Slider from "../common/Slider";
import { Rows, SectionHeader } from "../common/Section";
import { toast } from "../common/Toast";
import { useAiStore } from "../../hooks/useAi";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import {
  api,
  errorMessage,
  type AiProvider,
  type AppConfig,
  type ProviderStatus,
} from "../../lib/api";
import { useConfig } from "../../store/appStore";

const MODEL_FIELD: Record<AiProvider, keyof AppConfig> = {
  anthropic: "ai_model_anthropic",
  openai: "ai_model_openai",
  gemini: "ai_model_gemini",
  zai: "ai_model_zai",
  openrouter: "ai_model_openrouter",
};

const input =
  "w-full px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300 font-mono";

function ProviderCard({ p, active }: { p: ProviderStatus; active: boolean }) {
  const config = useConfig();
  const patch = useConfigPatch();
  const setStatus = useAiStore((s) => s.setStatus);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "models" | null>(null);
  const [models, setModels] = useState<string[]>(p.known_models);
  const [custom, setCustom] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const field = MODEL_FIELD[p.provider];
  const model = (config?.[field] as string) ?? p.model;

  useEffect(() => {
    setModels((m) => (m.includes(p.model) ? m : [p.model, ...m]));
  }, [p.model]);

  const refresh = async () => {
    const s = await api.aiStatus();
    setStatus(s);
  };

  const saveKey = async () => {
    setBusy("save");
    try {
      await api.aiSetKey(p.provider, key.trim());
      setKey("");
      await refresh();
      toast.success(key.trim() ? `${p.label} key saved` : `${p.label} key removed`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const clearKey = async () => {
    setBusy("save");
    try {
      await api.aiSetKey(p.provider, "");
      await refresh();
      toast.success(`${p.label} key removed`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    try {
      const reply = await api.aiTest(p.provider);
      toast.success(`${p.label}: ${reply}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const fetchModels = async () => {
    setBusy("models");
    try {
      const list = await api.aiListModels(p.provider);
      if (list.length === 0) {
        toast.info("No model list from this provider; type the id manually.");
      } else {
        setModels([...new Set([model, ...list])]);
        // Back to the dropdown so the fetched list is what the user sees.
        setCustom(false);
        setCustomModel("");
        toast.success(`${list.length} models loaded`);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const setModel = (m: string) => {
    const v = m.trim();
    if (!v) return;
    patch({ [field]: v } as Partial<AppConfig>);
    setModels((list) => (list.includes(v) ? list : [v, ...list]));
    setCustom(false);
    setCustomModel("");
  };

  return (
    <Card padding="md" variant={active ? "water" : "default"} className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${p.has_key ? "bg-move" : "bg-border dark:bg-border-dark"}`}
        />
        <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark flex-1">
          {p.label}
          {active && (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-haysu-500">
              in use
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => openUrl(p.console_url).catch(() => {})}
          className="text-[11px] text-haysu-500 hover:text-haysu-600 font-medium"
        >
          Get a key ↗
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
          API key{" "}
          {p.has_key && (
            <span className="font-mono text-text-primary dark:text-text-primary-dark">
              · {p.masked_key}
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && key.trim() && saveKey()}
            placeholder={p.has_key ? "Paste a new key to replace" : "Paste your key"}
            autoComplete="off"
            spellCheck={false}
            className={input}
          />
          <Button size="sm" onClick={saveKey} disabled={!key.trim() || busy !== null}>
            {busy === "save" ? "…" : "Save"}
          </Button>
          {p.has_key && (
            <Button size="sm" variant="secondary" onClick={test} disabled={busy !== null}>
              {busy === "test" ? "Testing…" : "Test"}
            </Button>
          )}
          {p.has_key && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearKey}
              disabled={busy !== null}
              title="Remove the key"
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
          Model
        </label>
        <div className="flex gap-2">
          {custom ? (
            <input
              autoFocus
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setModel(customModel);
                if (e.key === "Escape") setCustom(false);
              }}
              placeholder="model id, e.g. claude-sonnet-5-5"
              className={input}
            />
          ) : (
            <select value={model} onChange={(e) => setModel(e.target.value)} className={input}>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          {custom ? (
            <Button size="sm" onClick={() => setModel(customModel)} disabled={!customModel.trim()}>
              Use
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCustom(true)}
              title="Type any model id"
            >
              Custom
            </Button>
          )}
          {p.has_key && (
            <Button
              size="sm"
              variant="secondary"
              onClick={fetchModels}
              disabled={busy !== null}
              title="Fetch the latest list from the provider"
            >
              {busy === "models" ? "…" : "↻"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AiSettings() {
  const config = useConfig();
  const status = useAiStore((s) => s.status);
  const patch = useConfigPatch();
  if (!config) return null;

  const providers = status?.providers ?? [];
  const selection = config.ai_provider;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Haysu AI"
        description="Bring your own key. Keys stay in the local database and are never included in backups."
      />

      <Card padding="md">
        <Rows>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                Provider
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                {selection === "auto"
                  ? status?.active
                    ? `Auto picks the first configured key: ${providers.find((p) => p.provider === status.active)?.label}`
                    : "Auto picks the first configured key (Claude → GPT → Gemini → Z.AI → OpenRouter)"
                  : "Always use this provider when it has a key"}
              </p>
            </div>
            <select
              value={selection}
              onChange={(e) => patch({ ai_provider: e.target.value as AppConfig["ai_provider"] })}
              className="px-3 py-2 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
            >
              <option value="auto">Auto (first available)</option>
              {providers.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.label}
                  {p.has_key ? "" : " (no key)"}
                </option>
              ))}
            </select>
          </div>
        </Rows>
      </Card>

      {providers.map((p) => (
        <ProviderCard key={p.provider} p={p} active={status?.active === p.provider} />
      ))}

      <Card padding="md">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-3">
          What Haysu AI can see
        </h4>
        <Rows>
          <Toggle
            label="Share health records"
            description="Medicines, doses, conditions, measurements, food and activity go into each request so answers fit you."
            checked={config.ai_share_health}
            onChange={(v) => patch({ ai_share_health: v })}
          />
          <Toggle
            label="Share diary entries"
            description="The last two weeks of mood, energy, sleep, symptoms and notes."
            checked={config.ai_share_diary}
            onChange={(v) => patch({ ai_share_diary: v })}
            disabled={!config.ai_share_health}
          />
          <Toggle
            label="Share location and weather"
            description="City-level only, for outfit and briefing advice."
            checked={config.ai_share_location}
            onChange={(v) => patch({ ai_share_location: v })}
          />
          <Toggle
            label="Keep posture photos"
            description="Save check-in photos in Haysu's data folder so you can compare over time. Photos are always sent to the provider only for the one request."
            checked={config.ai_keep_photos}
            onChange={(v) => patch({ ai_keep_photos: v })}
          />
        </Rows>
      </Card>

      <Card padding="md">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-3">
          Daily briefing
        </h4>
        <Rows>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                Morning briefing
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                A short plan for the day, delivered as a popup. Leave empty to turn it off.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={config.ai_briefing_time}
                onChange={(e) => patch({ ai_briefing_time: e.target.value })}
                className="px-3 py-1.5 rounded-xl text-sm bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text-primary dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-haysu-300"
              />
              {config.ai_briefing_time && (
                <button
                  type="button"
                  onClick={() => patch({ ai_briefing_time: "" })}
                  className="text-xs text-text-secondary hover:text-tomato"
                >
                  Off
                </button>
              )}
            </div>
          </div>
          <Slider
            label="Reply length"
            value={config.ai_max_tokens}
            onChange={(v) => patch({ ai_max_tokens: v })}
            min={300}
            max={4000}
            step={100}
            unit=" tokens"
          />
        </Rows>
      </Card>

      <p className="text-[11px] text-text-secondary dark:text-text-secondary-dark leading-relaxed">
        Haysu AI gives general wellness guidance from your own records. It is not a medical device
        and does not replace a doctor. Requests go directly from this computer to the provider you
        chose.
      </p>
    </div>
  );
}
