import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const storeId = context.user.storeId;
        
        // 1. Get Lat/Lng from settings
        const [latSetting, lngSetting, priceSetting, trucksRes] = await Promise.all([
            db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'latitude'").bind(storeId).first(),
            db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'longitude'").bind(storeId).first(),
            db.prepare("SELECT value FROM settings WHERE userId = ? AND key = 'daily_price'").bind(storeId).first(),
            db.prepare("SELECT capacity FROM trucks WHERE userId = ?").bind(storeId).all()
        ]);

        const latitude = latSetting ? parseFloat(latSetting.value) : null;
        const longitude = lngSetting ? parseFloat(lngSetting.value) : null;
        const dailyPrice = priceSetting ? parseFloat(priceSetting.value) : 55.0; // default price

        if (!latitude || !longitude) {
            return jsonResponse({
                status: 'not_configured',
                message: 'กรุณากรอกพิกัดละติจูดและลองจิจูดในเมนูตั้งค่าร้านค้า เพื่อเปิดใช้งานระบบคาดการณ์ผลผลิตน้ำยางสดล่วงหน้า'
            });
        }

        // 2. Calculate Base Yield and Average DRC (from past 14 active days of latex buys)
        const baseYieldRes = await db.prepare(`
            SELECT AVG(daily_weight) as avg_weight, AVG(avg_daily_drc) as avg_drc FROM (
                SELECT SUM(weight) as daily_weight, AVG(drc) as avg_daily_drc
                FROM buys 
                WHERE userId = ? AND rubberType = 'latex' AND weight > 0 AND date >= date('now', '-60 days')
                GROUP BY date 
                ORDER BY date DESC 
                LIMIT 14
            )
        `).bind(storeId).first();

        const baseYield = baseYieldRes?.avg_weight ? parseFloat(baseYieldRes.avg_weight) : 800.0; // Fallback to 800kg if no history
        const avgDrc = baseYieldRes?.avg_drc ? parseFloat(baseYieldRes.avg_drc) : 33.0; // Fallback to 33% if no history

        // 3. Determine max truck capacity
        let truckCapacity = 1500; // default 1.5 tons
        if (trucksRes?.results && trucksRes.results.length > 0) {
            const capacities = trucksRes.results.map(t => parseFloat(t.capacity) || 0).filter(c => c > 0);
            if (capacities.length > 0) {
                truckCapacity = Math.max(...capacities);
            }
        }

        // 4. Check cached forecasts first
        const cacheAgeLimit = new Date();
        cacheAgeLimit.setHours(cacheAgeLimit.getHours() - 6); // 6 hours cache validity
        const cacheAgeStr = cacheAgeLimit.toISOString().replace('T', ' ').substring(0, 19);

        const cachedForecasts = await db.prepare(`
            SELECT * FROM weather_forecasts 
            WHERE userId = ? AND forecast_date >= date('now', 'localtime') AND updated_at >= ?
            ORDER BY forecast_date ASC
            LIMIT 3
        `).bind(storeId, cacheAgeStr).all();

        let forecasts = cachedForecasts?.results || [];

        // 5. Fetch from Open-Meteo if cache is empty or incomplete
        if (forecasts.length < 3) {
            try {
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability,precipitation,weather_code&timezone=Asia%2FBangkok&forecast_days=3`;
                const response = await fetch(weatherUrl);
                if (!response.ok) throw new Error('Failed to fetch from Open-Meteo');
                
                const weatherData = await response.json();
                const hourly = weatherData.hourly;

                if (hourly && hourly.time) {
                    const tempForecasts = [];
                    // Process 3 days
                    for (let day = 0; day < 3; day++) {
                        // Tapping hours are 01:00 AM to 06:00 AM
                        // Indices for the day: day * 24 + hour
                        const startIdx = day * 24 + 1; // 01:00
                        const endIdx = day * 24 + 6;   // 06:00
                        
                        let maxRainProb = 0;
                        let totalPrecipitation = 0;
                        let weatherCode = 0;

                        for (let i = startIdx; i <= endIdx; i++) {
                            if (hourly.precipitation_probability && hourly.precipitation_probability[i] > maxRainProb) {
                                maxRainProb = hourly.precipitation_probability[i];
                            }
                            if (hourly.precipitation && hourly.precipitation[i]) {
                                totalPrecipitation += hourly.precipitation[i];
                            }
                            // Take weather code from 06:00 AM as a general day indicator
                            if (i === endIdx && hourly.weather_code) {
                                weatherCode = hourly.weather_code[i];
                            }
                        }

                        // Determine yield percentage based on rain
                        let estimatedYieldPct = 100.0;
                        if (totalPrecipitation >= 1.0 || maxRainProb >= 70) {
                            estimatedYieldPct = 5.0; // Tapping suspended
                        } else if (totalPrecipitation >= 0.2 || maxRainProb >= 40) {
                            estimatedYieldPct = 40.0; // Partial tapping
                        }

                        const forecastDate = hourly.time[day * 24].substring(0, 10);
                        tempForecasts.push({
                            forecastDate,
                            rainProbability: maxRainProb,
                            tappingHoursRain: parseFloat(totalPrecipitation.toFixed(2)),
                            weatherCode,
                            estimatedYieldPct
                        });
                    }

                    // Save to database (ON CONFLICT REPLACE)
                    const insertStmt = db.prepare(`
                        INSERT INTO weather_forecasts (id, userId, forecast_date, rain_probability, tapping_hours_rain, weather_code, estimated_yield_pct, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(userId, forecast_date) DO UPDATE SET
                            rain_probability=excluded.rain_probability,
                            tapping_hours_rain=excluded.tapping_hours_rain,
                            weather_code=excluded.weather_code,
                            estimated_yield_pct=excluded.estimated_yield_pct,
                            updated_at=CURRENT_TIMESTAMP
                    `);

                    const batchStmts = tempForecasts.map(f => {
                        const id = crypto.randomUUID();
                        return insertStmt.bind(
                            id,
                            storeId,
                            f.forecastDate,
                            f.rainProbability,
                            f.tappingHoursRain,
                            f.weatherCode,
                            f.estimatedYieldPct
                        );
                    });

                    await db.batch(batchStmts);

                    // Re-query saved forecasts
                    const newForecasts = await db.prepare(`
                        SELECT * FROM weather_forecasts 
                        WHERE userId = ? AND forecast_date >= date('now', 'localtime')
                        ORDER BY forecast_date ASC
                        LIMIT 3
                    `).bind(storeId).all();
                    
                    forecasts = newForecasts?.results || [];
                }
            } catch (err) {
                console.error('Weather Fetch Error:', err);
                // If Open-Meteo fails, try to fallback to old cache (even if older than 6 hours)
                if (forecasts.length === 0) {
                    const fallbackCached = await db.prepare(`
                        SELECT * FROM weather_forecasts 
                        WHERE userId = ? AND forecast_date >= date('now', 'localtime')
                        ORDER BY forecast_date ASC
                        LIMIT 3
                    `).bind(storeId).all();
                    forecasts = fallbackCached?.results || [];
                }
            }
        }

        // 6. Map and enrich predictions with Yield Formula & Seasonality Factors
        const processedForecasts = forecasts.map(f => {
            const dateStr = f.forecast_date;
            const month = new Date(dateStr).getMonth() + 1; // 1-12

            // Calculate seasonality factor based on region latitude
            let seasonalityFactor = 1.0;
            if (latitude >= 10.0) { // North / Northeast (more severe dry season defoliation)
                if (month === 1) seasonalityFactor = 0.5;
                else if (month === 2 || month === 3) seasonalityFactor = 0.25;
                else if (month === 4) seasonalityFactor = 0.6;
            } else { // Southern Thailand (less severe, later)
                if (month === 2) seasonalityFactor = 0.6;
                else if (month === 3 || month === 4) seasonalityFactor = 0.35;
                else if (month === 5) seasonalityFactor = 0.7;
            }

            // Yield = BaseYield * RainImpact * SeasonalityFactor
            const rainYieldFactor = f.estimated_yield_pct / 100.0;
            const finalYieldPct = Math.round(f.estimated_yield_pct * seasonalityFactor);
            const predictedWeight = Math.round(baseYield * rainYieldFactor * seasonalityFactor);
            
            // Financials and logistics
            const cashRequired = Math.round(predictedWeight * (avgDrc / 100.0) * dailyPrice);
            const truckTrips = Math.max(1, Math.ceil(predictedWeight / truckCapacity));

            return {
                date: f.forecast_date,
                rainProbability: f.rain_probability,
                tappingHoursRain: f.tapping_hours_rain,
                weatherCode: f.weather_code,
                yieldPct: finalYieldPct,
                predictedWeight,
                cashRequired,
                truckTrips,
                seasonalityFactor: parseFloat(seasonalityFactor.toFixed(2))
            };
        });

        return jsonResponse({
            status: 'success',
            latitude,
            longitude,
            baseYield,
            avgDrc,
            dailyPrice,
            forecasts: processedForecasts
        });

    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
