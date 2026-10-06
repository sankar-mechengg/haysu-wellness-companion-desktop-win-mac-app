# Changelog

All notable changes to Haysu are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.3.0] - 2026-10-07

### Added

- **Haysu AI.** A personal wellness companion that answers from your own
  records. Bring your own key for Anthropic (Claude), OpenAI (GPT), Z.AI (GLM)
  or OpenRouter; *Auto* uses the first key you add, or pin a provider. Pick a
  model from the list, fetch the provider's latest list, or type any model id.
  Streaming replies, Markdown, conversation history, and a global hotkey
  (Ctrl/⌘+Shift+A). Quick actions: daily briefing, plan my meals, what to
  wear, posture check (camera or file photo), review my week, grooming
  routine and a neutral summary for your doctor. Privacy switches control
  whether health records, diary entries and location are shared; keys live
  only in the local database and are never exported.
- **Daily briefing** at a time you choose, delivered as a popup.
- **Richer profile**: gender (optional), diet (vegetarian, non-vegetarian,
  eggetarian, vegan, pescatarian, other) with allergies and cuisines, main
  goal, dress style with wardrobe notes, free-form "about me", and a city for
  weather. BMI is shown from height and weight. The onboarding wizard gained
  a lifestyle step.
- **Food log** under Health, with optional calories and a one-click meal plan
  from Haysu AI that respects your diet, goal and what you already ate.
- **Personal care routines** under Health → Care: presets (daily check-in,
  posture photo, weigh-in, skincare, haircut, dentist, …) or custom ones,
  every N days at an optional time. They remind you even during Do Not
  Disturb, with Done / Open / Tomorrow.
- **Weather** on the Today tab (Open-Meteo, no key needed) with an outfit
  shortcut.
- **Backup and export.** `.hay` holds everything (profile, settings, logs,
  medicines, diary, routines, AI chats; never API keys). `.su` is a
  health-only snapshot for a clinician or another device. Import merges by
  default or replaces everything; double-clicking a `.hay`/`.su` file opens
  the import dialog. Automatic daily backups with a configurable retention,
  plus a Markdown health report for your doctor.
- **Translucency** (Windows 11 Mica, macOS vibrancy) for the dashboard and
  settings, and an **animations** switch: count-ups, staggered cards and a
  confetti burst when you hit the water goal.
- The widget has an **Ask** button; Health shows a Haysu AI strip on Today.

### Changed

- Database schema version 4 (additive).
- Clear history now also clears food and AI chats; profile, medicines, diary
  and routines are kept.

## [1.2.0] - 2026-10-07

### Added

- **Medicine reminders.** Add medicines with dose, instructions, times of day,
  weekdays and an optional date range. Each dose pops up with Taken / Snooze /
  Skip, fires even during Do Not Disturb, outside work hours and while you're
  away (configurable), survives restarts, and is counted as missed after a
  grace period. The dashboard's Health tab shows the day's schedule with
  undo, a 7-day adherence bar, and lets you browse past and future days. The
  widget, the dashboard strip and the tray tooltip surface the next or
  overdue dose.
- **Health diary.** Log how you feel any time: mood and energy (1–5), pain
  (0–10), sleep hours, symptoms with suggestions, free notes, and an optional
  link to a condition. Entries are editable and grouped by day.
- **Health conditions.** Keep a list of current issues with severity, start
  date and notes; mark them resolved and reopen them.
- **Vitals and measurements.** Weight, blood pressure, heart rate,
  temperature, blood glucose and SpO₂ with charts. A new weight updates the
  profile and the water goal.
- **Trends.** Mood/energy lines, pain and sleep, most-logged symptoms and
  medicine adherence over 7, 30 or 90 days.
- **Dark grey theme** is now the default dark look; a **Blue** variant is
  available under Appearance → Dark style.
- Diary entries and taken doses count towards the daily streak. Exports
  include the new tables (JSON) and three extra CSV files.

### Changed

- Database schema version 3 (additive; existing data is untouched).

## [1.1.0] - 2026-10-06

A ground-up rebuild of the backend and most of the UI. See `docs/AUDIT.md` for
the full list of issues found in 1.0.x.

