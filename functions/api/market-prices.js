export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const since = url.searchParams.get('since');

    if (request.method === 'GET') {
        try {
            let query = 'SELECT * FROM market_prices';
            let params = [];
            
            if (since) {
                query += ' WHERE updated_at > ?';
                params.push(since);
            }
            
            query += ' ORDER BY date DESC LIMIT 100';
            
            const { results } = await db.prepare(query).bind(...params).all();
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

    if (request.method === 'POST') {
        try {
            const data = await request.json();
            const { date, price, note, source } = data;

            if (!date || !price) {
                return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const id = `mp_${Date.now()}`;
            await db.prepare(`
                INSERT INTO market_prices (id, date, price, note, source)
                VALUES (?, ?, ?, ?, ?)
            `).bind(id, date, price, note || '', source || 'factory').run();

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

    return new Response('Method not allowed', { status: 405 });
}
