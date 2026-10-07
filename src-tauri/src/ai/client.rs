//! HTTP client for the chat providers. Streams tokens back through a callback.

use std::time::Duration;

use futures_util::StreamExt;
use serde_json::{json, Value};

use super::{ChatMessage, Provider};

pub struct ChatRequest {
    pub provider: Provider,
    pub model: String,
    pub api_key: String,
    pub system: String,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: u32,
}

fn http() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(format!("Haysu/{}", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())
}

/// Pull a readable error out of a provider error body.
fn describe_error(status: reqwest::StatusCode, body: &str) -> String {
    let msg = serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|v| {
            v.get("error")
                .and_then(|e| e.get("message").or(Some(e)))
                .and_then(|m| m.as_str().map(|s| s.to_string()))
                .or_else(|| {
                    v.get("message")
                        .and_then(|m| m.as_str())
                        .map(|s| s.to_string())
                })
        })
        .unwrap_or_else(|| body.chars().take(300).collect());
    match status.as_u16() {
        401 | 403 => format!("The API key was rejected ({status}). {msg}"),
        404 => format!("Model not found ({status}). {msg}"),
        429 => format!("Rate limited or out of credits ({status}). {msg}"),
        _ => format!("{status}: {msg}"),
    }
}

// ─── Request bodies ────────────────────────────────────────────────────────

fn openai_messages(system: &str, messages: &[ChatMessage]) -> Vec<Value> {
    let mut out = Vec::with_capacity(messages.len() + 1);
    if !system.is_empty() {
        out.push(json!({ "role": "system", "content": system }));
    }
    for m in messages {
        if m.images.is_empty() {
            out.push(json!({ "role": m.role, "content": m.content }));
        } else {
            let mut parts = vec![json!({ "type": "text", "text": m.content })];
            for img in &m.images {
                parts.push(json!({
                    "type": "image_url",
                    "image_url": { "url": format!("data:{};base64,{}", img.media_type, img.base64) }
                }));
            }
            out.push(json!({ "role": m.role, "content": parts }));
        }
    }
    out
}

fn anthropic_messages(messages: &[ChatMessage]) -> Vec<Value> {
    messages
        .iter()
        .map(|m| {
            let mut parts = Vec::new();
            for img in &m.images {
                parts.push(json!({
                    "type": "image",
                    "source": { "type": "base64", "media_type": img.media_type, "data": img.base64 }
                }));
            }
            parts.push(json!({ "type": "text", "text": m.content }));
            json!({ "role": m.role, "content": parts })
        })
        .collect()
}

// ─── Streaming ─────────────────────────────────────────────────────────────

/// How the output limit is named for the OpenAI-style providers. Newer OpenAI
/// models only accept `max_completion_tokens`; everyone else wants `max_tokens`.
#[derive(Clone, Copy, PartialEq, Eq)]
enum LimitParam {
    MaxTokens,
    MaxCompletionTokens,
}

impl LimitParam {
    fn name(self) -> &'static str {
        match self {
            LimitParam::MaxTokens => "max_tokens",
            LimitParam::MaxCompletionTokens => "max_completion_tokens",
        }
    }
    fn other(self) -> LimitParam {
        match self {
            LimitParam::MaxTokens => LimitParam::MaxCompletionTokens,
            LimitParam::MaxCompletionTokens => LimitParam::MaxTokens,
        }
    }
    fn default_for(p: Provider) -> LimitParam {
        match p {
            Provider::Openai => LimitParam::MaxCompletionTokens,
            _ => LimitParam::MaxTokens,
        }
    }
}

/// A 400 that names a parameter we can drop or rename and try once more.
fn is_param_rejection(status: reqwest::StatusCode, body: &str) -> bool {
    let b = body.to_ascii_lowercase();
    status.as_u16() == 400
        && (b.contains("max_tokens")
            || b.contains("max_completion_tokens")
            || b.contains("temperature")
            || b.contains("unsupported parameter")
            || b.contains("unsupported value"))
}

fn build_request(
    client: &reqwest::Client,
    req: &ChatRequest,
    limit: LimitParam,
) -> (String, reqwest::RequestBuilder) {
    // No temperature anywhere: several models (OpenAI reasoning models, GPT-5)
    // reject anything but the default, and the default is fine for us.
    match req.provider {
        Provider::Anthropic => {
            let body = json!({
                "model": req.model,
                "max_tokens": req.max_tokens,
                "system": req.system,
                "messages": anthropic_messages(&req.messages),
                "stream": true,
            });
            let url = format!("{}/messages", req.provider.base_url());
            (
                url.clone(),
                client
                    .post(url)
                    .header("x-api-key", &req.api_key)
                    .header("anthropic-version", "2023-06-01")
                    .json(&body),
            )
        }
        Provider::Openai | Provider::Gemini | Provider::Zai | Provider::Openrouter => {
            let mut body = json!({
                "model": req.model,
                "messages": openai_messages(&req.system, &req.messages),
                "stream": true,
            });
            body[limit.name()] = json!(req.max_tokens);
            let url = format!("{}/chat/completions", req.provider.base_url());
            let mut b = client
                .post(url.clone())
                .bearer_auth(&req.api_key)
                .json(&body);
            if req.provider == Provider::Openrouter {
                b = b
                    .header(
                        "HTTP-Referer",
                        "https://github.com/sankar-mechengg/haysu-wellness-companion-desktop-win-mac-app",
                    )
                    .header("X-Title", "Haysu");
            }
            (url, b)
        }
    }
}

