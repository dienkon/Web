export function parseRoomCode(input: string): string | null {
  let value = input.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const parts = new URL(value).pathname.split('/').filter(Boolean);
      if (parts.length !== 2 || !['join', 'room', 'meeting'].includes(parts[0])) return null;
      value = parts[1];
    } catch { return null; }
  }
  value = value.toUpperCase().replace(/^ROOM-/, '');
  return /^[A-Z0-9][A-Z0-9-]{2,63}$/.test(value) ? value : null;
}
