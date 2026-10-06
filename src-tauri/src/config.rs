//! Typed application configuration.
//!
//! Persisted in the `settings` key/value table, one row per field, so 1.0.x
//! databases load unchanged and the table stays greppable with any SQLite tool.

use std::sync::RwLock;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::db::DbState;

/// How a reminder is surfaced.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ReminderStyle {
    /// In-app popup window (default).
    #[default]
    Popup,
    /// Native OS notification only.
    Native,
    /// Both.
    Both,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum Theme {
    #[default]
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    // Reminders
    pub water_interval_min: u32,
    pub movement_interval_min: u32,
    pub water_amount_ml: u32,
    pub snooze_minutes: u32,
    /// 0 disables auto-dismiss.
    pub popup_auto_dismiss_sec: u32,
    pub reminder_style: ReminderStyle,
    pub sound_enabled: bool,

    // Pomodoro
    pub pomodoro_work_min: u32,
    pub pomodoro_short_break_min: u32,
    pub pomodoro_long_break_min: u32,
    pub pomodoro_sessions_before_long: u32,
    pub pomodoro_auto_start_break: bool,
    pub pomodoro_auto_start_work: bool,

    // Do not disturb
    pub dnd_enabled: bool,
    /// RFC 3339 instant after which DND switches itself off. Empty = manual.
    pub dnd_until: String,

    // Schedule and presence
    pub schedule_enabled: bool,
    /// `HH:MM`, 24 hour.
    pub schedule_start: String,
    pub schedule_end: String,
    /// ISO weekday numbers, Monday = 1 … Sunday = 7.
    pub schedule_days: Vec<u8>,
    pub idle_pause_enabled: bool,
    pub idle_threshold_min: u32,

    // Appearance
    pub theme: Theme,
    pub widget_visible: bool,
    pub widget_always_on_top: bool,
    pub widget_x: Option<i32>,
    pub widget_y: Option<i32>,

    // System
    pub autostart_enabled: bool,
    pub onboarding_complete: bool,
    pub check_updates_on_launch: bool,

    // Hotkeys (empty string = disabled)
    pub hotkey_toggle_pomodoro: String,
    pub hotkey_toggle_dnd: String,
    pub hotkey_show_dashboard: String,
    pub hotkey_log_water: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            water_interval_min: 30,
            movement_interval_min: 45,
            water_amount_ml: 250,
            snooze_minutes: 5,
            popup_auto_dismiss_sec: 90,
            reminder_style: ReminderStyle::Popup,
            sound_enabled: true,

            pomodoro_work_min: 25,
            pomodoro_short_break_min: 5,
            pomodoro_long_break_min: 15,
            pomodoro_sessions_before_long: 4,
            pomodoro_auto_start_break: true,
            pomodoro_auto_start_work: false,

            dnd_enabled: false,
            dnd_until: String::new(),

            schedule_enabled: false,
            schedule_start: "09:00".into(),
            schedule_end: "18:00".into(),
            schedule_days: vec![1, 2, 3, 4, 5],
            idle_pause_enabled: true,
            idle_threshold_min: 5,

            theme: Theme::Light,
            widget_visible: true,
            widget_always_on_top: true,
            widget_x: None,
            widget_y: None,

            autostart_enabled: false,
            onboarding_complete: false,
            check_updates_on_launch: true,

            hotkey_toggle_pomodoro: "CmdOrCtrl+Shift+J".into(),
            hotkey_toggle_dnd: "CmdOrCtrl+Shift+K".into(),
            hotkey_show_dashboard: "CmdOrCtrl+Shift+H".into(),
            hotkey_log_water: String::new(),
        }
    }
}

