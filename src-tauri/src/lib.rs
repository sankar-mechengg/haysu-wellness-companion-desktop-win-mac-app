//! Haysu — desktop wellness companion.

pub mod autostart;
pub mod commands;
pub mod config;
pub mod db;
pub mod hotkeys;
pub mod notify;
pub mod scheduler;
pub mod tray;
pub mod utils;
pub mod windows;

use std::sync::{Arc, Mutex};

use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

use config::ConfigState;
use db::DbState;
use hotkeys::HotkeyStatus;
use scheduler::SchedulerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log_level)
                .level_for("hyper", log::LevelFilter::Warn)
                .level_for("reqwest", log::LevelFilter::Warn)
                .level_for("tao", log::LevelFilter::Warn)
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("haysu".into()),
                    }),
                ])
                .max_file_size(2 * 1024 * 1024)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let cfg = app.state::<ConfigState>().get();
            if cfg.onboarding_complete {
                windows::show_widget(app);
            } else {
                windows::ensure_window(app, windows::ONBOARDING);
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Database and config.
            let path = db::init::db_path(&handle)?;
            let db = DbState::open(&path).map_err(|e| {
                log::error!("{e}");
                std::io::Error::other(e)
            })?;
            log::info!("database at {}", path.display());
            let config = ConfigState::load_from(&db);
            let cfg = config.get();
            let work_style = commands::user::current_work_style(&db);
            app.manage(db);
            app.manage(config);
            app.manage(HotkeyStatus(Mutex::new(Vec::new())));
            app.manage(Arc::new(Mutex::new(SchedulerState::new(&cfg, work_style))));

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            if let Err(e) = tray::setup(&handle) {
                log::error!("tray setup failed: {e}");
            }
            hotkeys::apply(&handle, &cfg);
            if let Err(e) = autostart::apply(&handle, cfg.autostart_enabled) {
                log::warn!("autostart sync failed: {e}");
            }

            scheduler::start(handle.clone());

            if cfg.onboarding_complete {
                if cfg.widget_visible {
                    windows::show_widget(&handle);
                }
            } else {
                windows::ensure_window(&handle, windows::ONBOARDING);
            }

            log::info!("Haysu {} ready", env!("CARGO_PKG_VERSION"));
            Ok(())
        })
        .on_window_event(windows::on_window_event)
        .invoke_handler(tauri::generate_handler![
            // Profile
            commands::user::get_user_profile,
            commands::user::save_user_profile,
            commands::user::has_completed_onboarding,
            // Config
            commands::config::get_config,
            commands::config::update_config,
            commands::config::set_dnd,
            commands::config::toggle_dnd,
            commands::config::get_hotkey_status,
            commands::config::validate_hotkey,
            commands::config::complete_onboarding,
            commands::config::reset_data,
            // Stats
            commands::stats::log_water,
            commands::stats::get_water_today,
            commands::stats::log_movement,
            commands::stats::get_movement_today,
            commands::stats::get_pomodoro_today,
            commands::stats::delete_entry,
            commands::stats::get_today_date,
            commands::stats::get_daily_stats,
            commands::stats::get_weekly_stats,
            commands::stats::get_streaks,
            // Export
            commands::export::export_json,
            commands::export::export_csv,
            // Timers
            commands::timers::get_app_state,
            commands::timers::snooze_reminder,
            commands::timers::reset_reminder,
            commands::timers::pomodoro_action,
            commands::timers::hide_popup,
            // System
            commands::system::get_system_info,
            commands::system::show_window,
            commands::system::hide_window,
            commands::system::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Haysu");
}
