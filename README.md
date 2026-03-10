# Haysu

**Your desktop wellness companion.**

Haysu is a lightweight, cross-platform desktop app that keeps you healthy during long work sessions with smart water reminders, guided movement exercises, and a built-in Pomodoro timer.

## Features

- **Water Reminders** — Weight-based daily goal, confirm/skip tracking, adaptive intervals
- **Movement Reminders** — 40+ exercises (upper body, lower body, eyes, breathing), profile-adaptive intensity
- **Pomodoro Timer** — Classic 25/5/15 cycle with session tracking
- **Floating Widget** — Minimal always-on-top timer with next reminder countdown
- **Dashboard** — Daily and weekly stats with charts, CSV/JSON export
- **Smart Onboarding** — Profile-based setup (age, weight, height, work style, occupation)
- **DND Mode** — Pause all reminders with a hotkey
- **Global Hotkeys** — `Ctrl+Shift+J` (Pomodoro), `Ctrl+Shift+K` (DND)
- **Auto-start** — Launch with your OS
- **Light & Dark Mode** — Soft pastel theme with manual toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Tauri v2 |
| Backend | Rust |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Charts | Recharts |
| Database | SQLite (via tauri-plugin-sql) |
| Build | Vite |

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Requirements

- Node.js 18+
- Rust (latest stable)
- Windows: Visual Studio C++ Build Tools + WebView2
- macOS: Xcode Command Line Tools

## Release

```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions builds .msi/.exe (Windows) and .dmg (macOS) automatically
```

## License

MIT
