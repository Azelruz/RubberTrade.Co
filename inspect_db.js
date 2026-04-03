import { execSync } from 'child_process';

try {
    const cmd = `npx wrangler d1 execute rubber-latex-db --command="SELECT * FROM farmers;" --remote --json`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    const data = JSON.parse(output);
    console.log(JSON.stringify(data[0].results, null, 2));
} catch (e) {
    console.error(e.stdout || e.message);
}
