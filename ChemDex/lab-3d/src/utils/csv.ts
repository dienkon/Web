export function csvCell(value: string | number | null | undefined): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value !== 'string' || !value) return '';
  // Keep user-supplied labels as text in spreadsheet readers.
  const text = /^[\s\uFEFF]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + text.replaceAll('"', '""') + '"';
}
