/**
 * Utility functions for RAOT (การยางแห่งประเทศไทย) reports (ค.ย. ๖, ค.ย. ๗, ค.ย. ๘)
 */

export const getRubberTypeLabel = (type) => {
    if (!type) return 'น้ำยางสด';
    const t = String(type).toLowerCase();
    if (t.includes('cup') || t.includes('ก้อน') || t.includes('ขี้ยาง')) return 'ยางก้อนถ้วย';
    if (t.includes('sheet') || t.includes('แผ่น')) return 'ยางแผ่นดิบ';
    if (t.includes('smoked') || t.includes('รมควัน')) return 'ยางแผ่นรมควัน';
    if (t.includes('scrap') || t.includes('เศษ')) return 'เศษยาง';
    return 'น้ำยางสด';
};

export const calculateDryRubberWeight = (weight, drc) => {
    const w = Number(weight || 0);
    const d = Number(drc || 0);
    if (!w) return 0;
    if (!d || d <= 0) return w;
    return parseFloat(((w * d) / 100).toFixed(2));
};

export const calculateKy6Totals = (records = []) => {
    let totalWeight = 0;
    let totalDryRubber = 0;
    let totalAmount = 0;

    records.forEach(r => {
        const w = Number(r.weight || 0);
        const drc = Number(r.drc || 0);
        const dry = Number(r.dryRubber || calculateDryRubberWeight(w, drc));
        const amt = Number(r.total || 0);

        totalWeight += w;
        totalDryRubber += dry;
        totalAmount += amt;
    });

    return {
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        totalDryRubber: parseFloat(totalDryRubber.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2))
    };
};

export const calculateKy8StockBalance = (broughtForward = 0, bought = 0, sold = 0, loss = 0) => {
    const bf = Number(broughtForward || 0);
    const b = Number(bought || 0);
    const s = Number(sold || 0);
    const l = Number(loss || 0);

    const totalAvailable = bf + b;
    const balance = Math.max(0, totalAvailable - s - l);

    return {
        totalAvailable: parseFloat(totalAvailable.toFixed(2)),
        balance: parseFloat(balance.toFixed(2))
    };
};
