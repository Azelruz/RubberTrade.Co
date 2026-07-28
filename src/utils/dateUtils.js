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
    
    const dateValue = record.date;
    const preciseValue = record.timestamp || record.created_at || record.createdAt;
    
    let baseDate = null;
    
    // 1. Try to get the date from record.date first (since it is the user-selected date)
    if (dateValue) {
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateValue.split('-').map(Number);
            baseDate = new Date(y, m - 1, d); // local midnight
        } else {
            const parsedDate = new Date(dateValue);
            if (isValid(parsedDate)) {
                baseDate = parsedDate;
            }
        }
    }
    
    // 2. If we got a base date, we can optionally merge the time from preciseValue if available
    if (baseDate && isValid(baseDate)) {
        if (preciseValue) {
            let preciseDate = null;
            if (typeof preciseValue === 'string') {
                const sqliteFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
                if (sqliteFormat.test(preciseValue) && !preciseValue.includes('Z') && !preciseValue.includes('+')) {
                    preciseDate = new Date(preciseValue.replace(' ', 'T') + 'Z');
                }
            }
            if (!preciseDate || !isValid(preciseDate)) {
                preciseDate = new Date(preciseValue);
            }
            
            if (preciseDate && isValid(preciseDate)) {
                // Merge date from baseDate and time from preciseDate
                baseDate.setHours(preciseDate.getHours());
                baseDate.setMinutes(preciseDate.getMinutes());
                baseDate.setSeconds(preciseDate.getSeconds());
                baseDate.setMilliseconds(preciseDate.getMilliseconds());
            }
        }
        return baseDate;
    }
    
    // 3. Fallback to preciseValue only if dateValue was not present
    if (preciseValue) {
        if (typeof preciseValue === 'string') {
            const sqliteFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
            if (sqliteFormat.test(preciseValue) && !preciseValue.includes('Z') && !preciseValue.includes('+')) {
                const parsed = new Date(preciseValue.replace(' ', 'T') + 'Z');
                if (isValid(parsed)) return parsed;
            }
        }

        const parsed = new Date(preciseValue);
        if (isValid(parsed)) return parsed;
    }
    
    return new Date();
};

/**
 * Parses only the user-selected date (record.date).
 * Fallback to precise timestamp if record.date is missing.
 */
export const parseSelectedDate = (record) => {
    if (!record) return new Date();
    const dateValue = record.date;
    if (dateValue) {
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateValue.split('-').map(Number);
            return new Date(y, m - 1, d); // local midnight
        }
        const parsedDate = new Date(dateValue);
        if (isValid(parsedDate)) return parsedDate;
    }
    
    const preciseValue = record.timestamp || record.created_at || record.createdAt;
    if (preciseValue) {
        const parsed = new Date(preciseValue);
        if (isValid(parsed)) return parsed;
    }
    return new Date();
};

/**
 * Parses only the system recording date/time (record.created_at / record.timestamp).
 * Fallback to selected date if precise timestamp is missing.
 */
export const parseRecordingDate = (record) => {
    if (!record) return new Date();
    const preciseValue = record.timestamp || record.created_at || record.createdAt;
    if (preciseValue) {
        if (typeof preciseValue === 'string') {
            const sqliteFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
            if (sqliteFormat.test(preciseValue) && !preciseValue.includes('Z') && !preciseValue.includes('+')) {
                const parsed = new Date(preciseValue.replace(' ', 'T') + 'Z');
                if (isValid(parsed)) return parsed;
            }
        }
        const parsed = new Date(preciseValue);
        if (isValid(parsed)) return parsed;
    }
    
    return parseSelectedDate(record);
};

/**
 * Formats only the selected date portion.
 */
export const formatSelectedDate = (record, formatStr = 'dd/MM/yyyy', addThaiYears = true) => {
    const dateObj = parseSelectedDate(record);
    const finalDate = addThaiYears ? addYears(dateObj, 543) : dateObj;
    return format(finalDate, formatStr, { locale: th });
};

/**
 * Formats only the recording date and time.
 */
export const formatRecordingDate = (record, formatStr = 'dd/MM/yyyy HH:mm', addThaiYears = true) => {
    const dateObj = parseRecordingDate(record);
    const finalDate = addThaiYears ? addYears(dateObj, 543) : dateObj;
    return format(finalDate, formatStr, { locale: th });
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
