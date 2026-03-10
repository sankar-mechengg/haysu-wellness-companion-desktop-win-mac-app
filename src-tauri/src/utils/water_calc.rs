/// Calculate recommended daily water intake in milliliters
/// Formula: weight_kg × 35 = daily_ml
/// Minimum: 1500ml, Maximum: 5000ml
pub fn calculate_daily_water(weight_kg: f64) -> i64 {
    let raw_ml = (weight_kg * 35.0) as i64;
    raw_ml.clamp(1500, 5000)
}

/// Get adaptive water interval based on work style
/// Returns interval in minutes
pub fn get_adaptive_water_interval(work_style: &str) -> u64 {
    match work_style {
        "sedentary" => 25,
        "moderate" => 30,
        "active" => 40,
        _ => 30,
    }
}

/// Get adaptive movement interval based on work style
/// Returns interval in minutes
pub fn get_adaptive_movement_interval(work_style: &str) -> u64 {
    match work_style {
        "sedentary" => 35,
        "moderate" => 45,
        "active" => 60,
        _ => 45,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_water_calculation() {
        assert_eq!(calculate_daily_water(70.0), 2450);
        assert_eq!(calculate_daily_water(50.0), 1750);
        assert_eq!(calculate_daily_water(100.0), 3500);
    }

    #[test]
    fn test_water_calculation_clamp() {
        assert_eq!(calculate_daily_water(30.0), 1500); // Below minimum
        assert_eq!(calculate_daily_water(200.0), 5000); // Above maximum
    }

    #[test]
    fn test_adaptive_intervals() {
        assert_eq!(get_adaptive_water_interval("sedentary"), 25);
        assert_eq!(get_adaptive_water_interval("active"), 40);
        assert_eq!(get_adaptive_movement_interval("sedentary"), 35);
        assert_eq!(get_adaptive_movement_interval("active"), 60);
    }
}