impl AppConfig {
    /// Clamp every numeric field into a sane range and normalise strings.
    pub fn sanitize(&mut self) {
        self.water_interval_min = self.water_interval_min.clamp(5, 240);
        self.movement_interval_min = self.movement_interval_min.clamp(5, 240);
        self.water_amount_ml = self.water_amount_ml.clamp(50, 1000);
        self.snooze_minutes = self.snooze_minutes.clamp(1, 60);
        self.popup_auto_dismiss_sec = self.popup_auto_dismiss_sec.min(600);
        self.pomodoro_work_min = self.pomodoro_work_min.clamp(1, 120);
        self.pomodoro_short_break_min = self.pomodoro_short_break_min.clamp(1, 60);
        self.pomodoro_long_break_min = self.pomodoro_long_break_min.clamp(1, 120);
        self.pomodoro_sessions_before_long = self.pomodoro_sessions_before_long.clamp(1, 12);
        self.idle_threshold_min = self.idle_threshold_min.clamp(1, 120);
        if !is_hhmm(&self.schedule_start) {
            self.schedule_start = "09:00".into();
        }
        if !is_hhmm(&self.schedule_end) {
            self.schedule_end = "18:00".into();
        }
        self.schedule_days.retain(|d| (1..=7).contains(d));
        self.schedule_days.sort_unstable();
        self.schedule_days.dedup();
        for hk in [
            &mut self.hotkey_toggle_pomodoro,
            &mut self.hotkey_toggle_dnd,
            &mut self.hotkey_show_dashboard,
            &mut self.hotkey_log_water,
        ] {
            *hk = hk.trim().to_string();
        }
    }

    /// Load from the settings table, falling back to defaults per field.
    pub fn load(conn: &Connection) -> Self {
        let defaults = serde_json::to_value(AppConfig::default()).unwrap_or(Value::Null);
        let Some(default_map) = defaults.as_object() else {
            return AppConfig::default();
        };

        let mut stmt = match conn.prepare("SELECT key, value FROM settings") {
            Ok(s) => s,
            Err(_) => return AppConfig::default(),
        };
        let rows = stmt
            .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
            .map(|it| it.filter_map(Result::ok).collect::<Vec<_>>())
            .unwrap_or_default();

        let mut merged = default_map.clone();
        for (key, raw) in rows {
            if let Some(template) = default_map.get(&key) {
                if let Some(parsed) = parse_value(template, &raw) {
                    merged.insert(key, parsed);
                }
            }
        }
        let mut cfg: AppConfig = serde_json::from_value(Value::Object(merged)).unwrap_or_default();
        cfg.sanitize();
        cfg
    }

    /// Persist every field.
    pub fn save(&self, conn: &Connection) -> Result<(), String> {
        let value = serde_json::to_value(self).map_err(|e| e.to_string())?;
        let Some(map) = value.as_object() else {
            return Err("config did not serialise to an object".into());
        };
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        for (key, v) in map {
            let raw = match v {
                Value::String(s) => s.clone(),
                Value::Null => String::new(),
                other => other.to_string(),
            };
            tx.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                rusqlite::params![key, raw],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())
    }

    /// Apply a partial JSON object on top of this config.
    pub fn merge_patch(&self, patch: &Value) -> Result<AppConfig, String> {
        let mut base = serde_json::to_value(self).map_err(|e| e.to_string())?;
        let (Some(base_map), Some(patch_map)) = (base.as_object_mut(), patch.as_object()) else {
            return Err("patch must be a JSON object".into());
        };
        for (k, v) in patch_map {
            if !base_map.contains_key(k) {
                return Err(format!("unknown setting: {k}"));
            }
            base_map.insert(k.clone(), v.clone());
        }
        let mut cfg: AppConfig = serde_json::from_value(base).map_err(|e| e.to_string())?;
        cfg.sanitize();
        Ok(cfg)
    }
}

