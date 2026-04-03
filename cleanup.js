import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath);
        } else {
            if (dirPath.endsWith('.jsx') || dirPath.endsWith('.js')) {
                let content = fs.readFileSync(dirPath, 'utf8');
                let changed = false;

                // Remove setupSheets and getScriptUrl imports
                if (content.match(/getScriptUrl/)) {
                    content = content.replace(/import {([^}]*?)getScriptUrl([^}]*?)} from '\.\.\/services\/apiService';/g, (match, p1, p2) => {
                        let inner = [p1, p2].join('').split(',').map(s=>s.trim()).filter(s=>s && s !== 'setupSheets' && s !== 'updateScriptUrl').join(', ');
                        if (!inner) return '';
                        return `import { ${inner} } from '../services/apiService';`;
                    });
                    
                    // Replace const isDemo = !getScriptUrl();
                    content = content.replace(/const isDemo = !getScriptUrl\(\);/g, 'const isDemo = false;');
                    
                    // Specific to Settings.jsx
                    if (dirPath.includes('Settings.jsx')) {
                        content = content.replace(/if \(!getScriptUrl\(\)\) \{[\s\S]*?toast\.success\('.*?\(Demo\)'\);[\s\S]*?return;[\s\S]*?\}/g, '');
                        content = content.replace(/} else if \(!getScriptUrl\(\)\) \{[\s\S]*?try \{ setDrcBonuses\(JSON\.parse\(demoDrc\)\); \} catch\(e\) \{\}[\s\S]*?\} else \{/g, '} else {');
                        content = content.replace(/if \(!getScriptUrl\(\)\) \{[\s\S]*?reset\(\{ factoryName: '.*?\(Demo\)'.*?\}\);[\s\S]*?\} else \{/g, '');
                        content = content.replace(/getScriptUrl\(\) \? getSettings\(\) : \{ status: 'success', data: \{\} \}/g, 'getSettings()');
                        content = content.replace(/scriptUrl: getScriptUrl\(\) \|\| ''/g, "scriptUrl: ''");
                        content = content.replace(/if \(!getScriptUrl\(\)\) \{[\s\S]*?const newStaff[\s\S]*?return;[\s\S]*?\}/g, '');
                    }

                    // Specific to Login.jsx
                    if (dirPath.includes('Login.jsx')) {
                         content = content.replace(/const \[apiSetupUrl, setApiSetupUrl\] = useState\(getScriptUrl\(\)\);/g, '');
                         content = content.replace(/const \[showSetup, setShowSetup\] = useState\(!getScriptUrl\(\)\);/g, 'const [showSetup, setShowSetup] = useState(false);');
                         content = content.replace(/if \(!getScriptUrl\(\) && username !== 'admin'\) \{[\s\S]*?toast\.error\('กรุณาตั้งค่าฐานข้อมูลก่อน'\);[\s\S]*?setShowSetup\(true\);[\s\S]*?return;[\s\S]*?\}/g, '');
                         content = content.replace(/\{!getScriptUrl\(\) && \([\s\S]*?ตั้งค่าฐานข้อมูลครั้งแรก[\s\S]*?\)\} /g, '');
                    }

                    changed = true;
                }
                
                if (changed) {
                    fs.writeFileSync(dirPath, content, 'utf8');
                    console.log(`Cleaned up ${dirPath}`);
                }
            }
        }
    });
}

walkDir('./src/pages');
console.log('Done cleaning up pages!');
