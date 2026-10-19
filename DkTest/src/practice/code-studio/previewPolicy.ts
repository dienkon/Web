// Only public asset CDNs may load code/styles. Never include 'self': srcdoc
// inherits the app's base URL even though its sandbox has an opaque origin.
const codeCdns = 'https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com';
const styleCdns = `${codeCdns} https://fonts.googleapis.com`;
const fonts = 'data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net';
export const PREVIEW_CSP = `default-src 'none'; script-src 'unsafe-inline' data: blob: ${codeCdns}; style-src 'unsafe-inline' ${styleCdns}; img-src data: blob: https:; font-src ${fonts}; connect-src ${codeCdns}; worker-src blob:; media-src data: blob: https:; frame-src 'none'; form-action 'none'; base-uri 'none'`;
export const CAPTURE_CSP = `default-src 'none'; script-src 'none'; style-src 'unsafe-inline' ${styleCdns}; img-src data: blob: https:; font-src ${fonts}; frame-src about:; form-action 'none'; base-uri 'none'`;

export function setPreviewPolicy(doc: Document) {
  doc.querySelectorAll('meta[http-equiv]').forEach(node => {
    if (node.getAttribute('http-equiv')?.toLowerCase() === 'content-security-policy') node.remove();
  });
  const csp = doc.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy'; csp.content = PREVIEW_CSP;
  doc.head.prepend(csp);
}

/** Stored website snapshots also need policy updates; no Firebase write occurs. */
export function refreshPreviewPolicy(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  setPreviewPolicy(doc);
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}
