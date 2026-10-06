//! Haysu AI: provider abstraction, local key store and shared types.

pub mod client;
pub mod context;
pub mod store;

use std::collections::HashMap;
use std::sync::RwLock;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::config::AppConfig;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Provider {
    Anthropic,
    Openai,
    Zai,
    Openrouter,
}

impl Provider {
    pub const ALL: [Provider; 4] = [
        Provider::Anthropic,
        Provider::Openai,
        Provider::Zai,
        Provider::Openrouter,
    ];

    pub fn id(self) -> &'static str {
        match self {
            Provider::Anthropic => "anthropic",
            Provider::Openai => "openai",
            Provider::Zai => "zai",
            Provider::Openrouter => "openrouter",
        }
    }

    pub fn parse(s: &str) -> Option<Provider> {
        match s {
            "anthropic" => Some(Provider::Anthropic),
            "openai" => Some(Provider::Openai),
            "zai" => Some(Provider::Zai),
            "openrouter" => Some(Provider::Openrouter),
            _ => None,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Provider::Anthropic => "Anthropic (Claude)",
            Provider::Openai => "OpenAI (GPT)",
            Provider::Zai => "Z.AI (GLM)",
            Provider::Openrouter => "OpenRouter",
        }
    }

    /// Settings-table key that holds the API key.
    pub fn key_setting(self) -> &'static str {
        match self {
            Provider::Anthropic => "ai_key_anthropic",
            Provider::Openai => "ai_key_openai",
            Provider::Zai => "ai_key_zai",
            Provider::Openrouter => "ai_key_openrouter",
        }
    }

    pub fn default_model(self) -> &'static str {
        match self {
            Provider::Anthropic => "claude-sonnet-5-5",
            Provider::Openai => "gpt-5",
            Provider::Zai => "glm-4.6",
            Provider::Openrouter => "anthropic/claude-sonnet-4.5",
        }
    }

    /// Well-known model ids offered in the dropdown. The user can type any id;
    /// "Fetch models" pulls the live list from the provider.
    pub fn known_models(self) -> &'static [&'static str] {
        match self {
            Provider::Anthropic => &[
                "claude-sonnet-5-5",
                "claude-opus-5-5",
                "claude-fable-5-1",
                "claude-haiku-4-5-20251001",
                "claude-sonnet-4-5",
                "claude-opus-4-1",
            ],
            Provider::Openai => &[
                "gpt-5",
                "gpt-5-mini",
                "gpt-5-nano",
                "gpt-4.1",
                "gpt-4.1-mini",
                "gpt-4o",
                "o4-mini",
            ],
            Provider::Zai => &[
                "glm-4.6",
                "glm-4.5",
                "glm-4.5-air",
                "glm-4.5v",
                "glm-4.5-flash",
            ],
            Provider::Openrouter => &[
                "anthropic/claude-sonnet-4.5",
                "anthropic/claude-opus-4.1",
                "openai/gpt-5",
                "openai/gpt-5-mini",
                "google/gemini-2.5-pro",
                "google/gemini-2.5-flash",
                "z-ai/glm-4.6",
                "deepseek/deepseek-chat-v3.1",
                "meta-llama/llama-4-maverick",
            ],
        }
    }

    pub fn base_url(self) -> &'static str {
        match self {
            Provider::Anthropic => "https://api.anthropic.com/v1",
            Provider::Openai => "https://api.openai.com/v1",
            Provider::Zai => "https://api.z.ai/api/paas/v4",
            Provider::Openrouter => "https://openrouter.ai/api/v1",
        }
    }

    pub fn console_url(self) -> &'static str {
        match self {
            Provider::Anthropic => "https://console.anthropic.com/settings/keys",
            Provider::Openai => "https://platform.openai.com/api-keys",
            Provider::Zai => "https://z.ai/manage-apikey/apikey-list",
            Provider::Openrouter => "https://openrouter.ai/settings/keys",
        }
    }
}

/// API keys live in the settings table like everything else (local SQLite),
/// but are kept out of `AppConfig` so they are never broadcast to webviews.
pub struct KeyStore(RwLock<HashMap<Provider, String>>);

impl KeyStore {
    pub fn load(conn: &Connection) -> Self {
        let mut map = HashMap::new();
        for p in Provider::ALL {
            let v: Option<String> = conn
                .query_row(
                    "SELECT value FROM settings WHERE key = ?1",
                    [p.key_setting()],
                    |r| r.get(0),
                )
                .ok();
            if let Some(v) = v.filter(|v| !v.trim().is_empty()) {
                map.insert(p, v.trim().to_string());
            }
        }
        KeyStore(RwLock::new(map))
    }

    pub fn get(&self, p: Provider) -> Option<String> {
        self.0.read().ok().and_then(|m| m.get(&p).cloned())
    }

    pub fn has(&self, p: Provider) -> bool {
        self.get(p).is_some()
    }

