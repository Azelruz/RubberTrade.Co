const fs = require('fs');

async function main() {
    const config = fs.readFileSync('C:\\Users\\pond_\\AppData\\Roaming\\xdg.config\\.wrangler\\config\\default.toml', 'utf8');
    const tokenMatch = config.match(/oauth_token\s*=\s*"([^"]+)"/);
    const token = tokenMatch[1];
    const accountId = '2b00394b61f63fdb6d5b87d7fb2df0ff';
    const padangDbId = '2e7882b9-be8c-45a1-831c-704b0c0c8cae';

    const patchPayload = {
        deployment_configs: {
            preview: {
                d1_databases: {
                    DB: {
                        id: padangDbId
                    }
                },
                r2_buckets: {
                    BUCKET: {
                        name: "rubertrade-co-ltd-bucket"
                    }
                },
                ai_bindings: {
                    AI: {}
                },
                compatibility_date: "2024-03-12"
            },
            production: {
                d1_databases: {
                    DB: {
                        id: padangDbId
                    }
                },
                r2_buckets: {
                    BUCKET: {
                        name: "rubertrade-co-ltd-bucket"
                    }
                },
                ai_bindings: {
                    AI: {}
                },
                compatibility_date: "2024-03-12"
            }
        }
    };

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/rubertrade-padang`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchPayload)
    });

    const result = await res.json();
    console.log('Update result success:', result.success);
    if (!result.success) {
        console.error(JSON.stringify(result.errors, null, 2));
    } else {
        console.log('D1 Database for rubertrade-padang is now:', result.result.deployment_configs.production.d1_databases.DB.id);
    }
}

main().catch(console.error);
