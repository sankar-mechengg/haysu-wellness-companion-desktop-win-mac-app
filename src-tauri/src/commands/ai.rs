//! Haysu AI commands: keys, models, conversations, streaming chat, photos.

use std::path::PathBuf;

use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::ai::store::{self as astore, Conversation, StoredMessage};
use crate::ai::{self, client, context, ChatMessage, ImageData, KeyStore, Provider};
use crate::config::ConfigState;
use crate::db::DbState;
use crate::weather;

pub const EV_DELTA: &str = "ai-delta";
pub const EV_DONE: &str = "ai-done";
pub const EV_ERROR: &str = "ai-error";
pub const EV_HISTORY: &str = "ai-history-changed";
pub const EV_STATUS: &str = "ai-status-changed";

#[derive(Debug, Clone, Serialize)]
struct DeltaEvent<'a> {
    conversation_id: i64,
    delta: &'a str,
}

#[derive(Debug, Clone, Serialize)]
struct DoneEvent {
    conversation_id: i64,
    message: StoredMessage,
}

#[derive(Debug, Clone, Serialize)]
struct ErrorEvent {
    conversation_id: i64,
    error: String,
}

fn provider_or_err(s: &str) -> Result<Provider, String> {
    Provider::parse(s).ok_or_else(|| format!("unknown provider: {s}"))
}

// ─── Status / keys / models ────────────────────────────────────────────────

#[tauri::command]
pub fn ai_status(app: AppHandle) -> ai::AiStatus {
    let cfg = app.state::<ConfigState>().get();
    ai::status(&cfg, &app.state::<KeyStore>())
}

#[tauri::command]
pub fn ai_set_key(app: AppHandle, provider: String, key: String) -> Result<ai::AiStatus, String> {
    let p = provider_or_err(&provider)?;
    {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        app.state::<KeyStore>().set(&conn, p, &key)?;
    }
    let status = ai_status(app.clone());
    let _ = app.emit(EV_STATUS, &status);
    Ok(status)
}

#[tauri::command]
pub async fn ai_list_models(app: AppHandle, provider: String) -> Result<Vec<String>, String> {
    let p = provider_or_err(&provider)?;
    let key = app.state::<KeyStore>().get(p).unwrap_or_default();
    if key.is_empty() && p != Provider::Openrouter {
        return Ok(p.known_models().iter().map(|s| s.to_string()).collect());
    }
    client::list_models(p, &key).await
}

#[tauri::command]
pub async fn ai_test(app: AppHandle, provider: String) -> Result<String, String> {
    let p = provider_or_err(&provider)?;
    let key = app
        .state::<KeyStore>()
        .get(p)
        .ok_or_else(|| "No API key saved for this provider".to_string())?;
    let cfg = app.state::<ConfigState>().get();
    client::test_key(p, &key, &ai::model_for(&cfg, p)).await
}

// ─── History ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn ai_conversations(app: AppHandle) -> Result<Vec<Conversation>, String> {
    let db = app.state::<DbState>();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    astore::list_conversations(&conn, 200)
}

#[tauri::command]
pub fn ai_messages(app: AppHandle, conversation_id: i64) -> Result<Vec<StoredMessage>, String> {
    let db = app.state::<DbState>();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    astore::messages(&conn, conversation_id)
}

#[tauri::command]
pub fn ai_delete_conversation(app: AppHandle, id: i64) -> Result<(), String> {
    {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        astore::delete_conversation(&conn, id)?;
    }
    let _ = app.emit(EV_HISTORY, ());
    Ok(())
}

#[tauri::command]
pub fn ai_rename_conversation(app: AppHandle, id: i64, title: String) -> Result<(), String> {
    {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        astore::rename_conversation(&conn, id, &title)?;
    }
    let _ = app.emit(EV_HISTORY, ());
    Ok(())
}

#[tauri::command]
pub fn ai_clear_history(app: AppHandle) -> Result<(), String> {
    {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        astore::clear_all(&conn)?;
    }
    let _ = app.emit(EV_HISTORY, ());
    Ok(())
}

