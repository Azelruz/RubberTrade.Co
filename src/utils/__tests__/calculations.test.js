import { describe, it, expect } from 'vitest';
import {
    truncateOneDecimal,
    truncateTwoDecimals,
    calculateWage,
    calculateDrcBonus,
    calculateBuyTotal,
    calculateProfitShare
} from '../calculations';

describe('RubberTrade Business Calculations Unit Tests', () => {

    describe('truncateOneDecimal', () => {
        it('should truncate numbers to 1 decimal place without rounding up', () => {
            expect(truncateOneDecimal(12.99)).toBe(12.9);
            expect(truncateOneDecimal(10.55)).toBe(10.5);
            expect(truncateOneDecimal(5)).toBe(5);
            expect(truncateOneDecimal(0)).toBe(0);
        });

        it('should handle string input and invalid values gracefully', () => {
            expect(truncateOneDecimal("45.89")).toBe(45.8);
            expect(truncateOneDecimal("abc")).toBe(0);
            expect(truncateOneDecimal(null)).toBe(0);
            expect(truncateOneDecimal(undefined)).toBe(0);
        });
    });

    describe('truncateTwoDecimals', () => {
        it('should truncate numbers to 2 decimal places without rounding up', () => {
            expect(truncateTwoDecimals(12.999)).toBe(12.99);
            expect(truncateTwoDecimals(10.554)).toBe(10.55);
            expect(truncateTwoDecimals(100.1)).toBe(100.1);
        });

        it('should handle string input and invalid values gracefully', () => {
            expect(truncateTwoDecimals("99.999")).toBe(99.99);
            expect(truncateTwoDecimals("invalid")).toBe(0);
        });
    });

    describe('calculateWage', () => {
        it('should calculate flat daily salary correctly for 1 day', () => {
            const res = calculateWage(500, 100, 1);
            expect(res).toEqual({
                dailyWage: 500,
                bonus: 100,
                workDays: 1,
                total: 600
            });
        });

        it('should calculate wage correctly for multiple work days', () => {
            const res = calculateWage(450, 50, 5);
            expect(res).toEqual({
                dailyWage: 450,
                bonus: 50,
                workDays: 5,
                total: 2300 // (450 * 5) + 50 = 2250 + 50 = 2300
            });
        });

        it('should fallback defaults for missing parameters', () => {
            const res = calculateWage(300);
            expect(res).toEqual({
                dailyWage: 300,
                bonus: 0,
                workDays: 1,
                total: 300
            });
        });
    });

    describe('calculateDrcBonus', () => {
        it('should use default fallback DRC bonus (1 baht per DRC level above 30%)', () => {
            expect(calculateDrcBonus(31)).toBe(1);
            expect(calculateDrcBonus(35)).toBe(5);
            expect(calculateDrcBonus(30)).toBe(0);
            expect(calculateDrcBonus(25)).toBe(0);
        });

        it('should use custom DRC bonus rules when provided', () => {
            const customRules = [
                { drc: 35, bonus: 7.5 },
                { drc: 32, bonus: 4.0 },
                { drc: 30, bonus: 1.0 }
            ];

            expect(calculateDrcBonus(36, customRules)).toBe(7.5);
            expect(calculateDrcBonus(33, customRules)).toBe(4.0);
            expect(calculateDrcBonus(30, customRules)).toBe(1.0);
            expect(calculateDrcBonus(28, customRules)).toBe(0);
        });
    });

    describe('calculateBuyTotal (Rubber Latex Purchasing Logic)', () => {
        it('should correctly calculate latex buy totals with net weight and DRC', () => {
            // Fresh Latex: 100kg total - 10kg bucket = 90kg net
            // DRC: 35%
            // Dry Weight: (90 * 35) / 100 = 31.5 kg dry
            // Daily Price: 50 THB / dry kg
            // DRC Bonus: 5 THB (35% -> 5 above 30%)
            // Actual Price: 50 + 5 = 55 THB / dry kg
            // Total: 31.5 * 55 = 1732.5 THB
            const result = calculateBuyTotal(100, 10, 35, 50);

            expect(result.dryWeight).toBe(31.5);
            expect(result.bonusDrc).toBe(5);
            expect(result.actualPrice).toBe(55);
            expect(result.total).toBe(1732.5);
            expect(result.farmerTotal).toBe(1732.5);
            expect(result.employeeTotal).toBe(0);
        });

        it('should split totals correctly when employee profit share is specified', () => {
            // Total = 1000 THB, Employee share = 10%
            // Employee total = 100 THB, Farmer total = 900 THB
            const result = calculateBuyTotal(100, 0, 30, 33.33, 0, 10);
            // dryWeight = 30 kg
            // actualPrice = 33.3 THB
            // total = 30 * 33.3 = 999 THB
            // employeeTotal = (999 * 10) / 100 = 99.9 THB
            // farmerTotal = 999 - 99.9 = 899.1 THB
            expect(result.employeeTotal).toBe(99.9);
            expect(result.farmerTotal).toBe(899.1);
        });
    });

    describe('calculateProfitShare', () => {
        it('should calculate profit share percentage accurately', () => {
            expect(calculateProfitShare(10000, 5)).toBe(500);
            expect(calculateProfitShare(2500, 10)).toBe(250);
            expect(calculateProfitShare(0, 5)).toBe(0);
        });
    });

});
