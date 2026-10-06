//! User-presence detection.

/// Seconds since the last keyboard/mouse input, or `None` if the platform
/// cannot tell us (for example Wayland without the X11 compatibility layer).
pub fn idle_seconds() -> Option<u64> {
    user_idle::UserIdle::get_time().ok().map(|t| t.as_seconds())
}
