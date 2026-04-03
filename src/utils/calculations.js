/**
 * Core business logic and calculations for the Rubber Latex System
 */

/**
 * Truncates a number to 1 decimal place (rounding down)
 * Example: 12.99 -> 12.9
 * @param {number|string} value 
 * @returns {number}
 */
export const truncateOneDecimal = (value) => {
    const n = Number(value);
    if (isNaN(n)) return 0;
    // Use Math.floor on the shifted number to truncate
    return Math.floor(n * 10) / 10;
};

/**
 * Truncates a number to 2 decimal places (rounding down)
 * Example: 12.999 -> 12.99
 * @param {number|string} value 
 * @returns {number}
 */
export const truncateTwoDecimals = (value) => {
    const n = Number(value);
    if (isNaN(n)) return 0;
    return Math.floor(n * 100) / 100;
};

/**
 * Calculate wage for a staff member.
 * @param {number} baseSalary - The flat daily salary
 * @param {number} bonus - The pre-calculated bonus amount
 * @param {number} workDays - Number of days worked
 * @returns {Object} { dailyWage, bonus, workDays, total }
 */
export const calculateWage = (baseSalary, bonus = 0, workDays = 1) => {
    const daily = truncateOneDecimal(Number(baseSalary) || 0);
    const b = truncateOneDecimal(Number(bonus) || 0);
    const days = truncateOneDecimal(Number(workDays) || 1);
    const total = (daily * days) + b;
    return {
        dailyWage: daily,
        bonus: b,
        workDays: days,
        total: truncateOneDecimal(total)
    };
};

/**
 * Calculate DRC Bonus per Kilogram
 * @param {number} drc - The dry rubber content percentage
 * @param {Array} drcBonuses - Array of { drc, bonus } price rules
 * @returns {number} The bonus amount per kg
 */
export const calculateDrcBonus = (drc, drcBonuses = []) => {
    const d = Number(drc) || 0;
    
    // 1. Try custom rules first
    if (Array.isArray(drcBonuses) && drcBonuses.length > 0) {
        const sorted = [...drcBonuses].sort((a, b) => Number(b.drc) - Number(a.drc));
        const match = sorted.find(item => d >= Number(item.drc));
        if (match) return Number(match.bonus);
    }
    
    // 2. Default fallback logic: 1 baht per level above 30%
    if (d > 30) {
        return Math.floor(d) - 30; // 31% -> 1, 32% -> 2, etc.
    }
    
    return 0;
};

/**
 * Calculate Buy Total
 * @param {number} weight - Fresh latex weight in kg
 * @param {number} bucketWeight - Bucket weight in kg
 * @param {number} drc - Dry rubber content percentage
 * @param {number} dailyPrice - Base price per dry kg
 * @param {Array|number} drcBonusInput - Bonus array or pre-calculated bonus per kg
 * @param {number} empSharePct - Employee profit share percentage (0-100)
 * @returns {Object} { dryWeight, total, employeeTotal, farmerTotal, bonusDrc, actualPrice }
 */
export const calculateBuyTotal = (weight, bucketWeight = 0, drc, dailyPrice, drcBonusInput = 0, empSharePct = 0) => {
    const w = truncateOneDecimal(Number(weight) || 0);
    const bw = truncateOneDecimal(Number(bucketWeight) || 0);
    const netWeight = truncateOneDecimal(w - bw);
    const d = truncateOneDecimal(Number(drc) || 0);
    const p = truncateOneDecimal(Number(dailyPrice) || 0);
    
    // Handle both pre-calculated bonus or the bonus array
    let b = 0;
    if (Array.isArray(drcBonusInput)) {
        b = calculateDrcBonus(d, drcBonusInput);
    } else {
        b = truncateOneDecimal(Number(drcBonusInput) || 0);
    }
    
    const s = truncateOneDecimal(Number(empSharePct) || 0);

    const dryWeight = truncateOneDecimal((netWeight * d) / 100);
    const actualPrice = truncateOneDecimal(p + b);
    const total = truncateOneDecimal(dryWeight * actualPrice);
    
    const employeeTotal = truncateOneDecimal((total * s) / 100);
    const farmerTotal = truncateOneDecimal(total - employeeTotal);

    return {
        dryWeight,
        total,
        employeeTotal,
        farmerTotal,
        bonusDrc: b,
        actualPrice
    };
};

/**
 * Calculate Sell Profit Share
 * @param {number} total - Total sale amount
 * @param {number} sharePct - Profit share percentage
 * @returns {number}
 */
export const calculateProfitShare = (total, sharePct) => {
    return truncateOneDecimal((Number(total) * (Number(sharePct) || 0)) / 100);
};
