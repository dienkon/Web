import { uploadShareCover } from '../src/practice/code-studio/shareCoverUpload';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../server/firebaseAdmin.js', () => ({ adminDb: null, encodeFirestoreFields: (data: any) => Object.fromEntries(Object.entries(data).map(([key,value]) => [key, { stringValue: String(value) }])), decodeFirestoreDocument: (data: any) => data.testDocument }));
import { publishStudioShare, readStudioShare, renderStudioShareHtml } from '../server/codeStudioShares';
import { shareIdFromSlug, shareSlug, validatePublishedShare, PublishedShare } from '../src/practice/code-studio/publishedShare';
const image = 'data:image/jpeg;base64,' + Buffer.from([255,216,...Array(30).fill(0),255,217]).toString('base64');
const sample: PublishedShare = { version: 1, mode: 'website', title: 'Website của Điền ✨', description: 'Một trang web riêng', imageUrl: 'https://res.cloudinary.com/dys3wgutz/image/upload/v123/cover.jpg', payload: JSON.stringify({ version: 1, title: 'Website', html: '<!DOCTYPE html><html><body>Hello</body></html>' }), createdAt: '' };
afterEach(() => vi.unstubAllGlobals());
describe('Explicit Firebase publishing', () => {
  it('publishes without an image and renders metadata without an empty/broken image tag', async () => {
    const { imageUrl: _, ...withoutImage } = sample;
    const fetcher = vi.fn().mockResolvedValue(Response.json({})); vi.stubGlobal('fetch', fetcher);
    await publishStudioShare(withoutImage);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.fields).not.toHaveProperty('imageDataUrl'); expect(body.fields).not.toHaveProperty('imageUrl');
    const html = renderStudioShareHtml('<head><meta property="og:image" content="old"></head>', validatePublishedShare(withoutImage), 'https://app.test/s/test');
    expect(html).not.toContain('og:image'); expect(html).not.toContain('twitter:image'); expect(html).toContain('content="summary"');
  });
  it('keeps legacy JPEG shares readable but rejects base64 on new publications', async () => {
    const legacy = { ...sample, imageUrl: undefined, imageDataUrl: image };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ testDocument: legacy })));
    expect((await readStudioShare('0123456789abcdef'))?.imageDataUrl).toBe(image);
    await expect(publishStudioShare(legacy)).rejects.toThrow('Cloudinary');
  });
  it('uploads a cover to Cloudinary and stores only its URL in a new snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ secure_url: sample.imageUrl })).mockResolvedValueOnce(Response.json({})); vi.stubGlobal('fetch', fetcher);
    const imageUrl = await uploadShareCover(image);
    expect(fetcher.mock.calls[0][0]).toMatch(/^https:\/\/api.cloudinary.com\/v1_1\/[^/]+\/image\/upload$/);
    const form = fetcher.mock.calls[0][1].body as FormData;
    expect(form.get('file')).toBe(image); expect(form.get('upload_preset')).toBeTruthy();
    await publishStudioShare({ ...sample, imageUrl });
    const saved = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(saved.fields.imageUrl.stringValue).toBe(sample.imageUrl); expect(saved.fields).not.toHaveProperty('imageDataUrl');
    expect(renderStudioShareHtml('<head></head>', sample, 'https://app.test/s/test')).toContain(`content="${sample.imageUrl}"`);
  });
  it('rejects failed uploads and invalid provider image URLs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { message: 'Bad preset' } }, { status: 400 })));
    await expect(uploadShareCover(image)).rejects.toThrow('Cloudinary');
    for (const imageUrl of ['http://res.cloudinary.com/demo/image/upload/a.jpg','https://res.cloudinary.com.evil.test/demo/image/upload/a.jpg','javascript:alert(1)','https://res.cloudinary.com/demo/raw/upload/code.html']) expect(() => validatePublishedShare({ ...sample, imageUrl })).toThrow();
  });

  it('performs exactly one immutable create when publishing and returns a short titled path', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', fetcher);
    const result = await publishStudioShare(sample);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0][1].method).toBe('POST');
    expect(result.path).toMatch(/^\/s\/website-cua-dien\.[a-f0-9]{16}$/); expect(result.path).not.toContain('#');
    expect(shareIdFromSlug(result.path.split('/').at(-1)!)).toBe(result.id);
  });
  it('viewing a link and retrieving metadata never writes', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ testDocument: sample }), { status: 200 })); vi.stubGlobal('fetch', fetcher);
    const share = await readStudioShare('0123456789abcdef'); expect(share?.title).toBe(sample.title);
    expect(fetcher.mock.calls[0][1].method).toBeUndefined(); expect(fetcher.mock.calls).toHaveLength(1);
    const html = renderStudioShareHtml('<html><head><title>Old</title><meta property="og:title" content="Old"></head><body><div id="root"></div></body></html>', sample, 'https://example.test/s/site.0123456789abcdef', 'https://example.test/image.jpg');
    expect(html).toContain(`<title>${sample.title}</title>`); expect(html).toContain('summary_large_image'); expect(html).not.toContain('content="Old"');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not return a pretend link when rules deny publication', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    await expect(publishStudioShare(sample)).rejects.toThrow(/rules|Firebase/);
  });
  it('escapes title/metadata and rejects oversized or malformed snapshots', () => {
    expect(shareSlug('Điền & Bạn')).toBe('dien-ban'); expect(shareIdFromSlug('../invalid')).toBe('');
    const html = renderStudioShareHtml('<head></head>', { ...sample, title: '"><script>bad</script>' }, 'https://example.test', 'https://example.test/image.jpg');
    expect(html).not.toContain('<script>bad</script>');
    expect(() => validatePublishedShare({ ...sample, imageDataUrl: 'data:image/jpeg;base64,eA==' })).toThrow();
    expect(() => validatePublishedShare({ ...sample, payload: 'x'.repeat(700001) })).toThrow();
  });
});
