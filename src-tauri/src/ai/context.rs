//! Builds the system prompt from the user's local records.

use std::fmt::Write as _;

use chrono::Local;
use rusqlite::Connection;

use crate::commands::stats;
use crate::config::AppConfig;
use crate::db::models::UserProfile;
use crate::db::time;
use crate::health::store as hstore;
use crate::weather::Weather;

pub struct ContextInput<'a> {
    pub cfg: &'a AppConfig,
    pub profile: Option<&'a UserProfile>,
    pub weather: Option<&'a Weather>,
}

fn diet_label(d: &str) -> &str {
    match d {
        "vegetarian" => "vegetarian",
        "vegan" => "vegan",
        "eggetarian" => "eggetarian (vegetarian plus eggs)",
        "pescatarian" => "pescatarian",
        "non_vegetarian" | "omnivore" => "non-vegetarian",
        "" => "not specified",
        other => other,
    }
}

/// The persona and ground rules, independent of data.
pub fn persona(cfg: &AppConfig, profile: Option<&UserProfile>) -> String {
    let name = profile.map(|p| p.name.as_str()).unwrap_or("the user");
    let mut s = String::new();
    let _ = writeln!(
        s,
        "You are Haysu, a warm, practical personal wellness companion that lives in {name}'s desktop app. \
You help with hydration, movement, focus, medicines, sleep, mood, food, grooming, outfits and everyday self-care, \
always grounded in the records below."
    );
    s.push_str(
        "Ground rules:\n\
- Be concise and concrete. Prefer short sections and bullets. Use metric units.\n\
- You are not a doctor. Give general wellness guidance, and clearly say when something should be checked by a clinician (red flags: chest pain, breathing trouble, fainting, very high or low readings, sudden severe symptoms, thoughts of self-harm).\n\
- Never invent records. If something is missing, say so and ask one focused question.\n\
- Respect the dietary preference, allergies and goals exactly. Never suggest food that violates them.\n\
- When asked for a plan (meals, outfit, day), give a decisive recommendation first, then brief alternatives.\n\
- Keep a friendly, encouraging tone without being saccharine. No emojis in headings; a few inline are fine.\n",
    );
    let now = Local::now();
    let _ = writeln!(
        s,
        "Now: {} ({}). Local timezone offset {}.",
        now.format("%A %d %B %Y, %H:%M"),
        now.format("%Y-%m-%d"),
        now.format("%:z")
    );
    if !cfg.ai_share_health {
        s.push_str("The user chose not to share health records with you; answer from general knowledge and what they tell you in chat.\n");
    }
    s
}

