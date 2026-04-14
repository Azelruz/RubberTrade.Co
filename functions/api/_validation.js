/**
 * Shared validation utilities for Backend APIs
 */

export const isFutureDate = (dateString) => {
    if (!dateString) return false;
    const inputDate = new Date(dateString);
    const now = new Date();
    
    // Set both to start of day for simple comparison if needed, 
    // but here we just check if it's strictly later than 'now' (server time)
    // Actually, users might submit for 'today'. So we compare years, months, days.
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow all of today
    
    return inputDate > today;
};

export const validateNumeric = (value, fieldName, min = 0, max = Infinity) => {
    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`${fieldName} ต้องเป็นตัวเลข`);
    }
    if (num < min) {
        throw new Error(`${fieldName} ห้ามมีค่าน้อยกว่า ${min}`);
    }
    if (num > max) {
        throw new Error(`${fieldName} ห้ามมีค่ามากกว่า ${max}`);
    }
    return num;
};

export const validatePayload = (payload, rules) => {
    const errors = [];
    
    for (const [field, rule] of Object.entries(rules)) {
        const value = payload[field];
        
        if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${rule.label || field} จำเป็นต้องระบุ`);
            continue;
        }
        
        if (value !== undefined && value !== null && value !== '') {
            if (rule.type === 'number') {
                try {
                    validateNumeric(value, rule.label || field, rule.min, rule.max);
                } catch (e) {
                    errors.push(e.message);
                }
            }
            
            if (rule.type === 'date' && isFutureDate(value)) {
                errors.push(`${rule.label || field} ห้ามเป็นวันที่ในอนาคต`);
            }
        }
    }
    
    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }
    
    return true;
};
