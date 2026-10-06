# Haysu 1.0.x Audit

Audit of the codebase as of commit `5558344` (March 2026), performed before the 1.1.0 rebuild.
Severity: **S1** = data loss or feature does not work, **S2** = wrong behaviour users will notice,
**S3** = quality, maintainability, or polish.

## 1. Rust backend

| # | Sev | Area | Finding |
|---|-----|------|---------|
| B1 | S1 | Pomodoro | `log_pomodoro_start` / `log_pomodoro_end` are never called by anyone. `PomodoroTimerState.current_log_id` is dead. The dashboard "Focus Sessions" and weekly Pomodoro chart are permanently zero. |
| B2 | S1 | Timers | `start_water_timer` / `start_movement_timer` start with the hard-coded 30 / 45 minute defaults. Saved `water_interval_min` / `movement_interval_min` are only applied when the user re-saves settings. Every app launch silently resets intervals. |
| B3 | S1 | Pomodoro | `pomodoro_work_min`, `pomodoro_short_break_min`, `pomodoro_long_break_min`, `pomodoro_sessions_before_long` exist in the settings table but the backend never reads them and the UI never writes them. Pomodoro durations are not configurable. |
| B4 | S1 | DND | `dnd_enabled` is persisted but never restored on startup; timers run and reminders fire even if DND was on when the app quit. |
| B5 | S1 | Time zones | Rows are stamped with `CURRENT_TIMESTAMP` (UTC). Queries compare `date(timestamp)` (UTC date) against `date('now','localtime')` or a local date string from the UI. For UTC+5:30 everything logged between 00:00 and 05:30 local disappears from "today"; for negative offsets evening entries move to tomorrow. |
| B6 | S2 | Tray | "Start Pomodoro" and "Enable DND" emit `tray-action`; no window listens to that event. Both items are no-ops. Labels never update. |
| B7 | S2 | Movement | The backend picks a random exercise from all 40 ids, ignoring `work_style`. Sedentary users receive wall sits and lunges. The "profile-adaptive intensity" claim in the README is false. |
| B8 | S2 | Timers | Loops sleep 1 s and decrement a counter. After system sleep/suspend the countdown resumes where it left off instead of accounting for elapsed wall-clock time. No idle detection: reminders fire into an empty room and reset. |
| B9 | S2 | Hotkeys | Handler matches on `shortcut.to_string().contains("J")`. Registration of both shortcuts fails together if either conflicts; failure is swallowed by `.ok()`. Not customizable. |
| B10 | S2 | Single instance | Second launch always shows the widget, even during onboarding (widget window exists from config). |
| B11 | S2 | Tray icon | `iconAsTemplate: true` with a full-colour PNG. macOS renders template icons as a solid silhouette, producing a black blob. |
| B12 | S2 | macOS | No `ActivationPolicy::Accessory`; a tray-only app shows a dock icon with a blank window. |
| B13 | S2 | Windows | Closing Dashboard/Settings with the title-bar X destroys the webview. Tray then recreates it via `WebviewWindowBuilder`, losing config (icons, min size). Widget can be destroyed with Alt+F4 and never comes back. |
| B14 | S2 | Export CSV | Frontend uses a *save-file* dialog and strips the filename to get a folder. `lastIndexOf("/")` on Windows paths returns -1. No CSV escaping of commas/quotes. `dialog:allow-open` permission missing so a proper folder picker cannot be used. |
| B15 | S3 | DB | `get_db_path` and `initialize_db` use `expect`, crashing the process with no message if the app data dir is unwritable. No schema version / migration table. |
| B16 | S3 | Settings | Untyped string map. Every consumer parses strings with its own defaults. |
| B17 | S3 | Deps | `tauri-plugin-sql`, `tauri-plugin-store`, `tauri-plugin-os`, `tauri-plugin-notification` are initialised but unused. `TimerState` model unused. |
| B18 | S3 | Security | `withGlobalTauri: true` exposes `window.__TAURI__` unnecessarily. No CSP configured. |
| B19 | S3 | Timer events | Water/movement emit `remaining` before decrement, Pomodoro emits `remaining - 1`. Three separate `timer-tick` events per second. |
| B20 | S3 | Weekly stats | Locks and unlocks the DB mutex 8 times per day for 7 days. Fine for SQLite but noisy. |

