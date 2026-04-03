import fs from 'fs';
import path from 'path';

const targetStr = 'sheetsService';
const replacementStr = 'apiService';

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath);
        } else {
            if ((dirPath.endsWith('.jsx') || dirPath.endsWith('.js')) && !dirPath.includes('apiService.js') && !dirPath.includes('sheetsService.js')) {
                let content = fs.readFileSync(dirPath, 'utf8');
                if (content.includes(targetStr)) {
                    let newContent = content.replaceAll(targetStr, replacementStr);
                    fs.writeFileSync(dirPath, newContent, 'utf8');
                    console.log(`Updated ${dirPath}`);
                }
            }
        }
    });
}

walkDir('./src');
console.log('Done!');
