/**
 * Shared validation utilities for Backend APIs
 */

import { getNowByTimezone, getTodayDateStr } from './_utils.js';

export const isFutureDate = (dateString, timezone = 'Asia/Bangkok') => {
    if (!dateString) return false;
    
    // Get max allowed date (Today + 3 days)
    const now = getNowByTimezone(timezone);
    const maxDate = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const maxDateStr = maxDate.toISOString().split('T')[0];
    
    // String comparison is robust for YYYY-MM-DD formats
    return dateString > maxDateStr;
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

export const validatePayload = (payload, rules, timezone = 'Asia/Bangkok') => {
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
            
            if (rule.type === 'date' && isFutureDate(value, timezone)) {
                errors.push(`${rule.label || field} ห้ามระบุวันที่ล่วงหน้าเกิน 3 วัน`);
            }
        }
    }
    
    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }
    
    return true;
};
