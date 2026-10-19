import { uploadShareCover } from '../src/practice/code-studio/shareCoverUpload';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../server/firebaseAdmin.js', () => ({ adminDb: null, adminAuth: { verifyIdToken: async (token: string) => { if (token === 'owner-token') return { uid: 'owner' }; if (token === 'other-token') return { uid: 'other' }; throw new Error('invalid'); } }, encodeFirestoreFields: (data: any) => data, decodeFirestoreDocument: (data: any) => data.fields }));
import { publishStudioShare, readStudioShare, renderStudioShareHtml } from '../server/codeStudioShares';
import { shareIdFromSlug, shareSlug, validatePublishedShare, PublishedShare } from '../src/practice/code-studio/publishedShare';
const image = 'data:image/jpeg;base64,' + Buffer.from([255,216,...Array(30).fill(0),255,217]).toString('base64');
const sample: PublishedShare & { projectId: string } = { version: 1, projectId: 'local-project', mode: 'website', title: 'Website của Điền ✨', description: 'Một trang web riêng', imageUrl: 'https://res.cloudinary.com/dys3wgutz/image/upload/v123/cover.jpg', payload: JSON.stringify({ version: 1, title: 'Website', html: '<!DOCTYPE html><html><body>Hello</body></html>' }), createdAt: '' };
const publish = (input: any = sample, token = 'owner-token') => publishStudioShare(input, token);
function firebase() {
  const documents = new Map<string, any>(); let revision = 0;
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const parsed = new URL(url), id = parsed.pathname.split('/').at(-1)!;
    if (init?.method === 'PATCH') {
      const old = documents.get(id);
      if ((parsed.searchParams.get('currentDocument.exists') === 'false' && old) || (parsed.searchParams.has('currentDocument.updateTime') && old?.updateTime !== parsed.searchParams.get('currentDocument.updateTime'))) return Response.json({}, { status: 412 });
      const doc = { ...JSON.parse(String(init.body)), updateTime: 'revision-' + ++revision }; documents.set(id, doc); return Response.json(doc);
    }
    return documents.has(id) ? Response.json(documents.get(id)) : Response.json({}, { status: 404 });
  });
  vi.stubGlobal('fetch', fetcher); return { documents, fetcher };
}
afterEach(() => vi.unstubAllGlobals());
describe('One owner-bound project share', () => {
  it('reuses the exact URL/document when title, payload, mode and cover change', async () => {
    const { documents, fetcher } = firebase();
    const first = await publish();
    const next = await publish({ ...sample, shareId: first.id, title: 'Tên mới', payload: JSON.stringify({ version: 1, title: 'Updated', html: '<!DOCTYPE html><body>Updated</body>' }), imageUrl: '' });
    expect(next.path).toBe(first.path); expect(next.id).toBe(first.id); expect(next.createdAt).toBe(first.createdAt);
    expect(documents.size).toBe(1); expect(fetcher.mock.calls.filter(([,init]) => init?.method === 'PATCH')).toHaveLength(2);
    expect((await readStudioShare(first.id))?.title).toBe('Tên mới'); expect((await readStudioShare(first.id))?.imageUrl).toBeUndefined();
    expect(next.path).toMatch(/^\/s\/website-cua-dien\.[a-f0-9]{16}$/); expect(shareIdFromSlug(next.path.split('/').at(-1)!)).toBe(first.id);
  });
  it('recovers the same ID after a lost response/local binding and separates projects', async () => {
    const { documents } = firebase(); const first = await publish(); const retry = await publish({ ...sample, title: 'Retry' });
    expect(retry.path).toBe(first.path);
    const copy = await publish({ ...sample, projectId: 'independent-copy' }); expect(copy.id).not.toBe(first.id); expect(documents.size).toBe(2);
  });
  it('rejects invalid identity, foreign links and incompatible ownership before writing', async () => {
    const { documents } = firebase(); const first = await publish();
    await expect(publish({ ...sample, shareId: first.id }, 'other-token')).rejects.toMatchObject({ status: 403 });
    await expect(publish(sample, 'bad-token')).rejects.toMatchObject({ status: 401 });
    await expect(publishStudioShare(sample)).rejects.toMatchObject({ status: 401 });
    documents.get(first.id).fields.ownerUid = 'someone-else';
    await expect(publish({ ...sample, shareId: first.id })).rejects.toMatchObject({ status: 403 });
    expect(documents.size).toBe(1);
  });
  it('uses a precondition to detect simultaneous updates instead of creating another link', async () => {
    const { fetcher } = firebase(); const first = await publish();
    fetcher.mockImplementationOnce(async () => Response.json({ fields: { ...sample, ownerUid: 'owner', projectId: sample.projectId, slug: 'website-cua-dien' }, updateTime: 'stale' }));
    await expect(publish({ ...sample, shareId: first.id })).rejects.toMatchObject({ status: 409 });
  });
  it('publishes without a cover and omits broken image metadata', async () => {
    const { documents } = firebase(); const { imageUrl: _, ...withoutImage } = sample; const result = await publish(withoutImage);
    const saved = documents.get(result.id).fields; expect(saved.imageUrl).toBeUndefined(); expect(saved.imageDataUrl).toBeUndefined();
    const html = renderStudioShareHtml('<head><meta property="og:image" content="old"></head>', validatePublishedShare(withoutImage), 'https://app.test/s/test');
    expect(html).not.toContain('og:image'); expect(html).not.toContain('twitter:image'); expect(html).toContain('content="summary"');
  });
  it('keeps legacy snapshots readable but does not allow claiming their ownership', async () => {
    const { documents } = firebase(); const legacy = { ...sample, imageUrl: undefined, imageDataUrl: image }; documents.set('0123456789abcdef', { fields: legacy });
    expect((await readStudioShare('0123456789abcdef'))?.imageDataUrl).toBe(image);
    await expect(publish(legacy)).rejects.toThrow('Cloudinary');
    await expect(publish({ ...sample, shareId: '0123456789abcdef' })).rejects.toMatchObject({ status: 403 });
  });
  it('reads without writing and returns no private ownership fields in the public API', async () => {
    const { fetcher } = firebase(); const first = await publish(); fetcher.mockClear();
    const shared = await readStudioShare(first.id); expect(shared?.title).toBe(sample.title); expect(shared).not.toHaveProperty('ownerUid'); expect(shared).not.toHaveProperty('projectId');
    expect(fetcher.mock.calls).toHaveLength(1); expect(fetcher.mock.calls[0][1]?.method).toBeUndefined();
  });
  it('surfaces denied Firebase writes without inventing a link', async () => {
    const { fetcher } = firebase(); fetcher.mockImplementationOnce(async () => Response.json({}, { status: 404 })).mockImplementationOnce(async () => Response.json({}, { status: 403 }));
    await expect(publish()).rejects.toThrow(/rules|Firebase/);
  });
  it('uploads to Cloudinary only when requested and rejects invalid URLs/provider errors', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ secure_url: sample.imageUrl })).mockResolvedValueOnce(Response.json({}, { status: 400 })); vi.stubGlobal('fetch', fetcher);
    expect(await uploadShareCover(image)).toBe(sample.imageUrl); expect((fetcher.mock.calls[0][1].body as FormData).get('file')).toBe(image);
    await expect(uploadShareCover(image)).rejects.toThrow('Cloudinary');
    for (const imageUrl of ['http://res.cloudinary.com/demo/image/upload/a.jpg','https://res.cloudinary.com.evil.test/demo/image/upload/a.jpg','javascript:alert(1)','https://res.cloudinary.com/demo/raw/upload/code.html']) expect(() => validatePublishedShare({ ...sample, imageUrl })).toThrow();
  });
  it('escapes metadata and validates legacy images and payload sizes', () => {
    expect(shareSlug('Điền & Bạn')).toBe('dien-ban'); expect(shareIdFromSlug('../invalid')).toBe('');
    const html = renderStudioShareHtml('<head></head>', { ...sample, title: '\"><script>bad</script>' }, 'https://example.test'); expect(html).not.toContain('<script>bad</script>');
    expect(() => validatePublishedShare({ ...sample, imageDataUrl: 'data:image/jpeg;base64,eA==' })).toThrow();
    expect(() => validatePublishedShare({ ...sample, payload: 'x'.repeat(700001) })).toThrow();
  });
});
