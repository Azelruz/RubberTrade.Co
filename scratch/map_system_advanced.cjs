const fs = require('fs');
const path = require('path');

const srcDir = 'd:/pond/Antigravity/Rubertrade-Co-Ltd/src';
const vaultBaseDir = 'D:/PonD_Azelruz/AzelRuz/Antigravity/Rubbertrade.Co.LTD/Structure';

const tables = [
    'farmers', 'staff', 'employees', 'factories', 'trucks', 'farmer_types', 
    'buys', 'sells', 'wages', 'expenses', 'chemicals', 'promotions', 
    'settings', 'sync_queue'
];

// Mapping service functions to tables
const serviceToTable = {
    'fetchFarmers': ['farmers'],
    'addFarmer': ['farmers'],
    'fetchBuys': ['buys'],
    'fetchBuyRecords': ['buys'],
    'fetchBuyHistory': ['buys'],
    'addBuyRecord': ['buys'],
    'fetchSellRecords': ['sells'],
    'fetchSellHistory': ['sells'],
    'addSellRecord': ['sells'],
    'fetchEmployees': ['employees'],
    'addEmployee': ['employees'],
    'fetchStaff': ['staff'],
    'addStaff': ['staff'],
    'fetchFactories': ['factories'],
    'addFactory': ['factories'],
    'fetchTrucks': ['trucks'],
    'addTruck': ['trucks'],
    'fetchExpenses': ['expenses'],
    'addExpense': ['expenses'],
    'fetchWages': ['wages'],
    'addWage': ['wages'],
    'addBulkWages': ['wages'],
    'fetchPromotions': ['promotions'],
    'addPromotion': ['promotions'],
    'fetchChemicalUsage': ['chemicals'],
    'addChemicalUsage': ['chemicals'],
    'deleteChemicalUsage': ['chemicals'],
    'getSettings': ['settings'],
    'updateSettingsAPI': ['settings'],
    'updateDailyPriceAPI': ['settings'],
    'fetchMemberTypes': ['farmer_types'],
    'addMemberType': ['farmer_types'],
    'deleteMemberType': ['farmer_types'],
    'fetchDashboardData': ['dashboard_cache', 'buys', 'sells'], // Dashboard uses multiple
    'adminExportTable': (table) => table,
    'adminImportTable': (table) => table,
};

const results = {};

function getAllFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const allFiles = getAllFiles(srcDir);

allFiles.forEach(filePath => {
    const relPath = path.relative(srcDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 1. Find Imports
    const imports = [];
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        let imp = match[1];
        if (imp.startsWith('.')) {
            const resolved = path.normalize(path.join(path.dirname(relPath), imp)).replace(/\\/g, '/');
            const potentialPaths = [resolved, resolved + '.js', resolved + '.jsx', resolved + '/index.js', resolved + '/index.jsx'];
            for (const p of potentialPaths) {
                if (fs.existsSync(path.join(srcDir, p))) {
                    imports.push(p);
                    break;
                }
            }
        }
    }
    
    // 2. Find Direct DB Usage
    const dbUsage = [];
    tables.forEach(table => {
        const tableRegex = new RegExp(`db\\.${table}|db\\[['"]${table}['"]\\]`, 'g');
        if (tableRegex.test(content)) {
            dbUsage.push(table);
        }
    });

    // 3. Find Indirect Service Usage
    Object.keys(serviceToTable).forEach(func => {
        const funcRegex = new RegExp(`\\b${func}\\(`, 'g');
        if (funcRegex.test(content)) {
            const mapped = serviceToTable[func];
            if (Array.isArray(mapped)) {
                mapped.forEach(t => dbUsage.push(t));
            } else if (typeof mapped === 'function') {
               // Dynamic mapping like adminExportTable(table) might need more regex, skipping for now
            }
        }
    });
    
    results[relPath] = {
        imports: [...new Set(imports)],
        dbUsage: [...new Set(dbUsage)],
        content: content
    };
});

// Final Mapping cleanup and backlinks
Object.keys(results).forEach(file => {
    results[file].importedBy = [];
});
Object.keys(results).forEach(file => {
    results[file].imports.forEach(imp => {
        if (results[imp]) results[imp].importedBy.push(file);
    });
});

