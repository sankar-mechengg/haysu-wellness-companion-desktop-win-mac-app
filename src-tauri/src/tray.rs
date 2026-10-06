//! System tray icon and menu.

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Wry,
};

use crate::scheduler::TrayInfo;
use crate::windows;

pub const TRAY_ID: &str = "main";

fn tray_icon(app: &AppHandle) -> Option<Image<'static>> {
    #[cfg(target_os = "macos")]
    {
        let _ = app;
        Image::from_bytes(include_bytes!("../icons/tray-template.png")).ok()
    }
    #[cfg(not(target_os = "macos"))]
    {
        app.default_window_icon()
            .map(|i| Image::new_owned(i.rgba().to_vec(), i.width(), i.height()))
    }
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let info = TrayInfo {
        pomodoro_running: false,
        pomodoro_paused: false,
        dnd: false,
        tooltip: "Haysu — Wellness Companion".into(),
    };
    let menu = build_menu(app, &info)?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip(&info.tooltip)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| handle_menu(app, event.id.as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                windows::toggle_widget(tray.app_handle());
            }
        });

    if let Some(icon) = tray_icon(app) {
        builder = builder.icon(icon);
    }
    #[cfg(target_os = "macos")]
    {
        builder = builder.icon_as_template(true);
    }

    builder.build(app)?;
    Ok(())
}

/// Rebuild the menu and tooltip to reflect the current state.
pub fn refresh(app: &AppHandle, info: &TrayInfo) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };
    if let Ok(menu) = build_menu(app, info) {
        let _ = tray.set_menu(Some(menu));
    }
    let _ = tray.set_tooltip(Some(&info.tooltip));
}

fn build_menu(app: &AppHandle, info: &TrayInfo) -> tauri::Result<Menu<Wry>> {
    let widget_label = if windows::is_visible(app, windows::WIDGET) {
        "Hide Widget"
    } else {
        "Show Widget"
    };
    let pomo_label = match (info.pomodoro_running, info.pomodoro_paused) {
        (false, _) => "Start Pomodoro",
        (true, true) => "Resume Pomodoro",
        (true, false) => "Pause Pomodoro",
    };
    let dnd_label = if info.dnd {
        "Disable Do Not Disturb"
    } else {
        "Do Not Disturb"
    };

    let widget = MenuItem::with_id(app, "widget", widget_label, true, None::<&str>)?;
    let dashboard = MenuItem::with_id(app, "dashboard", "Dashboard", true, None::<&str>)?;
    let water = MenuItem::with_id(app, "log_water", "Log a glass of water", true, None::<&str>)?;
    let pomodoro = MenuItem::with_id(app, "pomodoro", pomo_label, true, None::<&str>)?;
    let pomodoro_stop = MenuItem::with_id(
        app,
        "pomodoro_stop",
        "Stop Pomodoro",
        info.pomodoro_running,
        None::<&str>,
    )?;
    let dnd = MenuItem::with_id(app, "dnd", dnd_label, true, None::<&str>)?;
    let dnd_1h = MenuItem::with_id(
        app,
        "dnd_1h",
        "Do Not Disturb for 1 hour",
        !info.dnd,
        None::<&str>,
    )?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
    let updates = MenuItem::with_id(app, "updates", "Check for Updates…", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Haysu", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &widget,
            &dashboard,
            &PredefinedMenuItem::separator(app)?,
            &water,
            &pomodoro,
            &pomodoro_stop,
            &PredefinedMenuItem::separator(app)?,
            &dnd,
            &dnd_1h,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &updates,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )
}

fn handle_menu(app: &AppHandle, id: &str) {
    match id {
        "widget" => windows::toggle_widget(app),
        "dashboard" => {
            windows::ensure_window(app, windows::DASHBOARD);
        }
        "settings" => {
            windows::ensure_window(app, windows::SETTINGS);
        }
        "log_water" => crate::commands::stats::quick_log_water(app),
        "pomodoro" => crate::scheduler::pomodoro_command(app, "toggle"),
        "pomodoro_stop" => crate::scheduler::pomodoro_command(app, "stop"),
        "dnd" => crate::commands::config::toggle_dnd_internal(app, None),
        "dnd_1h" => crate::commands::config::set_dnd_internal(app, true, Some(60)),
        "updates" => {
            if let Some(win) = windows::ensure_window(app, windows::DASHBOARD) {
                use tauri::Emitter;
                let _ = win.emit("check-updates", ());
            }
        }
        "quit" => app.exit(0),
        _ => {}
    }
}