/// Send the conversation and stream the reply. Returns the full text.
pub async fn stream_chat(
    req: ChatRequest,
    mut on_delta: impl FnMut(&str),
) -> Result<String, String> {
    let client = http()?;
    let mut limit = LimitParam::default_for(req.provider);
    let (url, builder) = build_request(&client, &req, limit);
    log::info!("ai: {} {} via {}", req.provider.id(), req.model, url);

    let resp = builder.send().await.map_err(|e| {
        if e.is_connect() || e.is_timeout() {
            format!("Could not reach {}: {e}", req.provider.label())
        } else {
            e.to_string()
        }
    })?;
    let mut resp = resp;
    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        if req.provider != Provider::Anthropic && is_param_rejection(status, &body) {
            // Swap the limit parameter and try once more.
            limit = limit.other();
            log::info!(
                "ai: retrying with {} after: {}",
                limit.name(),
                body.chars().take(200).collect::<String>()
            );
            let (_, retry) = build_request(&client, &req, limit);
            resp = retry.send().await.map_err(|e| e.to_string())?;
            let status = resp.status();
            if !status.is_success() {
                let body = resp.text().await.unwrap_or_default();
                return Err(describe_error(status, &body));
            }
        } else {
            return Err(describe_error(status, &body));
        }
    }

    let mut full = String::new();
    let mut buf = String::new();
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&chunk));
        // Process complete lines; keep the remainder.
        while let Some(idx) = buf.find('\n') {
            let line = buf[..idx].trim_end_matches('\r').to_string();
            buf.drain(..=idx);
            let Some(data) = line.strip_prefix("data:") else {
                continue;
            };
            let data = data.trim();
            if data.is_empty() || data == "[DONE]" {
                continue;
            }
            let Ok(v) = serde_json::from_str::<Value>(data) else {
                continue;
            };
            let delta = match req.provider {
                Provider::Anthropic => {
                    if v.get("type").and_then(|t| t.as_str()) == Some("error") {
                        let msg = v
                            .pointer("/error/message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("stream error");
                        return Err(msg.to_string());
                    }
                    v.pointer("/delta/text")
                        .and_then(|t| t.as_str())
                        .map(|s| s.to_string())
                }
                _ => {
                    if let Some(err) = v.get("error") {
                        let msg = err
                            .get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("stream error");
                        return Err(msg.to_string());
                    }
                    v.pointer("/choices/0/delta/content")
                        .and_then(|t| t.as_str())
                        .map(|s| s.to_string())
                }
            };
            if let Some(d) = delta {
                if !d.is_empty() {
                    full.push_str(&d);
                    on_delta(&d);
                }
            }
        }
    }
    if full.trim().is_empty() {
        return Err("The model returned an empty reply".into());
    }
    Ok(full)
}

// ─── Model listing ─────────────────────────────────────────────────────────

/// Live model ids from the provider, or the static list when unsupported.
pub async fn list_models(provider: Provider, api_key: &str) -> Result<Vec<String>, String> {
    let client = http()?;
    let req = match provider {
        Provider::Anthropic => client
            .get(format!("{}/models?limit=100", provider.base_url()))
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01"),
        Provider::Openai => client
            .get(format!("{}/models", provider.base_url()))
            .bearer_auth(api_key),
        Provider::Openrouter => client.get(format!("{}/models", provider.base_url())),
        Provider::Zai | Provider::Gemini => client
            .get(format!("{}/models", provider.base_url()))
            .bearer_auth(api_key),
    };
    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let body = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        if provider == Provider::Zai {
            return Ok(provider
                .known_models()
                .iter()
                .map(|s| s.to_string())
                .collect());
        }
        return Err(describe_error(status, &body));
    }
    let v: Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    let mut ids: Vec<String> = v
        .get("data")
        .and_then(|d| d.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m.get("id").and_then(|i| i.as_str()))
                .map(|id| id.strip_prefix("models/").unwrap_or(id).to_string())
                .collect()
        })
        .unwrap_or_default();
    if ids.is_empty() {
        return Ok(provider
            .known_models()
            .iter()
            .map(|s| s.to_string())
            .collect());
    }
    ids.sort();
    ids.dedup();
    Ok(ids)
}

/// Minimal round-trip to confirm a key works for the chosen model.
pub async fn test_key(provider: Provider, api_key: &str, model: &str) -> Result<String, String> {
    let req = ChatRequest {
        provider,
        model: model.to_string(),
        api_key: api_key.to_string(),
        system: "Reply with exactly: OK".into(),
        messages: vec![ChatMessage {
            role: "user".into(),
            content: "ping".into(),
            images: vec![],
        }],
        max_tokens: 16,
    };
    let text = stream_chat(req, |_| {}).await?;
    Ok(format!(
        "{} replied: {}",
        model,
        text.trim().chars().take(40).collect::<String>()
    ))
}
