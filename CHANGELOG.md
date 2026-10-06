# Changelog

All notable changes to Haysu are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

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

[1.1.0]: https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/compare/v1.0.0...v1.0.2
[1.0.0]: https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app/releases/tag/v1.0.0
