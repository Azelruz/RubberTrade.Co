import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { username, password } = body;

        if (!username || !password) {
            return errorResponse('Username and password are required', 400);
        }

        // Query the user from D1
        const user = await context.env.DB.prepare(
            'SELECT id, username, password, role FROM users WHERE username = ?'
        ).bind(username).first();

        if (!user) {
            return errorResponse('Invalid credentials', 401);
        }

        // Simulating simple password check (In production, use bcrypt/argon2)
        if (user.password !== password) {
            return errorResponse('Invalid credentials', 401);
        }

        // Return user info (except password)
        const { password: _, ...userData } = user;
        
        return jsonResponse({
            status: 'success',
            user: userData
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}
