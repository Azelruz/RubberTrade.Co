import { updateSettingsAPI } from '../services/apiService';

export const STAT_CARD_DEFINITIONS = [
    { id: 'today_buy', label: 'ยอดรับซื้อวันนี้', category: 'daily' },
    { id: 'today_weight', label: 'ปริมาณยางวันนี้', category: 'daily' },
    { id: 'today_dry_weight', label: 'ยอดรวมยางแห้งวันนี้', category: 'daily' },
    { id: 'today_drc', label: 'เฉลี่ย % DRC วันนี้', category: 'daily' },
    { id: 'today_avg_buy_price', label: 'ราคารับซื้อเฉลี่ยวันนี้', category: 'daily' },
    { id: 'today_sell', label: 'ยอดขายวันนี้', category: 'daily' },
    { id: 'daily_price', label: 'ราคายางวันนี้', category: 'daily' },
    { id: 'today_expense', label: 'ค่าใช้จ่ายวันนี้', category: 'daily' },
    { id: 'total_members', label: 'สมาชิกในระบบ', category: 'members' },
    { id: 'inactive_farmers_15d', label: 'ลูกค้าไม่เคลื่อนไหว (15 วัน)', category: 'members' },
    { id: 'monthly_income', label: 'รายรับรวมเดือนนี้', category: 'monthly' },
    { id: 'monthly_cost', label: 'ต้นทุนรวมเดือนนี้', category: 'monthly' },
    { id: 'monthly_profit', label: 'กำไรสุทธิเดือนนี้', category: 'monthly' }
];

export const WIDGET_SECTION_DEFINITIONS = [
    { id: 'forecast_widget', label: 'การคาดการณ์ราคายาง (AI Forecast)', description: 'วิเคราะห์แนวโน้มราคาและแนะนำช่วงเวลาซื้อขาย' },
    { id: 'chemical_widget', label: 'การคำนวณและบันทึกสารเคมี', description: 'คำนวณสัดส่วนสารเคมีและปุ่มบันทึกการใช้งาน' },
    { id: 'charts_activity', label: 'กราฟเปรียบเทียบการซื้อ-ขาย (7 วัน)', description: 'แสดงปริมาณเงินซื้อและขายย้อนหลัง 7 วัน' },
    { id: 'charts_price', label: 'กราฟแนวโน้มราคาน้ำยาง (30 วัน)', description: 'แสดงราคารับซื้อและราคาส่งขายโรงงานย้อนหลัง 30 วัน' },
    { id: 'recent_transactions', label: 'รายการทำธุรกรรมล่าสุด', description: 'แสดง 5 รายการซื้อ-ขายล่าสุดประจำวัน' }
];

export const PRESET_CONFIGS = {
    default: {
        id: 'default',
        name: 'ครบถ้วน (Default)',
        description: 'แสดงข้อมูล สรุปตัวเลข การเงิน และวิดเจ็ตการทำงานทั้งหมด',
        visibleStats: STAT_CARD_DEFINITIONS.map(s => s.id),
        widgetOrder: WIDGET_SECTION_DEFINITIONS.map(w => w.id),
        visibleWidgets: WIDGET_SECTION_DEFINITIONS.map(w => w.id)
    },
    executive: {
        id: 'executive',
        name: 'เน้นการเงินและผู้บริหาร (Executive Focus)',
        description: 'เน้นรายรับ ต้นทุน กำไรสุทธิ ยอดซื้อ-ขาย และแนวโน้มราคายาง',
        visibleStats: [
            'monthly_profit', 'monthly_income', 'monthly_cost',
            'today_buy', 'today_sell', 'daily_price', 'today_expense'
        ],
        widgetOrder: ['charts_price', 'forecast_widget', 'charts_activity', 'recent_transactions'],
        visibleWidgets: ['charts_price', 'forecast_widget', 'charts_activity', 'recent_transactions']
    },
    operations: {
        id: 'operations',
        name: 'เน้นปฏิบัติงานรับซื้อ (Operations Focus)',
        description: 'เน้นการรับซื้อ ปริมาณยาง ยางแห้ง DRC สารเคมี และลูกค้าไม่เคลื่อนไหว',
        visibleStats: [
            'today_buy', 'today_weight', 'today_dry_weight', 'today_drc',
            'daily_price', 'inactive_farmers_15d', 'total_members'
        ],
        widgetOrder: ['chemical_widget', 'recent_transactions', 'charts_activity', 'forecast_widget'],
        visibleWidgets: ['chemical_widget', 'recent_transactions', 'charts_activity', 'forecast_widget']
    }
};

const LOCAL_STORAGE_KEY = 'rt_dashboard_config_v1';

export const getDefaultDashboardConfig = () => {
    return { ...PRESET_CONFIGS.default };
};

/**
 * Loads dashboard configuration from cloud settings if available,
 * falling back to local storage, and then to default preset.
 */
export const loadDashboardConfig = (cloudSettings = {}) => {
    try {
        let rawConfig = cloudSettings.dashboard_config || cloudSettings.dashboardConfig;
        
        if (!rawConfig) {
            rawConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
        }

        if (rawConfig) {
            const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
            
            // Ensure all required fields exist
            const allStatIds = STAT_CARD_DEFINITIONS.map(s => s.id);
            const allWidgetIds = WIDGET_SECTION_DEFINITIONS.map(w => w.id);

            const visibleStats = Array.isArray(parsed.visibleStats) 
                ? parsed.visibleStats.filter(id => allStatIds.includes(id))
                : allStatIds;
                
            let widgetOrder = Array.isArray(parsed.widgetOrder) 
                ? parsed.widgetOrder.filter(id => allWidgetIds.includes(id))
                : allWidgetIds;

            // Append any new widget definitions missing from saved order
            allWidgetIds.forEach(id => {
                if (!widgetOrder.includes(id)) widgetOrder.push(id);
            });

            const visibleWidgets = Array.isArray(parsed.visibleWidgets)
                ? parsed.visibleWidgets.filter(id => allWidgetIds.includes(id))
                : allWidgetIds;

            return {
                visibleStats,
                widgetOrder,
                visibleWidgets,
                activePreset: parsed.activePreset || 'custom'
            };
        }
    } catch (e) {
        console.error('Failed to load dashboard config:', e);
    }

    return getDefaultDashboardConfig();
};

/**
 * Saves dashboard configuration to cloud DB via settings API
 * and syncs to localStorage.
 */
export const saveDashboardConfig = async (config) => {
    try {
        const jsonStr = JSON.stringify(config);
        localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);

        // Sync with Cloud Settings backend if online
        if (navigator.onLine) {
            await updateSettingsAPI({ dashboard_config: jsonStr });
        }
        return { status: 'success' };
    } catch (e) {
        console.error('Failed to save dashboard config:', e);
        return { status: 'error', message: e.message };
    }
};

/**
 * Resets dashboard config back to default preset.
 */
export const resetDashboardConfig = async () => {
    const defaultConfig = getDefaultDashboardConfig();
    await saveDashboardConfig(defaultConfig);
    return defaultConfig;
};