    pub fn set(&self, conn: &Connection, p: Provider, key: &str) -> Result<(), String> {
        let key = key.trim();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            rusqlite::params![p.key_setting(), key],
        )
        .map_err(|e| e.to_string())?;
        if let Ok(mut m) = self.0.write() {
            if key.is_empty() {
                m.remove(&p);
            } else {
                m.insert(p, key.to_string());
            }
        }
        Ok(())
    }

    /// `sk-ant-…x7Qz` style preview for the UI.
    pub fn masked(&self, p: Provider) -> String {
        match self.get(p) {
            Some(k) if k.len() > 10 => format!("{}…{}", &k[..6], &k[k.len() - 4..]),
            Some(_) => "••••".into(),
            None => String::new(),
        }
    }
}

/// Which provider answers right now.
pub fn resolve_provider(cfg: &AppConfig, keys: &KeyStore) -> Option<Provider> {
    match Provider::parse(&cfg.ai_provider) {
        Some(p) => keys.has(p).then_some(p),
        None => Provider::ALL.into_iter().find(|p| keys.has(*p)),
    }
}

pub fn model_for(cfg: &AppConfig, p: Provider) -> String {
    let m = match p {
        Provider::Anthropic => &cfg.ai_model_anthropic,
        Provider::Openai => &cfg.ai_model_openai,
        Provider::Zai => &cfg.ai_model_zai,
        Provider::Openrouter => &cfg.ai_model_openrouter,
    };
    if m.trim().is_empty() {
        p.default_model().to_string()
    } else {
        m.trim().to_string()
    }
}

/// An inline image for vision models.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageData {
    /// e.g. `image/jpeg`
    pub media_type: String,
    /// Raw base64 (no data: prefix).
    pub base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    /// "user" | "assistant"
    pub role: String,
    pub content: String,
    #[serde(default)]
    pub images: Vec<ImageData>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProviderStatus {
    pub provider: Provider,
    pub label: &'static str,
    pub has_key: bool,
    pub masked_key: String,
    pub model: String,
    pub known_models: Vec<&'static str>,
    pub console_url: &'static str,
}

#[derive(Debug, Clone, Serialize)]
pub struct AiStatus {
    pub providers: Vec<ProviderStatus>,
    pub active: Option<Provider>,
    pub active_model: Option<String>,
    pub selection: String,
}

pub fn status(cfg: &AppConfig, keys: &KeyStore) -> AiStatus {
    let active = resolve_provider(cfg, keys);
    AiStatus {
        providers: Provider::ALL
            .into_iter()
            .map(|p| ProviderStatus {
                provider: p,
                label: p.label(),
                has_key: keys.has(p),
                masked_key: keys.masked(p),
                model: model_for(cfg, p),
                known_models: p.known_models().to_vec(),
                console_url: p.console_url(),
            })
            .collect(),
        active,
        active_model: active.map(|p| model_for(cfg, p)),
        selection: cfg.ai_provider.clone(),
    }
}

#[cfg(test)]
#[allow(clippy::field_reassign_with_default)]
mod tests {
    use super::*;
    use crate::db::DbState;

    #[test]
    fn key_store_roundtrip_and_masking() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let ks = KeyStore::load(&conn);
        assert!(!ks.has(Provider::Openai));
        ks.set(&conn, Provider::Openai, "  sk-proj-1234567890abcdef  ")
            .unwrap();
        assert!(ks.has(Provider::Openai));
        assert_eq!(ks.masked(Provider::Openai), "sk-pro…cdef");
        let reloaded = KeyStore::load(&conn);
        assert_eq!(
            reloaded.get(Provider::Openai).unwrap(),
            "sk-proj-1234567890abcdef"
        );
        ks.set(&conn, Provider::Openai, "").unwrap();
        assert!(!ks.has(Provider::Openai));
    }

    #[test]
    fn auto_picks_first_available_in_order() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let ks = KeyStore::load(&conn);
        let cfg = AppConfig::default();
        assert_eq!(resolve_provider(&cfg, &ks), None);
        ks.set(&conn, Provider::Zai, "k").unwrap();
        assert_eq!(resolve_provider(&cfg, &ks), Some(Provider::Zai));
        ks.set(&conn, Provider::Anthropic, "k").unwrap();
        assert_eq!(resolve_provider(&cfg, &ks), Some(Provider::Anthropic));
        let mut pinned = cfg.clone();
        pinned.ai_provider = "openai".into();
        assert_eq!(
            resolve_provider(&pinned, &ks),
            None,
            "pinned provider without a key"
        );
        pinned.ai_provider = "zai".into();
        assert_eq!(resolve_provider(&pinned, &ks), Some(Provider::Zai));
    }

    #[test]
    fn model_falls_back_to_default() {
        let mut cfg = AppConfig::default();
        cfg.ai_model_openai = "  ".into();
        assert_eq!(model_for(&cfg, Provider::Openai), "gpt-5");
        cfg.ai_model_openai = "gpt-5-mini".into();
        assert_eq!(model_for(&cfg, Provider::Openai), "gpt-5-mini");
    }
}
