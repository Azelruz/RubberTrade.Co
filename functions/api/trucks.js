export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare('SELECT * FROM trucks ORDER BY created_at DESC').all();
        return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    try {
        const body = await request.json();
        const { payload } = body;
        const { id, licensePlate, chassisNumber, brand, model, prbExpiry } = payload;

        await env.DB.prepare(`
            INSERT INTO trucks (id, licensePlate, chassisNumber, brand, model, prbExpiry)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                licensePlate = excluded.licensePlate,
                chassisNumber = excluded.chassisNumber,
                brand = excluded.brand,
                model = excluded.model,
                prbExpiry = excluded.prbExpiry
        `).bind(id, licensePlate, chassisNumber, brand, model, prbExpiry).run();

        return new Response(JSON.stringify({ status: 'success', id }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
