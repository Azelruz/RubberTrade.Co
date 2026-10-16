export async function onRequest(context) {
    const url = new URL(context.request.url);
    const pathname = url.pathname;

    // Fast return for static assets and API routes
    if (
        pathname.startsWith('/api/') || 
        pathname.startsWith('/assets/') || 
        pathname.endsWith('.js') || 
        pathname.endsWith('.css') || 
        pathname.endsWith('.png') || 
        pathname.endsWith('.jpg') || 
        pathname.endsWith('.jpeg') || 
        pathname.endsWith('.svg') || 
        pathname.endsWith('.ico') || 
        pathname.endsWith('.webmanifest') || 
        pathname.endsWith('.json') || 
        pathname.endsWith('.woff2') || 
        pathname.endsWith('.ttf')
    ) {
        return context.next();
    }

    const isMemberPortal = pathname === '/member-portal' || pathname.startsWith('/member-portal/');
    const isFarmerPlot = pathname === '/farmer-plot' || pathname.startsWith('/farmer-plot/');

    if (isMemberPortal || isFarmerPlot) {
        // Fetch static index.html from ASSETS
        let response = null;
        if (context.env?.ASSETS) {
            try {
                response = await context.env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), {
                    headers: context.request.headers,
                    method: 'GET'
                }));
            } catch (e) {
                console.error('ASSETS fetch index.html failed:', e);
            }
        }

        if (!response || !response.ok) {
            response = await context.next();
        }

        const query = url.search;
        const manifestUrl = isMemberPortal 
            ? `/api/member_portal/manifest${query}`
            : `/api/farmer_plot/manifest${query}`;
            
        const appTitle = isMemberPortal ? 'บัตรสมาชิก' : 'สวนยาง';
        const pageTitle = isMemberPortal ? 'บัตรสมาชิกและสมุดเงินฝากดิจิทัล' : 'ข้อมูลแปลงสวนยางพารา';

        return new HTMLRewriter()
            .on('link[rel="manifest"]', {
                element(element) {
                    element.setAttribute('href', manifestUrl);
                }
            })
            .on('title', {
                element(element) {
                    element.setInnerContent(pageTitle);
                }
            })
            .on('meta[name="apple-mobile-web-app-title"]', {
                element(element) {
                    element.setAttribute('content', appTitle);
                }
            })
            .on('head', {
                element(element) {
                    element.append(`<meta name="apple-mobile-web-app-title" content="${appTitle}">`, { html: true });
                }
            })
            .transform(response);
    }

    return context.next();
}
