-- Migration: Add weather_forecasts table
CREATE TABLE IF NOT EXISTS weather_forecasts (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    forecast_date DATE NOT NULL,
    rain_probability REAL,
    tapping_hours_rain REAL,
    weather_code INTEGER,
    estimated_yield_pct REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_weather_forecasts_user_date ON weather_forecasts(userId, forecast_date);
