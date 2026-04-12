export async function generateNextId(db, table, format, stationCode, userId) {
    // 1. Get current date parts
    const now = new Date();
    const YYYY = now.getFullYear().toString();
    const MM = (now.getMonth() + 1).toString().padStart(2, '0');
    const DD = now.getDate().toString().padStart(2, '0');

    // 2. Prepare prefix for search (everything before the {SEQ})
    // Also replace other placeholders
    let searchPattern = (format || '')
        .replace('{STATION}', stationCode || '')
        .replace('{YYYY}', YYYY)
        .replace('{MM}', MM)
        .replace('{DD}', DD);
    
    // Find the {SEQn} part
    const seqMatch = searchPattern.match(/\{SEQ(\d+)\}/);
    if (!seqMatch) return searchPattern; // No sequence, just return format

    const seqLen = parseInt(seqMatch[1], 10);
    const prefix = searchPattern.substring(0, seqMatch.index);
    const suffix = searchPattern.substring(seqMatch.index + seqMatch[0].length);

    // 3. Query DB for max ID with this prefix and THIS user
    // For D1, we use LIKE for prefix matching
    const sql = `SELECT id FROM ${table} WHERE id LIKE ? AND userId = ? ORDER BY id DESC LIMIT 1`;
    const { results } = await db.prepare(sql).bind(prefix + '%', userId).all();

    let nextSeq = 1;
    if (results && results.length > 0) {
        const lastId = results[0].id;
        // Attempt to extract the sequence part
        // We expect it to be at the same position as where {SEQn} was
        const possibleSeqPart = lastId.substring(prefix.length, prefix.length + seqLen);
        const lastSeq = parseInt(possibleSeqPart, 10);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
        } else {
            // Fallback: if parsing failed, maybe try to find numbers at the end?
            // But usually prefix matching with structured IDs works better.
        }
    }

    // 4. Format the final ID
    const nextSeqStr = nextSeq.toString().padStart(seqLen, '0');
    return prefix + nextSeqStr + suffix;
}

export async function getSetting(db, key, userId, defaultValue = '') {
    const { results } = await db.prepare("SELECT value FROM settings WHERE key = ? AND userId = ?").bind(key, userId).all();
    if (results && results.length > 0) return results[0].value;
    return defaultValue;
}

/**
 * Use the full original ID as the running part to prevent collisions
 */
export function extractRunningNumber(id) {
    if (!id) return null;
    return String(id);
}

/**
 * Formats an ID with a specific sequence number and format template
 */
export function formatIdUsingTemplate(format, stationCode, nextSeq, referenceDate = null) {
    const date = referenceDate || new Date();
    const YYYY = date.getFullYear().toString();
    const MM = (date.getMonth() + 1).toString().padStart(2, '0');
    const DD = date.getDate().toString().padStart(2, '0');

    let result = (format || '')
        .replace('{STATION}', stationCode || '')
        .replace('{YYYY}', YYYY)
        .replace('{MM}', MM)
        .replace('{DD}', DD);

    const seqMatch = result.match(/\{SEQ(\d+)\}/);
    if (seqMatch) {
        const seqLen = parseInt(seqMatch[1], 10);
        const prefix = result.substring(0, seqMatch.index);
        const suffix = result.substring(seqMatch.index + seqMatch[0].length);
        // Use full nextSeq string, padding only if it's shorter than required
        const nextSeqStr = String(nextSeq).padStart(seqLen, '0');
        result = prefix + nextSeqStr + suffix;
    }
    return result;
}

