const fs = require('fs');
const path = require('path');

const srcDir = 'd:/pond/Antigravity/Rubertrade-Co-Ltd/src';
const tables = [
    'farmers', 'staff', 'employees', 'factories', 'trucks', 'farmer_types', 
    'buys', 'sells', 'wages', 'expenses', 'chemicals', 'promotions', 
    'settings', 'sync_queue'
];

const results = {};

function getAllFiles(dir, fileList = []) {
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
            // Try to add extension
            const potentialPaths = [resolved, resolved + '.js', resolved + '.jsx', resolved + '/index.js', resolved + '/index.jsx'];
            for (const p of potentialPaths) {
                if (fs.existsSync(path.join(srcDir, p))) {
                    imports.push(p);
                    break;
                }
            }
        }
    }
    
    // 2. Find DB Usage
    const dbUsage = [];
    tables.forEach(table => {
        // Look for db.table or db['table'] or db["table"]
        const tableRegex = new RegExp(`db\\.${table}|db\\[['"]${table}['"]\\]`, 'g');
        if (tableRegex.test(content)) {
            dbUsage.push(table);
        }
    });
    
    results[relPath] = {
        imports: [...new Set(imports)],
        dbUsage: [...new Set(dbUsage)],
        content: content
    };
});

// Calculate Backlinks (Imported By)
Object.keys(results).forEach(file => {
    results[file].importedBy = [];
});

Object.keys(results).forEach(file => {
    results[file].imports.forEach(imp => {
        if (results[imp]) {
            results[imp].importedBy.push(file);
        }
    });
});

fs.writeFileSync('d:/pond/Antigravity/Rubertrade-Co-Ltd/scratch/system_mapping.json', JSON.stringify(results, null, 2));
console.log('Mapping completed.');
