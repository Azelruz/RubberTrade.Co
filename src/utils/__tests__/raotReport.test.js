import { describe, it, expect } from 'vitest';
import { 
    getRubberTypeLabel, 
    calculateDryRubberWeight, 
    calculateKy6Totals, 
    calculateKy8StockBalance 
} from '../raotHelpers';

describe('RAOT Report Helpers (ค.ย. ๖ / ๗ / ๘)', () => {
    describe('getRubberTypeLabel', () => {
        it('should classify latex correctly', () => {
            expect(getRubberTypeLabel('latex')).toBe('น้ำยางสด');
            expect(getRubberTypeLabel('น้ำยางสด')).toBe('น้ำยางสด');
            expect(getRubberTypeLabel('')).toBe('น้ำยางสด');
        });

        it('should classify cup lump correctly', () => {
            expect(getRubberTypeLabel('cup')).toBe('ยางก้อนถ้วย');
            expect(getRubberTypeLabel('cup_lump')).toBe('ยางก้อนถ้วย');
            expect(getRubberTypeLabel('ขี้ยาง')).toBe('ยางก้อนถ้วย');
        });

        it('should classify raw sheet and scrap', () => {
            expect(getRubberTypeLabel('raw_sheet')).toBe('ยางแผ่นดิบ');
            expect(getRubberTypeLabel('scrap')).toBe('เศษยาง');
        });
    });

    describe('calculateDryRubberWeight', () => {
        it('calculates DRC weight accurately', () => {
            // 1,000 kg fresh latex with 35% DRC = 350 kg dry rubber
            expect(calculateDryRubberWeight(1000, 35)).toBe(350);
            // 450.5 kg fresh latex with 32.5% DRC = 146.41 kg dry rubber
            expect(calculateDryRubberWeight(450.5, 32.5)).toBe(146.41);
        });

        it('handles zero or missing values gracefully', () => {
            expect(calculateDryRubberWeight(0, 35)).toBe(0);
            // If DRC is 0 or unmeasured (e.g. cup lump weight), returns fresh weight
            expect(calculateDryRubberWeight(500, 0)).toBe(500);
        });
    });

    describe('calculateKy6Totals', () => {
        it('aggregates totals for KY6 buy records', () => {
            const mockRecords = [
                { weight: 1000, drc: 35, total: 24500 }, // dry = 350
                { weight: 500, drc: 30, total: 10500 },  // dry = 150
            ];
            const totals = calculateKy6Totals(mockRecords);
            expect(totals.totalWeight).toBe(1500);
            expect(totals.totalDryRubber).toBe(500);
            expect(totals.totalAmount).toBe(35000);
        });
    });

    describe('calculateKy8StockBalance', () => {
        it('calculates stock balance correctly', () => {
            // Brought forward: 500 kg, Bought: 10,000 kg, Sold: 9,000 kg, Loss: 100 kg
            // Expected balance: 500 + 10000 - 9000 - 100 = 1,400 kg
            const res = calculateKy8StockBalance(500, 10000, 9000, 100);
            expect(res.totalAvailable).toBe(10500);
            expect(res.balance).toBe(1400);
        });

        it('prevents negative stock balance', () => {
            const res = calculateKy8StockBalance(0, 100, 200, 0);
            expect(res.balance).toBe(0);
        });
    });
});
