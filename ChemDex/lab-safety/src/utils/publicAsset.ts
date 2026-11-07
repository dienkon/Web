/** Keep public files relative to the app when it is hosted in a subdirectory. */
export function publicAsset(path: string): string {
  return `${import.meta.env?.BASE_URL ?? './'}${path.replace(/^\/+/, '')}`;
}
