const fs = require('fs');
const path = require('path');

const mappingPath = 'd:/pond/Antigravity/Rubertrade-Co-Ltd/scratch/system_mapping.json';
const vaultBaseDir = 'D:/PonD_Azelruz/AzelRuz/Projects/RubberTrade/Structure';

if (!fs.existsSync(mappingPath)) {
    console.error('Mapping file not found.');
    process.exit(1);
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

// Directories
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

function formatNoteName(relPath) {
    return relPath.replace(/\//g, '_').replace(/\.jsx?$/, '');
}

// 1. Generate Code Notes
Object.keys(mapping).forEach(relPath => {
    const data = mapping[relPath];
    const noteName = formatNoteName(relPath);
    const fileName = path.basename(relPath);
    
    let content = `# ${fileName}\n\n`;
    content += `**Path**: \`${relPath}\`\n`;
    content += `**Local Link**: [Open File](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/src/${relPath})\n\n`;
    
    content += `## Summary\n`;
    content += `*(Auto-generated)*: This file is located in \`${path.dirname(relPath)}\` and handles logic related to ${fileName.split('.')[0]}.\n\n`;
    
    content += `## Connections\n\n`;
    content += `### Imports (Outgoing)\n`;
    if (data.imports.length > 0) {
        data.imports.forEach(imp => {
            content += `- [[${formatNoteName(imp)}]]\n`;
        });
    } else {
        content += `- No internal imports.\n`;
    }
    
    content += `\n### Imported By (Backlinks)\n`;
    if (data.importedBy.length > 0) {
        data.importedBy.forEach(impBy => {
            content += `- [[${formatNoteName(impBy)}]]\n`;
        });
    } else {
        content += `- Not imported by any other internal files.\n`;
    }
    
    content += `\n### Database Usage\n`;
    if (data.dbUsage.length > 0) {
        data.dbUsage.forEach(table => {
            content += `- [[Database_${table}]]\n`;
        });
    } else {
        content += `- No direct database access found.\n`;
    }
    
    content += `\n## Source Code\n\n`;
    const ext = fileName.split('.').pop();
    content += `\`\`\`${ext === 'jsx' ? 'javascript' : ext}\n${data.content}\n\`\`\`\n`;
    
    fs.writeFileSync(path.join(codeDir, `${noteName}.md`), content);
});

// 2. Generate Database Notes
Object.keys(tableSchema).forEach(table => {
    const noteName = `Database_${table}`;
    const columns = tableSchema[table];
    
    let content = `# Table: ${table}\n\n`;
    content += `**Description**: Local IndexedDB table managed by Dexie.\n\n`;
    
    content += `## Schema (Columns)\n`;
    content += `\`${columns}\`\n\n`;
    
    content += `## Used By (Code Files)\n`;
    const usedBy = Object.keys(mapping).filter(file => mapping[file].dbUsage.includes(table));
    if (usedBy.length > 0) {
        usedBy.forEach(file => {
            content += `- [[${formatNoteName(file)}]]\n`;
        });
    } else {
        content += `- No direct code usage detected (may be used dynamically).\n`;
    }
    
    fs.writeFileSync(path.join(dbDir, `${noteName}.md`), content);
});

// 3. Generate Master Index
let indexContent = `# RubberTrade System Map\n\n`;
indexContent += `## 🏗️ Architecture Layers\n\n`;

const categories = {
    Pages: [],
    Components: [],
    Services: [],
    Utils: [],
    Contexts: [],
    Misc: []
};

Object.keys(mapping).sort().forEach(relPath => {
    const noteName = formatNoteName(relPath);
    if (relPath.startsWith('pages/')) categories.Pages.push(noteName);
    else if (relPath.startsWith('components/')) categories.Components.push(noteName);
    else if (relPath.startsWith('services/')) categories.Services.push(noteName);
    else if (relPath.startsWith('utils/')) categories.Utils.push(noteName);
    else if (relPath.startsWith('context/')) categories.Contexts.push(noteName);
    else categories.Misc.push(noteName);
});

Object.keys(categories).forEach(cat => {
    indexContent += `### ${cat}\n`;
    categories[cat].forEach(note => {
        indexContent += `- [[${note}]]\n`;
    });
    indexContent += `\n`;
});

indexContent += `## 🗄️ Database Tables\n\n`;
Object.keys(tableSchema).sort().forEach(table => {
    indexContent += `- [[Database_${table}]]\n`;
});

fs.writeFileSync(path.join(vaultBaseDir, '00_System_Map.md'), indexContent);

console.log('Obsidian notes generated successfully.');
