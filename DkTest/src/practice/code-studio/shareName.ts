export function validShareName(name: unknown): name is string {
  return typeof name === 'string' && /^[a-z0-9](?:[a-z0-9-]{1,40}[a-z0-9])$/.test(name) && !['api','admin','practice','login','assets','settings','dkcode','www'].includes(name);
}
