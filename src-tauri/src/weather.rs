//! Weather via Open-Meteo (free, no API key). Cached for 30 minutes.

use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::config::ConfigState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub name: String,
    pub country: String,
    pub admin: String,
    pub lat: f64,
    pub lon: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Weather {
    pub location_name: String,
    pub temp_c: f64,
    pub feels_like_c: f64,
    pub temp_min_c: f64,
    pub temp_max_c: f64,
    pub humidity: i64,
    pub wind_kph: f64,
    pub precipitation_prob: i64,
    pub uv_index: f64,
    pub weather_code: i64,
    pub description: String,
    pub icon: String,
    pub is_day: bool,
    pub sunrise: String,
    pub sunset: String,
    pub fetched_at: String,
}

type CacheEntry = (Instant, (f64, f64), Weather);

pub struct WeatherCache(pub Mutex<Option<CacheEntry>>);

impl Default for WeatherCache {
    fn default() -> Self {
        WeatherCache(Mutex::new(None))
    }
}

fn http() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(format!("Haysu/{}", env!("CARGO_PKG_VERSION")))
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())
}

/// WMO weather code → (description, emoji).
pub fn describe_code(code: i64, is_day: bool) -> (&'static str, &'static str) {
    match code {
        0 => ("Clear sky", if is_day { "☀️" } else { "🌙" }),
        1 => ("Mainly clear", if is_day { "🌤️" } else { "🌙" }),
        2 => ("Partly cloudy", "⛅"),
        3 => ("Overcast", "☁️"),
        45 | 48 => ("Fog", "🌫️"),
        51 | 53 | 55 => ("Drizzle", "🌦️"),
        56 | 57 => ("Freezing drizzle", "🌧️"),
        61 | 63 | 65 => ("Rain", "🌧️"),
        66 | 67 => ("Freezing rain", "🌧️"),
        71 | 73 | 75 | 77 => ("Snow", "🌨️"),
        80..=82 => ("Rain showers", "🌦️"),
        85 | 86 => ("Snow showers", "🌨️"),
        95 => ("Thunderstorm", "⛈️"),
        96 | 99 => ("Thunderstorm with hail", "⛈️"),
        _ => ("Unknown", "🌡️"),
    }
}

