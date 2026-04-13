export async function generateNextId(db, table, format, stationCode, userId, nonce = '', offset = 0) {
    // 1. Get current date parts
    const now = new Date();
    const YYYY = now.getFullYear().toString();
    const MM = (now.getMonth() + 1).toString().padStart(2, '0');
    const DD = now.getDate().toString().padStart(2, '0');

    // 2. Prepare prefix for search (everything before the {SEQ})
    let searchPattern = (format || '')
        .replace('{STATION}', stationCode || '')
        .replace('{YYYY}', YYYY)
        .replace('{MM}', MM)
        .replace('{DD}', DD);
    
    // Find the {SEQn} part
    const seqMatch = searchPattern.match(/\{SEQ(\d+)\}/);
    if (!seqMatch) return searchPattern + (nonce ? '-' + nonce : '');

    const seqLen = parseInt(seqMatch[1], 10);
    const prefix = searchPattern.substring(0, seqMatch.index);
    const suffix = searchPattern.substring(seqMatch.index + seqMatch[0].length);

    // 3. Query DB for max ID with this prefix and THIS user
    const sql = `SELECT id FROM ${table} WHERE id LIKE ? AND userId = ? ORDER BY id DESC LIMIT 1`;
    const { results } = await db.prepare(sql).bind(prefix + '%', userId).all();

    let nextSeq = 1 + offset;
    if (results && results.length > 0) {
        const lastId = results[0].id;
        // Attempt to extract the sequence part (account for B-XXXXYYYY-#### format)
        const possibleSeqPart = lastId.substring(prefix.length, prefix.length + seqLen);
        const lastSeq = parseInt(possibleSeqPart, 10);
        if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1 + offset;
        }
    }

    // 4. Format the final ID
    const nextSeqStr = nextSeq.toString().padStart(seqLen, '0');
    let finalId = prefix + nextSeqStr + suffix;
    
    // 5. Append short nonce if provided to prevent strictly timed collisions
    if (nonce) {
        // Use only first 2 chars of nonce for brevity if it's a long string
        const shortNonce = nonce.length > 2 ? nonce.substring(0, 2) : nonce;
        finalId += '-' + shortNonce;
    }
    
    return finalId;
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

