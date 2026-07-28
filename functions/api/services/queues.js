import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function initTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS service_queues (
            id TEXT PRIMARY KEY,
            service_no TEXT NOT NULL,
            farmer_id TEXT,
            customer_name TEXT NOT NULL,
            phone TEXT,
            service_id TEXT,
            service_name TEXT,
            unit_type TEXT,
            unit_price REAL DEFAULT 0,
            quantity REAL DEFAULT 1,
            total_amount REAL DEFAULT 0,
            appointment_date TEXT,
            staff_id TEXT,
            staff_name TEXT,
            location_note TEXT,
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'unpaid',
            payment_method TEXT,
            paid_at TEXT,
            userId TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
}

async function handleGet(context) {
    try {
        await initTable(context.env.DB);
        const storeId = context.user?.storeId || 'DEFAULT_STORE';
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM service_queues WHERE userId = ? ORDER BY created_at DESC"
        ).bind(storeId).all();
        return jsonResponse(results || []);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        await initTable(context.env.DB);
        const body = await context.request.json();
        const payload = body.payload || body;
        const id = payload.id || crypto.randomUUID();
        const storeId = context.user?.storeId || 'DEFAULT_STORE';
        
        const service_no = payload.service_no !== undefined ? payload.service_no : null;
        const farmer_id = payload.farmer_id !== undefined ? payload.farmer_id : null;
        const customer_name = payload.customer_name !== undefined ? payload.customer_name : null;
        const phone = payload.phone !== undefined ? payload.phone : null;
        const service_id = payload.service_id !== undefined ? payload.service_id : null;
        const service_name = payload.service_name !== undefined ? payload.service_name : null;
        const unit_type = payload.unit_type !== undefined ? payload.unit_type : null;
        const unit_price = payload.unit_price !== undefined ? Number(payload.unit_price) : null;
        const quantity = payload.quantity !== undefined ? Number(payload.quantity) : null;
        const total_amount = payload.total_amount !== undefined ? Number(payload.total_amount) : null;
        const appointment_date = payload.appointment_date !== undefined ? payload.appointment_date : null;
        const staff_id = payload.staff_id !== undefined ? payload.staff_id : null;
        const staff_name = payload.staff_name !== undefined ? payload.staff_name : null;
        const location_note = payload.location_note !== undefined ? payload.location_note : null;
        const status = payload.status !== undefined ? payload.status : null;
        const payment_status = payload.payment_status !== undefined ? payload.payment_status : null;
        const payment_method = payload.payment_method !== undefined ? payload.payment_method : null;
        const paid_at = payload.paid_at !== undefined ? payload.paid_at : null;

        await context.env.DB.prepare(`
            INSERT INTO service_queues (
                id, service_no, farmer_id, customer_name, phone, service_id, service_name,
                unit_type, unit_price, quantity, total_amount, appointment_date,
                staff_id, staff_name, location_note, status, payment_status, payment_method, paid_at, userId
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                service_no = COALESCE(excluded.service_no, service_queues.service_no),
                farmer_id = COALESCE(excluded.farmer_id, service_queues.farmer_id),
                customer_name = COALESCE(excluded.customer_name, service_queues.customer_name),
                phone = COALESCE(excluded.phone, service_queues.phone),
                service_id = COALESCE(excluded.service_id, service_queues.service_id),
                service_name = COALESCE(excluded.service_name, service_queues.service_name),
                unit_type = COALESCE(excluded.unit_type, service_queues.unit_type),
                unit_price = COALESCE(excluded.unit_price, service_queues.unit_price),
                quantity = COALESCE(excluded.quantity, service_queues.quantity),
                total_amount = COALESCE(excluded.total_amount, service_queues.total_amount),
                appointment_date = COALESCE(excluded.appointment_date, service_queues.appointment_date),
                staff_id = COALESCE(excluded.staff_id, service_queues.staff_id),
                staff_name = COALESCE(excluded.staff_name, service_queues.staff_name),
                location_note = COALESCE(excluded.location_note, service_queues.location_note),
                status = COALESCE(excluded.status, service_queues.status),
                payment_status = COALESCE(excluded.payment_status, service_queues.payment_status),
                payment_method = COALESCE(excluded.payment_method, service_queues.payment_method),
                paid_at = COALESCE(excluded.paid_at, service_queues.paid_at),
                userId = COALESCE(excluded.userId, service_queues.userId)
        `).bind(
            id, service_no, farmer_id, customer_name, phone, service_id, service_name,
            unit_type, unit_price, quantity, total_amount, appointment_date,
            staff_id, staff_name, location_note, status, payment_status, payment_method, paid_at, storeId
        ).run();

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);

async function handleDelete(context) {
    try {
        await initTable(context.env.DB);
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse('Missing ID');

        const storeId = context.user?.storeId || 'DEFAULT_STORE';
        await context.env.DB.prepare("DELETE FROM service_queues WHERE id = ? AND userId = ?")
            .bind(id, storeId).run();
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