pub async fn geocode(query: &str) -> Result<Vec<Location>, String> {
    let q = query.trim();
    if q.len() < 2 {
        return Ok(vec![]);
    }
    let client = http()?;
    let v: Value = client
        .get("https://geocoding-api.open-meteo.com/v1/search")
        .query(&[
            ("name", q),
            ("count", "6"),
            ("language", "en"),
            ("format", "json"),
        ])
        .send()
        .await
        .map_err(|e| format!("Location lookup failed: {e}"))?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let out = v
        .get("results")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|r| {
                    Some(Location {
                        name: r.get("name")?.as_str()?.to_string(),
                        country: r
                            .get("country")
                            .and_then(|c| c.as_str())
                            .unwrap_or("")
                            .to_string(),
                        admin: r
                            .get("admin1")
                            .and_then(|c| c.as_str())
                            .unwrap_or("")
                            .to_string(),
                        lat: r.get("latitude")?.as_f64()?,
                        lon: r.get("longitude")?.as_f64()?,
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    Ok(out)
}

pub async fn fetch(lat: f64, lon: f64, name: &str) -> Result<Weather, String> {
    let client = http()?;
    let v: Value = client
        .get("https://api.open-meteo.com/v1/forecast")
        .query(&[
            ("latitude", lat.to_string()),
            ("longitude", lon.to_string()),
            (
                "current",
                "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day"
                    .to_string(),
            ),
            (
                "daily",
                "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset"
                    .to_string(),
            ),
            ("timezone", "auto".to_string()),
            ("forecast_days", "1".to_string()),
        ])
        .send()
        .await
        .map_err(|e| format!("Weather request failed: {e}"))?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let f = |p: &str| v.pointer(p).and_then(|x| x.as_f64()).unwrap_or(0.0);
    let i = |p: &str| v.pointer(p).and_then(|x| x.as_i64()).unwrap_or(0);
    let s = |p: &str| {
        v.pointer(p)
            .and_then(|x| x.as_str())
            .map(|t| t.get(11..16).unwrap_or(t).to_string())
            .unwrap_or_default()
    };
    let code = i("/current/weather_code");
    let is_day = i("/current/is_day") == 1;
    let (description, icon) = describe_code(code, is_day);
    Ok(Weather {
        location_name: name.to_string(),
        temp_c: f("/current/temperature_2m"),
        feels_like_c: f("/current/apparent_temperature"),
        temp_min_c: f("/daily/temperature_2m_min/0"),
        temp_max_c: f("/daily/temperature_2m_max/0"),
        humidity: i("/current/relative_humidity_2m"),
        wind_kph: f("/current/wind_speed_10m"),
        precipitation_prob: i("/daily/precipitation_probability_max/0"),
        uv_index: f("/daily/uv_index_max/0"),
        weather_code: code,
        description: description.into(),
        icon: icon.into(),
        is_day,
        sunrise: s("/daily/sunrise/0"),
        sunset: s("/daily/sunset/0"),
        fetched_at: chrono::Local::now().to_rfc3339(),
    })
}

/// Current weather for the configured location, from cache when fresh.
pub async fn current(app: &AppHandle) -> Option<Weather> {
    let cfg = app.state::<ConfigState>().get();
    let (Some(lat), Some(lon)) = (cfg.location_lat, cfg.location_lon) else {
        return None;
    };
    let cached = {
        let cache = app.state::<WeatherCache>();
        let guard = cache.0.lock().ok();
        guard.as_ref().and_then(|c| {
            c.as_ref().and_then(|(at, coords, w)| {
                (coords.0 == lat && coords.1 == lon && at.elapsed() < Duration::from_secs(1800))
                    .then(|| w.clone())
            })
        })
    };
    if let Some(w) = cached {
        return Some(w);
    }
    match fetch(lat, lon, &cfg.location_name).await {
        Ok(w) => {
            if let Ok(mut c) = app.state::<WeatherCache>().0.lock() {
                *c = Some((Instant::now(), (lat, lon), w.clone()));
            }
            Some(w)
        }
        Err(e) => {
            log::warn!("weather: {e}");
            None
        }
    }
}

// ─── Commands ──────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn weather_search(query: String) -> Result<Vec<Location>, String> {
    geocode(&query).await
}

#[tauri::command]
pub async fn weather_set_location(
    app: AppHandle,
    location: Option<Location>,
) -> Result<(), String> {
    let mut next = app.state::<ConfigState>().get();
    match location {
        Some(l) => {
            let mut name = l.name.clone();
            if !l.admin.is_empty() && l.admin != l.name {
                name.push_str(&format!(", {}", l.admin));
            }
            if !l.country.is_empty() {
                name.push_str(&format!(", {}", l.country));
            }
            next.location_name = name;
            next.location_lat = Some(l.lat);
            next.location_lon = Some(l.lon);
        }
        None => {
            next.location_name.clear();
            next.location_lat = None;
            next.location_lon = None;
        }
    }
    if let Ok(mut c) = app.state::<WeatherCache>().0.lock() {
        *c = None;
    }
    crate::commands::config::commit_config(&app, next);
    Ok(())
}

#[tauri::command]
pub async fn weather_now(app: AppHandle) -> Option<Weather> {
    current(&app).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_have_descriptions() {
        assert_eq!(describe_code(0, true).0, "Clear sky");
        assert_eq!(describe_code(0, false).1, "🌙");
        assert_eq!(describe_code(95, true).0, "Thunderstorm");
        assert_eq!(describe_code(999, true).0, "Unknown");
    }
}
