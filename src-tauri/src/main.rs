// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tauri::Manager;
use haysu_lib::db::init;
use haysu_lib::timers::{water, movement, pomodoro};
use haysu_lib::tray;
use haysu_lib::hotkeys;
use haysu_lib::commands::{user, settings, stats, export};
use haysu_lib::autostart;

fn main() {
    tauri::Builder::default()
        // ─── Plugins ───
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // Second launch: show widget or onboarding and bring to front
            if let Some(win) = app.get_webview_window("widget") {
                let _ = win.show();
                let _ = win.set_focus();
            } else if let Some(win) = app.get_webview_window("onboarding") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        // ─── Setup ───
        .setup(|app| {
            let handle = app.handle().clone();

            // Initialize database
            let db_state = init::initialize_db(&handle);
            app.manage(db_state);

            // Initialize timer states
            app.manage(Arc::new(water::WaterTimerState::default()));
            app.manage(Arc::new(movement::MovementTimerState::default()));
            app.manage(Arc::new(pomodoro::PomodoroTimerState::default()));

            // Setup system tray
            tray::menu::setup_tray_menu(&handle).ok();

            // Register global hotkeys
            hotkeys::global::register_hotkeys(&handle).ok();

            // Configure autostart from saved settings
            autostart::setup::configure_autostart(&handle).ok();

            // Start background timer loops
            let app_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                water::start_water_timer(app_handle.clone());
                movement::start_movement_timer(app_handle.clone());
                pomodoro::start_pomodoro_loop(app_handle.clone());
            });

            // Ensure the main background window stays hidden
            if let Some(main_win) = handle.get_webview_window("main") {
                let _ = main_win.hide();
            }

            // Check onboarding and show appropriate window
            let app_handle2 = handle.clone();
            tauri::async_runtime::spawn(async move {
                // Delay to let windows and webview initialize (longer on first run after install)
                tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

                let onboarding_complete = {
                    let db = app_handle2.state::<init::DbState>();
                    user::has_completed_onboarding(db).unwrap_or(false)
                };

                if !onboarding_complete {
                    println!("[Haysu] Showing onboarding window");
                    if let Some(win) = app_handle2.get_webview_window("onboarding") {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                } else {
                    println!("[Haysu] Onboarding complete, showing widget");
                    if let Some(win) = app_handle2.get_webview_window("widget") {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            });

            Ok(())
        })
        // ─── Commands ───
        .invoke_handler(tauri::generate_handler![
            // User profile
            user::get_user_profile,
            user::save_user_profile,
            user::update_user_profile,
            user::has_completed_onboarding,
            // Settings
            settings::get_setting,
            settings::set_setting,
            settings::get_all_settings,
            settings::set_multiple_settings,
            // Stats
            stats::log_water,
            stats::get_water_today,
            stats::log_movement,
            stats::get_movement_today,
            stats::log_pomodoro_start,
            stats::log_pomodoro_end,
            stats::get_pomodoro_today,
            stats::get_daily_stats,
            stats::get_weekly_stats,
            // Export
            export::export_json,
            export::export_csv,
            // Water timer
            water::set_water_interval,
            water::pause_water_timer,
            water::resume_water_timer,
            water::reset_water_timer,
            water::get_water_timer_state,
            // Movement timer
            movement::set_movement_interval,
            movement::pause_movement_timer,
            movement::resume_movement_timer,
            movement::reset_movement_timer,
            movement::get_movement_timer_state,
            // Pomodoro
            pomodoro::start_pomodoro,
            pomodoro::pause_pomodoro,
            pomodoro::resume_pomodoro,
            pomodoro::stop_pomodoro,
            pomodoro::skip_pomodoro_phase,
            pomodoro::get_pomodoro_state,
            pomodoro::toggle_pomodoro,
            // Autostart
            autostart::setup::cmd_enable_autostart,
            autostart::setup::cmd_disable_autostart,
            autostart::setup::cmd_is_autostart_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Haysu");
}
