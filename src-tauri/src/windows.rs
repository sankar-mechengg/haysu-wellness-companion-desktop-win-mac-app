//! Window management: lazy creation, show/hide, close interception and the
//! floating widget's remembered position.

use tauri::{
    AppHandle, LogicalSize, Manager, PhysicalPosition, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, Window, WindowEvent,
};

use std::collections::HashSet;
use std::sync::Mutex;

use crate::config::{AppConfig, ConfigState, DarkVariant, Theme};
use crate::scheduler::Scheduler;

pub const WIDGET: &str = "widget";
pub const POPUP: &str = "popup";
pub const DASHBOARD: &str = "dashboard";
pub const SETTINGS: &str = "settings";
pub const ONBOARDING: &str = "onboarding";

/// Labels of windows that currently have a native translucency effect.
pub struct EffectsState(pub Mutex<HashSet<String>>);

/// Whether this OS can do Mica / vibrancy at all.
pub fn effects_supported() -> bool {
    #[cfg(target_os = "windows")]
    {
        // Mica needs Windows 11 (build 22000+).
        windows_build() >= 22000
    }
    #[cfg(target_os = "macos")]
    {
        true
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        false
    }
}

#[cfg(target_os = "windows")]
fn windows_build() -> u32 {
    use std::sync::OnceLock;
    static BUILD: OnceLock<u32> = OnceLock::new();
    *BUILD.get_or_init(|| {
        // RtlGetVersion is not affected by compatibility shims. Read it via the
        // registry-free `ver` command to avoid extra crates; 0 on failure.
        std::process::Command::new("cmd")
            .args(["/C", "ver"])
            .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
            .output()
            .ok()
            .and_then(|o| {
                let s = String::from_utf8_lossy(&o.stdout);
                s.split('.')
                    .nth(2)
                    .and_then(|b| b.trim_matches(|c: char| !c.is_ascii_digit()).parse().ok())
            })
            .unwrap_or(0)
    })
}

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Apply Mica (Windows 11) or vibrancy (macOS) to a window; returns whether it took.
pub fn apply_effects(app: &AppHandle, win: &WebviewWindow, cfg: &AppConfig) -> bool {
    let label = win.label().to_string();
    #[allow(unused_mut)]
    let mut ok = false;
    if cfg.window_effects && effects_supported() {
        #[cfg(target_os = "windows")]
        {
            let dark = match cfg.theme {
                Theme::Dark => Some(true),
                Theme::Light => Some(false),
                Theme::System => None,
            };
            ok = window_vibrancy::apply_mica(win, dark).is_ok();
        }
        #[cfg(target_os = "macos")]
        {
            use window_vibrancy::{NSVisualEffectMaterial, NSVisualEffectState};
            ok = window_vibrancy::apply_vibrancy(
                win,
                NSVisualEffectMaterial::Sidebar,
                Some(NSVisualEffectState::Active),
                Some(12.0),
            )
            .is_ok();
        }
    }
    if let Ok(mut set) = app.state::<EffectsState>().0.lock() {
        if ok {
            set.insert(label);
        } else {
            set.remove(&label);
        }
    }
    ok
}

pub fn has_effects(app: &AppHandle, label: &str) -> bool {
    app.state::<EffectsState>()
        .0
        .lock()
        .map(|s| s.contains(label))
        .unwrap_or(false)
}

/// Windows that are created from `tauri.conf.json` and must never be destroyed.
const PERSISTENT: &[&str] = &[WIDGET, POPUP];

fn url_for(label: &str) -> WebviewUrl {
    WebviewUrl::App(format!("/?window={label}").into())
}

/// Show an existing window or create it. Returns the window on success.
pub fn ensure_window(app: &AppHandle, label: &str) -> Option<WebviewWindow> {
    if let Some(win) = app.get_webview_window(label) {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
        return Some(win);
    }

    let builder = match label {
        DASHBOARD => WebviewWindowBuilder::new(app, DASHBOARD, url_for(DASHBOARD))
            .title("Haysu Dashboard")
            .inner_size(960.0, 720.0)
            .min_inner_size(760.0, 560.0)
            .center(),
        SETTINGS => WebviewWindowBuilder::new(app, SETTINGS, url_for(SETTINGS))
            .title("Haysu Settings")
            .inner_size(640.0, 700.0)
            .min_inner_size(560.0, 560.0)
            .center(),
        ONBOARDING => WebviewWindowBuilder::new(app, ONBOARDING, url_for(ONBOARDING))
            .title("Welcome to Haysu")
            .inner_size(640.0, 580.0)
            .resizable(false)
            .decorations(false)
            .always_on_top(true)
            .center(),
        _ => return None,
    };

    let cfg = app.state::<ConfigState>().get();
    let translucent = cfg.window_effects && effects_supported();
    let builder = if translucent {
        builder.transparent(true)
    } else {
        builder
    };
    let builder = match cfg.theme {
        Theme::Dark if translucent => builder.theme(Some(tauri::Theme::Dark)),
        Theme::Light if translucent => builder.theme(Some(tauri::Theme::Light)),
        Theme::Dark => {
            builder
                .theme(Some(tauri::Theme::Dark))
                .background_color(match cfg.dark_variant {
                    DarkVariant::Blue => tauri::window::Color(21, 22, 42, 255),
                    DarkVariant::Grey => tauri::window::Color(24, 24, 27, 255),
                })
        }
        Theme::Light => builder
            .theme(Some(tauri::Theme::Light))
            .background_color(tauri::window::Color(246, 247, 251, 255)),
        Theme::System => builder,
    };

    match builder.visible(true).build() {
        Ok(win) => {
            apply_effects(app, &win, &cfg);
            let _ = win.set_focus();
            Some(win)
        }
        Err(e) => {
            log::error!("failed to create window {label}: {e}");
            None
        }
    }
}

