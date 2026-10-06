//! Haysu — desktop wellness companion.

pub mod ai;
pub mod autostart;
pub mod backup;
pub mod care;
pub mod commands;
pub mod config;
pub mod db;
pub mod health;
pub mod hotkeys;
pub mod notify;
pub mod scheduler;
pub mod tray;
pub mod utils;
pub mod weather;
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
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(p) = argv.iter().skip(1).find(|a| {
                let l = a.to_lowercase();
                l.ends_with(".hay") || l.ends_with(".su")
            }) {
                commands::backup::queue_import(app, std::path::PathBuf::from(p));
                return;
            }
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
            if let Ok(conn) = db.conn.lock() {
                let _ = conn.execute(
                    "UPDATE pomodoro_log SET ended_at = ?1, completed = 0 WHERE ended_at IS NULL",
                    [db::time::now_utc()],
                );
            }
            let config = ConfigState::load_from(&db);
            let cfg = config.get();
            let work_style = commands::user::current_work_style(&db);
            app.manage(db);
            app.manage(config);
            app.manage(HotkeyStatus(Mutex::new(Vec::new())));
            app.manage(ai::KeyStore::load(
                &app.state::<DbState>().conn.lock().expect("db lock"),
            ));
            app.manage(weather::WeatherCache::default());
            app.manage(windows::EffectsState(Mutex::new(
                std::collections::HashSet::new(),
            )));
            app.manage(commands::backup::PendingImport(Mutex::new(None)));
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

            scheduler::reload_medicines(&handle);
            scheduler::reload_care(&handle);
            scheduler::start(handle.clone());

            // Daily automatic backup (off the main thread).
            if cfg.auto_backup {
                let h = handle.clone();
                let keep = cfg.auto_backup_keep as usize;
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(20)).await;
                    if let Ok(dir) = h.path().app_data_dir() {
                        let res = h
                            .state::<DbState>()
                            .conn
                            .lock()
                            .map_err(|e| e.to_string())
                            .and_then(|c| backup::auto_backup(&c, &dir, keep));
                        match res {
                            Ok(Some(p)) => log::info!("auto backup written: {}", p.display()),
                            Ok(None) => {}
                            Err(e) => log::warn!("auto backup failed: {e}"),
                        }
                    }
                });
            }

            // A .hay/.su passed on the command line (Windows / Linux file association).
            if let Some(p) = std::env::args().skip(1).find(|a| {
                let l = a.to_lowercase();
                l.ends_with(".hay") || l.ends_with(".su")
            }) {
                let h = handle.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                    commands::backup::queue_import(&h, std::path::PathBuf::from(p));
                });
            }

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
            // Health
            commands::health::list_medicines,
            commands::health::save_medicine,
            commands::health::delete_medicine,
            commands::health::get_dose_schedule,
            commands::health::log_dose,
            commands::health::snooze_dose,
            commands::health::get_adherence,
            commands::health::list_conditions,
            commands::health::save_condition,
            commands::health::delete_condition,
            commands::health::list_diary,
            commands::health::save_diary_entry,
            commands::health::delete_diary_entry,
            commands::health::get_symptom_suggestions,
            commands::health::list_measurements,
            commands::health::add_measurement,
            commands::health::delete_measurement,
            commands::health::measurement_kinds,
            commands::health::list_food,
            commands::health::add_food,
            commands::health::delete_food,
            // AI
            commands::ai::ai_status,
            commands::ai::ai_set_key,
            commands::ai::ai_list_models,
            commands::ai::ai_test,
            commands::ai::ai_conversations,
            commands::ai::ai_messages,
            commands::ai::ai_delete_conversation,
            commands::ai::ai_rename_conversation,
            commands::ai::ai_clear_history,
            commands::ai::ai_send,
            commands::ai::ai_save_photo,
            commands::ai::ai_read_image,
            // Weather
            weather::weather_search,
            weather::weather_set_location,
            weather::weather_now,
            // Care
            commands::care::care_list,
            commands::care::care_presets,
            commands::care::care_save,
            commands::care::care_add_preset,
            commands::care::care_delete,
            commands::care::care_done,
            commands::care::care_snooze,
            // Backup
            commands::backup::backup_export_hay,
            commands::backup::backup_export_su,
            commands::backup::backup_preview,
            commands::backup::backup_import,
            commands::backup::backup_list,
            commands::backup::backup_now,
            commands::backup::backup_health_report,
            commands::backup::backup_save_report,
            commands::backup::backup_take_pending_import,
            // Effects
            commands::system::window_effects_active,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Haysu")
        .run(|app, event| {
            // macOS hands opened files through this event.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                for url in urls {
                    if let Ok(p) = url.to_file_path() {
                        commands::backup::queue_import(app, p);
                    }
                }
            }
            #[cfg(not(target_os = "macos"))]
            {
                let _ = (app, event);
            }
        });
}
