//! Timestamp helpers.
//!
//! All rows are stored in UTC using the SQLite-friendly `YYYY-MM-DD HH:MM:SS`
//! format (the same format `CURRENT_TIMESTAMP` produces, so pre-1.1 rows stay
//! compatible). Values handed to the frontend are normalised to RFC 3339 with a
//! trailing `Z` so `new Date()` parses them as UTC.

use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, Utc};

pub const SQLITE_FMT: &str = "%Y-%m-%d %H:%M:%S";

/// Current UTC time in storage format.
pub fn now_utc() -> String {
    Utc::now().format(SQLITE_FMT).to_string()
}

/// Today's date in the machine's local timezone, `YYYY-MM-DD`.
pub fn today_local() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

/// Add `days` to a `YYYY-MM-DD` date. Returns the input unchanged if it does
/// not parse.
pub fn add_days(date: &str, days: i64) -> String {
    NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|d| {
            (d + chrono::Duration::days(days))
                .format("%Y-%m-%d")
                .to_string()
        })
        .unwrap_or_else(|_| date.to_string())
}

/// Validate a `YYYY-MM-DD` string.
pub fn is_valid_date(date: &str) -> bool {
    NaiveDate::parse_from_str(date, "%Y-%m-%d").is_ok()
}

/// Convert a stored timestamp to RFC 3339 UTC (`2026-03-11T10:00:00Z`).
/// Accepts both the storage format and already-normalised RFC 3339 strings.
pub fn to_rfc3339(stored: &str) -> String {
    if let Ok(dt) = NaiveDateTime::parse_from_str(stored, SQLITE_FMT) {
        return DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc)
            .format("%Y-%m-%dT%H:%M:%SZ")
            .to_string();
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(stored) {
        return dt
            .with_timezone(&Utc)
            .format("%Y-%m-%dT%H:%M:%SZ")
            .to_string();
    }
    stored.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalises_sqlite_format() {
        assert_eq!(to_rfc3339("2026-03-11 10:05:09"), "2026-03-11T10:05:09Z");
    }

    #[test]
    fn passes_through_rfc3339() {
        assert_eq!(
            to_rfc3339("2026-03-11T10:05:09+05:30"),
            "2026-03-11T04:35:09Z"
        );
    }

    #[test]
    fn leaves_garbage_alone() {
        assert_eq!(to_rfc3339("nope"), "nope");
    }

    #[test]
    fn adds_days_across_month() {
        assert_eq!(add_days("2026-01-30", 3), "2026-02-02");
        assert_eq!(add_days("2026-03-01", -1), "2026-02-28");
    }
}
