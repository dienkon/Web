import { createHash } from 'node:crypto';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-zA-Z0-9_-]{32,128}$/.test(token);
}