// GENERATE OBSIDIAN NOTES
const codeDir = path.join(vaultBaseDir, 'Code');
const dbDir = path.join(vaultBaseDir, 'Database');
if (!fs.existsSync(codeDir)) fs.mkdirSync(codeDir, { recursive: true });
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const tableSchema = {
    farmers: 'id, name, fscId, phone, userId, updated_at',
    staff: 'id, name, phone, userId',
    employees: 'id, name, farmerId, userId',
    factories: 'id, name, code, userId',
    trucks: 'id, plateNo, factoryId, userId',
    farmer_types: 'id, name, bonus, userId',
    buys: 'id, date, farmerId, farmerName, status, created_at, userId',
    sells: 'id, date, factoryId, buyerName, userId',
    wages: 'id, date, staffId, type, status, userId',
    expenses: 'id, date, title, category, userId',
    chemicals: 'id, date, totalFreshWeight, userId',
    promotions: 'id, title, isActive, userId',
    settings: 'key, value, userId',
    dashboard_cache: 'id',
    sync_queue: '++uuid, type, action, payload, status, retryCount, createdAt'
};

function formatNoteName(relPath) { return relPath.replace(/\//g, '_').replace(/\.jsx?$/, ''); }

Object.keys(results).forEach(relPath => {
    const data = results[relPath];
    const fileName = path.basename(relPath);
    const noteName = formatNoteName(relPath);
    
    let content = `# ${fileName}\n\n`;
    content += `**Path**: \`${relPath}\`\n`;
    content += `**Local Link**: [Open File](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/src/${relPath})\n\n`;
    
    content += `## 📝 Summary\n`;
    content += `*(Auto-generated)*: This file manages ${fileName.split('.')[0]} logic within the system.\n\n`;

    content += `## 🔄 Data Flow\n`;
    if (data.dbUsage.length > 0) {
        content += `- **Input/UI**: User interacts with ${fileName}.\n`;
        content += `- **Service**: Calls relevant functions in [[services_apiService]].\n`;
        content += `- **Local Storage**: Data is persisted to [[Database_${data.dbUsage[0]}]] via Dexie (Offline-first).\n`;
        content += `- **Cloud Sync**: [[services_syncService]] periodically pushes from \`sync_queue\` to Cloudflare D1/Supabase.\n`;
    } else {
        content += `- This is a structural or UI component with no direct data lifecycle management.\n`;
    }
    
    content += `\n## 🔗 Connections\n\n`;
    content += `### Imports (Outgoing)\n`;
    if (data.imports.length > 0) data.imports.forEach(imp => content += `- [[${formatNoteName(imp)}]]\n`);
    else content += `- No internal imports.\n`;
    
    content += `\n### Imported By (Backlinks)\n`;
    if (data.importedBy.length > 0) data.importedBy.forEach(impBy => content += `- [[${formatNoteName(impBy)}]]\n`);
    else content += `- Not imported by other internal files.\n`;
    
    content += `\n### 🗄️ Database Usage (Deep Linked)\n`;
    if (data.dbUsage.length > 0) data.dbUsage.forEach(table => content += `- [[Database_${table}]]\n`);
    else content += `- No database access detected.\n`;
    
    content += `\n## 💻 Source Code\n\n`;
    const ext = fileName.split('.').pop();
    content += `\`\`\`${ext === 'jsx' ? 'javascript' : ext}\n${data.content}\n\`\`\`\n`;
    
    fs.writeFileSync(path.join(codeDir, `${noteName}.md`), content);
});

// Database and Index generation (similar logic)
Object.keys(tableSchema).forEach(table => {
    const noteName = `Database_${table}`;
    let content = `# Table: ${table}\n\n**Schema**: \`${tableSchema[table]}\`\n\n## 🔄 Data Flow\n- **Write**: Initiated by pages via \`apiService\`. Saved to Dexie locally.\n- **Sync**: Picked up by \`syncService\` if online.\n- **Read**: \`apiService\` reads from API (online) or fallback to this table (offline).\n\n## Used By\n`;
    const usedBy = Object.keys(results).filter(file => results[file].dbUsage.includes(table));
    if (usedBy.length > 0) usedBy.forEach(file => content += `- [[${formatNoteName(file)}]]\n`);
    else content += `- No direct usage.\n`;
    fs.writeFileSync(path.join(dbDir, `${noteName}.md`), content);
});

// Master Index
let indexContent = `# RubberTrade System Map\n\n## 🏗️ Architecture Layers\n\n`;
const cats = { Pages: 'pages/', Components: 'components/', Services: 'services/', Utils: 'utils/', Contexts: 'context/' };
Object.entries(cats).forEach(([label, prefix]) => {
    indexContent += `### ${label}\n`;
    Object.keys(results).sort().filter(p => p.startsWith(prefix)).forEach(p => indexContent += `- [[${formatNoteName(p)}]]\n`);
    indexContent += `\n`;
});
indexContent += `## 🗄️ Database\n`;
Object.keys(tableSchema).sort().forEach(t => indexContent += `- [[Database_${t}]]\n`);
fs.writeFileSync(path.join(vaultBaseDir, '00_System_Map.md'), indexContent);

console.log('Mapping completed with Data Flow and Deep Linking.');
