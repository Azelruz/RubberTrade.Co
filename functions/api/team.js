import { jsonResponse, errorResponse, withAuth } from './_utils.js';

// GET: List all team members for the store
async function handleGet(context) {
    try {
        const storeId = context.user.storeId;
        // Get owner and all staff
        const { results } = await context.db.prepare(`
            SELECT id, email, username, role, created_at 
            FROM users 
            WHERE id = ? OR parentId = ?
            ORDER BY CASE WHEN role = 'owner' THEN 0 WHEN role = 'admin' THEN 1 ELSE 2 END ASC, created_at ASC
        `).bind(storeId, storeId).all();
        
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

// POST: Manage Team Members
async function handlePost(context) {
    try {
        if (context.user.role !== 'owner' && context.user.role !== 'super_admin') {
            return errorResponse('Only owners can manage team members', 403);
        }

        const body = await context.request.json();
        const { action, email, userId: targetUserId } = body;
        const storeId = context.user.storeId;

        // INVITE ACTION
        if (action === 'invite') {
            if (!email) return errorResponse('Email is required');
            const targetEmail = email.toLowerCase().trim();
            
            // Check quota
            const teamCount = await context.db.prepare("SELECT COUNT(*) as count FROM users WHERE parentId = ?").bind(storeId).first();
            if (teamCount.count >= context.user.maxStaffLimit) {
                return errorResponse(`Team limit reached (${context.user.maxStaffLimit}). Please upgrade your package.`);
            }

            // Check if user already exists
            let existing = await context.db.prepare("SELECT * FROM users WHERE email = ?").bind(targetEmail).first();
            
            if (existing) {
                if (existing.parentId && existing.parentId !== storeId) {
                    return errorResponse('User is already a member of another store');
                }
                if (existing.id === storeId) {
                    return errorResponse('Cannot invite yourself');
                }
                
                // Update existing user to be staff of this store
                await context.db.prepare("UPDATE users SET parentId = ?, role = 'staff' WHERE id = ?")
                    .bind(storeId, existing.id).run();
                return jsonResponse({ status: 'success', message: 'User added to team' });
            } else {
                // Pre-create placeholder record
                const tempId = `invited_${targetEmail}`;
                try {
                await context.db.prepare("INSERT INTO users (id, username, email, password, role, parentId) VALUES (?, ?, ?, ?, ?, ?)")
                    .bind(tempId, targetEmail.split('@')[0], targetEmail, 'invited', 'staff', storeId).run();
                } catch (err) {
                    if (err.message.includes('UNIQUE')) {
                        return errorResponse('Invitation for this email already exists');
                    }
                    throw err;
                }
                
                return jsonResponse({ status: 'success', message: 'Invitation record created' });
            }
        }

        // REMOVE ACTION
        if (action === 'remove') {
            if (!targetUserId) return errorResponse('User ID is required');
            
            // Cannot remove owner
            if (targetUserId === storeId) return errorResponse('Cannot remove the store owner');

            // Verify the user belongs to this store
            const userToRemove = await context.db.prepare("SELECT * FROM users WHERE id = ? AND parentId = ?").bind(targetUserId, storeId).first();
            if (!userToRemove) return errorResponse('User not found in your team');

            // If it was a placeholder, delete it. If real user, unbind it.
            if (targetUserId.startsWith('invited_')) {
                await context.db.prepare("DELETE FROM users WHERE id = ?").bind(targetUserId).run();
            } else {
                // Reset role to owner (so they become their own store owner again)
                await context.db.prepare("UPDATE users SET parentId = NULL, role = 'owner' WHERE id = ?").bind(targetUserId).run();
            }

            return jsonResponse({ status: 'success', message: 'Member removed from team' });
        }

        return errorResponse('Invalid action');
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
export const onRequestPost = withAuth(handlePost);