/// Parse a raw settings string according to the JSON type of the default value.
fn parse_value(template: &Value, raw: &str) -> Option<Value> {
    match template {
        Value::Bool(_) => match raw.trim() {
            "true" | "1" => Some(Value::Bool(true)),
            "false" | "0" | "" => Some(Value::Bool(false)),
            _ => None,
        },
        Value::Number(_) => raw.trim().parse::<f64>().ok().and_then(|n| {
            if n.fract() == 0.0 {
                Some(Value::from(n as i64))
            } else {
                serde_json::Number::from_f64(n).map(Value::Number)
            }
        }),
        Value::String(_) => Some(Value::String(raw.to_string())),
        Value::Null => {
            // Option<_> fields: empty = None, otherwise try JSON then number.
            if raw.trim().is_empty() || raw.trim() == "null" {
                Some(Value::Null)
            } else {
                serde_json::from_str(raw).ok()
            }
        }
        Value::Array(_) | Value::Object(_) => serde_json::from_str(raw).ok(),
    }
}

fn is_hhmm(s: &str) -> bool {
    let mut parts = s.split(':');
    let (Some(h), Some(m), None) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    matches!((h.parse::<u8>(), m.parse::<u8>()), (Ok(h), Ok(m)) if h < 24 && m < 60)
}

/// Managed state wrapper.
pub struct ConfigState(pub RwLock<AppConfig>);

impl ConfigState {
    pub fn get(&self) -> AppConfig {
        self.0.read().map(|c| c.clone()).unwrap_or_default()
    }

    pub fn set(&self, cfg: AppConfig) {
        if let Ok(mut w) = self.0.write() {
            *w = cfg;
        }
    }

    /// Load from DB and populate.
    pub fn load_from(db: &DbState) -> Self {
        let cfg = db
            .conn
            .lock()
            .map(|c| AppConfig::load(&c))
            .unwrap_or_default();
        ConfigState(RwLock::new(cfg))
    }
}

#[cfg(test)]
#[allow(clippy::field_reassign_with_default)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_through_settings_table() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let mut cfg = AppConfig::default();
        cfg.water_interval_min = 20;
        cfg.theme = Theme::Dark;
        cfg.schedule_days = vec![1, 3, 5];
        cfg.widget_x = Some(120);
        cfg.dnd_until = "2026-03-11T10:00:00Z".into();
        cfg.save(&conn).unwrap();
        let loaded = AppConfig::load(&conn);
        assert_eq!(loaded, cfg);
    }

    #[test]
    fn loads_legacy_1_0_rows() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        for (k, v) in [
            ("water_interval_min", "40"),
            ("theme", "dark"),
            ("sound_enabled", "false"),
            ("onboarding_complete", "true"),
            ("unknown_key", "whatever"),
        ] {
            conn.execute("INSERT INTO settings (key,value) VALUES (?1,?2)", [k, v])
                .unwrap();
        }
        let cfg = AppConfig::load(&conn);
        assert_eq!(cfg.water_interval_min, 40);
        assert_eq!(cfg.theme, Theme::Dark);
        assert!(!cfg.sound_enabled);
        assert!(cfg.onboarding_complete);
        assert_eq!(cfg.movement_interval_min, 45, "missing keys use defaults");
    }

    #[test]
    fn sanitize_clamps_and_fixes() {
        let mut cfg = AppConfig::default();
        cfg.water_interval_min = 0;
        cfg.pomodoro_work_min = 999;
        cfg.schedule_start = "25:00".into();
        cfg.schedule_days = vec![9, 2, 2, 0];
        cfg.sanitize();
        assert_eq!(cfg.water_interval_min, 5);
        assert_eq!(cfg.pomodoro_work_min, 120);
        assert_eq!(cfg.schedule_start, "09:00");
        assert_eq!(cfg.schedule_days, vec![2]);
    }

    #[test]
    fn merge_patch_rejects_unknown_keys() {
        let cfg = AppConfig::default();
        let patch = serde_json::json!({ "water_interval_min": 15, "bogus": 1 });
        assert!(cfg.merge_patch(&patch).is_err());
        let ok = cfg
            .merge_patch(&serde_json::json!({ "water_interval_min": 15 }))
            .unwrap();
        assert_eq!(ok.water_interval_min, 15);
    }
}
