import { getNowByTimezone } from './_utils.js';

export async function generateNextId(db, table, format, stationCode, userId, nonce = '', offset = 0, timezone = 'Asia/Bangkok') {
    // 1. Get current date parts adjusted to user timezone
    const thaiNow = getNowByTimezone(timezone);
    const YYYY = thaiNow.getFullYear().toString();
    const MM = (thaiNow.getMonth() + 1).toString().padStart(2, '0');
    const DD = thaiNow.getDate().toString().padStart(2, '0');

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

    // 3. SINGLE-QUERY ATOMIC UPSERT
    // This query handles both initialization (if counter missing) and incrementing in one atomic step.
    // It uses a subquery to find the MAX existing sequence only if the row doesn't exist yet.
    let nextSeq = 1;

    try {
        const sql = `
            INSERT INTO counters (table_name, id_prefix, userId, last_seq) 
            VALUES (
                ?, ?, ?, 
                (SELECT COALESCE(MAX(CAST(substr(id, ?, ?) AS INTEGER)), 0) FROM ${table} WHERE id LIKE ? AND userId = ?) + 1
            )
            ON CONFLICT(table_name, id_prefix, userId) 
            DO UPDATE SET last_seq = last_seq + 1, updated_at = CURRENT_TIMESTAMP
            RETURNING last_seq
        `;

        const result = await db.prepare(sql).bind(
            table, prefix, userId, 
            prefix.length + 1, seqLen, prefix + '%', userId
        ).first();

        if (result && result.last_seq) {
            nextSeq = result.last_seq;
        }
    } catch (err) {
        console.error("[ID_UTILS] Atomic counter failed:", err.message);
        // Fallback to legacy logic if counters table is missing or query fails
        const legacySql = `SELECT id FROM ${table} WHERE id LIKE ? AND userId = ? ORDER BY id DESC LIMIT 1`;
        const { results } = await db.prepare(legacySql).bind(prefix + '%', userId).all();
        
        if (results && results.length > 0) {
            const lastId = results[0].id;
            const possibleSeqPart = lastId.substring(prefix.length, prefix.length + seqLen);
            const parsedSeq = parseInt(possibleSeqPart, 10);
            if (!isNaN(parsedSeq)) nextSeq = parsedSeq + 1 + offset;
        } else {
            nextSeq = 1 + offset;
        }
    }

    // 4. Format the final ID
    const nextSeqStr = nextSeq.toString().padStart(seqLen, '0');
    let finalId = prefix + nextSeqStr + suffix;
    
    // 5. Append short nonce if provided (6-character hex for 1 in 16.7M uniqueness)
    if (nonce) {
        const shortNonce = nonce.length > 6 ? nonce.substring(0, 6) : nonce;
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

