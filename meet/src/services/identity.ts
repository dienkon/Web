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

export function saveRoomRecovery(room: string, state: unknown) {
  localStorage.setItem(`meetclass_recovery_${room.toUpperCase().replace(/^ROOM-/, '')}`, JSON.stringify(state));
}
export function getRoomRecovery(room: string): unknown {
  try { return JSON.parse(localStorage.getItem(`meetclass_recovery_${room.toUpperCase().replace(/^ROOM-/, '')}`) || 'null'); }
  catch { return undefined; }
}
