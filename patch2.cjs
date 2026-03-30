const fs = require('fs');
const path = 'packages/web/src/app/api/auth/callback/notion/route.ts';
let content = fs.readFileSync(path, 'utf8');

const oldInterface = `interface NotionTokenResponse {
    access_token: string;
    refresh_token?: string;
    workspace_name?: string | null;
    workspace_icon?: string | null;
    owner?: {
        type: string;
        user?: {
            name?: string;
        };
    };
}`;

const newInterface = `interface NotionTokenResponse {
    access_token: string;
    refresh_token?: string;
    workspace_name?: string | null;
    workspace_icon?: string | null;
    owner?: { type: "user"; user: { name?: string } } | { type: "bot" };
}`;

content = content.replace(oldInterface, newInterface);

const oldUserName = 'const userName = owner?.type === "user" ? owner.user?.name : undefined;';
const newUserName = 'const userName = owner?.type === "user" ? owner.user.name : undefined;';

content = content.replace(oldUserName, newUserName);

fs.writeFileSync(path, content, 'utf8');
console.log('Patch 2 applied successfully.');
