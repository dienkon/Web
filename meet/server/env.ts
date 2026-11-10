import { existsSync } from 'node:fs';
// Keep deployment secrets in the server environment, never in the client bundle.
for (const file of ['../.env', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
