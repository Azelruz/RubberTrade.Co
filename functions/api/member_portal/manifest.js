export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const memberId = url.searchParams.get('id');
    const memberNo = url.searchParams.get('memberNo');
    let name = url.searchParams.get('name') || '';

    // Auto-fetch member or farmer name from D1 if not in query params
    if (!name && context.env?.DB && (memberId || memberNo)) {
        try {
            let row = memberId
                ? await context.env.DB.prepare("SELECT name FROM coop_members WHERE id = ?").bind(memberId).first()
                : await context.env.DB.prepare("SELECT name FROM coop_members WHERE memberNo = ?").bind(memberNo).first();

            if (!row && (memberId || memberNo)) {
                const target = memberId || memberNo;
                row = await context.env.DB.prepare(
                    "SELECT name FROM farmers WHERE id = ? OR phone = ? LIMIT 1"
                ).bind(target, target).first();
            }

            if (!row && (memberId || memberNo)) {
                const target = memberId || memberNo;
                row = await context.env.DB.prepare(
                    "SELECT name FROM employees WHERE id = ? OR phone = ? LIMIT 1"
                ).bind(target, target).first();
            }

            if (row?.name) name = row.name;
        } catch (e) {
            console.error('Error fetching member/farmer name for manifest:', e);
        }
    }

    const displayName = name ? `บัตรสมาชิก - ${name}` : 'บัตรสมาชิกดิจิทัล';
    const shortName = name ? `บัตร-${name.slice(0, 8)}` : 'บัตรสมาชิก';

    let targetUrl = '/member-portal';
    if (memberId) targetUrl += `?id=${encodeURIComponent(memberId)}`;
    else if (memberNo) targetUrl += `?memberNo=${encodeURIComponent(memberNo)}`;

    const manifest = {
        name: displayName,
        short_name: shortName,
        description: 'บัตรสมาชิกและสมุดเงินฝากดิจิทัล RubberTrade',
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