### Added

- **Configurable Pomodoro**: work, short break, long break lengths and the
  number of sessions before a long break. Optional auto-start for breaks and
  for the next work session.
- **Snooze and auto-dismiss** on every reminder popup, with keyboard shortcuts
  (Enter, Esc, S, D).
- **Exercise timer**: movement popups count down the exercise and log it when
  the timer ends.
- **Quick water amounts** on the popup, the dashboard and the widget.
- **Away detection**: countdowns pause when there is no keyboard or mouse input
  for a configurable number of minutes, and resume when you return.
- **Work-hours schedule**: only remind on chosen weekdays between a start and
  end time, including overnight windows.
- **Timed Do Not Disturb** (30 min, 1 h, 2 h, rest of day) from Settings, the
  tray, and the widget, in addition to manual DND.
- **Customisable global hotkeys** with a recorder and conflict reporting; new
  "open dashboard" and "log water" actions.
- **Native notification option** (popup, native, or both).
- **Streaks**: current and longest streak, active days in the last 30, and a
  water-goal streak on the dashboard.
- **Dynamic tray menu** with live labels (Start/Pause/Resume Pomodoro,
  DND on/off), a quick water log, and a "Check for Updates" item. The tray
  tooltip shows the next reminders.
- **In-app updater** with signed releases from GitHub. The widget and dashboard
  show an update banner; the About page has a manual check.
- **Linux builds** (AppImage and .deb).
- **Widget remembers its position**, has a dedicated drag handle, and offers
  Pomodoro, DND, dashboard and settings controls when expanded.
- **Delete entries** from the dashboard's recent activity list.
- **Data management**: clear history or reset the whole app from Settings.
- **System theme** option that follows the OS.
- **Logging** to a rotating file in the OS log directory.
- CI workflow (typecheck, lint, Prettier, Vitest, cargo fmt/clippy/test on
  three operating systems) and a version-consistency check for releases.
- `npm run bump` script to update every manifest at once.

### Fixed

- Pomodoro sessions were never written to the database, so the dashboard never
  showed any focus time.
- Saved reminder intervals, DND state and Pomodoro durations were ignored on
  startup; every launch reset to the defaults.
- Timezone handling: entries were stored in UTC but filtered by local date,
  hiding early-morning entries for users east of UTC and shifting chart labels
  for users west of it.
- Dark mode only changed the page background. Tailwind v4 was configured with
  a v3 config file, so all `dark:` styles followed the OS instead of the app
  setting.
- Tray menu "Start Pomodoro" and "Enable DND" did nothing.
- DND toggled by hotkey was not persisted, did not pause timers, and was not
  shared between windows.
- The water popup always logged 250 ml regardless of the configured amount.
- Movement reminders ignored the work-style profile and could suggest wall
  sits to sedentary users.
- Timers now use wall-clock deadlines, so they survive system sleep.
- macOS: the tray icon rendered as a black blob (coloured icon flagged as a
  template) and the app showed a dock icon despite being a tray app.
- Closing the dashboard or settings with the window's close button no longer
  breaks reopening them from the tray. The widget cannot be destroyed with
  Alt+F4 any more.
- CSV export now escapes fields correctly and uses a real folder picker.
- Popup window is sized to its content instead of clipping long exercises.
- Release artefacts were all named 1.0.0 and releases stayed in draft.

### Changed

- All windows except the widget and popup are created on demand, cutting idle
  memory.
- Settings save instantly; there are no Save buttons except for the profile.
- Unused dependencies removed (`react-router-dom`, the SQL, store and OS Tauri
  plugins).
- `withGlobalTauri` disabled and a Content-Security-Policy added.
- New application icon that matches the in-app lettermark.

## [1.0.2] - 2026-03-11

- Build fixes for the release workflow.

## [1.0.0] - 2026-03-11

- Initial release: water and movement reminders, Pomodoro timer, floating
  widget, dashboard, onboarding, global hotkeys, autostart.

[1.2.0]: https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/compare/v1.0.0...v1.0.2
[1.0.0]: https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/releases/tag/v1.0.0