/// Full system prompt: persona + records (respecting the sharing toggles).
pub fn build(conn: &Connection, input: &ContextInput) -> String {
    let cfg = input.cfg;
    let mut s = persona(cfg, input.profile);

    if let Some(p) = input.profile {
        s.push_str("\n## About the user\n");
        let _ = writeln!(s, "- Name: {}", p.name);
        if p.age > 0 {
            let _ = writeln!(s, "- Age: {}", p.age);
        }
        if !p.gender.is_empty() {
            let _ = writeln!(s, "- Gender: {}", p.gender);
        }
        let bmi = if p.height_cm > 0.0 {
            p.weight_kg / ((p.height_cm / 100.0) * (p.height_cm / 100.0))
        } else {
            0.0
        };
        let _ = writeln!(
            s,
            "- Height {:.0} cm, weight {:.1} kg{}",
            p.height_cm,
            p.weight_kg,
            if bmi > 0.0 {
                format!(", BMI {bmi:.1}")
            } else {
                String::new()
            }
        );
        let _ = writeln!(
            s,
            "- Occupation: {}; work style: {}",
            p.occupation, p.work_style
        );
        let _ = writeln!(s, "- Diet: {}", diet_label(&p.diet));
        if !p.diet_notes.is_empty() {
            let _ = writeln!(s, "- Allergies / dislikes / notes: {}", p.diet_notes);
        }
        if !p.cuisines.is_empty() {
            let _ = writeln!(s, "- Favourite cuisines: {}", p.cuisines);
        }
        if !p.health_goal.is_empty() {
            let _ = writeln!(s, "- Main goal: {}", p.health_goal.replace('_', " "));
        }
        if !p.dress_style.is_empty() {
            let _ = writeln!(s, "- Dress style: {}", p.dress_style.replace('_', " "));
        }
        if !p.wardrobe_notes.is_empty() {
            let _ = writeln!(s, "- Wardrobe notes: {}", p.wardrobe_notes);
        }
        if !p.about_me.is_empty() {
            let _ = writeln!(s, "- In their own words: {}", p.about_me);
        }
        let _ = writeln!(s, "- Daily water goal: {} ml", p.daily_water_ml);
    }

    if cfg.ai_share_location {
        if let Some(w) = input.weather {
            s.push_str("\n## Weather today\n");
            let _ = writeln!(
                s,
                "- {} · {} · now {:.0}°C (feels {:.0}°C), {:.0}–{:.0}°C today, humidity {}%, wind {:.0} km/h, rain chance {}%, UV index {:.0}. Sunrise {}, sunset {}.",
                w.location_name,
                w.description,
                w.temp_c,
                w.feels_like_c,
                w.temp_min_c,
                w.temp_max_c,
                w.humidity,
                w.wind_kph,
                w.precipitation_prob,
                w.uv_index,
                w.sunrise,
                w.sunset
            );
        } else if !cfg.location_name.is_empty() {
            let _ = writeln!(
                s,
                "\n## Location\n- {} (weather unavailable right now)",
                cfg.location_name
            );
        }
    }

    if !cfg.ai_share_health {
        return s;
    }

    let today = time::today_local();

    // Today so far.
    let d = stats::daily_stats(conn, &today);
    s.push_str("\n## Today so far\n");
    let _ = writeln!(
        s,
        "- Water {} ml of {} ml goal ({} logged, {} skipped). Movement breaks done {}, skipped {}. Focus sessions {} ({} min).",
        d.water_total_ml,
        d.water_goal_ml,
        d.water_consumed,
        d.water_skipped,
        d.movement_completed,
        d.movement_skipped,
        d.pomodoro_work_completed,
        d.pomodoro_total_minutes
    );
    if let Ok(st) = stats::streaks_for_conn(conn) {
        let _ = writeln!(
            s,
            "- Streak {} days (best {}), active {} of the last 30 days.",
            st.current_streak, st.longest_streak, st.active_days_30
        );
    }

    // Conditions.
    if let Ok(conds) = hstore::list_conditions(conn) {
        if !conds.is_empty() {
            s.push_str("\n## Health conditions\n");
            for c in conds {
                let _ = writeln!(
                    s,
                    "- {} ({}, severity {}/5{}{}){}",
                    c.name,
                    c.status,
                    c.severity,
                    c.started_on
                        .as_deref()
                        .map(|d| format!(", since {d}"))
                        .unwrap_or_default(),
                    c.resolved_on
                        .as_deref()
                        .map(|d| format!(", resolved {d}"))
                        .unwrap_or_default(),
                    if c.notes.is_empty() {
                        String::new()
                    } else {
                        format!(": {}", c.notes)
                    }
                );
            }
        }
    }

    // Medicines and today's doses.
    if let Ok(meds) = hstore::list_medicines(conn) {
        if !meds.is_empty() {
            s.push_str("\n## Medicines\n");
            for m in &meds {
                let _ = writeln!(
                    s,
                    "- {}{} at {} on {}{}{}",
                    m.name,
                    if m.dose.is_empty() {
                        String::new()
                    } else {
                        format!(" {}", m.dose)
                    },
                    m.times.join(", "),
                    if m.days.len() == 7 {
                        "every day".to_string()
                    } else {
                        format!("days {:?}", m.days)
                    },
                    if m.active { "" } else { " (paused)" },
                    if m.instructions.is_empty() {
                        String::new()
                    } else {
                        format!(" — {}", m.instructions)
                    }
                );
            }
            if let Ok(sched) = hstore::schedule_for_date(conn, &today) {
                if !sched.is_empty() {
                    s.push_str("Today's doses: ");
                    let parts: Vec<String> = sched
                        .iter()
                        .map(|x| format!("{} {} ({})", &x.scheduled_at[11..], x.name, x.status))
                        .collect();
                    s.push_str(&parts.join("; "));
                    s.push('\n');
                }
            }
            if let Ok(a) = hstore::adherence(conn, 7) {
                if a.scheduled > 0 {
                    let _ = writeln!(
                        s,
                        "Adherence last 7 days: {}% ({} taken, {} missed, {} skipped of {}).",
                        a.adherence_pct, a.taken, a.missed, a.skipped, a.scheduled
                    );
                }
            }
        }
    }

    // Diary (last 14 days, newest first, capped).
    if cfg.ai_share_diary {
        let from = time::add_days(&today, -13);
        if let Ok(entries) = hstore::list_diary(conn, &from, &today) {
            if !entries.is_empty() {
                s.push_str("\n## Health diary (last 14 days, newest first)\n");
                for e in entries.iter().take(30) {
                    let mut bits = Vec::new();
                    if let Some(m) = e.mood {
                        bits.push(format!("mood {m}/5"));
                    }
                    if let Some(v) = e.energy {
                        bits.push(format!("energy {v}/5"));
                    }
                    if let Some(v) = e.pain {
                        bits.push(format!("pain {v}/10"));
                    }
                    if let Some(v) = e.sleep_hours {
                        bits.push(format!("sleep {v}h"));
                    }
                    if !e.symptoms.is_empty() {
                        bits.push(format!("symptoms: {}", e.symptoms.join(", ")));
                    }
                    let _ = writeln!(
                        s,
                        "- {} {}: {}{}",
                        e.date,
                        &e.timestamp[11..16],
                        bits.join(", "),
                        if e.notes.is_empty() {
                            String::new()
                        } else {
                            format!(" — \"{}\"", e.notes.chars().take(200).collect::<String>())
                        }
                    );
                }
            }
        }
    }

    // Measurements (last 30 days).
    if let Ok(ms) = hstore::list_measurements(conn, None, 30) {
        if !ms.is_empty() {
            s.push_str("\n## Measurements (last 30 days, newest first)\n");
            for m in ms.iter().take(40) {
                let val = match m.value2 {
                    Some(v2) => format!("{:.0}/{:.0} {}", m.value, v2, m.unit),
                    None => format!("{} {}", m.value, m.unit),
                };
                let _ = writeln!(
                    s,
                    "- {} {}: {}",
                    &m.measured_at[..10],
                    m.kind.replace('_', " "),
                    val
                );
            }
        }
    }

    // Food (last 3 days).
    if let Ok(food) = hstore::list_food(conn, 3) {
        if !food.is_empty() {
            s.push_str("\n## Food log (last 3 days, newest first)\n");
            for f in food.iter().take(30) {
                let _ = writeln!(
                    s,
                    "- {} {} {}: {}{}",
                    &f.timestamp[..10],
                    &f.timestamp[11..16],
                    f.meal,
                    f.description,
                    f.calories
                        .map(|c| format!(" (~{c} kcal)"))
                        .unwrap_or_default()
                );
            }
        }
    }

    // Care routines.
    if let Ok(routines) = crate::care::store::list(conn) {
        let active: Vec<_> = routines.iter().filter(|r| r.active).collect();
        if !active.is_empty() {
            s.push_str("\n## Personal care routines\n");
            for r in active {
                let _ = writeln!(
                    s,
                    "- {} every {} day(s){}",
                    r.name,
                    r.interval_days,
                    r.last_done
                        .as_deref()
                        .map(|d| format!(", last done {d}"))
                        .unwrap_or_else(|| ", never done yet".into())
                );
            }
        }
    }

    s
}

