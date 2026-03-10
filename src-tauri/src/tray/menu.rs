use tauri::{
    AppHandle, Emitter, Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconEvent, MouseButton, MouseButtonState},
};

/// Build and attach the system tray menu
pub fn setup_tray_menu(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let tray = app.tray_by_id("main").unwrap_or_else(|| {
        app.tray_by_id("main").expect("No tray icon found")
    });

    rebuild_tray_menu(app, &tray)?;

    // Only toggle widget on LEFT click — right click opens the menu naturally
    let app_handle = app.clone();
    tray.on_tray_icon_event(move |_tray, event| {
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event {
            if let Some(widget_win) = app_handle.get_webview_window("widget") {
                if widget_win.is_visible().unwrap_or(false) {
                    let _ = widget_win.hide();
                } else {
                    let _ = widget_win.show();
                    let _ = widget_win.set_focus();
                }
            }
        }
    });

    Ok(())
}

/// Build the tray menu items
pub fn rebuild_tray_menu(
    app: &AppHandle,
    tray: &tauri::tray::TrayIcon,
) -> Result<(), Box<dyn std::error::Error>> {
    let show_widget = MenuItem::with_id(app, "show_widget", "Show Widget", true, None::<&str>)?;
    let show_dashboard = MenuItem::with_id(app, "show_dashboard", "Dashboard", true, None::<&str>)?;
    let toggle_pomodoro = MenuItem::with_id(app, "toggle_pomodoro", "Start Pomodoro", true, None::<&str>)?;
    let toggle_dnd = MenuItem::with_id(app, "toggle_dnd", "Enable DND", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let show_settings = MenuItem::with_id(app, "show_settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Haysu", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_widget,
            &show_dashboard,
            &sep1,
            &toggle_pomodoro,
            &toggle_dnd,
            &sep2,
            &show_settings,
            &sep3,
            &quit,
        ],
    )?;

    tray.set_menu(Some(menu))?;

    // Handle menu item clicks
    let app_handle = app.clone();
    tray.on_menu_event(move |_app, event| {
        match event.id.as_ref() {
            "show_widget" => {
                if let Some(win) = app_handle.get_webview_window("widget") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "show_dashboard" => {
                if let Some(win) = app_handle.get_webview_window("dashboard") {
                    let _ = win.show();
                    let _ = win.set_focus();
                } else {
                    // Window might need to be created
                    let _ = tauri::WebviewWindowBuilder::new(
                        &app_handle,
                        "dashboard",
                        tauri::WebviewUrl::App("/?window=dashboard".into()),
                    )
                    .title("Haysu Dashboard")
                    .inner_size(920.0, 670.0)
                    .center()
                    .build();
                }
            }
            "toggle_pomodoro" => {
                let _ = app_handle.emit("tray-action", "toggle_pomodoro");
            }
            "toggle_dnd" => {
                let _ = app_handle.emit("tray-action", "toggle_dnd");
            }
            "show_settings" => {
                if let Some(win) = app_handle.get_webview_window("settings") {
                    let _ = win.show();
                    let _ = win.set_focus();
                } else {
                    let _ = tauri::WebviewWindowBuilder::new(
                        &app_handle,
                        "settings",
                        tauri::WebviewUrl::App("/?window=settings".into()),
                    )
                    .title("Haysu Settings")
                    .inner_size(560.0, 620.0)
                    .center()
                    .build();
                }
            }
            "quit" => {
                app_handle.exit(0);
            }
            _ => {}
        }
    });

    Ok(())
}
