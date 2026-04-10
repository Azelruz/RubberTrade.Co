import Dexie from 'dexie';

// Create a new Dexie database instance
export const db = new Dexie('RubertradeOfflineDB');

// Define the database schema
// ++id means auto-incremented primary key for local queue
// Other id fields (like farmer's id) are standard keys because they are UUIDs from backend.
db.version(1).stores({
    // Core Data
    farmers: 'id, name, fscId, phone, userId, updated_at',
    staff: 'id, name, phone, userId',
    employees: 'id, name, farmerId, userId',
    factories: 'id, name, code, userId',
    trucks: 'id, plateNo, factoryId, userId',
    farmer_types: 'id, name, bonus, userId',
    
    // Transactions
    buys: 'id, date, farmerId, farmerName, status, created_at, userId',
    sells: 'id, date, factoryId, buyerName, userId',
    wages: 'id, date, staffId, type, status, userId',
    expenses: 'id, date, title, category, userId',
    
    // Misc
    chemicals: 'id, date, totalFreshWeight, userId',
    promotions: 'id, title, isActive, userId',
    settings: 'key, value, userId',
    dashboard_cache: 'id', // Just holds { id: 'latest', data: { ... } }

    // Sync Queue - The most important table for offline writes
    sync_queue: '++uuid, type, action, payload, status, createdAt'
});

export default db;