// ─── Chat ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
pub struct SendInput {
    pub conversation_id: Option<i64>,
    #[serde(default)]
    pub message: String,
    /// Quick-action kind; when set and `message` is empty a prompt is generated.
    pub kind: Option<String>,
    #[serde(default)]
    pub images: Vec<ImageData>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SendResult {
    pub conversation_id: i64,
    pub message: StoredMessage,
}

fn conversation_title(kind: &str, user_text: &str) -> String {
    match kind {
        "chat" => astore::title_from(user_text),
        "meals" => "Meal plan".into(),
        "outfit" => "Outfit of the day".into(),
        "briefing" => format!("Daily briefing · {}", crate::db::time::today_local()),
        "posture" => "Posture & appearance check".into(),
        "week" => "Weekly review".into(),
        "doctor" => "Summary for my doctor".into(),
        "grooming" => "Grooming routine".into(),
        other => other.to_string(),
    }
}

/// Send a message (or run a quick action) and stream the reply through
/// `ai-delta` events. Resolves with the stored assistant message.
#[tauri::command]
pub async fn ai_send(app: AppHandle, input: SendInput) -> Result<SendResult, String> {
    run_chat(&app, input).await
}

/// Shared by the command and the scheduled briefing.
pub async fn run_chat(app: &AppHandle, input: SendInput) -> Result<SendResult, String> {
    let cfg = app.state::<ConfigState>().get();
    let keys = app.state::<KeyStore>();
    let provider = ai::resolve_provider(&cfg, &keys)
        .ok_or_else(|| "Add an API key in Settings → Haysu AI first".to_string())?;
    let key = keys.get(provider).unwrap_or_default();
    let model = ai::model_for(&cfg, provider);

    let kind = input.kind.clone().unwrap_or_else(|| "chat".into());
    let user_text = if kind != "chat" {
        context::quick_prompt(&kind, &input.message)
    } else {
        input.message.trim().to_string()
    };
    if user_text.is_empty() && input.images.is_empty() {
        return Err("Type a message first".into());
    }
    if !input.images.is_empty() && !model_supports_vision(provider, &model) {
        return Err(format!(
            "{model} does not accept images. Pick a vision-capable model (e.g. {}) in Settings → Haysu AI.",
            vision_hint(provider)
        ));
    }

    let weather_now = if cfg.ai_share_location {
        weather::current(app).await
    } else {
        None
    };

    // Everything that touches the DB happens before the network call.
    let (conversation_id, system, history) = {
        let db = app.state::<DbState>();
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let conversation_id = match input.conversation_id {
            Some(id) if astore::get_conversation(&conn, id)?.is_some() => id,
            _ => {
                astore::create_conversation(&conn, &conversation_title(&kind, &user_text), &kind)?
                    .id
            }
        };
        // Quick actions show a short label instead of the long generated prompt.
        let shown = if kind == "chat" {
            user_text.clone()
        } else if input.message.trim().is_empty() {
            format!("[{}]", kind.replace('_', " "))
        } else {
            format!("[{}] {}", kind.replace('_', " "), input.message.trim())
        };
        astore::add_message(
            &conn,
            conversation_id,
            "user",
            &shown,
            !input.images.is_empty(),
            provider.id(),
            &model,
        )?;

        let profile = crate::commands::user::read_profile(&conn);
        let system = context::build(
            &conn,
            &context::ContextInput {
                cfg: &cfg,
                profile: profile.as_ref(),
                weather: weather_now.as_ref(),
            },
        );
        // Prior turns, text only; the row just inserted is replaced by the full prompt.
        let prior = astore::messages(&conn, conversation_id)?;
        let keep = prior.len().saturating_sub(1);
        let start = keep.saturating_sub(20);
        let mut history: Vec<ChatMessage> = prior[start..keep]
            .iter()
            .filter(|m| m.role == "user" || m.role == "assistant")
            .map(|m| ChatMessage {
                role: m.role.clone(),
                content: m.content.clone(),
                images: vec![],
            })
            .collect();
        history.push(ChatMessage {
            role: "user".into(),
            content: user_text.clone(),
            images: input.images.clone(),
        });
        (conversation_id, system, history)
    };
    let _ = app.emit(EV_HISTORY, ());

    let req = client::ChatRequest {
        provider,
        model: model.clone(),
        api_key: key,
        system,
        messages: history,
        max_tokens: cfg.ai_max_tokens.clamp(256, 8000),
        temperature: 0.6,
    };
    let app2 = app.clone();
    let result = client::stream_chat(req, |delta| {
        let _ = app2.emit(
            EV_DELTA,
            DeltaEvent {
                conversation_id,
                delta,
            },
        );
    })
    .await;

    match result {
        Ok(text) => {
            let stored = {
                let db = app.state::<DbState>();
                let conn = db.conn.lock().map_err(|e| e.to_string())?;
                astore::add_message(
                    &conn,
                    conversation_id,
                    "assistant",
                    &text,
                    false,
                    provider.id(),
                    &model,
                )?
            };
            let _ = app.emit(
                EV_DONE,
                DoneEvent {
                    conversation_id,
                    message: stored.clone(),
                },
            );
            let _ = app.emit(EV_HISTORY, ());
            Ok(SendResult {
                conversation_id,
                message: stored,
            })
        }
        Err(err) => {
            log::warn!("ai error: {err}");
            let _ = app.emit(
                EV_ERROR,
                ErrorEvent {
                    conversation_id,
                    error: err.clone(),
                },
            );
            Err(err)
        }
    }
}

fn model_supports_vision(provider: Provider, model: &str) -> bool {
    let m = model.to_lowercase();
    match provider {
        Provider::Anthropic => true,
        Provider::Openai => {
            !(m.starts_with("o1-mini") || m.contains("instruct") || m.starts_with("gpt-3.5"))
        }
        Provider::Zai => m.contains("4.5v") || m.contains("4.6v") || m.contains("-v"),
        Provider::Openrouter => !(m.contains("deepseek") && !m.contains("vl")),
    }
}

fn vision_hint(provider: Provider) -> &'static str {
    match provider {
        Provider::Anthropic => "claude-sonnet-5-5",
        Provider::Openai => "gpt-5",
        Provider::Zai => "glm-4.5v",
        Provider::Openrouter => "anthropic/claude-sonnet-4.5",
    }
}

