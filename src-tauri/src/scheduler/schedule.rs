//! Work-hours schedule check.

use chrono::{Datelike, NaiveTime, Timelike};

use crate::config::AppConfig;

/// Returns `true` when reminders are allowed at the given local time.
/// With the schedule disabled this is always `true`.
pub fn is_within_schedule(cfg: &AppConfig, now: chrono::DateTime<chrono::Local>) -> bool {
    if !cfg.schedule_enabled {
        return true;
    }
    let weekday = now.weekday().number_from_monday() as u8;
    if !cfg.schedule_days.contains(&weekday) {
        return false;
    }
    let (Some(start), Some(end)) = (
        parse_hhmm(&cfg.schedule_start),
        parse_hhmm(&cfg.schedule_end),
    ) else {
        return true;
    };
    let t = NaiveTime::from_hms_opt(now.hour(), now.minute(), 0).unwrap_or(start);
    if start <= end {
        t >= start && t < end
    } else {
        // Overnight window, e.g. 22:00 → 06:00.
        t >= start || t < end
    }
}

fn parse_hhmm(s: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(s, "%H:%M").ok()
}

#[cfg(test)]
#[allow(clippy::field_reassign_with_default)]
mod tests {
    use super::*;
    use chrono::{Local, TimeZone};

    fn at(y: i32, m: u32, d: u32, h: u32, min: u32) -> chrono::DateTime<Local> {
        Local.with_ymd_and_hms(y, m, d, h, min, 0).unwrap()
    }

    #[test]
    fn disabled_schedule_always_allows() {
        let cfg = AppConfig::default();
        assert!(is_within_schedule(&cfg, at(2026, 3, 15, 3, 0))); // Sunday 03:00
    }

    #[test]
    fn respects_days_and_hours() {
        let mut cfg = AppConfig::default();
        cfg.schedule_enabled = true;
        cfg.schedule_days = vec![1, 2, 3, 4, 5];
        cfg.schedule_start = "09:00".into();
        cfg.schedule_end = "18:00".into();
        assert!(is_within_schedule(&cfg, at(2026, 3, 11, 10, 0))); // Wed
        assert!(!is_within_schedule(&cfg, at(2026, 3, 11, 18, 0))); // end exclusive
        assert!(!is_within_schedule(&cfg, at(2026, 3, 14, 10, 0))); // Sat
    }

    #[test]
    fn overnight_window() {
        let mut cfg = AppConfig::default();
        cfg.schedule_enabled = true;
        cfg.schedule_days = (1..=7).collect();
        cfg.schedule_start = "22:00".into();
        cfg.schedule_end = "06:00".into();
        assert!(is_within_schedule(&cfg, at(2026, 3, 11, 23, 30)));
        assert!(is_within_schedule(&cfg, at(2026, 3, 11, 5, 59)));
        assert!(!is_within_schedule(&cfg, at(2026, 3, 11, 12, 0)));
    }
}
