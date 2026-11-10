export function getIdentityToken(): string {
  const key = 'meetclass_identity';
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    sessionStorage.setItem(key, token);
  }
  return token;
}

export const hostKey = (room: string) => `meetclass_host_${room.toUpperCase().replace(/^ROOM-/, '')}`;
export const getHostToken = (room: string) => localStorage.getItem(hostKey(room)) || undefined;

export function saveHostToken(room: string, token: string) {
  localStorage.setItem(hostKey(room), token);
}
