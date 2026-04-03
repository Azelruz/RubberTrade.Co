import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet(context) {
    try {
        const db = context.env.DB;
        
        const [farmers, staff, buys, sells, wages, expenses, settings] = await Promise.all([
            db.prepare("SELECT * FROM farmers").all(),
            db.prepare("SELECT * FROM staff").all(),
            db.prepare("SELECT b.*, f.name as farmerName FROM buys b LEFT JOIN farmers f ON b.farmerId = f.id ORDER BY b.date DESC, b.created_at DESC").all(),
            db.prepare("SELECT * FROM sells ORDER BY date DESC, created_at DESC").all(),
            db.prepare("SELECT w.*, s.name as staffName FROM wages w LEFT JOIN staff s ON w.staffId = s.id ORDER BY w.date DESC, w.created_at DESC").all(),
            db.prepare("SELECT * FROM expenses ORDER BY date DESC, created_at DESC").all(),
            db.prepare("SELECT * FROM settings").all()
        ]);

        const settingsList = settings?.results || [];
        const settingsMap = {};
        settingsList.forEach(s => {
            if (s.key) settingsMap[s.key] = s.value;
        });

        const priceSetting = settingsList.find(s => s.key === 'daily_price');
        const dailyPrice = {
            price: priceSetting ? (priceSetting.value || '0') : '0',
            date: priceSetting ? (priceSetting.updated_at || '').split(' ')[0] : ''
        };

        return jsonResponse({
            farmers: farmers?.results || [],
            staff: staff?.results || [],
            buys: buys?.results || [],
            sells: sells?.results || [],
            wages: wages?.results || [],
            expenses: expenses?.results || [],
            dailyPrice: dailyPrice,
            settings: settingsMap
        });
    } catch (e) {
        console.error("[GET /dashboard Error]", e);
        return errorResponse(e.message);
    }
}
