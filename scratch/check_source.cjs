const fs = require('fs');

async function check() {
    const config = fs.readFileSync('C:\\Users\\pond_\\AppData\\Roaming\\xdg.config\\.wrangler\\config\\default.toml', 'utf8');
    const tokenMatch = config.match(/oauth_token\s*=\s*"([^"]+)"/);
    const token = tokenMatch[1];
    const accountId = '2b00394b61f63fdb6d5b87d7fb2df0ff';

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/rubertrade-co-ltd`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
}

check().catch(console.error);