/// Ready-made prompts for the quick actions.
pub fn quick_prompt(kind: &str, extra: &str) -> String {
    let extra = extra.trim();
    let tail = if extra.is_empty() {
        String::new()
    } else {
        format!("\n\nExtra context from me: {extra}")
    };
    match kind {
        "meals" => format!(
            "Plan my meals for the rest of today (and tomorrow's breakfast) based on my diet, goal, what I have already eaten today, my energy and the weather. \
Give each meal as a short line with a quick-to-make option and a lighter alternative, plus a hydration nudge. Keep it to what I can realistically cook or buy.{tail}"
        ),
        "outfit" => format!(
            "What should I wear today? Use today's weather, my dress style, wardrobe notes and what my day looks like. \
Give one complete outfit (top, bottom, footwear, layer, accessories) with the reasoning in one line each, then a rain/temperature backup. \
Add one grooming touch for today.{tail}"
        ),
        "briefing" => format!(
            "Give me my daily briefing: 1) one-line weather and what to wear, 2) medicines due today, 3) what the last few diary entries and measurements suggest I should watch, \
4) a food plan for the day in three lines, 5) one movement or posture focus, 6) a single encouraging sentence. Keep the whole thing under 220 words.{tail}"
        ),
        "posture" => format!(
            "Look at the attached photo of me. Comment kindly and specifically on posture (head, shoulders, spine, hips), desk ergonomics if visible, and overall appearance or grooming. \
Give three concrete adjustments I can make right now and one habit to build. Do not comment on body weight unless I ask. Note anything that may deserve a physiotherapist's look.{tail}"
        ),
        "week" => format!(
            "Review my last 7 days: hydration, movement, focus, medicines, mood/energy, sleep, symptoms and measurements. \
Point out two things that went well, two patterns worth attention, and three small changes for next week.{tail}"
        ),
        "doctor" => format!(
            "Write a concise summary of my records that I can hand to my doctor: conditions, medicines and adherence, recent symptoms with dates, measurements with trends, sleep and mood pattern, and three questions worth asking. \
Use neutral clinical language, plain Markdown, no advice.{tail}"
        ),
        "grooming" => format!(
            "Build me a simple weekly personal care and grooming routine (skin, hair, nails, dental, sleep hygiene) that fits my routines list, work style and climate. \
Mark which items to do daily, weekly and monthly, and suggest which ones to add as Haysu care routines.{tail}"
        ),
        _ => extra.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quick_prompts_cover_kinds() {
        for k in [
            "meals", "outfit", "briefing", "posture", "week", "doctor", "grooming",
        ] {
            assert!(quick_prompt(k, "").len() > 40, "{k}");
        }
        assert!(quick_prompt("meals", "I have rice").ends_with("I have rice"));
        assert_eq!(quick_prompt("chat", "hello"), "hello");
    }

    #[test]
    fn persona_mentions_name_and_rules() {
        let cfg = AppConfig::default();
        let s = persona(&cfg, None);
        assert!(s.contains("You are Haysu"));
        assert!(s.contains("not a doctor"));
    }
}
