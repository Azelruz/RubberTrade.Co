import { describe, it, expect } from 'vitest';
import {
    calculateCoopSavingsInterest,
    calculateCoopDividendDistribution
} from '../coopCalculations';

describe('Cooperative Financial Business Logic Unit Tests', () => {

    describe('calculateCoopSavingsInterest', () => {
        const sampleMembers = [
            { id: 'm1', name: 'นายสมชาย ใจดี', memberNo: '001', savingsBalance: 10000 },
            { id: 'm2', name: 'นางสมศรี มีสุข', memberNo: '002', savingsBalance: 50000 },
            { id: 'm3', name: 'นายไร้เงิน ฝาก', memberNo: '003', savingsBalance: 0 }
        ];

        it('should calculate 1-year savings interest correctly at 2.0% per annum', () => {
            const result = calculateCoopSavingsInterest(sampleMembers, 2.0, 12);

            expect(result.summary.totalEligibleMembers).toBe(2);
            expect(result.summary.totalSavingsPrincipal).toBe(60000);
            expect(result.summary.estimatedTotalInterest).toBe(1200); // (10,000*2% = 200) + (50,000*2% = 1000)

            const m1Dist = result.distributions.find(d => d.memberId === 'm1');
            expect(m1Dist.interestAmount).toBe(200);
            expect(m1Dist.newBalance).toBe(10200);

            const m2Dist = result.distributions.find(d => d.memberId === 'm2');
            expect(m2Dist.interestAmount).toBe(1000);
            expect(m2Dist.newBalance).toBe(51000);
        });

        it('should calculate 6-month (half-year) savings interest correctly at 3.0% per annum', () => {
            const result = calculateCoopSavingsInterest(sampleMembers, 3.0, 6);

            // Half-year rate = 1.5%
            // m1: 10000 * 1.5% = 150
            // m2: 50000 * 1.5% = 750
            expect(result.summary.estimatedTotalInterest).toBe(900);

            const m1Dist = result.distributions.find(d => d.memberId === 'm1');
            expect(m1Dist.interestAmount).toBe(150);
            expect(m1Dist.newBalance).toBe(10150);
        });

        it('should return 0 distributions when all members have zero balance', () => {
            const zeroMembers = [
                { id: 'm1', name: 'A', savingsBalance: 0 },
                { id: 'm2', name: 'B', savingsBalance: 0 }
            ];
            const result = calculateCoopSavingsInterest(zeroMembers, 2.5, 12);
            expect(result.distributions.length).toBe(0);
            expect(result.summary.estimatedTotalInterest).toBe(0);
        });
    });

    describe('calculateCoopDividendDistribution', () => {
        const sampleCoopMembers = [
            { id: 'm1', name: 'สมาชิก A', memberNo: '001', shareAmount: 10000, totalDryRubberKg: 500, totalSalesAmount: 25000 },
            { id: 'm2', name: 'สมาชิก B', memberNo: '002', shareAmount: 20000, totalDryRubberKg: 1000, totalSalesAmount: 50000 }
        ];

        it('should calculate dividend and patronage refund with dry rubber formula [Formula A]', () => {
            const result = calculateCoopDividendDistribution({
                allocatedProfit: 100000,
                dividendShareRate: 5.0, // 5% share dividend
                patronageFormulaType: 'dry_rubber',
                patronageRefundRate: 2.0, // 2 THB / kg DRC
                reservePct: 10,
                welfarePct: 5,
                boardBonusPct: 5,
                members: sampleCoopMembers
            });

            expect(result.summary.allocatedProfit).toBe(100000);
            expect(result.summary.reserveAmount).toBe(10000); // 10%
            expect(result.summary.welfareAmount).toBe(5000);  // 5%
            expect(result.summary.boardBonusAmount).toBe(5000); // 5%

            // m1: Share (10000 * 5% = 500), Patronage (500 kg * 2 = 1000) -> Total = 1500
            const m1 = result.distributions.find(d => d.memberId === 'm1');
            expect(m1.shareDividend).toBe(500);
            expect(m1.patronageRefund).toBe(1000);
            expect(m1.totalPayout).toBe(1500);

            // m2: Share (20000 * 5% = 1000), Patronage (1000 kg * 2 = 2000) -> Total = 3000
            const m2 = result.distributions.find(d => d.memberId === 'm2');
            expect(m2.shareDividend).toBe(1000);
            expect(m2.patronageRefund).toBe(2000);
            expect(m2.totalPayout).toBe(3000);

            expect(result.summary.totalMemberPayout).toBe(4500);
        });

        it('should calculate dividend and patronage refund with sales percentage formula [Formula C]', () => {
            const result = calculateCoopDividendDistribution({
                allocatedProfit: 50000,
                dividendShareRate: 4.0, // 4% share dividend
                patronageFormulaType: 'sales_amount',
                patronageRefundRate: 1.5, // 1.5% of sales amount
                reservePct: 10,
                welfarePct: 5,
                boardBonusPct: 5,
                members: sampleCoopMembers
            });

            // m1: Share (10000 * 4% = 400), Patronage (25000 * 1.5% = 375) -> Total = 775
            const m1 = result.distributions.find(d => d.memberId === 'm1');
            expect(m1.shareDividend).toBe(400);
            expect(m1.patronageRefund).toBe(375);
            expect(m1.totalPayout).toBe(775);
        });
    });

});
