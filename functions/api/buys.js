import { jsonResponse, errorResponse, withAuth, isUUID, trackUsage, recordAuditLog, getTodayDateStr } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';
import { validatePayload } from './_validation.js';
import { refundLoanDeductions } from './_loan_helpers.js';

async function handleGet(context) {
    try {
        const userId = context.user.id;
        const url = new URL(context.request.url);
        
        // --- Input Parameters ---
        const since = url.searchParams.get('since');
        let startDate = url.searchParams.get('startDate');
        let endDate = url.searchParams.get('endDate');
        const search = url.searchParams.get('search');
        const pageParam = url.searchParams.get('page');
        const pageSizeParam = url.searchParams.get('pageSize');
        const allParam = url.searchParams.get('all') === 'true';
        const isPaginated = !!pageParam;
        
        const page = parseInt(pageParam) || 1;
        const pageSize = parseInt(pageSizeParam) || 50;
        const offset = (page - 1) * pageSize;

        // Default to TODAY's date if no date range, search, since, or all parameter is specified
        if (!startDate && !endDate && !search && !since && !allParam) {
            const todayStr = getTodayDateStr(context.user.timezone);
            startDate = todayStr;
            endDate = todayStr;
        }

        // --- Build Where Clauses ---
        let whereClauses = ["b.userId = ?"];
        const params = [context.user.storeId];

        if (since) {
            whereClauses.push("b.updated_at > ?");
            params.push(since);
        }
        if (startDate) {
            whereClauses.push("b.date >= ?");
            params.push(startDate);
        }
        if (endDate) {
            const endDateBound = endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate;
            whereClauses.push("b.date <= ?");
            params.push(endDateBound);
        }
        if (search) {
            whereClauses.push("(b.farmerName LIKE ? OR b.id LIKE ? OR f.name LIKE ?)");
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // --- Advanced Filters ---
        const rubberType = url.searchParams.get('rubberType');
        const minWeight = url.searchParams.get('minWeight');
        const maxWeight = url.searchParams.get('maxWeight');
        const minTotal = url.searchParams.get('minTotal');
        const maxTotal = url.searchParams.get('maxTotal');
        const farmerId = url.searchParams.get('farmerId');
        const farmerStatus = url.searchParams.get('farmerStatus');
        const employeeStatus = url.searchParams.get('employeeStatus');

        if (rubberType) {
            whereClauses.push("b.rubberType = ?");
            params.push(rubberType);
        }
        if (minWeight) {
            whereClauses.push("(b.weight - b.bucketWeight) >= ?");
            params.push(parseFloat(minWeight));
        }
        if (maxWeight) {
            whereClauses.push("(b.weight - b.bucketWeight) <= ?");
            params.push(parseFloat(maxWeight));
        }
        if (minTotal) {
            whereClauses.push("b.total >= ?");
            params.push(parseFloat(minTotal));
        }
        if (maxTotal) {
            whereClauses.push("b.total <= ?");
            params.push(parseFloat(maxTotal));
        }
        if (farmerId) {
            whereClauses.push("b.farmerId = ?");
            params.push(farmerId);
        }
        if (farmerStatus) {
            whereClauses.push("b.farmerStatus = ?");
            params.push(farmerStatus);
        }
        if (employeeStatus) {
            whereClauses.push("b.employeeStatus = ?");
            params.push(employeeStatus);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // --- Execute Queries in Batch ---
        // 1. Paginated or Safety-limited Records (Default limit 100 if unpaginated to prevent massive D1 rows read)
        const defaultLimit = (!isPaginated && !startDate && !endDate && !search && !since) ? 100 : null;
        
        // Only JOIN farmers if searching across f.name, otherwise b.farmerName is already present in buys table
        const fromClause = search ? 'FROM buys b LEFT JOIN farmers f ON b.farmerId = f.id' : 'FROM buys b';
        const selectNameColumn = search ? 'COALESCE(f.name, b.farmerName) as farmerName' : 'b.farmerName';

        const recordsQuery = `
            SELECT b.*, ${selectNameColumn} 
            ${fromClause} 
            ${whereSql} 
            ORDER BY b.date DESC, b.created_at DESC 
            ${isPaginated ? 'LIMIT ? OFFSET ?' : (defaultLimit ? 'LIMIT ?' : '')}
        `;
        const recordsParams = isPaginated ? [...params, pageSize, offset] : (defaultLimit ? [...params, defaultLimit] : params);

        let results = [];
        let totalCount = 0;
        let totalPages = 1;
        let summary = { totalCount: 0, totalAmount: 0, totalWeight: 0 };

        if (isPaginated) {
            const summaryQuery = `
                SELECT 
                    COUNT(*) as totalCount,
                    SUM(b.total) as totalAmount,
                    SUM(b.weight - b.bucketWeight) as totalWeight
                ${fromClause}
                ${whereSql}
            `;

            const [recordsRes, summaryRes] = await context.env.DB.batch([
                context.env.DB.prepare(recordsQuery).bind(...recordsParams),
                context.env.DB.prepare(summaryQuery).bind(...params)
            ]);

            results = recordsRes.results || [];
            summary = summaryRes.results[0] || { totalCount: 0, totalAmount: 0, totalWeight: 0 };
            totalCount = summary.totalCount || 0;
            totalPages = Math.ceil(totalCount / pageSize);

            // Track usage
            context.waitUntil?.(trackUsage(context, { rowsRead: results.length }));

            return jsonResponse({
                results,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: page,
                    pageSize
                },
                summary: {
                    totalBills: totalCount,
                    totalAmount: summary.totalAmount || 0,
                    totalWeight: summary.totalWeight || 0
                }
            });
        } else {
            const recordsRes = await context.env.DB.prepare(recordsQuery).bind(...recordsParams).all();
            results = recordsRes.results || [];

            // Track usage
            context.waitUntil?.(trackUsage(context, { rowsRead: results.length }));

            return jsonResponse(results);
        }
    } catch (e) {
        console.error("[GET /buys Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const userId = context.user.id;
        const storeId = context.user.storeId;

        // Bulk Insert Support
        if (body.action === 'bulk' && Array.isArray(body.payloads)) {
            const stationCode = await getSetting(context.env.DB, 'station_code', storeId, '0335');
            const format = await getSetting(context.env.DB, 'format_buy_bill', storeId, 'B-{STATION}{YYYY}-{SEQ4}');
            const stmts = [];

            const buySchema = {
                date: { type: 'date', label: 'วันที่' },
                weight: { type: 'number', label: 'น้ำหนักรวม', min: 0.1 },
                bucketWeight: { type: 'number', label: 'น้ำหนักถัง', min: 0 },
                drc: { type: 'number', label: 'DRC', min: 1, max: 100 },
                actualPrice: { type: 'number', label: 'ราคาสุทธิ', min: 0.1 },
                empPct: { type: 'number', label: 'ส่วนแบ่งลูกจ้าง (%)', min: 0, max: 100 }
            };
            
            for (let i = 0; i < body.payloads.length; i++) {
                const p = body.payloads[i];
                
                // Server-side Validation
                try {
                    validatePayload(p, buySchema, context.user.timezone);
                    if (p.bucketWeight >= p.weight) {
                        throw new Error(`น้ำหนักถัง (${p.bucketWeight}) ต้องน้อยกว่าน้ำหนักรวม (${p.weight})`);
                    }
                } catch (valErr) {
                    return errorResponse(`ข้อมูลรายการที่ ${i + 1} ไม่ถูกต้อง: ${valErr.message}`);
                }

                let id = p.id;
                if (!id || isUUID(id)) {
                    const nonce = isUUID(id) ? id.substring(0, 6).toUpperCase() : '';
                    id = await generateNextId(context.env.DB, 'buys', format, stationCode, storeId, nonce, i);
                }
                const {
                    date, farmerId, farmerName, weight, drc, pricePerKg, total,
                    dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
                    farmerStatus, employeeStatus, receiptUrl, bucketWeight,
                    basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType, createdBy
                } = p;

                stmts.push(context.env.DB.prepare(`
                    INSERT INTO buys (
                        id, date, farmerId, farmerName, weight, drc, pricePerKg, total, 
                        dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
                        farmerStatus, employeeStatus, receiptUrl, bucketWeight,
                        basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType, createdBy, userId, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        date = excluded.date,
                        farmerId = excluded.farmerId,
                        farmerName = excluded.farmerName,
                        weight = excluded.weight,
                        drc = excluded.drc,
                        pricePerKg = excluded.pricePerKg,
                        total = excluded.total,
                        dryRubber = excluded.dryRubber,
                        empPct = excluded.empPct,
                        employeeTotal = excluded.employeeTotal,
                        farmerTotal = excluded.farmerTotal,
                        note = excluded.note,
                        status = excluded.status,
                        farmerStatus = excluded.farmerStatus,
                        employeeStatus = excluded.employeeStatus,
                        receiptUrl = excluded.receiptUrl,
                        bucketWeight = excluded.bucketWeight,
                        basePrice = excluded.basePrice,
                        bonusDrc = excluded.bonusDrc,
                        actualPrice = excluded.actualPrice,
                        bonusMemberType = excluded.bonusMemberType,
                        rubberType = excluded.rubberType
                `).bind(
                    id, date || null, farmerId || null, farmerName || null, 
                    weight || 0, drc || 0, pricePerKg || 0, total || 0, 
                    dryRubber || 0, empPct || 0, employeeTotal || 0, farmerTotal || 0, 
                    note || null, status || null, 
                    farmerStatus || 'Pending', employeeStatus || 'Pending', 
                    receiptUrl || null, bucketWeight || 0,
                    basePrice || 0, bonusDrc || 0, actualPrice || 0, bonusMemberType || 0, 
                    rubberType || 'latex', createdBy || context.user.username || 'Owner', storeId, p.created_at || p.timestamp || new Date().toISOString()
                ));
            }
            
            await context.env.DB.batch(stmts);
            
            // --- Audit Logging (Bulk) ---
            if (body.payloads.length > 0) {
                context.waitUntil?.(Promise.all(body.payloads.map((p, idx) => {
                    const id = stmts[idx].params[0]; // Extract ID from prepared statement
                    return recordAuditLog(context, {
                        action: 'CREATE_BUY',
                        entityType: 'buys',
                        entityId: id,
                        oldData: null,
                        newData: { ...p, userId: storeId }
                    });
                })));
            }

            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        const buyData = {
            ...payload,
            userId: storeId,
            created_at: payload.created_at || new Date().toISOString()
        };

        const buySchema = {
            date: { type: 'date', label: 'วันที่' },
            weight: { type: 'number', label: 'น้ำหนักรวม', min: 0.1 },
            bucketWeight: { type: 'number', label: 'น้ำหนักถัง', min: 0 },
            drc: { type: 'number', label: 'DRC', min: 1, max: 100 },
            actualPrice: { type: 'number', label: 'ราคาสุทธิ', min: 0.1 },
            empPct: { type: 'number', label: 'ส่วนแบ่งลูกจ้าง (%)', min: 0, max: 100 }
        };

        try {
            validatePayload(payload, buySchema, context.user.timezone);
            if (payload.bucketWeight >= payload.weight) {
                throw new Error(`น้ำหนักถัง (${payload.bucketWeight}) ต้องน้อยกว่าน้ำหนักรวม (${payload.weight})`);
            }
        } catch (valErr) {
            return errorResponse(`ข้อมูลไม่ถูกต้อง: ${valErr.message}`);
        }

        let id = payload.id;
        if (!id || isUUID(id)) {
            const stationCode = await getSetting(context.env.DB, 'station_code', storeId, '0335');
            const format = await getSetting(context.env.DB, 'format_buy_bill', storeId, 'B-{STATION}{YYYY}-{SEQ4}');
            const nonce = isUUID(id) ? id.substring(0, 6).toUpperCase() : '';
            id = await generateNextId(context.env.DB, 'buys', format, stationCode, storeId, nonce, 0);
        }

        // Check if existing record exists to record accurate audit log (CREATE vs UPDATE)
        const existingRecord = await context.env.DB.prepare("SELECT * FROM buys WHERE id = ? AND userId = ?").bind(id, storeId).first();
        const isUpdate = !!existingRecord;

        const { 
            date, farmerId, farmerName, weight, drc, pricePerKg, total, 
            dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
            farmerStatus, employeeStatus, receiptUrl, bucketWeight,
            basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType, createdBy
        } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO buys (
                id, date, farmerId, farmerName, weight, drc, pricePerKg, total, 
                dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
                farmerStatus, employeeStatus, receiptUrl, bucketWeight,
                basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType, createdBy, userId, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                farmerId = excluded.farmerId,
                farmerName = excluded.farmerName,
                weight = excluded.weight,
                drc = excluded.drc,
                pricePerKg = excluded.pricePerKg,
                total = excluded.total,
                dryRubber = excluded.dryRubber,
                empPct = excluded.empPct,
                employeeTotal = excluded.employeeTotal,
                farmerTotal = excluded.farmerTotal,
                note = excluded.note,
                status = excluded.status,
                farmerStatus = excluded.farmerStatus,
                employeeStatus = excluded.employeeStatus,
                receiptUrl = excluded.receiptUrl,
                bucketWeight = excluded.bucketWeight,
                basePrice = excluded.basePrice,
                bonusDrc = excluded.bonusDrc,
                actualPrice = excluded.actualPrice,
                bonusMemberType = excluded.bonusMemberType,
                rubberType = excluded.rubberType
        `).bind(
            id, date || null, farmerId || null, farmerName || null, 
            weight || 0, drc || 0, pricePerKg || 0, total || 0, 
            dryRubber || 0, empPct || 0, employeeTotal || 0, farmerTotal || 0, 
            note || null, status || null, 
            farmerStatus || 'Pending', employeeStatus || 'Pending', 
            receiptUrl || null, bucketWeight || 0,
            basePrice || 0, bonusDrc || 0, actualPrice || 0, bonusMemberType || 0, 
            rubberType || 'latex', createdBy || (existingRecord ? existingRecord.createdBy : (context.user.username || 'Owner')), storeId, payload.created_at || payload.timestamp || (existingRecord ? existingRecord.created_at : new Date().toISOString())
        ).run();

        // --- Process Loan Deductions ---
        // 1. Revert any existing deductions for this buyId (in case this is an update)
        await refundLoanDeductions(context.env.DB, id, storeId);

        // 2. Process new deductions if present in payload
        if (Array.isArray(payload.loanDeductions) && payload.loanDeductions.length > 0) {
            for (const ded of payload.loanDeductions) {
                const { borrowerType, borrowerId, amount: deductAmt } = ded;
                if (!deductAmt || deductAmt <= 0) continue;

                // Fetch active loans for borrower
                const { results: activeLoans } = await context.env.DB.prepare(
                    "SELECT * FROM loans WHERE userId = ? AND borrowerId = ? AND remainingAmount > 0 ORDER BY date ASC, created_at ASC"
                ).bind(storeId, borrowerId).all();

                let remainingToDeduct = deductAmt;
                for (const loan of activeLoans) {
                    if (remainingToDeduct <= 0) break;

                    let deductionFromThisLoan = 0;
                    let newRemaining = 0;

                    if (loan.remainingAmount >= remainingToDeduct) {
                        deductionFromThisLoan = remainingToDeduct;
                        newRemaining = loan.remainingAmount - remainingToDeduct;
                        remainingToDeduct = 0;
                    } else {
                        deductionFromThisLoan = loan.remainingAmount;
                        newRemaining = 0;
                        remainingToDeduct -= loan.remainingAmount;
                    }

                    // Update the loan's remainingAmount
                    await context.env.DB.prepare(
                        "UPDATE loans SET remainingAmount = ? WHERE id = ?"
                    ).bind(newRemaining, loan.id).run();
                }

                // Query total remaining debt after updates
                const totalDebtResult = await context.env.DB.prepare(
                    "SELECT SUM(remainingAmount) as total FROM loans WHERE userId = ? AND borrowerId = ? AND remainingAmount > 0"
                ).bind(storeId, borrowerId).first();
                const remainingDebtAfter = totalDebtResult ? (totalDebtResult.total || 0) : 0;

                // Save deduction record
                const deductionId = crypto.randomUUID();
                await context.env.DB.prepare(
                    `INSERT INTO loan_deductions (id, buyId, borrowerType, borrowerId, amount, remainingDebtAfter, userId)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`
                ).bind(deductionId, id, borrowerType, borrowerId, deductAmt, remainingDebtAfter, storeId).run();
            }
        }
        
        // --- Audit Logging ---
        context.waitUntil?.(recordAuditLog(context, {
            action: isUpdate ? 'UPDATE_BUY' : 'CREATE_BUY',
            entityType: 'buys',
            entityId: id,
            oldData: isUpdate ? existingRecord : null,
            newData: { ...buyData, id }
        }));

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /buys Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);
