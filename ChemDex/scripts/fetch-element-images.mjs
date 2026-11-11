import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'assets/periodic-table/photos');
await fs.mkdir(directory, { recursive: true });
const elements = JSON.parse(await fs.readFile(path.join(root, 'shared/elements.json'), 'utf8'));
const strip = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const results = [];
const eligible = elements.filter(el => el.z < 93 && !['Tc', 'Pm', 'At', 'Rn', 'Fr', 'Ac', 'Pa'].includes(el.symbol));
const previous = JSON.parse(await fs.readFile(path.join(root, 'data/element-image-provenance.json'), 'utf8')).elements;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(35000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
const pageimages = new Map();
// Batch MediaWiki queries to respect the public service's request limit.
for (let i = 0; i < eligible.length; i += 50) {
  const batch = eligible.slice(i, i + 50);
  const titles = batch.map(el => ({ Cs: 'Caesium', Al: 'Aluminium' })[el.symbol] ?? el.name_en);
  try {
    const response = await json(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({action:'query',format:'json',prop:'pageimages',piprop:'name',titles:titles.join('|')})}`);
    for (const page of Object.values(response.query.pages)) pageimages.set(page.title, page.pageimage);
  } catch (error) { console.log('Page batch:', error.message); }
  await sleep(5000);
}
const metadata = new Map();
const filenames = [...pageimages.values()].filter(Boolean);
for (let i = 0; i < filenames.length; i += 50) {
  try {
    const response = await json(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({action:'query',format:'json',prop:'imageinfo',titles:filenames.slice(i,i+50).map(n=>'File:'+n).join('|'),iiprop:'url|extmetadata',iiurlwidth:'800'})}`);
    for (const page of Object.values(response.query.pages)) metadata.set(page.title.slice(5).replaceAll(' ', '_'), page.imageinfo?.[0]);
  } catch (error) { console.log('Metadata batch:', error.message); }
  await sleep(5000);
}
let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < elements.length) {
    const el = elements[next++];
    const retained = previous.find(r => r.symbol === el.symbol && r.status === 'downloaded');
    if (retained) { results.push(retained); continue; }
    if (!eligible.includes(el)) {
      results.push({symbol:el.symbol,status:'diagram',reason:'Không dùng ảnh mẫu vĩ mô không xác minh cho nguyên tố cực hiếm/nhân tạo.'});
      continue;
    }
    try {
      const title = ({ Cs: 'Caesium', Al: 'Aluminium' })[el.symbol] ?? el.name_en;
      const filename = pageimages.get(title);
      if (!filename) throw new Error('Không có ảnh tham chiếu đã định danh trong truy vấn theo lô');
      const image = metadata.get(filename.replaceAll(' ', '_'));
      const meta = image?.extmetadata;
      const license = strip(meta?.LicenseShortName?.value);
      if (!image || !/CC BY|CC0|Public domain/i.test(license)) throw new Error(`Chưa xác nhận giấy phép dùng lại: ${license}`);
      const remote = image.thumburl ?? image.url;
      if (!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(remote)) throw new Error('Dùng sơ đồ cục bộ thay ảnh vector/animation');
      const response = await fetch(remote, { signal: AbortSignal.timeout(35000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image HTTP ${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      const extension = /png/i.test(response.headers.get('content-type')) ? 'png' : /webp/i.test(response.headers.get('content-type')) ? 'webp' : 'jpg';
      const relative = `assets/periodic-table/photos/${String(el.z).padStart(3, '0')}_${el.symbol}.${extension}`;
      await fs.writeFile(path.join(root, relative), data);
      results.push({ symbol: el.symbol, status: 'downloaded', file: `/${relative}`, source: image.descriptionurl,
        original: image.url, thumbnail: remote, filename, title: strip(meta.ObjectName?.value) || filename,
        description: strip(meta.ImageDescription?.value), author: strip(meta.Artist?.value),
        license, licenseUrl: strip(meta.LicenseUrl?.value), credit: strip(meta.Credit?.value),
        sha256: crypto.createHash('sha256').update(data).digest('hex'), bytes: data.length });
      await sleep(1500);
    } catch (error) { results.push({ symbol: el.symbol, status: 'diagram', reason: error.message }); }
  }
}));
results.sort((a, b) => elements.find(e => e.symbol === a.symbol).z - elements.find(e => e.symbol === b.symbol).z);
await fs.writeFile(path.join(root, 'data/element-image-provenance.json'), JSON.stringify({ reviewedAt: '2026-11-11', policy: 'Ảnh Commons có tác giả, giấy phép và trang nguồn; nguyên tố cực hiếm/nhân tạo dùng sơ đồ có nhãn.', elements: results }, null, 2) + '\n');
console.log(JSON.stringify({ downloaded: results.filter(r => r.status === 'downloaded').length, diagrams: results.filter(r => r.status === 'diagram').length }));
