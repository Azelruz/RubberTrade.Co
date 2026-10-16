const fs = require('fs');

async function main() {
    const config = fs.readFileSync('C:\\Users\\pond_\\AppData\\Roaming\\xdg.config\\.wrangler\\config\\default.toml', 'utf8');
    const tokenMatch = config.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (!tokenMatch) {
        console.error('No token found');
        return;
    }
    const token = tokenMatch[1];
    const accountId = '2b00394b61f63fdb6d5b87d7fb2df0ff';

    // 1. Get rubertrade-co-ltd configs
    const resMain = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/rubertrade-co-ltd`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const dataMain = await resMain.json();
    console.log('--- MAIN PROJECT CONFIGS ---');
    console.log(JSON.stringify(dataMain.result?.deployment_configs, null, 2));

    // 2. Get rubertrade-padang configs
    const resPadang = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/rubertrade-padang`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const dataPadang = await resPadang.json();
    console.log('--- PADANG PROJECT CONFIGS ---');
    console.log(JSON.stringify(dataPadang.result?.deployment_configs, null, 2));
}

main().catch(console.error);
