// Retain the public route for existing clients. Chains now come from the same
// sourced local catalog as the browser, without an API key or unverified AI output.
import catalog from '../../../shared/reaction-catalog.generated.json';
import { createCatalogIndex, solveCatalogRequest, type ReactionCatalog } from '../../../shared/chemistry/reaction-catalog.mjs';

const index = createCatalogIndex(catalog as ReactionCatalog);
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: 'JSON không hợp lệ.' }); }
  }
  if (!body || !['analyze', 'generate'].includes(body.action)) return res.status(400).json({ error: 'action phải là analyze hoặc generate.' });
  const result = solveCatalogRequest(index, body);
  return res.status(result.status === 'invalid' ? 400 : 200).json(result);
}
