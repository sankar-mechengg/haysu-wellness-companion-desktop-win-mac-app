import Card from "../common/Card";
import Toggle from "../common/Toggle";
import Segmented from "../common/Segmented";
import { Rows, SectionHeader } from "../common/Section";
import { useConfigPatch } from "../../hooks/useConfigPatch";
import { useAppStore, useConfig } from "../../store/appStore";
import type { DarkVariant, Theme } from "../../lib/api";

export default function AppearanceSettings() {
  const config = useConfig();
  const resolved = useAppStore((s) => s.resolvedTheme);
  const patch = useConfigPatch();
  if (!config) return null;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Appearance"
        description="Theme applies to every Haysu window at once."
      />

      <Card padding="md">
        <Rows>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                Theme
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                System follows your OS setting
              </p>
            </div>
            <Segmented<Theme>
              value={config.theme}
              onChange={(v) => patch({ theme: v })}
              options={[
                { value: "light", label: "Light", icon: "☀️" },
                { value: "dark", label: "Dark", icon: "🌙" },
                { value: "system", label: "System", icon: "🖥️" },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                Dark style
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                {resolved === "dark" ? "Applied now" : "Used whenever the dark theme is active"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-md border border-border dark:border-border-dark"
                style={{ background: config.dark_variant === "blue" ? "#15162a" : "#18181b" }}
                aria-hidden
              />
              <Segmented<DarkVariant>
                value={config.dark_variant}
                onChange={(v) => patch({ dark_variant: v })}
                options={[
                  { value: "grey", label: "Grey" },
                  { value: "blue", label: "Blue" },
                ]}
              />
            </div>
          </div>
        </Rows>
      </Card>

      <Card padding="md">
        <h4 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-3">
          Floating widget
        </h4>
        <Rows>
          <Toggle
            label="Show the widget"
            description="The small countdown pill on your desktop. Drag it by the ⋮⋮ handle."
            checked={config.widget_visible}
            onChange={(v) => patch({ widget_visible: v })}
          />
          <Toggle
            label="Always on top"
            description="Keep the widget above other windows"
            checked={config.widget_always_on_top}
            onChange={(v) => patch({ widget_always_on_top: v })}
          />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                Position
              </p>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                {config.widget_x !== null ? "Remembered where you left it" : "Centred on screen"}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                patch({ widget_x: null, widget_y: null, widget_visible: true }, "Widget re-centred")
              }
              className="text-xs text-haysu-500 hover:text-haysu-600 font-medium"
            >
              Re-centre
            </button>
          </div>
        </Rows>
      </Card>
    </div>
  );
}
