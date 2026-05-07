import { format, addYears, isValid } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Robustly parses a receipt date, prioritizing precise timestamp fields.
 * Handles the "UTC midnight" trap where date-only strings become 07:00 in Thailand.
 * 
 * @param {Object} record - The transaction record (Buy/Sell/History)
 * @returns {Date} Parsed date object
 */
export const parseReceiptDate = (record) => {
    if (!record) return new Date();
    
    // Prioritize precise fields
    const preciseValue = record.timestamp || record.created_at || record.createdAt;
    if (preciseValue) {
        // If it's a string like "2024-04-18 03:46:00" (SQLite format without Z),
        // we assume it is UTC if it comes from the server.
        if (typeof preciseValue === 'string') {
            // Check for SQLite datetime format: YYYY-MM-DD HH:MM:SS
            const sqliteFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
            if (sqliteFormat.test(preciseValue) && !preciseValue.includes('Z') && !preciseValue.includes('+')) {
                // Force interpretation as UTC by adding Z
                const parsed = new Date(preciseValue.replace(' ', 'T') + 'Z');
                if (isValid(parsed)) return parsed;
            }
        }

        const parsed = new Date(preciseValue);
        if (isValid(parsed)) return parsed;
    }
    
    // Fallback to date-only field
    const dateValue = record.date;
    if (dateValue) {
        // If it's a date-only string like "2024-04-18", 
        // parse as local midnight to avoid UTC shift.
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateValue.split('-').map(Number);
            return new Date(y, m - 1, d); 
        }
        
        const parsedDate = new Date(dateValue);
        if (isValid(parsedDate)) return parsedDate;
    }
    
    return new Date();
};

/**
 * Standard formatter for receipt dates with Thai year support.
 * 
 * @param {Date|Object} dateOrRecord - Date object or record object
 * @param {string} formatStr - date-fns format string
 * @param {boolean} addThaiYears - Whether to add 543 years (default: true)
 * @returns {string} Formatted date string
 */
export const formatReceiptDate = (dateOrRecord, formatStr = 'dd/MM/yyyy HH:mm', addThaiYears = true) => {
    let dateObj;
    if (dateOrRecord instanceof Date) {
        dateObj = dateOrRecord;
    } else {
        dateObj = parseReceiptDate(dateOrRecord);
    }
    
    const finalDate = addThaiYears ? addYears(dateObj, 543) : dateObj;
    return format(finalDate, formatStr, { locale: th });
};