pub fn hide_window(app: &AppHandle, label: &str) {
    if let Some(win) = app.get_webview_window(label) {
        if PERSISTENT.contains(&label) {
            let _ = win.hide();
        } else {
            let _ = win.close();
        }
    }
}

pub fn is_visible(app: &AppHandle, label: &str) -> bool {
    app.get_webview_window(label)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

/// Show the widget, restoring its saved position when it is still on-screen.
pub fn show_widget(app: &AppHandle) {
    let cfg = app.state::<ConfigState>().get();
    let Some(win) = app.get_webview_window(WIDGET) else {
        return;
    };
    let _ = win.set_always_on_top(cfg.widget_always_on_top);
    let _ = win.set_size(LogicalSize::new(260.0, 56.0));
    match (cfg.widget_x, cfg.widget_y) {
        (Some(x), Some(y)) if point_on_some_monitor(&win, x, y) => {
            let _ = win.set_position(PhysicalPosition::new(x, y));
        }
        _ => {
            let _ = win.center();
        }
    }
    let _ = win.show();
}

pub fn toggle_widget(app: &AppHandle) {
    if is_visible(app, WIDGET) {
        hide_window(app, WIDGET);
    } else {
        show_widget(app);
    }
}

fn point_on_some_monitor(win: &WebviewWindow, x: i32, y: i32) -> bool {
    let Ok(monitors) = win.available_monitors() else {
        return false;
    };
    monitors.iter().any(|m| {
        let p = m.position();
        let s = m.size();
        // Allow a little slack so a partly off-screen widget is still restored.
        x >= p.x - 40
            && y >= p.y - 10
            && x < p.x + s.width as i32 - 40
            && y < p.y + s.height as i32 - 20
    })
}

/// Move the popup to the top-centre of the monitor the widget lives on and show it.
pub fn show_popup(app: &AppHandle) {
    let Some(popup) = app.get_webview_window(POPUP) else {
        return;
    };
    let monitor = app
        .get_webview_window(WIDGET)
        .and_then(|w| w.current_monitor().ok().flatten())
        .or_else(|| popup.primary_monitor().ok().flatten());
    if let Some(m) = monitor {
        let scale = m.scale_factor();
        let width = (440.0 * scale) as i32;
        let height = (300.0 * scale) as i32;
        let x = m.position().x + (m.size().width as i32 - width) / 2;
        let mut y = m.position().y + (28.0 * scale) as i32;
        // Keep clear of the widget if the user parked it along the top edge.
        if let Some(widget) = app.get_webview_window(WIDGET) {
            if widget.is_visible().unwrap_or(false) {
                if let (Ok(wp), Ok(ws)) = (widget.outer_position(), widget.outer_size()) {
                    let overlaps_x = wp.x < x + width && wp.x + ws.width as i32 > x;
                    let overlaps_y = wp.y < y + height && wp.y + ws.height as i32 > y;
                    if overlaps_x && overlaps_y {
                        y = wp.y + ws.height as i32 + (8.0 * scale) as i32;
                    }
                }
            }
        }
        let _ = popup.set_position(PhysicalPosition::new(x, y));
    }
    let _ = popup.show();
}

pub fn hide_popup(app: &AppHandle) {
    if let Some(popup) = app.get_webview_window(POPUP) {
        let _ = popup.hide();
    }
}

/// Apply widget preferences after a config change.
pub fn apply_widget_prefs(app: &AppHandle, old: &AppConfig, new: &AppConfig) {
    if old.widget_always_on_top != new.widget_always_on_top {
        if let Some(win) = app.get_webview_window(WIDGET) {
            let _ = win.set_always_on_top(new.widget_always_on_top);
        }
    }
    if old.widget_visible != new.widget_visible {
        if new.widget_visible {
            show_widget(app);
        } else {
            hide_window(app, WIDGET);
        }
    }
}

/// Global window-event hook installed on the builder.
pub fn on_window_event(window: &Window, event: &WindowEvent) {
    let label = window.label();
    match event {
        WindowEvent::CloseRequested { api, .. } if PERSISTENT.contains(&label) => {
            api.prevent_close();
            let _ = window.hide();
            if label == WIDGET {
                // Closing the widget (Alt+F4 / Cmd+W) means "hide"; remember that.
                let app = window.app_handle();
                if let Some(state) = app.try_state::<ConfigState>() {
                    let cfg = state.get();
                    if cfg.widget_visible {
                        let mut next = cfg;
                        next.widget_visible = false;
                        crate::commands::config::commit_config_quiet(app, next);
                    }
                }
            }
        }
        WindowEvent::Moved(pos) if label == WIDGET && window.is_visible().unwrap_or(false) => {
            // Config windows are created before `setup` manages state; be tolerant.
            if let Some(scheduler) = window.app_handle().try_state::<Scheduler>() {
                if let Ok(mut st) = scheduler.lock() {
                    st.note_widget_moved(pos.x, pos.y);
                }
            }
        }
        _ => {}
    }
}
