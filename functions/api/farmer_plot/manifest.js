export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const farmerId = url.searchParams.get('id');
    let name = url.searchParams.get('name') || '';

    // Auto-fetch farmer name from D1 if not in query params
    if (!name && context.env?.DB && farmerId) {
        try {
            const row = await context.env.DB.prepare("SELECT name FROM farmers WHERE id = ?").bind(farmerId).first();
            if (row?.name) name = row.name;
        } catch (e) {
            console.error('Error fetching farmer name for manifest:', e);
        }
    }

    const displayName = name ? `สวนยาง - ${name}` : 'ระบบแปลงสวนยางพารา';
    const shortName = name ? `สวน-${name.slice(0, 8)}` : 'สวนยาง';

    let targetUrl = '/farmer-plot';
    if (farmerId) targetUrl += `?id=${encodeURIComponent(farmerId)}`;

    const manifest = {
        name: displayName,
        short_name: shortName,
        description: 'ระบบแปลงสวนยางพารา RubberTrade',
        start_url: targetUrl,
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#065f46',
        icons: [
            {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
            },
            {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
            },
            {
                src: '/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png'
            }
        ]
    };

    return new Response(JSON.stringify(manifest), {
        headers: {
            'Content-Type': 'application/manifest+json; charset=utf-8',
            'Cache-Control': 'public, max-age=300'
        }
    });
}