## 2. Frontend

| # | Sev | Area | Finding |
|---|-----|------|---------|
| F1 | S1 | Theme | Tailwind v4 is used (`@import "tailwindcss"`, `@theme`) but dark mode is configured via the v3 `tailwind.config.js` (`darkMode: "class"`), which v4 ignores. All `dark:` utilities follow `prefers-color-scheme`, not `body.dark`. Toggling the theme changes the body background only; cards, text, and borders stay in OS mode. |
| F2 | S1 | State | Every Tauri window is its own webview with its own Zustand store. DND toggled via hotkey flips a boolean in each window that happens to be listening, never persists, never pauses timers. Settings window toggles persist and pause timers but do not inform the widget or popup. |
| F3 | S1 | Water | `WaterPopup` always logs 250 ml. The "Amount per reminder" setting is ignored. |
| F4 | S2 | Dates | `todayStr()` / `weekStartStr()` use `toISOString()` (UTC). `new Date("YYYY-MM-DD")` parses as UTC midnight, so chart weekday labels shift one day in the Americas. Activity times from SQLite ("YYYY-MM-DD HH:MM:SS") are parsed as local time but are UTC. |
| F5 | S2 | Pomodoro popup | `pomodoroSession` in the store is never set; the popup always says "Session 1" and always suggests a short break. |
| F6 | S2 | Popup | Window height is fixed at 220 px. Movement popups with a long description plus buttons overflow and are clipped. A second reminder arriving while one is open replaces it silently (no log entry). No auto-dismiss, no snooze. |
| F7 | S2 | Widget | `data-tauri-drag-region` is on the same element as the click handler. On Windows, mousedown starts a native drag so click rarely fires. `resizable: true` lets users accidentally resize a 240x52 widget. Position is not remembered. |
| F8 | S2 | Widget | `widget_visible` setting is ignored on startup; the backend always shows the widget after onboarding. |
| F9 | S2 | Popup DND | `PopupWindow` reads DND from its own store, which never loads from DB. DND set in Settings does not stop popups after a restart. |
| F10 | S3 | Version | "Version 1.0.0" hard-coded in `GeneralSettings`. |
| F11 | S3 | Hooks | `useTauriEvent` cleanup runs before `listen()` resolves under StrictMode, leaking a listener. `useTimer` and `useTauriEvents` are dead code. |
| F12 | S3 | Export | `save()` dialog abused as a folder picker. |
| F13 | S3 | Charts | Tooltip styles hard-coded to white; unreadable in dark mode. |
| F14 | S3 | Deps | `react-router-dom` unused. `tailwind.config.js` and `postcss.config.js` are inert under v4. |
| F15 | S3 | Errors | Failures are `console.error` only. No user-facing feedback on save failures. |
| F16 | S3 | Quality | No ESLint, Prettier, or frontend tests. `noUnusedLocals: false`. |

## 3. Release pipeline

| # | Sev | Finding |
|---|-----|---------|
| R1 | S1 | `version` in `tauri.conf.json`, `Cargo.toml`, `package.json` was never bumped. Tags v1.0.1 and v1.0.2 produced releases titled "Haysu v1.0.0" with `Haysu_1.0.0_*` assets. |
| R2 | S1 | `releaseDraft: true`. Both releases are still drafts; nothing is publicly downloadable. |
| R3 | S2 | No CI on push/PR. The only workflow is the tag release, so broken commits are discovered 8 minutes into a release build. |
| R4 | S2 | Release notes link to `CHANGELOG.md` on branch `main`; the branch is `master` and the file does not exist. |
| R5 | S2 | No Linux target. No updater artifacts or `latest.json`. |
| R6 | S3 | macOS "right-click → Open" advice is outdated for macOS 15+, which requires System Settings → Privacy & Security → Open Anyway. |
| R7 | S3 | No version/tag consistency check before building. |

## 4. Resolution

All S1 and S2 items and the listed S3 items are addressed in 1.1.0. See `CHANGELOG.md` for the user-facing summary and the commit history for details.