// ─── Photos ────────────────────────────────────────────────────────────────

fn photos_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("photos");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Keep a check-in photo locally (only when the user opted in).
#[tauri::command]
pub fn ai_save_photo(app: AppHandle, image: ImageData, label: String) -> Result<String, String> {
    let cfg = app.state::<ConfigState>().get();
    if !cfg.ai_keep_photos {
        return Err("Photo keeping is off in Settings → Haysu AI".into());
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(image.base64.as_bytes())
        .map_err(|e| e.to_string())?;
    let ext = match image.media_type.as_str() {
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "jpg",
    };
    let safe: String = label
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .take(40)
        .collect();
    let name = format!(
        "{}_{}.{}",
        chrono::Local::now().format("%Y%m%d_%H%M%S"),
        if safe.is_empty() {
            "checkin".into()
        } else {
            safe
        },
        ext
    );
    let path = photos_dir(&app)?.join(name);
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

/// Read an image the user picked from disk.
#[tauri::command]
pub fn ai_read_image(path: String) -> Result<ImageData, String> {
    let p = PathBuf::from(&path);
    let meta = std::fs::metadata(&p).map_err(|e| e.to_string())?;
    if meta.len() > 12 * 1024 * 1024 {
        return Err("Image is larger than 12 MB".into());
    }
    let bytes = std::fs::read(&p).map_err(|e| e.to_string())?;
    let media_type = match p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        _ => return Err("Use a JPG, PNG, WEBP or GIF image".into()),
    };
    Ok(ImageData {
        media_type: media_type.into(),
        base64: base64::engine::general_purpose::STANDARD.encode(bytes),
    })
}
