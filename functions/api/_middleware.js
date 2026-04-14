export async function onRequest(context) {
    // 1. Handle Preflight (OPTIONS) requests
    if (context.request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
                "Access-Control-Max-Age": "86400", // Cache for 24 hours
            },
        });
    }

    // 2. Procced to the actual handler
    const response = await context.next();
    
    // 3. Clone response and ensure CORS headers are present on the final result
    // Note: Some handlers in _utils.js already add these, but we ensure consistency here.
    const newHeaders = new Headers(response.headers);
    if (!newHeaders.has("Access-Control-Allow-Origin")) {
        newHeaders.set("Access-Control-Allow-Origin", "*");
    }
    if (!newHeaders.has("Access-Control-Allow-Methods")) {
        newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    }
    if (!newHeaders.has("Access-Control-Allow-Headers")) {
        newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}
