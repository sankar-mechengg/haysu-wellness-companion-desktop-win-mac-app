//! Conversation history, stored locally.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::Serialize;

use crate::db::time;

type R<T> = Result<T, String>;

fn e(err: rusqlite::Error) -> String {
    err.to_string()
}

#[derive(Debug, Clone, Serialize)]
pub struct Conversation {
    pub id: i64,
    pub title: String,
    /// "chat" | "meals" | "outfit" | "briefing" | "posture" | "week" | "doctor" | "grooming"
    pub kind: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct StoredMessage {
    pub id: i64,
    pub conversation_id: i64,
    pub role: String,
    pub content: String,
    pub has_image: bool,
    pub provider: String,
    pub model: String,
    pub created_at: String,
}

fn conv_from_row(row: &Row) -> rusqlite::Result<Conversation> {
    Ok(Conversation {
        id: row.get(0)?,
        title: row.get(1)?,
        kind: row.get(2)?,
        created_at: time::to_rfc3339(&row.get::<_, String>(3)?),
        updated_at: time::to_rfc3339(&row.get::<_, String>(4)?),
        message_count: row.get(5)?,
    })
}

const CONV_SELECT: &str = "SELECT c.id, c.title, c.kind, c.created_at, c.updated_at,
    (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id)
    FROM ai_conversations c";

pub fn create_conversation(conn: &Connection, title: &str, kind: &str) -> R<Conversation> {
    let now = time::now_utc();
    conn.execute(
        "INSERT INTO ai_conversations (title, kind, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
        params![title.trim(), kind, now],
    )
    .map_err(e)?;
    let id = conn.last_insert_rowid();
    get_conversation(conn, id)?.ok_or_else(|| "conversation vanished".into())
}

pub fn get_conversation(conn: &Connection, id: i64) -> R<Option<Conversation>> {
    conn.query_row(
        &format!("{CONV_SELECT} WHERE c.id = ?1"),
        [id],
        conv_from_row,
    )
    .optional()
    .map_err(e)
}

pub fn list_conversations(conn: &Connection, limit: i64) -> R<Vec<Conversation>> {
    let mut stmt = conn
        .prepare(&format!(
            "{CONV_SELECT} ORDER BY c.updated_at DESC LIMIT ?1"
        ))
        .map_err(e)?;
    let rows = stmt
        .query_map([limit.clamp(1, 500)], conv_from_row)
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

pub fn rename_conversation(conn: &Connection, id: i64, title: &str) -> R<()> {
    conn.execute(
        "UPDATE ai_conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![title.trim(), time::now_utc(), id],
    )
    .map_err(e)?;
    Ok(())
}

pub fn delete_conversation(conn: &Connection, id: i64) -> R<()> {
    conn.execute("DELETE FROM ai_messages WHERE conversation_id = ?1", [id])
        .map_err(e)?;
    conn.execute("DELETE FROM ai_conversations WHERE id = ?1", [id])
        .map_err(e)?;
    Ok(())
}

pub fn clear_all(conn: &Connection) -> R<()> {
    conn.execute_batch("DELETE FROM ai_messages; DELETE FROM ai_conversations;")
        .map_err(e)
}

pub fn add_message(
    conn: &Connection,
    conversation_id: i64,
    role: &str,
    content: &str,
    has_image: bool,
    provider: &str,
    model: &str,
) -> R<StoredMessage> {
    let now = time::now_utc();
    conn.execute(
        "INSERT INTO ai_messages (conversation_id, role, content, has_image, provider, model, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            conversation_id,
            role,
            content,
            has_image as i64,
            provider,
            model,
            now
        ],
    )
    .map_err(e)?;
    let id = conn.last_insert_rowid();
    conn.execute(
        "UPDATE ai_conversations SET updated_at = ?1 WHERE id = ?2",
        params![now, conversation_id],
    )
    .map_err(e)?;
    Ok(StoredMessage {
        id,
        conversation_id,
        role: role.into(),
        content: content.into(),
        has_image,
        provider: provider.into(),
        model: model.into(),
        created_at: time::to_rfc3339(&now),
    })
}

pub fn messages(conn: &Connection, conversation_id: i64) -> R<Vec<StoredMessage>> {
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, role, content, has_image, provider, model, created_at
             FROM ai_messages WHERE conversation_id = ?1 ORDER BY id",
        )
        .map_err(e)?;
    let rows = stmt
        .query_map([conversation_id], |r| {
            Ok(StoredMessage {
                id: r.get(0)?,
                conversation_id: r.get(1)?,
                role: r.get(2)?,
                content: r.get(3)?,
                has_image: r.get::<_, i64>(4)? == 1,
                provider: r.get(5)?,
                model: r.get(6)?,
                created_at: time::to_rfc3339(&r.get::<_, String>(7)?),
            })
        })
        .map_err(e)?
        .filter_map(Result::ok)
        .collect();
    Ok(rows)
}

/// A title from the first user message.
pub fn title_from(text: &str) -> String {
    let t: String = text
        .split_whitespace()
        .take(8)
        .collect::<Vec<_>>()
        .join(" ");
    let t = t
        .trim_end_matches(|c: char| !c.is_alphanumeric())
        .to_string();
    if t.is_empty() {
        "New conversation".into()
    } else if text.split_whitespace().count() > 8 {
        format!("{t}…")
    } else {
        t
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DbState;

    #[test]
    fn conversation_lifecycle() {
        let db = DbState::in_memory();
        let conn = db.conn.lock().unwrap();
        let c = create_conversation(&conn, "Meals", "meals").unwrap();
        add_message(&conn, c.id, "user", "hi", false, "openai", "gpt-5").unwrap();
        add_message(&conn, c.id, "assistant", "hello", false, "openai", "gpt-5").unwrap();
        let list = list_conversations(&conn, 10).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].message_count, 2);
        assert_eq!(messages(&conn, c.id).unwrap()[1].content, "hello");
        rename_conversation(&conn, c.id, "Lunch ideas").unwrap();
        assert_eq!(
            get_conversation(&conn, c.id).unwrap().unwrap().title,
            "Lunch ideas"
        );
        delete_conversation(&conn, c.id).unwrap();
        assert!(list_conversations(&conn, 10).unwrap().is_empty());
        assert!(messages(&conn, c.id).unwrap().is_empty());
    }

    #[test]
    fn titles() {
        assert_eq!(
            title_from("What should I eat tonight?"),
            "What should I eat tonight"
        );
        assert_eq!(
            title_from("one two three four five six seven eight nine ten"),
            "one two three four five six seven eight…"
        );
        assert_eq!(title_from("   "), "New conversation");
    }
}
