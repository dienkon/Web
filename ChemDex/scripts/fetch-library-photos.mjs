import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFormula } from '../shared/chemistry/formula.mjs';
import { substanceSlug, documentFile } from '../shared/library-paths.mjs';
import { isomerGroupFor } from '../shared/chemistry/molecular-isomers.mjs';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const OUT_DIR = path.resolve('trung-tam/public/assets/library/photos');
const MAP_FILE = path.resolve('shared/library-photos.generated.json');
const DOCS_DIR = path.join(OUT_DIR, 'docs');
const ELEMENTS_DIR = path.join(OUT_DIR, 'elements');
const SUBSTANCES_DIR = path.join(OUT_DIR, 'substances');
const ISOMER_EXAMPLES_DIR = path.join(SUBSTANCES_DIR, 'isomers');
const FORCE = process.argv.includes('--force');
const UPGRADE_2D = process.argv.includes('--upgrade-2d');

for (const dir of [OUT_DIR, DOCS_DIR, ELEMENTS_DIR, SUBSTANCES_DIR, ISOMER_EXAMPLES_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const WIKI_HEADERS = {
  'User-Agent': 'ChemDexEducationalLibrary/1.0 (https://chemdex.local; educational chemistry visualization)',
  'Accept': 'application/json'
};
const BINARY_HEADERS = {
  'User-Agent': WIKI_HEADERS['User-Agent']
};

const BAD_IMAGE_RE = /pictogram|ghs|nfpa|hazard|warning|logo|icon|symbol|flag|coat_of_arms|map|emblem|banner|commons-logo|wiki|ambox|edit-|stub|question|disambig|steroid|progesterone|signature|autograph|diisocyanate/i;
const REAL_PHOTO_RE = /\.(jpe?g|webp)$/i;
const RASTER_EXT_RE = /\.(jpe?g|png|webp)$/i;
const DIAGRAM_NAME_RE = /-(?:2d|3d|skeletal|balls?|vdw|sf|full|lewis|xtal|unit-cell|polyhedra|diagram|spectrum|chart|plot)\b/i;
const MODEL_3D_NAME_RE = /(?:[-_ ](?:3d|balls?|ball[-_ ]and[-_ ]stick|space[-_ ]?fill(?:ing)?|vdw|sf|bs(?:-\d+)?|xtal|crystal|lattice|elpot|polyhedr|ionic)|(?:^|[-_ ])(?:3d|balls?|vdw)(?:[-_ .]))/i;
const FLAT_2D_NAME_RE = /(?:2d|skeletal|structural|lewis|displayed|formula|scheme|mechanism|synthesis|spectrum|spectra|ir[-_ ]|nmr|uv[-_ ]|diagram|chart|plot|curve|table|graph|phase[-_ ]diagram|reaction)/i;

function isLegacy2DRecord(meta) {
  if (!meta || !meta.kind) return true;
  if (['structure-2d', 'pubchem'].includes(meta.kind)) return true;
  const origin = String(meta.originUrl || '');
  if (origin.includes('pubchem.ncbi.nlm.nih.gov') && !origin.includes('record_type=3d')) return true;
  return false;
}

function normalizeMatchToken(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const sleep = ms => new Promise(ok => setTimeout(ok, ms));

let lastPubChemAt = 0;
let lastWikiAt = 0;
async function throttleWiki() {
  const wait = 140 - (Date.now() - lastWikiAt);
  if (wait > 0) await sleep(wait);
  lastWikiAt = Date.now();
}
async function fetchWithRetry(url, headers, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429 || res.status === 503) {
        await sleep(800 * (i + 1));
        continue;
      }
      return res;
    } catch {
      await sleep(500 * (i + 1));
    }
  }
  return null;
}

function detectImageType(buf) {
  if (!buf || buf.length <= 2000) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function findExistingFile(dir, baseName) {
  if (!fs.existsSync(dir)) return null;
  for (const ext of ['jpg', 'png', 'webp']) {
    const filePath = path.join(dir, `${baseName}.${ext}`);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      if (detectImageType(buf)) return { filePath, ext, buf };
    }
  }
  return null;
}

function removeOtherExts(dir, baseName, keepExt) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (ext === keepExt) continue;
    const p = path.join(dir, `${baseName}.${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

async function downloadBuffer(url) {
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;
  const res = await fetchWithRetry(fullUrl, BINARY_HEADERS);
  if (!res || !res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = detectImageType(buf);
  if (!ext) return null;
  return { buf, ext, url: fullUrl };
}

function isUsableWikiUrl(src) {
  if (!src) return false;
  const clean = src.split('?')[0].toLowerCase();
  if (clean.endsWith('.svg') || clean.includes('.svg/')) return false;
  if (!RASTER_EXT_RE.test(clean)) return false;
  const fileName = clean.split('/').pop() || '';
  if (BAD_IMAGE_RE.test(fileName)) return false;
  return true;
}

async function fetchWikiSummary(title, lang = 'en') {
  await throttleWiki();
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetchWithRetry(url, WIKI_HEADERS);
  if (!res || !res.ok) return null;
  try {
    const data = await res.json();
    if (data?.type === 'disambiguation') return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchWikiMediaList(title, lang = 'en') {
  await throttleWiki();
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`;
  const res = await fetchWithRetry(url, WIKI_HEADERS);
  if (!res || !res.ok) return [];
  try {
    const data = await res.json();
    return data?.items || [];
  } catch {
    return [];
  }
}

function bestSrcFromMediaItem(item) {
  const srcset = item?.srcset || [];
  if (!srcset.length) return null;
  const preferred = srcset.find(s => /\/(?:500|640|800)px-/.test(s.src || '')) || srcset[0];
  return preferred?.src ? (preferred.src.startsWith('//') ? `https:${preferred.src}` : preferred.src) : null;
}

function normalizeUrlKey(src) {
  return String(src || '').split('?')[0].replace(/^https?:/, '').replace(/\/\d+px-/, '/');
}

async function pickWikiCandidate(titles, {
  lang = 'en',
  realPhotoOnly = false,
  model3dOnly = false,
  infoboxOnly = true,
  preferPattern = null,
  avoidPattern = null,
  titleToken = null,
  excludeUrls = new Set(),
  allowMediaList = true
} = {}) {
  for (const rawTitle of titles) {
    if (!rawTitle) continue;
    const summary = await fetchWikiSummary(rawTitle, lang);
    if (!summary) continue;
    const canonicalTitle = summary.title || rawTitle;
    const pageUrl = summary.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle.replace(/ /g, '_'))}`;

    // Gather ordered candidates from summary + media-list
    const candidates = [];
    const leadSrc = summary.thumbnail?.source || summary.originalimage?.source;
    if (leadSrc && isUsableWikiUrl(leadSrc)) {
      const leadFile = leadSrc.split('?')[0].split('/').pop() || '';
      const isRealPhoto = REAL_PHOTO_RE.test(leadFile) && !DIAGRAM_NAME_RE.test(leadFile);
      const isModel3d = !isRealPhoto && MODEL_3D_NAME_RE.test(leadFile) && !FLAT_2D_NAME_RE.test(leadFile);
      candidates.push({
        src: leadSrc,
        title: leadFile,
        caption: summary.description || canonicalTitle,
        isInfobox: true,
        isRealPhoto,
        isModel3d,
        priority: 0
      });
    }

    if (allowMediaList) {
      const items = await fetchWikiMediaList(canonicalTitle, lang);
      for (const item of items) {
        if (item.type !== 'image') continue;
        const src = bestSrcFromMediaItem(item);
        if (!src || !isUsableWikiUrl(src)) continue;
        const fileTitle = (item.title || '').replace(/^File:/i, '');
        if (BAD_IMAGE_RE.test(fileTitle)) continue;
        const isInfobox = item.section_id === 0;
        if (infoboxOnly && !isInfobox) continue;
        const isRealPhoto = REAL_PHOTO_RE.test(fileTitle) && !DIAGRAM_NAME_RE.test(fileTitle);
        const isModel3d = !isRealPhoto && MODEL_3D_NAME_RE.test(fileTitle) && !FLAT_2D_NAME_RE.test(fileTitle);
        candidates.push({
          src,
          title: fileTitle,
          caption: item.caption?.text?.trim() || canonicalTitle,
          isInfobox,
          isRealPhoto,
          isModel3d,
          priority: isInfobox ? 1 : 2
        });
      }
    }

    const filtered = candidates.filter(c => {
      if (excludeUrls.has(normalizeUrlKey(c.src))) return false;
      if (realPhotoOnly && !c.isRealPhoto) return false;
      if (model3dOnly && !c.isModel3d) return false;
      if (avoidPattern && avoidPattern.test(c.title)) return false;
      if (titleToken && !c.isInfobox && !normalizeMatchToken(c.title).includes(titleToken)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const aPref = preferPattern ? (preferPattern.test(a.title) ? 1 : 0) : 0;
      const bPref = preferPattern ? (preferPattern.test(b.title) ? 1 : 0) : 0;
      if (aPref !== bPref) return bPref - aPref;
      if (a.isRealPhoto !== b.isRealPhoto) return a.isRealPhoto ? -1 : 1;
      if (a.isModel3d !== b.isModel3d) return a.isModel3d ? -1 : 1;
      if (a.isInfobox !== b.isInfobox) return a.isInfobox ? -1 : 1;
      return a.priority - b.priority;
    });

    for (const c of filtered) {
      const dl = await downloadBuffer(c.src);
      if (dl) {
        return {
          ...dl,
          sourceName: lang === 'vi' ? 'Wikipedia Tiếng Việt' : 'Wikipedia / Wikimedia Commons',
          sourceUrl: pageUrl,
          mediaTitle: c.title,
          wikiCaption: c.caption,
          kind: c.isRealPhoto ? 'photo' : 'model'
        };
      }
    }
  }
  return null;
}

async function searchCommonsPhoto(queries, { excludeUrls = new Set(), realPhotoOnly = true, model3dOnly = false, matchToken = null } = {}) {
  for (const query of queries) {
    if (!query) continue;
    await throttleWiki();
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url|size&iiurlwidth=640&format=json`;
    const res = await fetchWithRetry(url, WIKI_HEADERS);
    if (!res || !res.ok) continue;
    let data;
    try {
      data = await res.json();
    } catch {
      continue;
    }
    const pages = Object.values(data?.query?.pages || {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
    for (const page of pages) {
      const title = (page.title || '').replace(/^File:/i, '');
      if (BAD_IMAGE_RE.test(title) || FLAT_2D_NAME_RE.test(title)) continue;
      if (realPhotoOnly && (!REAL_PHOTO_RE.test(title) || DIAGRAM_NAME_RE.test(title))) continue;
      if (model3dOnly && (!RASTER_EXT_RE.test(title) || !MODEL_3D_NAME_RE.test(title))) continue;
      if (!realPhotoOnly && !model3dOnly && !RASTER_EXT_RE.test(title)) continue;
      if (matchToken && !normalizeMatchToken(title).includes(matchToken)) continue;
      const info = page.imageinfo?.[0];
      const src = info?.thumburl || info?.url;
      if (!src || !isUsableWikiUrl(src)) continue;
      if (excludeUrls.has(normalizeUrlKey(src))) continue;
      const dl = await downloadBuffer(src);
      if (dl) {
        return {
          ...dl,
          sourceName: 'Wikimedia Commons',
          sourceUrl: info?.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,
          mediaTitle: title,
          wikiCaption: title.replace(/\.[a-z]+$/i, '').replace(/[_-]+/g, ' '),
          kind: REAL_PHOTO_RE.test(title) && !MODEL_3D_NAME_RE.test(title) ? 'photo' : 'model'
        };
      }
    }
  }
  return null;
}

async function throttlePubChem() {
  const wait = 260 - (Date.now() - lastPubChemAt);
  if (wait > 0) await sleep(wait);
  lastPubChemAt = Date.now();
}

async function fetchPubChem3dByCid(cid) {
  if (!cid) return null;
  await throttlePubChem();
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=3d&image_size=large`;
  const dl = await downloadBuffer(url);
  if (!dl) return null;
  return {
    ...dl,
    cid,
    sourceName: `PubChem 3D (CID ${cid})`,
    sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    kind: 'structure-3d'
  };
}

async function fetchPubChem3dByName(names) {
  for (const name of names) {
    if (!name) continue;
    await throttlePubChem();
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/PNG?record_type=3d&image_size=large`;
    const dl = await downloadBuffer(url);
    if (dl) {
      return {
        ...dl,
        sourceName: `PubChem 3D (${name})`,
        sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/',
        kind: 'structure-3d'
      };
    }
  }
  return null;
}

async function fetchPubChemByCid(cid) {
  if (!cid) return null;
  await throttlePubChem();
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=1200x900`;
  const dl = await downloadBuffer(url);
  if (!dl) return null;
  return {
    ...dl,
    cid,
    sourceName: `PubChem (CID ${cid})`,
    sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    kind: 'structure-2d'
  };
}

async function lookupPubChemCidByName(names) {
  for (const name of names) {
    if (!name) continue;
    await throttlePubChem();
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const res = await fetchWithRetry(url, { 'User-Agent': WIKI_HEADERS['User-Agent'] });
    if (!res || !res.ok) continue;
    try {
      const data = await res.json();
      const cid = data?.IdentifierList?.CID?.[0];
      if (cid) return { cid, matchedName: name };
    } catch {
      // try next name
    }
  }
  return null;
}

async function fetchPubChemBySmiles(smiles, displayName) {
  if (!smiles) return null;
  await throttlePubChem();
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=1200x900`;
  const dl = await downloadBuffer(url);
  if (!dl) return null;
  return {
    ...dl,
    sourceName: `PubChem (2D ${displayName})`,
    sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/',
    kind: 'structure-2d'
  };
}

const AUTHORED_SPECS = {
  'hydrogen-h': {
    cover: {
      wiki: ['Orion_Nebula', 'Hydrogen'],
      alt: 'Tinh vân Lạp Hộ giàu khí Hydrogen đang phát sáng',
      caption: 'Tinh vân Lạp Hộ — vườn ươm sao khổng lồ chứa đầy khí Hydrogen nguyên thủy.'
    },
    inline: {
      nebula: {
        wiki: ['Carina_Nebula', 'Eagle_Nebula', 'Sun'],
        alt: 'Vùng khí quyển sao và tinh vân phát xạ của Hydrogen',
        caption: 'Phản ứng tổng hợp hạt nhân chuyển hóa Hydrogen thành năng lượng thắp sáng các ngôi sao.'
      },
      cavendish: {
        wiki: ['Henry_Cavendish'],
        infoboxOnly: false,
        alt: 'Chân dung nhà hóa học Henry Cavendish',
        caption: 'Henry Cavendish (1731–1810) — người đầu tiên cô lập và cân đo khí dễ cháy Hydrogen năm 1766.'
      },
      discharge: {
        wiki: ['Hydrogen'],
        infoboxOnly: false,
        preferPattern: /discharge|spectrum/i,
        alt: 'Ống phóng điện chứa khí Hydrogen phát sáng ánh tím hồng',
        caption: 'Khí Hydrogen phát ra vạch quang phổ đặc trưng khi phóng điện trong ống thủy tinh.'
      }
    }
  },
  'heli-he': {
    cover: {
      wiki: ['Solar_corona', 'Helium'],
      alt: 'Vành nhật hoa Mặt Trời quan sát trong nhật thực toàn phần',
      caption: 'Vành nhật hoa Mặt Trời — nơi Heli được phát hiện qua vạch quang phổ vàng 587,49 nm năm 1868.'
    },
    inline: {
      discharge: {
        wiki: ['Helium'],
        infoboxOnly: false,
        preferPattern: /discharge|tube|Helium_spectrum/i,
        alt: 'Ống phóng điện chứa khí Heli phát sáng vàng cam đặc trưng',
        caption: 'Ánh sáng phát xạ đặc trưng của khí Heli khi kích thích bằng điện áp cao.'
      },
      superfluid: {
        wiki: ['Superfluid_helium-4', 'Liquid_helium'],
        infoboxOnly: false,
        alt: 'Hiện tượng siêu lỏng Heli lỏng chảy tràn qua thành cốc',
        caption: 'Heli lỏng dưới 2,17 K chuyển sang trạng thái siêu lỏng không ma sát, leo ngược thành bình chứa.'
      },
      mri: {
        wiki: ['Magnetic_resonance_imaging'],
        alt: 'Máy chụp cộng hưởng từ MRI sử dụng Heli lỏng làm mát nam châm siêu dẫn',
        caption: 'Hệ thống chụp cộng hưởng từ MRI hiện đại vận hành nhờ cuộn dây siêu dẫn làm lạnh bằng Heli lỏng.'
      }
    }
  },
  'liti-li': {
    cover: {
      wiki: ['Lithium'],
      alt: 'Mẫu kim loại Liti ánh bạc bảo quản trong dầu parafin',
      caption: 'Kim loại Liti nguyên chất có tỷ trọng rất nhẹ và phản ứng nhanh với không khí.'
    },
    inline: {
      petalite: {
        wiki: ['Petalite', 'Spodumene'],
        alt: 'Khoáng vật Petalite nguồn gốc phát hiện Liti trên đảo Utö',
        caption: 'Khoáng vật silicat chứa Liti — manh mối giúp Johan August Arfwedson tìm ra Liti năm 1817.'
      },
      flame: {
        wiki: ['Flame_test', 'Lithium'],
        infoboxOnly: false,
        preferPattern: /lithium|red|carmine|flame/i,
        alt: 'Thử nghiệm ngọn lửa màu đỏ son đặc trưng của ion Liti',
        caption: 'Muối Liti nhuộm ngọn lửa đèn khí thành sắc đỏ son đặc trưng trong phân tích định tính.'
      },
      battery: {
        wiki: ['Lithium-ion_battery'],
        alt: 'Pin sạc Lithium-ion ứng dụng rộng rãi trong thiết bị di động và xe điện',
        caption: 'Kiến trúc điện cực cho phép ion Liti tí hon di chuyển linh hoạt trong pin sạc thế hệ mới.'
      }
    }
  },
  'carbon-c': {
    cover: {
      wiki: ['Diamond'],
      alt: 'Tinh thể kim cương — dạng thù hình cứng nhất của nguyên tố Carbon',
      caption: 'Kim cương tự nhiên với mạng lưới tứ diện đều bền vững của các nguyên tử Carbon.'
    },
    inline: {
      graphite: {
        wiki: ['Graphite'],
        alt: 'Mẫu khoáng vật than chì (Graphite) màu xám đen ánh kim',
        caption: 'Than chì gồm các lớp lục giác Carbon trượt lên nhau, dẫn điện tốt và có màu tối mờ.'
      },
      fullerene: {
        wiki: ['Buckminsterfullerene'],
        infoboxOnly: false,
        alt: 'Mô hình phân tử quả cầu Buckyball C60 gồm 60 nguyên tử Carbon',
        caption: 'Phân tử Fullerene C60 cấu trúc lồng cầu khép kín gồm 12 ngũ giác và 20 lục giác Carbon.'
      },
      graphene: {
        wiki: ['Graphene'],
        infoboxOnly: false,
        alt: 'Tấm mạng tinh thể Graphene dày một lớp nguyên tử Carbon',
        caption: 'Mạng lưới tổ ong hai chiều của Graphene mang lại độ bền cơ học và độ dẫn điện vượt trội.'
      }
    }
  },
  'nito-n': {
    cover: {
      wiki: ['Liquid_nitrogen'],
      alt: 'Nitơ lỏng sôi bốc hơi lạnh ở nhiệt độ -196 độ C',
      caption: 'Nitơ hóa lỏng ở -196 °C được sử dụng phổ biến trong bảo quản lạnh và nghiên cứu vật liệu.'
    },
    inline: {
      lightning: {
        wiki: ['Lightning'],
        alt: 'Tia sét trong cơn giông cung cấp năng lượng cố định Nitơ tự nhiên',
        caption: 'Nhiệt độ cực cao của tia sét bẻ gãy liên kết ba trong phân tử Nitơ để tạo oxit nitơ và phân đạm tự nhiên.'
      },
      discharge: {
        wiki: ['Nitrogen'],
        infoboxOnly: false,
        preferPattern: /glow|discharge|nitrogen/i,
        alt: 'Ống phóng điện chứa khí Nitơ phát sáng màu tím hồng',
        caption: 'Khí Nitơ tinh khiết chiếm 78% khí quyển Trái Đất và phát sáng tím đặc trưng khi phóng điện.'
      },
      rutherford: {
        wiki: ['Daniel_Rutherford'],
        infoboxOnly: false,
        alt: 'Chân dung nhà hóa học Scotland Daniel Rutherford',
        caption: 'Daniel Rutherford (1749–1819) — người cô lập khí Nitơ trong thí nghiệm chuông thủy tinh năm 1772.'
      }
    }
  },
  'oxy-o': {
    cover: {
      wiki: ['Liquid_oxygen'],
      alt: 'Oxy lỏng màu xanh lam nhạt bị giữ lơ lửng giữa hai cực nam châm',
      caption: 'Oxy lỏng có màu xanh lam nhạt và thể hiện tính thuận từ mạnh dưới tác dụng của từ trường.'
    },
    inline: {
      lavoisier: {
        wiki: ['Antoine_Lavoisier'],
        infoboxOnly: false,
        alt: 'Tranh chân dung Antoine Lavoisier và vợ trong phòng thí nghiệm',
        caption: 'Antoine Lavoisier cùng dụng cụ đo định lượng lật đổ thuyết phlogiston và đặt tên cho nguyên tố Oxy.'
      },
      ozone: {
        wiki: ['Ozone_layer', 'Ozone'],
        alt: 'Lớp Ozon trong tầng bình lưu hấp thụ bức xạ cực tím bảo vệ Trái Đất',
        caption: 'Dạng thù hình Ozon hấp thụ tia cực tím có hại từ Mặt Trời ở tầng bình lưu.'
      },
      priestley: {
        wiki: ['Joseph_Priestley'],
        infoboxOnly: false,
        alt: 'Chân dung nhà hóa học Joseph Priestley',
        caption: 'Joseph Priestley (1733–1804) — người thu khí Oxy tinh khiết bằng thấu kính hội tụ năm 1774.'
      }
    }
  },
  'natri-na': {
    cover: {
      wiki: ['Sodium'],
      alt: 'Mẫu kim loại Natri mềm ánh bạc bảo quản ngập trong dầu parafin',
      caption: 'Kim loại Natri tinh khiết rất mềm và phản ứng mãnh liệt với hơi ẩm không khí.'
    },
    inline: {
      davy: {
        wiki: ['Humphry_Davy'],
        infoboxOnly: false,
        alt: 'Chân dung Sir Humphry Davy tại Viện Hoàng gia Luân Đôn',
        caption: 'Sir Humphry Davy — người điện phân nóng chảy xút để cô lập thành công Natri năm 1807.'
      },
      lamp: {
        wiki: ['Sodium-vapor_lamp'],
        alt: 'Đèn hơi Natri phát ánh sáng vàng cam bước sóng 589 nm',
        caption: 'Ánh sáng vàng đơn sắc bước sóng 589 nm của hơi Natri trong hệ thống đèn đường cao tốc.'
      },
      halite: {
        wiki: ['Halite'],
        alt: 'Khoáng vật muối mỏ Halite nguồn cung cấp Natri clorua tự nhiên',
        caption: 'Tinh thể halite tự nhiên là nguồn nguyên liệu chủ yếu để điện phân điều chế Natri công nghiệp.'
      }
    }
  },
  'sat-fe': {
    cover: {
      wiki: ['Iron'],
      alt: 'Mẫu kim loại Sắt tinh khiết ánh xám kim loại',
      caption: 'Sắt nguyên chất là kim loại có từ tính mạnh và là nguyên tố chủ đạo trong lõi Trái Đất.'
    },
    inline: {
      dagger: {
        wiki: ["Tutankhamun's_meteoric_iron_dagger", 'Iron_meteorite'],
        alt: 'Đoản kiếm bằng sắt thiên thạch trong lăng mộ Pharaon Tutankhamun',
        caption: 'Lưỡi đoản kiếm rèn từ thiên thạch sắt-niken của Pharaon Tutankhamun có niên đại hơn 3.300 năm.'
      },
      furnace: {
        wiki: ['Blast_furnace'],
        alt: 'Lò cao luyện gang thép từ quặng oxit sắt trong công nghiệp nặng',
        caption: 'Lò cao hiện đại sử dụng khí CO ở nhiệt độ cao để khử quặng sắt oxit thành gang lỏng.'
      },
      hematite: {
        wiki: ['Hematite'],
        alt: 'Quặng Hematit giàu sắt(III) oxit trong tự nhiên',
        caption: 'Quặng Hematit (Fe2O3) — nguồn cung cấp nguyên liệu chính cho ngành luyện kim toàn cầu.'
      }
    }
  },
  'dong-cu': {
    cover: {
      wiki: ['Copper'],
      alt: 'Mẫu kim loại Đồng tinh khiết màu đỏ cam ánh kim đặc trưng',
      caption: 'Đồng tự nhiên sở hữu sắc đỏ ánh kim hiếm thấy cùng độ dẫn điện và dẫn nhiệt hàng đầu.'
    },
    inline: {
      malachite: {
        wiki: ['Malachite'],
        alt: 'Khoáng vật Malachite xanh ngọc bích nguồn quặng Đồng cổ đại',
        caption: 'Khoáng vật Malachite màu xanh lục là nguyên liệu khai thác Đồng từ thời cổ đại tại đảo Cyprus.'
      },
      liberty: {
        wiki: ['Statue_of_Liberty'],
        alt: 'Lớp phủ patina xanh ngọc bích tự nhiên bảo vệ vỏ đồng Tượng Nữ thần Tự do',
        caption: 'Lớp muối cacbonat bazơ patina màu xanh ngọc giúp bảo vệ hơn 80 tấn đồng lá khỏi ăn mòn sâu.'
      },
      faraday: {
        wiki: ['Michael_Faraday', 'Faraday_coil'],
        infoboxOnly: false,
        alt: 'Chân dung nhà vật lý hóa học Michael Faraday',
        caption: 'Thí nghiệm cuộn dây đồng cảm ứng điện từ của Michael Faraday năm 1831 mở ra kỷ nguyên điện năng.'
      }
    }
  },
  'bac-ag': {
    cover: {
      wiki: ['Silver'],
      alt: 'Tinh thể Bạc kim loại tự nhiên sáng bóng ánh trắng lấp lánh',
      caption: 'Bạc là kim loại có độ dẫn điện, dẫn nhiệt và độ phản xạ ánh sáng cao nhất trong các nguyên tố.'
    },
    inline: {
      coin: {
        wiki: ['Athenian_tetradrachm', 'Owl_of_Athena'],
        alt: 'Đồng tiền bạc cổ Athens đúc từ mỏ bạc Laurion',
        caption: 'Tiền bạc cổ đại từ mỏ Laurion góp phần tài trợ hạm đội chiến thuyền bảo vệ thành Athens.'
      },
      daguerre: {
        wiki: ['Daguerreotype'],
        alt: 'Bức ảnh Daguerreotype cổ lưu giữ hình ảnh bằng muối Bạc halogenua',
        caption: 'Phản ứng quang hóa trên lớp muối bạc iotua nhạy sáng giúp ghi lại bức ảnh chân thực đầu tiên năm 1839.'
      },
      mirror: {
        wiki: ["Tollens'_reagent"],
        infoboxOnly: false,
        alt: 'Lớp gương Bạc sáng bóng kết tủa trên thành bình thủy tinh qua phản ứng Tollens',
        caption: 'Phản ứng tráng gương khử ion bạc thành lớp kim loại phản xạ mịn màng bám trên thành thủy tinh.'
      }
    }
  },
  'bien-nien-su-bang-tuan-hoan': {
    cover: {
      wiki: ['Dmitri_Mendeleev'],
      alt: 'Chân dung nhà hóa học Dmitri Mendeleev — cha đẻ Bảng tuần hoàn',
      caption: 'Dmitri Mendeleev (1834–1907) người phát hiện quy luật tuần hoàn các nguyên tố hóa học.'
    },
    inline: {
      draft1869: {
        wiki: ['Periodic_table'],
        infoboxOnly: false,
        preferPattern: /Mendeleev|1869|manuscript|table/i,
        alt: 'Bản thảo viết tay Bảng tuần hoàn nguyên tố năm 1869 của Mendeleev',
        caption: 'Bản thảo gốc năm 1869 nơi Mendeleev để trống các ô dự đoán Scandium, Gallium và Germanium.'
      },
      moseley: {
        wiki: ['Henry_Moseley'],
        infoboxOnly: false,
        alt: 'Nhà vật lý Henry Moseley trong phòng thí nghiệm tia X',
        caption: 'Henry Moseley (1887–1915) chứng minh số hiệu nguyên tử là cơ sở trật tự chuẩn của bảng tuần hoàn.'
      },
      cabinet: {
        wiki: ['Periodic_table', 'Chemical_element'],
        infoboxOnly: false,
        preferPattern: /Periodic_table_display|samples|cube|element/i,
        alt: 'Bộ sưu tập mẫu vật các nguyên tố hóa học sắp xếp theo bảng tuần hoàn',
        caption: 'Trưng bày trực quan các mẫu vật nguyên tố giúp đối chiếu tính chất kim loại và phi kim theo chu kỳ.'
      }
    }
  },
  'bai-hoc-xuong-mau-trong-phong-thi-nghiem': {
    cover: {
      wiki: ['Laboratory_glassware', 'Laboratory'],
      alt: 'Dụng cụ thủy tinh chuẩn mực trong phòng thí nghiệm hóa học',
      caption: 'Tuân thủ quy trình thao tác chuẩn giúp phòng tránh tai nạn ăn mòn, cháy nổ trong phòng thí nghiệm.'
    },
    inline: {
      fumehood: {
        wiki: ['Fume_hood'],
        alt: 'Tủ hút khí độc bảo vệ người thao tác với hóa chất dễ bay hơi',
        caption: 'Tủ hút hóa chất đảm bảo luồng khí độc và hơi axit luôn được dẫn thoát an toàn ra khỏi vùng hô hấp.'
      },
      goggles: {
        wiki: ['Safety_glasses', 'Goggles'],
        alt: 'Kính bảo hộ hóa chất che chắn hoàn toàn vùng mắt',
        caption: 'Kính bảo hộ là trang bị bắt buộc để ngăn giọt bắn axit, bazơ gây tổn thương giác mạc.'
      },
      eyewash: {
        wiki: ['Eyewash', 'Carl_Wilhelm_Scheele'],
        alt: 'Trạm vòi rửa mắt khẩn cấp trong phòng thí nghiệm',
        caption: 'Trạm rửa khẩn cấp cho phép xối nước liên tục tối thiểu 15 phút khi hóa chất bắn vào mắt hoặc da.'
      }
    }
  },
  'nghe-thuat-truc-quan-hoa-phan-tu': {
    cover: {
      wiki: ['Ball-and-stick_model', 'Crystal_structure'],
      alt: 'Mô hình cầu và que biểu diễn hình học phân tử trong không gian 3D',
      caption: 'Mô hình không gian giúp người học nhìn thấy góc liên kết và sự phân bố nguyên tử ngoài mặt phẳng.'
    },
    inline: {
      labVisualization: {
        wiki: ['Laboratory', 'Molecular_model'],
        alt: 'Không gian thực nghiệm và dụng cụ hóa học phân tích hiện đại',
        caption: 'Kết hợp dữ liệu thực nghiệm phòng thí nghiệm với mô hình hóa cấu trúc vi mô 3 chiều.'
      },
      cpk: {
        wiki: ['Space-filling_model'],
        infoboxOnly: false,
        alt: 'Mô hình lấp đầy không gian CPK phản ánh bán kính van der Waals',
        caption: 'Mô hình đặc CPK do Corey, Pauling và Koltun phát triển biểu diễn kích thước tương đối của đám mây electron.'
      },
      xrd: {
        wiki: ['X-ray_crystallography'],
        alt: 'Ảnh nhiễu xạ tia X xác định tọa độ nguyên tử trong tinh thể',
        caption: 'Kỹ thuật nhiễu xạ tia X cung cấp dữ liệu thực nghiệm về độ dài liên kết và góc phối trí tinh thể.'
      }
    }
  },
  'nuoc-h2o': {
    cover: {
      wiki: ['Waterfall', 'Water'],
      alt: 'Dòng nước tự nhiên luân chuyển trong vòng tuần hoàn trên Trái Đất',
      caption: 'Nước là dung môi phổ biến nhất trên hành tinh, nuôi dưỡng toàn bộ sinh quyển Trái Đất.'
    },
    inline: {
      electrolysis: {
        wiki: ['Electrolysis_of_water', 'Hofmann_voltameter'],
        infoboxOnly: false,
        alt: 'Thí nghiệm điện phân nước tách thành khí Hydrogen và khí Oxygen',
        caption: 'Điện phân nước cho thấy thể tích khí Hydrogen thoát ra ở cực âm luôn gấp đôi khí Oxygen ở cực dương.'
      },
      snowflake: {
        wiki: ['Snowflake'],
        infoboxOnly: false,
        preferPattern: /bentley|crystal|snowflake/i,
        alt: 'Tinh thể bông tuyết sáu cánh đối xứng chụp qua kính hiển vi',
        caption: 'Liên kết hiđro định hướng làm băng kết tinh theo cấu trúc lục giác rỗng nhẹ hơn nước lỏng.'
      },
      h2o3d: {
        wiki: ['Properties_of_water'],
        infoboxOnly: false,
        preferPattern: /3d|tetrahedral|hydrogen.*bond|water/i,
        alt: 'Mô hình mạng lưới liên kết hiđro giữa các phân tử nước',
        caption: 'Góc liên kết 104,5 độ biến mỗi phân tử nước thành một lưỡng cực điện dễ tạo mạng liên kết hiđro.'
      }
    }
  },
  'amoniac-nh3': {
    cover: {
      wiki: ['Haber_process', 'Ammonia'],
      infoboxOnly: false,
      preferPattern: /oppau|basf|reactor|ammonia.*(plant|tank|fountain)/i,
      avoidPattern: /fritz|haber.*\.(png|jpg)/i,
      commons: ['"Ammonia" plant OR tank', '"Liquid ammonia"'],
      alt: 'Hệ thống tháp tổng hợp Amoniac công nghiệp theo quy trình Haber-Bosch',
      caption: 'Amoniac là hợp chất nền tảng của ngành sản xuất phân đạm và hóa chất công nghiệp toàn cầu.'
    },
    inline: {
      haber: {
        wiki: ['Fritz_Haber'],
        infoboxOnly: false,
        alt: 'Chân dung nhà hóa học Fritz Haber — người tìm ra phản ứng tổng hợp Amoniac',
        caption: 'Fritz Haber (1868–1934) phát triển quy trình tổng hợp Amoniac trực tiếp từ khí Nitơ và Hydrogen ở áp suất cao.'
      },
      reactor: {
        wiki: ['Haber_process'],
        infoboxOnly: false,
        preferPattern: /oppau|reactor|basf|haber/i,
        alt: 'Tháp phản ứng áp suất cao quy trình Haber-Bosch lịch sử tại Đức',
        caption: 'Tháp cao áp đầu tiên của quy trình Haber–Bosch tại nhà máy BASF biến khí trời thành nguồn đạm nông nghiệp.'
      },
      fountain: {
        wiki: ['Ammonia_fountain'],
        infoboxOnly: false,
        alt: 'Thí nghiệm đài phun nước Amoniac nhuộm hồng chất chỉ thị phenolphtalein',
        caption: 'Độ tan cực lớn của khí NH3 tạo độ chênh áp suất hút dung dịch phun thành đài màu hồng cánh sen.'
      }
    }
  },
  'natri-clorua-nacl': {
    cover: {
      wiki: ['Halite'],
      alt: 'Tinh thể khoáng vật muối ăn Halite (NaCl) hình khối lập phương tự nhiên',
      caption: 'Tinh thể muối mỏ Halite trong suốt phản ánh sự sắp xếp tuần hoàn của ion Na+ và Cl-.'
    },
    inline: {
      saltpan: {
        wiki: ['Salt_evaporation_pond'],
        alt: 'Ruộng muối phơi nắng thu hoạch Natri clorua từ nước biển',
        caption: 'Khai thác muối bằng phương pháp bay hơi nước biển tồn tại hàng ngàn năm trong lịch sử nhân loại.'
      },
      lattice: {
        wiki: ['Sodium_chloride'],
        infoboxOnly: false,
        preferPattern: /3d|ionic|crystal|halite/i,
        alt: 'Mô hình mạng tinh thể lập phương tâm mặt tỉ lệ phối trí 6:6 của NaCl',
        caption: 'Mỗi ion Na+ được bao quanh bởi 6 ion Cl- lân cận trong đại mạng lưới lập phương bền vững.'
      },
      bragg: {
        wiki: ['William_Lawrence_Bragg'],
        infoboxOnly: false,
        alt: 'Chân dung nhà vật lý William Lawrence Bragg',
        caption: 'William Lawrence Bragg cùng cha giải mã thành công cấu trúc 3D của tinh thể NaCl bằng tia X năm 1913.'
      }
    }
  },
  'etanol-c2h5oh': {
    cover: {
      wiki: ['Ethanol'],
      alt: 'Mẫu dung dịch Etanol tinh khiết và cấu trúc đặc trưng',
      caption: 'Etanol là hợp chất hữu cơ phân cực có nhóm chức hydroxyl (-OH), tan vô hạn trong nước.'
    },
    inline: {
      alembic: {
        wiki: ['Alembic'],
        alt: 'Bình chưng cất cổ truyền alembic tách rượu tinh khiết qua chênh lệch điểm sôi',
        caption: 'Thiết bị ngưng tụ cổ truyền tận dụng điểm sôi 78,37 °C của Etanol để cô đặc khỏi nước.'
      },
      pubchem: {
        pubchemCid: 702,
        alt: 'Công thức cấu tạo phân tử Etanol từ PubChem CID 702',
        caption: 'Nhóm -OH phân cực gắn với gốc etyl không phân cực giúp Etanol vừa hòa tan nước vừa hòa tan chất hữu cơ.'
      },
      biofuel: {
        wiki: ['Ethanol_fuel'],
        alt: 'Ứng dụng nhiên liệu sinh học E10, E85 sản xuất từ lên men nông sản',
        caption: 'Xăng sinh học pha Etanol góp phần giảm phát thải carbon ròng trong giao thông hiện đại.'
      }
    }
  },
  'carbon-dioxide-co2': {
    cover: {
      wiki: ['Dry_ice'],
      alt: 'Đá khô CO2 rắn thăng hoa tạo làn khói trắng lạnh ở -78,5 độ C',
      caption: 'Carbon dioxide đóng rắn thành đá khô và thăng hoa trực tiếp thành khí ở áp suất khí quyển.'
    },
    inline: {
      black: {
        wiki: ['Joseph_Black'],
        infoboxOnly: false,
        alt: 'Chân dung nhà hóa học Scotland Joseph Black',
        caption: 'Joseph Black (1728–1799) chứng minh khí cố định CO2 tham gia vào phản ứng nung và tái kết tủa đá vôi.'
      },
      karst: {
        wiki: ['Stalactite', 'Hạ_Long_Bay'],
        alt: 'Thạch nhũ đá vôi hình thành từ phản ứng thuận nghịch của CO2 trong hang động',
        caption: 'Cân bằng CaCO3 + CO2 + H2O ⇌ Ca(HCO3)2 kiến tạo nên hệ thống hang động và thạch nhũ đá vôi kỳ vĩ.'
      },
      co2pubchem: {
        pubchemCid: 280,
        alt: 'Công thức cấu tạo thẳng đối xứng của phân tử Carbon dioxide',
        caption: 'Hai liên kết đôi C=O đối xứng góc 180 độ khiến momen lưỡng cực của phân tử CO2 tự triệt tiêu hoàn toàn.'
      }
    }
  },
  'metan-ch4': {
    cover: {
      wiki: ['Natural_gas', 'Methane'],
      infoboxOnly: false,
      preferPattern: /flame|burner|gas|clathrate|methane/i,
      commons: ['"Natural gas flame"', '"Methane flame"'],
      alt: 'Ngọn lửa xanh lam đặc trưng khi đốt cháy khí Metan tinh khiết',
      caption: 'Metan cháy hoàn toàn với ngọn lửa xanh lam tỏa nhiệt lớn và ít tạo muội than.'
    },
    inline: {
      davylamp: {
        wiki: ['Davy_lamp'],
        alt: 'Chiếc đèn an toàn Davy bọc lưới đồng ngăn nổ khí Metan trong hầm mỏ',
        caption: 'Lưới kim loại tản nhiệt nhanh trên đèn Davy giúp ngăn ngọn lửa lan ra hỗn hợp khí nổ trong hầm than.'
      },
      vanthoff: {
        wiki: ["Jacobus_Henricus_van_'t_Hoff"],
        infoboxOnly: false,
        alt: 'Chân dung nhà hóa học Jacobus Henricus van t Hoff',
        caption: 'Van t Hoff đề xuất mô hình Carbon tứ diện đều 109,5 độ năm 1874, khai sinh ngành Hóa học Lập thể.'
      },
      hydrate: {
        wiki: ['Methane_clathrate'],
        alt: 'Mẫu băng cháy Methane Hydrate cháy rực ngay trên nền băng tuyết',
        caption: 'Băng cháy (Methane Hydrate) dưới đáy đại dương giam giữ phân tử Metan trong lồng tinh thể nước đóng băng.'
      }
    }
  }
};

const ELEMENT_ALIAS = {
  H: ['Orion_Nebula', 'Hydrogen'],
  He: ['Solar_corona', 'Helium'],
  N: ['Liquid_nitrogen', 'Nitrogen'],
  O: ['Liquid_oxygen', 'Oxygen'],
  F: ['Fluorite', 'Fluorine'],
  Ne: ['Neon_sign', 'Neon'],
  Cl: ['Chlorine', 'Chlorine_gas'],
  Hg: ['Mercury_(element)'],
  S: ['Sulfur'],
  Au: ['Gold'],
  Pb: ['Lead'],
  Sn: ['Tin'],
  W: ['Tungsten'],
  Hf: ['Hafnium'],
  Fm: ['Fermium'],
  Md: ['Mendelevium'],
  No: ['Nobelium'],
  Lr: ['Lawrencium'],
  Rf: ['Rutherfordium'],
  Db: ['Dubnium'],
  Sg: ['Seaborgium'],
  Bh: ['Bohrium'],
  Hs: ['Hassium'],
  Mt: ['Meitnerium'],
  Ds: ['Darmstadtium'],
  Rg: ['Roentgenium'],
  Cn: ['Copernicium'],
  Nh: ['Nihonium'],
  Fl: ['Flerovium'],
  Mc: ['Moscovium'],
  Lv: ['Livermorium'],
  Ts: ['Tennessine'],
  Og: ['Oganesson']
};

// Direct compound specs keyed by doc id or formula where Wikipedia title needs precision or hydration separation.
const EXTRA_SPECS_BY_ID = {
  'litmus': { wiki: ['Litmus'], preferPattern: /litmus/i, realPhotoOnly: true },
  'universalindicator': { wiki: ['Universal_indicator'], preferPattern: /universal/i, realPhotoOnly: true },
  'ho-tinh-bot-c6h10o5': { wiki: ['Starch'], preferPattern: /cornstarch/i, realPhotoOnly: true },
  'ho-tinh-bot-chi-thi-1-c6h10o5': { wiki: ['Starch', "Lugol's_iodine"], preferPattern: /potato|granules|iodine/i, realPhotoOnly: true },
  'tinh-the-xesi-clorua-cscl': { wiki: ['Caesium_chloride'], preferPattern: /cesium-chloride-3d|cscl|crystal/i, realPhotoOnly: false, pubchemName: 'Cesium chloride' },
  'tinh-the-canxi-florua-caf2': { wiki: ['Fluorite', 'Calcium_fluoride'], preferPattern: /fluorite/i, realPhotoOnly: true },
  'dong-ii-sunfat-ngam-nuoc-tinh-the-lam-cuso4-5h2o': { exactFirst: true, exactCommonsFile: 'Copper sulfate pentahydrate crystals.jpg', exactCommonsDesc: 'Tinh thể màu xanh lam đặc trưng của Đồng(II) sunfat ngậm 5 nước (CuSO4·5H2O).', wiki: ['Copper(II)_sulfate', 'Chalcanthite'], pubchemCid: 24463 },
  'dong-ii-sunfat-cuso4': { commons: ['"Copper(II) sulfate anhydrous"', '"anhydrous copper sulfate"'], pubchemCid: 24462 },
  'coban-ii-clorua-ngam-6-nuoc-do-hong-cocl2-6h2o': { wiki: ['Cobalt(II)_chloride'], preferPattern: /hexahydrate/i, realPhotoOnly: true, pubchemName: 'Cobalt(II) chloride hexahydrate' },
  'coban-ii-clorua-cocl2': { commons: ['"Cobalt(II) chloride" anhydrous'], pubchemCid: 24288 },
  'niken-ii-sunfat-ngam-6-nuoc-luc-bao-niso4-6h2o': { wiki: ['Nickel(II)_sulfate'], preferPattern: /hexahydrate|nickel/i, realPhotoOnly: true, pubchemName: 'Nickel(II) sulfate hexahydrate' },
  'sat-ii-sunfat-ngam-7-nuoc-thanh-phan-feso4-7h2o': { wiki: ['Iron(II)_sulfate'], preferPattern: /sulfate/i, realPhotoOnly: true, pubchemName: 'Iron(II) sulfate heptahydrate' },
  'glucozo-c6h12o6': { exactFirst: true, exactCommonsFile: 'Beta-D-glucose-3D-balls.png', exactCommonsDesc: 'Mô hình phân tử 3D Beta-D-Glucozo (C6H12O6) từ Wikimedia Commons.', wiki: ['Glucose'], pubchemCid: 5793 },
  'fructozo-c6h12o6': { wiki: ['Fructose'], preferPattern: /Table_fructose|3D-bs|3D/i, pubchemCid: 5984 },
  'butan-c4h10': { wiki: ['Butane'], preferPattern: /3D-balls/i, pubchemCid: 7843 },
  'isobutan-c4h10': { wiki: ['Isobutane'], preferPattern: /3D-balls/i, pubchemCid: 6360 },
  'axetilen-c2h2': { wiki: ['Acetylene'], preferPattern: /3D-vdW|3D-balls/i, pubchemCid: 6326 },
  'propen-c3h6': { wiki: ['Propene'], preferPattern: /3D-bs|3D-sf/i, pubchemCid: 8252 },
  'hidro-h2': { wiki: ['Hydrogen'], preferPattern: /discharge/i, realPhotoOnly: true, pubchemCid: 783 },
  'nito-n2': { wiki: ['Nitrogen'], preferPattern: /glow|discharge|fluessiger|nitrogen/i, commons: ['"Nitrogen discharge tube"', '"Dinitrogen" 3D'], pubchemCid: 947 },
  'oxi-o2': { wiki: ['Oxygen'], preferPattern: /liquid_oxygen|discharge|oxygen/i, commons: ['"Liquid oxygen"', '"Dioxygen" 3D'], pubchemCid: 977 },
  'cl2-cl2': { wiki: ['Chlorine'], preferPattern: /chlorine|ampoule|gas/i, commons: ['"Chlorine ampoule"', '"Chlorine gas"'], pubchemCid: 24526 },
  'nuoc-brom-br2-br2': { wiki: ['Bromine'], commons: ['"Bromine water"'], realPhotoOnly: true, pubchemCid: 24408 },
  'dung-dich-iot-i2': { wiki: ["Lugol's_iodine", 'Iodine'], realPhotoOnly: true, pubchemCid: 807 },
  'chi-ii-cromat-pbcro4': { wiki: ['Lead(II)_chromate'], realPhotoOnly: true, pubchemCid: 24460 },
  'chi-ii-iodua-mua-vang-pbi2': { wiki: ['Lead(II)_iodide'], realPhotoOnly: true, pubchemCid: 24931 },
  'ag2o-ag2o': { wiki: ['Silver_oxide'], commons: ['"Silver oxide"'], realPhotoOnly: true, smiles: '[Ag+].[Ag+].[O-2]' },
  'sat-iii-hidroxit-fe-oh-3': { wiki: ['Iron(III)_oxide-hydroxide'], commons: ['"Iron(III) hydroxide"'], realPhotoOnly: false, smiles: 'O[Fe](O)O' },
  'na2zn-oh-4-na2zn-oh-4': { pubchemName: 'Sodium zincate', smiles: '[Na+].[Na+].O[Zn-2](O)(O)O' },
  'naal-oh-4-naal-oh-4': { smiles: '[Na+].O[Al-](O)(O)O', pubchemName: 'Sodium tetrahydroxoaluminate' },
  'naalo2-naalo2': { pubchemCid: 14766, pubchemName: 'Sodium aluminate' }
};

const FORMULA_TO_ENGLISH = {
  'Ag2O': 'Silver oxide',
  'Al2O3': 'Aluminium oxide',
  'BaO': 'Barium oxide',
  'CdO': 'Cadmium oxide',
  'Cl2': 'Chlorine',
  'CoO': 'Cobalt(II) oxide',
  'Cr2O3': 'Chromium(III) oxide',
  'FeO': 'Iron(II) oxide',
  'HBr': 'Hydrogen bromide',
  'HI': 'Hydrogen iodide',
  'K2O': 'Potassium oxide',
  'KNO2': 'Potassium nitrite',
  'Li2O': 'Lithium oxide',
  'MgO': 'Magnesium oxide',
  'MnO': 'Manganese(II) oxide',
  'Na2O': 'Sodium oxide',
  'NaNO2': 'Sodium nitrite',
  'NiO': 'Nickel(II) oxide',
  'NO': 'Nitric oxide',
  'PbO': 'Lead(II) oxide',
  'SrO': 'Strontium oxide',
  'ZnO': 'Zinc oxide',
  'C6H14': 'Hexane',
  'H2C2O4': 'Oxalic acid',
  'KIO3': 'Potassium iodate',
  'NaHSO3': 'Sodium bisulfite',
  'NaAlO2': 'Sodium aluminate',
  'Na2Zn(OH)4': 'Sodium zincate',
  'C2H5COOC2H5': 'Ethyl propionate',
  'C2H5COOC3H7': 'Propyl propionate',
  'C2H5COOC4H9': 'Butyl propionate',
  'C2H5COOCH3': 'Methyl propionate',
  'C2H5COOH': 'Propanoic acid',
  'C2H5COOK': 'Potassium propionate',
  'C2H5COOLi': 'Lithium propionate',
  'C2H5COONa': 'Sodium propionate',
  'C3H7COOC2H5': 'Ethyl butyrate',
  'C3H7COOC3H7': 'Propyl butyrate',
  'C3H7COOC4H9': 'Butyl butyrate',
  'C3H7COOCH3': 'Methyl butyrate',
  'C3H7COOH': 'Butyric acid',
  'C3H7COOK': 'Potassium butyrate',
  'C3H7COOLi': 'Lithium butyrate',
  'C3H7COONa': 'Sodium butyrate',
  'CH3CH2CH2CH2OH': '1-Butanol',
  'CH3CH2CH2OH': '1-Propanol',
  'CH3COOC3H7': 'Propyl acetate',
  'CH3COOC4H9': 'Butyl acetate',
  'CH3COOCH3': 'Methyl acetate',
  'HCOOC2H5': 'Ethyl formate',
  'HCOOC3H7': 'Propyl formate',
  'HCOOC4H9': 'Butyl formate',
  'HCOOCH3': 'Methyl formate'
};

const VI_CATIONS = [
  ['sắt(iii)', 'Iron(III)'], ['sat(iii)', 'Iron(III)'],
  ['sắt(ii)', 'Iron(II)'], ['sat(ii)', 'Iron(II)'],
  ['đồng(ii)', 'Copper(II)'], ['dong(ii)', 'Copper(II)'],
  ['chì(ii)', 'Lead(II)'], ['chi(ii)', 'Lead(II)'],
  ['thiếc(ii)', 'Tin(II)'], ['thiec(ii)', 'Tin(II)'],
  ['mangan(ii)', 'Manganese(II)'],
  ['coban(ii)', 'Cobalt(II)'],
  ['niken(ii)', 'Nickel(II)'],
  ['crom(iii)', 'Chromium(III)'],
  ['bạc', 'Silver'], ['bac', 'Silver'],
  ['nhôm', 'Aluminium'], ['nhom', 'Aluminium'],
  ['bari', 'Barium'],
  ['canxi', 'Calcium'],
  ['cadimi', 'Cadmium'],
  ['kali', 'Potassium'],
  ['liti', 'Lithium'],
  ['magie', 'Magnesium'],
  ['natri', 'Sodium'],
  ['amoni', 'Ammonium'],
  ['stronti', 'Strontium'],
  ['kẽm', 'Zinc'], ['kem', 'Zinc']
];

const VI_ANIONS = [
  ['hiđrocacbonat', 'bicarbonate'], ['hidrocacbonat', 'bicarbonate'],
  ['hiđroxit', 'hydroxide'], ['hidroxit', 'hydroxide'],
  ['cacbonat', 'carbonate'],
  ['đicromat', 'dichromate'], ['dicromat', 'dichromate'],
  ['cromat', 'chromate'],
  ['photphat', 'phosphate'],
  ['nitrat', 'nitrate'],
  ['nitrit', 'nitrite'],
  ['sunfat', 'sulfate'],
  ['sunfit', 'sulfite'],
  ['sunfua', 'sulfide'],
  ['bromua', 'bromide'],
  ['iođua', 'iodide'], ['iodua', 'iodide'],
  ['clorua', 'chloride'],
  ['florua', 'fluoride'],
  ['axetat', 'acetate'],
  ['fomat', 'formate'],
  ['oxalat', 'oxalate']
];

function cleanEnglishName(raw) {
  if (!raw) return '';
  let s = String(raw)
    .replace(/\([^)]*(?:0\.\d+M|\d+%|Organic Solvent|Golden Rain|Rust|Quicklime|C6H14)[^)]*\)/gi, '')
    .replace(/\b(?:Solution|Indicator|Powder|Crystals?|Solvent)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.includes('/')) {
    const parts = s.split('/').map(p => p.trim()).filter(Boolean);
    s = parts.find(p => !/limewater|indicator/i.test(p)) || parts[0] || s;
  }
  return s.replace(/\s*\(\s*\)\s*/g, '').trim();
}

function translateViChemical(nameVi) {
  if (!nameVi) return null;
  const low = String(nameVi).toLowerCase().replace(/^dung dịch\s+/i, '').trim();
  const cat = VI_CATIONS.find(([vi]) => low.startsWith(vi + ' '));
  const ani = VI_ANIONS.find(([vi]) => low.includes(' ' + vi));
  if (cat && ani) return `${cat[1]} ${ani[1]}`;
  return null;
}

function extractCidFromSource(url) {
  const m = /pubchem\.ncbi\.nlm\.nih\.gov\/compound\/(\d+)/i.exec(String(url || ''));
  return m ? Number(m[1]) : null;
}

const EXTRA_SPECS_OVERRIDES = {
  'oxi-o2': {
    exactFirst: true,
    exactCommonsFile: 'Oxygen discharge tube.jpg',
    exactCommonsDesc: 'Ống phóng điện chứa khí Oxy (O2) phát quang ánh tím nhạt đặc trưng.'
  },
  'cl2-cl2': {
    exactFirst: true,
    exactCommonsFile: 'Chlorine gas in high concentration.jpg',
    exactCommonsDesc: 'Khí Clo (Cl2) màu vàng lục đặc trưng chứa trong bình thủy tinh thí nghiệm.'
  },
  'nuoc-brom-br2-br2': {
    exactFirst: true,
    exactCommonsFile: 'Bromine water.jpg',
    exactCommonsDesc: 'Dung dịch nước Brom (Br2) màu vàng nâu đặc trưng dùng làm thuốc thử nhận biết anken.'
  },
  'tinh-the-canxi-florua-caf2': {
    exactFirst: true,
    exactCommonsFile: 'Calcium-fluoride-3D-ionic.png',
    exactCommonsDesc: 'Mô hình mạng tinh thể lập phương phối trí 8:4 của Canxi florua (CaF2).'
  },
  'hi-hi': {
    exactFirst: true,
    exactCommonsFile: 'Hydrogen-iodide-elpot-transparent-3D-balls.png',
    exactCommonsDesc: 'Mô hình phân tử Hidro iođua (HI) minh họa liên kết phân cực từ Wikimedia Commons.'
  },
  'sat-ii-fomat-fe-hcoo-2': { pubchemCid: 6451504, pubchemName: 'Iron(2+) diformate', smiles: '[Fe+2].C(=O)[O-].C(=O)[O-]' },
  'sat-ii-bromua-febr2': { pubchemCid: 82240, wiki: ['Iron(II)_bromide'] },
  'sat-ii-iodua-fei2': {
    pubchemCid: 82220,
    exactCommonsFile: 'Kristallstruktur Magnesiumiodid 3.png',
    exactCommonsDesc: 'Mô hình mạng tinh thể lớp đặc trưng của sắt(II) iodua (FeI2)'
  },
  'naal-oh-4-naal-oh-4': {
    exactCommonsFile: 'Sodium-tetrahydroxoaluminate-3D-vdW.png',
    exactCommonsDesc: 'Mô hình không gian 3D của anion phức tetrahydroxoaluminat [Al(OH)4]-'
  },
  'naalo2-naalo2': { pubchemCid: 14766, wiki: ['Sodium_aluminate'] },
  'na2zn-oh-4-na2zn-oh-4': { pubchemCid: 166652, wiki: ['Sodium_zincate'] },
  'hexan-dung-moi-huu-co-c6h14-c6h14': { pubchemCid: 8058, wiki: ['Hexane'] },
  'axit-oxalic-0-1m-h2c2o4': { pubchemCid: 971, wiki: ['Oxalic_acid'] },
  'kali-iodat-0-05m-kio3': { pubchemCid: 23665710, wiki: ['Potassium_iodate'] },
  'natri-bisunfit-0-05m-nahso3': { pubchemCid: 23665763, wiki: ['Sodium_bisulfite'] },
  'ho-tinh-bot-chi-thi-1-c6h10o5': { wiki: ['Starch'], commons: ['Cornstarch mixed with water'] },
  'dong-ii-sunfat-ngam-nuoc-tinh-the-lam-cuso4-5h2o': {
    exactFirst: true,
    exactCommonsFile: 'Copper sulfate pentahydrate crystals.jpg',
    exactCommonsDesc: 'Tinh thể màu xanh lam đặc trưng của Đồng(II) sunfat ngậm 5 nước (CuSO4·5H2O).',
    pubchemCid: 24463,
    wiki: ['Copper(II)_sulfate', 'Chalcanthite']
  },
  'toluen-c7h8': {
    exactFirst: true,
    exactCommonsFile: 'Bottle of Toluene.jpg',
    exactCommonsDesc: 'Chai dung môi Toluen (C7H8) trong phòng thí nghiệm.',
    pubchemCid: 1140,
    wiki: ['Toluene']
  },
  'bac-clorua-agcl': {
    exactFirst: true,
    exactCommonsFile: 'Silver chloride (AgCl).jpg',
    exactCommonsDesc: 'Mẫu chất và kết tủa trắng Bạc clorua (AgCl) đặc trưng.',
    pubchemCid: 24561,
    wiki: ['Silver_chloride']
  },
  'natri-fomat-hcoona': { wiki: ['Sodium_formate'], avoidPattern: /^Sodium-3D\.png$/i, pubchemCid: 2723810 },
  'coban-ii-clorua-ngam-6-nuoc-do-hong-cocl2-6h2o': { pubchemCid: 24643, wiki: ['Cobalt(II)_chloride'], preferPattern: /Cobaltous_chloride|hexahydrate/i },
  'niken-ii-sunfat-ngam-6-nuoc-luc-bao-niso4-6h2o': { pubchemCid: 5284429, wiki: ['Nickel(II)_sulfate'], preferPattern: /hydrate|hexahydrate/i },
  'sat-ii-sunfat-ngam-7-nuoc-thanh-phan-feso4-7h2o': { pubchemCid: 62662, wiki: ['Melanterite', 'Iron(II)_sulfate'], preferPattern: /Melanterite|heptahydrate/i }
};

function deriveCompoundQueries(item) {
  const spec = { ...(EXTRA_SPECS_BY_ID[item.id] || {}), ...(EXTRA_SPECS_OVERRIDES[item.id] || {}) };
  const cleanedEn = cleanEnglishName(item.name_en);
  const formulaEn = FORMULA_TO_ENGLISH[item.formula];
  const translatedVi = translateViChemical(item.name_vi);
  const baseName = spec.pubchemName || cleanedEn || formulaEn || translatedVi || item.formula;

  const wiki = [...new Set([
    ...(spec.wiki || []),
    cleanedEn ? cleanedEn.replace(/\s+/g, '_') : null,
    formulaEn ? formulaEn.replace(/\s+/g, '_') : null,
    translatedVi ? translatedVi.replace(/\s+/g, '_') : null
  ].filter(Boolean))];

  const pubchemNames = [...new Set([
    spec.pubchemName,
    cleanedEn,
    formulaEn,
    translatedVi,
    cleanedEn?.replace(/\bAluminium\b/g, 'Aluminum'),
    translatedVi?.replace(/\bAluminium\b/g, 'Aluminum'),
    baseName
  ].filter(Boolean))];

  return {
    baseName,
    cid: spec.pubchemCid ?? item.cid ?? extractCidFromSource(item.identitySource) ?? null,
    wiki,
    commons: spec.commons || [],
    pubchemNames,
    smiles: spec.smiles || null,
    preferPattern: spec.preferPattern || null,
    realPhotoOnly: spec.realPhotoOnly ?? false
  };
}

async function fetchPubChemByCidWithFallback(cid) {
  const std = await fetchPubChemByCid(cid);
  if (std) return std;
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=1600x1200`;
  const dl = await downloadBuffer(url);
  if (!dl) return null;
  return {
    ...dl,
    sourceName: `PubChem (CID ${cid})`,
    sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    kind: 'pubchem'
  };
}

async function fetchExactCommonsFile(fileTitle) {
  await throttleWiki();
  const normalized = String(fileTitle || '').replace(/^File:/i, '');
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent('File:' + normalized)}&prop=imageinfo&iiprop=url|size&iiurlwidth=640&format=json`;
  const res = await fetchWithRetry(apiUrl, WIKI_HEADERS);
  if (!res || !res.ok) return null;
  let data;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const page = Object.values(data?.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  const src = info?.thumburl || info?.url;
  if (!src || !isUsableWikiUrl(src)) return null;
  const dl = await downloadBuffer(src);
  if (!dl) return null;
  return {
    ...dl,
    sourceName: 'Wikimedia Commons',
    sourceUrl: info?.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(normalized)}`,
    mediaTitle: normalized,
    kind: REAL_PHOTO_RE.test(normalized) && !MODEL_3D_NAME_RE.test(normalized) ? 'photo' : 'model'
  };
}

function collectReferenceGroups() {
  const subjects = [...readJson('shared/compounds.json'), ...readJson('shared/structure-catalog.generated.json')];
  const authored = readJson('trung-tam/src/data/index.json');
  const elements = readJson('shared/elements.json');
  const byElement = new Map(elements.map(e => [e.symbol, e]));

  function identity(s) {
    if (s.material) return 'material:' + s.materialLabel;
    if (s.kind === 'crystal') return s.id;
    if (s.cid) return 'cid:' + s.cid;
    if (/^[A-Z][a-z]?$/.test(s.formula)) return 'element:' + s.formula;
    return s.family === 'organic' ? 'named:' + s.formula + ':' + s.name_vi : 'formula:' + s.formula;
  }

  const existing = new Map();
  for (const a of authored) {
    if (!fs.existsSync(documentFile(a))) continue;
    const full = readJson(documentFile(a));
    if (full.content.length < 2500 || !/^## /m.test(full.content) || !full.content.includes('<details>') || !full.content.includes('https://')) continue;
    for (const id of a.substanceIds ?? []) existing.set(id, a.id);
    if (a.id === '001_H') for (const s of subjects.filter(x => x.formula === 'H' && !x.material)) existing.set(s.id, a.id);
  }

  const groups = new Map();
  for (const s of subjects) {
    const key = identity(s);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const usedSlugs = new Set(authored.map(a => a.slug ?? a.id));
  const refs = [];
  for (const [key, group] of groups) {
    if (group.some(s => existing.has(s.id))) continue;
    const s = group.find(x => x.structure) ?? group[0];
    const counts = parseFormula(s.formula);
    const atomCount = Object.values(counts).reduce((a, b) => a + b, 0);
    const element = Object.keys(counts).length === 1 && atomCount === 1 ? byElement.get(s.formula) : null;
    const material = Boolean(s.material || s.modelNote?.includes('đơn vị lặp'));
    const name = element?.name_vi ?? s.name_vi ?? s.name_en ?? s.formula;
    const baseSlug = substanceSlug(`${s.material ? s.materialLabel : name} ${s.material ? '' : s.formula}`);
    let id = baseSlug;
    if (usedSlugs.has(id)) id = `${baseSlug}-${substanceSlug(s.kind ?? s.family ?? 'chat')}`;
    if (usedSlugs.has(id)) id += `-${substanceSlug(s.cid ? 'pubchem-' + s.cid : s.id)}`;
    usedSlugs.add(id);
    refs.push({
      id,
      key,
      name,
      formula: s.formula,
      cid: s.cid || null,
      name_vi: s.name_vi || null,
      name_en: s.name_en || null,
      kind: s.kind || null,
      family: s.family || null,
      element,
      material,
      isomers: isomerGroupFor(s),
      identitySource: s.identitySource || null
    });
  }
  return { elements, refs };
}

function saveBinary(dir, baseName, ext, buf) {
  removeOtherExts(dir, baseName, ext);
  fs.writeFileSync(path.join(dir, `${baseName}.${ext}`), buf);
}

async function resolveSpecToFile(dir, baseName, spec, { excludeUrls = new Set(), previousMeta = null } = {}) {
  if (!FORCE) {
    const existing = findExistingFile(dir, baseName);
    if (existing && previousMeta?.image?.endsWith(`/${baseName}.${existing.ext}`)) {
      return { ...previousMeta, hash: sha256(existing.buf), reused: true };
    }
  }

  let picked = null;
  if (spec.pubchemCid && !spec.wiki?.length && !spec.commons?.length) {
    picked = await fetchPubChemByCid(spec.pubchemCid);
  } else {
    if (spec.wiki?.length) {
      picked = await pickWikiCandidate(spec.wiki, {
        infoboxOnly: spec.infoboxOnly ?? true,
        realPhotoOnly: spec.realPhotoOnly ?? false,
        preferPattern: spec.preferPattern || null,
        avoidPattern: spec.avoidPattern || null,
        excludeUrls
      });
    }
    if (!picked && spec.commons?.length) {
      picked = await searchCommonsPhoto(spec.commons, { excludeUrls, realPhotoOnly: spec.realPhotoOnly ?? true });
    }
    if (!picked && spec.pubchemCid) {
      picked = await fetchPubChemByCid(spec.pubchemCid);
    }
  }
  if (!picked) return null;

  saveBinary(dir, baseName, picked.ext, picked.buf);
  const relDir = path.relative(path.resolve('trung-tam/public'), dir).replace(/\\/g, '/');
  return {
    image: `/${relDir}/${baseName}.${picked.ext}`,
    sourceName: picked.sourceName,
    sourceUrl: picked.sourceUrl,
    kind: picked.kind || 'photo',
    originUrl: normalizeUrlKey(picked.url),
    hash: sha256(picked.buf)
  };
}

function cleanupLegacyFlatPhotos() {
  const keepFiles = new Set(['authored-hydrogen-h.jpg', 'topic-default.jpg']);
  for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (keepFiles.has(entry.name)) continue;
    fs.unlinkSync(path.join(OUT_DIR, entry.name));
  }
}

async function main() {
  const prev = fs.existsSync(MAP_FILE) ? readJson(MAP_FILE) : {};
  const { elements, refs } = collectReferenceGroups();

  const result = {
    generatedAt: new Date().toISOString(),
    authored: {},
    authoredInline: {},
    elements: {},
    elementMeta: {},
    substances: {},
    isomerExamples: {},
    topics: {}
  };

  // 1. Authored docs cover + contextual inline images under docs/<slug>/
  console.log('--- Fetching media for 19 authored docs ---');
  for (const [slug, docSpec] of Object.entries(AUTHORED_SPECS)) {
    const docDir = path.join(DOCS_DIR, slug);
    fs.mkdirSync(docDir, { recursive: true });
    const prevCover = prev.authoredMeta?.[slug] || (prev.authored?.[slug] ? { image: prev.authored[slug] } : null);
    let cover = await resolveSpecToFile(docDir, 'cover', docSpec.cover, { previousMeta: prevCover });
    if (!cover) {
      // Relax infoboxOnly if first pass missed
      cover = await resolveSpecToFile(docDir, 'cover', { ...docSpec.cover, infoboxOnly: false }, { previousMeta: prevCover });
    }
    if (!cover) throw new Error(`Failed cover for authored doc: ${slug}`);
    result.authored[slug] = cover.image;
    result.authoredInline[slug] = {};

    const usedInDoc = new Set(cover.originUrl ? [cover.originUrl] : []);
    for (const [key, inSpec] of Object.entries(docSpec.inline || {})) {
      const prevIn = prev.authoredInline?.[slug]?.[key];
      let got = await resolveSpecToFile(docDir, key, inSpec, { excludeUrls: usedInDoc, previousMeta: prevIn });
      if (!got) {
        got = await resolveSpecToFile(docDir, key, { ...inSpec, infoboxOnly: false }, { previousMeta: prevIn });
      }
      if (!got) throw new Error(`Failed inline image ${slug}/${key}`);
      if (got.originUrl) usedInDoc.add(got.originUrl);
      result.authoredInline[slug][key] = {
        image: got.image,
        alt: inSpec.alt,
        caption: inSpec.caption,
        sourceName: got.sourceName,
        sourceUrl: got.sourceUrl,
        kind: got.kind
      };
    }
    console.log(`authored ${slug}: cover=${cover.image} (+${Object.keys(result.authoredInline[slug]).length} inline)`);
  }

  // Keep TaiLieuSoPage.tsx:219 and DocCard.tsx:22 fallback paths valid on disk
  const hCoverDisk = path.resolve('trung-tam/public' + result.authored['hydrogen-h']);
  if (fs.existsSync(hCoverDisk)) fs.copyFileSync(hCoverDisk, path.join(OUT_DIR, 'authored-hydrogen-h.jpg'));
  const labTopic = await resolveSpecToFile(OUT_DIR, 'topic-default', { wiki: ['Laboratory_glassware', 'Laboratory'], realPhotoOnly: true }, { previousMeta: prev.topics?.default ? { image: prev.topics.default } : null });
  if (labTopic) result.topics.default = labTopic.image;

  // 2. All 118 elements under elements/<sym>.<ext>
  console.log('--- Fetching photos for all 118 elements ---');
  for (const el of elements) {
    const prevEl = prev.elementMeta?.[el.symbol];
    if (!FORCE) {
      const existingNew = findExistingFile(ELEMENTS_DIR, el.symbol);
      if (existingNew && prevEl?.image?.endsWith(`/${el.symbol}.${existingNew.ext}`)) {
        result.elements[el.symbol] = prevEl.image;
        result.elementMeta[el.symbol] = prevEl;
        continue;
      }
      const existingLegacy = findExistingFile(OUT_DIR, `el-${el.symbol.toLowerCase()}`);
      if (existingLegacy) {
        saveBinary(ELEMENTS_DIR, el.symbol, existingLegacy.ext, existingLegacy.buf);
        const rel = `/assets/library/photos/elements/${el.symbol}.${existingLegacy.ext}`;
        result.elements[el.symbol] = rel;
        result.elementMeta[el.symbol] = {
          image: rel,
          sourceName: 'Wikipedia / Wikimedia Commons',
          sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(el.name_en)}`,
          alt: `Nguyên tố ${el.name_vi} (${el.symbol})`,
          caption: `Hình ảnh minh họa nguyên tố ${el.name_vi} (${el.symbol}, Z = ${el.z}).`,
          kind: 'photo'
        };
        continue;
      }
    }

    const titles = [...new Set([...(ELEMENT_ALIAS[el.symbol] || []), el.name_en, `${el.name_en}_(element)`])];
    let picked = await pickWikiCandidate(titles, { infoboxOnly: el.z <= 99, realPhotoOnly: false });
    if (!picked) {
      picked = await searchCommonsPhoto([`"${el.name_en}" element`, el.name_en], { realPhotoOnly: false });
    }
    if (!picked) throw new Error(`Failed element photo: ${el.symbol} (${el.name_en})`);
    saveBinary(ELEMENTS_DIR, el.symbol, picked.ext, picked.buf);
    const rel = `/assets/library/photos/elements/${el.symbol}.${picked.ext}`;
    result.elements[el.symbol] = rel;
    result.elementMeta[el.symbol] = {
      image: rel,
      sourceName: picked.sourceName,
      sourceUrl: picked.sourceUrl,
      alt: `Nguyên tố ${el.name_vi} (${el.symbol})`,
      caption: `Hình ảnh tư liệu nguyên tố ${el.name_vi} (${el.symbol}, Z = ${el.z}).`,
      kind: picked.kind
    };
  }
  console.log(`elements: ${Object.keys(result.elements).length}/118`);

  // 3. All 351 non-element reference docs under substances/<doc-id>.<ext>
  console.log('--- Fetching unique visuals for 351 non-element reference docs ---');
  const nonElements = refs.filter(r => !r.element);
  const usedUrls = new Set();
  const usedHashes = new Set();
  const preservedMap = new Map();

  if (!FORCE) {
    for (const item of nonElements) {
      const prevSub = prev.substances?.[item.id];
      const existing = findExistingFile(SUBSTANCES_DIR, item.id);
      if (
        existing &&
        prevSub?.image?.endsWith(`/${item.id}.${existing.ext}`) &&
        !prevSub.image.includes('topic-organic') &&
        (!UPGRADE_2D || !isLegacy2DRecord(prevSub))
      ) {
        const h = sha256(existing.buf);
        if (!usedHashes.has(h)) {
          usedHashes.add(h);
          if (prevSub.originUrl) usedUrls.add(prevSub.originUrl);
          preservedMap.set(item.id, prevSub);
        }
      }
    }
    console.log(`Pre-preserved ${preservedMap.size}/${nonElements.length} substances (${nonElements.length - preservedMap.size} to resolve/upgrade).`);
  }

  async function ensureIsomerExamples(item) {
    if (!item.isomers) return;
    for (const ex of item.isomers.examples.slice(0, 2)) {
      const exCid = ex.cid;
      if (result.isomerExamples[exCid]) continue;
      const exExisting = !FORCE ? findExistingFile(ISOMER_EXAMPLES_DIR, `cid-${exCid}`) : null;
      const prevEx = prev.isomerExamples?.[exCid];
      if (exExisting && prevEx && (!UPGRADE_2D || !isLegacy2DRecord(prevEx))) {
        result.isomerExamples[exCid] = prevEx;
        continue;
      }
      const dl = (await fetchPubChem3dByCid(exCid)) || (await fetchPubChemByCid(exCid));
      if (dl) {
        saveBinary(ISOMER_EXAMPLES_DIR, `cid-${exCid}`, dl.ext, dl.buf);
        result.isomerExamples[exCid] = {
          image: `/assets/library/photos/substances/isomers/cid-${exCid}.${dl.ext}`,
          alt: `Mô hình cấu trúc ${ex.name} (${item.formula})`,
          caption: `Cấu tạo ${ex.name} (${ex.condensed}) — ${dl.kind === 'structure-3d' ? 'Mô hình 3D PubChem' : 'PubChem'} CID ${exCid}.`,
          sourceName: dl.sourceName,
          sourceUrl: dl.sourceUrl,
          kind: dl.kind,
          originUrl: dl.url ? normalizeUrlKey(dl.url) : null
        };
      }
    }
  }

  for (let idx = 0; idx < nonElements.length; idx++) {
    const item = nonElements[idx];
    const preserved = preservedMap.get(item.id);
    if (preserved) {
      result.substances[item.id] = preserved;
      await ensureIsomerExamples(item);
      continue;
    }

    let chosen = null;

    if (item.isomers) {
      await ensureIsomerExamples(item);
      const examples = item.isomers.examples;

      // Prefer a unique Wikimedia 3D ball-and-stick render for the isomer group card, else PubChem 3D, else 2D
      for (const coverEx of examples) {
        const wikiTitle = coverEx.name.replace(/\s+/g, '_');
        const wiki3d = await pickWikiCandidate([wikiTitle], {
          lang: 'en',
          infoboxOnly: false,
          model3dOnly: true,
          titleToken: normalizeMatchToken(coverEx.name),
          excludeUrls: usedUrls
        });
        if (wiki3d && !usedHashes.has(sha256(wiki3d.buf))) {
          chosen = {
            ...wiki3d,
            alt: `Mô hình 3D đồng phân tiêu biểu ${coverEx.name} của ${item.formula}`,
            caption: `Mô hình 3D ${coverEx.name} (${coverEx.condensed}) thuộc nhóm đồng phân ${item.formula}.`
          };
          break;
        }
      }
      if (!chosen) {
        for (const coverEx of examples) {
          const dl = (await fetchPubChem3dByCid(coverEx.cid)) || (await fetchPubChemByCid(coverEx.cid));
          if (dl && !usedHashes.has(sha256(dl.buf))) {
            chosen = {
              ...dl,
              alt: `Cấu tạo đồng phân tiêu biểu ${coverEx.name} của ${item.formula}`,
              caption: `Minh họa cấu tạo ${coverEx.name} (${coverEx.condensed}) thuộc nhóm đồng phân ${item.formula}.`
            };
            break;
          }
        }
      }
    } else {
      const q = deriveCompoundQueries(item);
      const spec = { ...(EXTRA_SPECS_BY_ID[item.id] || {}), ...(EXTRA_SPECS_OVERRIDES[item.id] || {}) };
      const nameFormula = item.name === item.formula || String(item.name).includes(`(${item.formula})`) ? item.name : `${item.name} (${item.formula})`;
      const baseToken = normalizeMatchToken(q.baseName);

      if (spec.exactFirst && spec.exactCommonsFile) {
        const exact = await fetchExactCommonsFile(spec.exactCommonsFile);
        if (exact && !usedHashes.has(sha256(exact.buf))) {
          chosen = {
            ...exact,
            alt: `Minh họa cấu trúc của ${item.name}`,
            caption: spec.exactCommonsDesc || `Mô hình cấu trúc ${nameFormula} từ Wikimedia Commons.`
          };
          console.log(`[commons-exact] ${item.id} <- ${spec.exactCommonsFile}`);
        }
      }

      // Step A: Real infobox photo (.jpg/.jpeg/.webp) on English Wikipedia
      if (!chosen && q.wiki.length) {
        const wikiPhoto = await pickWikiCandidate(q.wiki, {
          lang: 'en',
          infoboxOnly: !spec?.wiki?.length || spec?.realPhotoOnly !== false,
          realPhotoOnly: true,
          preferPattern: q.preferPattern,
          avoidPattern: spec.avoidPattern || null,
          excludeUrls: usedUrls
        });
        if (wikiPhoto && !usedHashes.has(sha256(wikiPhoto.buf))) {
          chosen = {
            ...wikiPhoto,
            alt: `Mẫu chất hoặc minh họa thực nghiệm của ${item.name}`,
            caption: `Hình ảnh tư liệu thực nghiệm của ${nameFormula}.`
          };
        }
      }

      // Step B: 3D ball-and-stick / spacefill / crystal render on Wikipedia (never 2D skeletal)
      if (!chosen && q.wiki.length) {
        let wiki3d = await pickWikiCandidate(q.wiki, {
          lang: 'en',
          infoboxOnly: true,
          model3dOnly: true,
          preferPattern: q.preferPattern,
          avoidPattern: spec.avoidPattern || null,
          excludeUrls: usedUrls
        });
        if (!wiki3d && baseToken.length >= 4) {
          wiki3d = await pickWikiCandidate(q.wiki, {
            lang: 'en',
            infoboxOnly: false,
            model3dOnly: true,
            titleToken: baseToken,
            preferPattern: q.preferPattern,
            avoidPattern: spec.avoidPattern || null,
            excludeUrls: usedUrls
          });
        }
        if (wiki3d && !usedHashes.has(sha256(wiki3d.buf))) {
          chosen = {
            ...wiki3d,
            alt: `Mô hình 3D phân tử / tinh thể của ${item.name}`,
            caption: `Mô hình cấu trúc 3D ${nameFormula} từ Wikimedia Commons.`
          };
          console.log(`[wiki-3d] ${item.id} <- ${wiki3d.mediaTitle}`);
        }
      }

      // Step C: Curated Commons fallback file or strict-token Commons 3D / real photo search
      if (!chosen && spec.exactCommonsFile) {
        const exact = await fetchExactCommonsFile(spec.exactCommonsFile);
        if (exact && !usedHashes.has(sha256(exact.buf))) {
          chosen = {
            ...exact,
            alt: `Minh họa cấu trúc của ${item.name}`,
            caption: spec.exactCommonsDesc || `Mô hình cấu trúc ${nameFormula} từ Wikimedia Commons.`
          };
          console.log(`[commons-exact] ${item.id} <- ${spec.exactCommonsFile}`);
        }
      }

      if (!chosen && q.commons.length) {
        const cmSpec = await searchCommonsPhoto(q.commons, { excludeUrls: usedUrls, realPhotoOnly: false });
        if (cmSpec && !usedHashes.has(sha256(cmSpec.buf))) {
          chosen = {
            ...cmSpec,
            alt: `Tư liệu hình ảnh của ${item.name}`,
            caption: `Hình ảnh tư liệu hóa chất ${nameFormula} từ Wikimedia Commons.`
          };
          console.log(`[commons-spec] ${item.id} <- ${cmSpec.mediaTitle}`);
        }
      }

      if (!chosen && baseToken.length >= 5) {
        const cm3d = await searchCommonsPhoto(
          [`intitle:"${q.baseName}" intitle:3D`],
          { excludeUrls: usedUrls, realPhotoOnly: false, model3dOnly: true, matchToken: baseToken }
        );
        if (cm3d && !usedHashes.has(sha256(cm3d.buf))) {
          chosen = {
            ...cm3d,
            alt: `Mô hình 3D cấu trúc của ${item.name}`,
            caption: `Mô hình 3D ${nameFormula} từ Wikimedia Commons.`
          };
          console.log(`[commons-3d] ${item.id} <- ${cm3d.mediaTitle}`);
        }
      }

      // Step D: PubChem 3D conformer render (?record_type=3d&image_size=large) by CID or IUPAC name
      let resolvedCid = q.cid;
      if (!chosen) {
        if (!resolvedCid && q.pubchemNames.length) {
          const found = await lookupPubChemCidByName(q.pubchemNames);
          if (found?.cid) resolvedCid = found.cid;
        }
        if (resolvedCid) {
          const pub3d = await fetchPubChem3dByCid(resolvedCid);
          if (pub3d && !usedHashes.has(sha256(pub3d.buf))) {
            chosen = {
              ...pub3d,
              alt: `Mô hình cấu trúc 3D của ${item.name}`,
              caption: `Mô hình 3D của ${nameFormula} theo dữ liệu PubChem CID ${resolvedCid}.`
            };
            console.log(`[pubchem-3d] ${item.id} <- CID ${resolvedCid}`);
          }
        }
        if (!chosen && q.pubchemNames.length) {
          const pub3dName = await fetchPubChem3dByName(q.pubchemNames);
          if (pub3dName && !usedHashes.has(sha256(pub3dName.buf))) {
            chosen = {
              ...pub3dName,
              alt: `Mô hình cấu trúc 3D của ${item.name}`,
              caption: `Mô hình 3D của ${nameFormula} từ PubChem.`
            };
            console.log(`[pubchem-3d-name] ${item.id} <- ${q.pubchemNames[0]}`);
          }
        }
      }

      // Step E (last resort): PubChem 2D structure PNG or relaxed Commons photo when compound lacks 3D/photo (e.g. ionic salts)
      if (!chosen && baseToken.length >= 5) {
        const cmPhoto = await searchCommonsPhoto(
          [`intitle:"${q.baseName}"`, `"${q.baseName}"`],
          { excludeUrls: usedUrls, realPhotoOnly: true, matchToken: baseToken }
        );
        if (cmPhoto && !usedHashes.has(sha256(cmPhoto.buf))) {
          chosen = {
            ...cmPhoto,
            alt: `Mẫu chất của ${item.name}`,
            caption: `Hình ảnh tư liệu hóa chất ${nameFormula} từ Wikimedia Commons.`
          };
          console.log(`[commons-photo] ${item.id} <- ${cmPhoto.mediaTitle}`);
        }
      }

      if (!chosen && resolvedCid) {
        const pub2d = await fetchPubChemByCidWithFallback(resolvedCid);
        if (pub2d && !usedHashes.has(sha256(pub2d.buf))) {
          chosen = {
            ...pub2d,
            alt: `Công thức cấu tạo hóa học của ${item.name}`,
            caption: `Cấu tạo hóa học chuẩn hóa của ${item.name} theo dữ liệu PubChem CID ${resolvedCid}.`
          };
        }
      }

      if (!chosen && q.smiles) {
        const pub = await fetchPubChemBySmiles(q.smiles, q.baseName);
        if (pub && !usedHashes.has(sha256(pub.buf))) {
          chosen = {
            ...pub,
            alt: `Công thức cấu tạo hóa học của ${item.name}`,
            caption: `Cấu tạo hóa học của ${nameFormula} kết xuất từ PubChem.`
          };
        }
      }

      if (!chosen) {
        const cm = await searchCommonsPhoto([
          ...q.commons,
          `"${q.baseName}"`,
          q.baseName
        ], { excludeUrls: usedUrls, realPhotoOnly: false });
        if (cm && !usedHashes.has(sha256(cm.buf))) {
          chosen = {
            ...cm,
            alt: `Tư liệu hình ảnh của ${item.name}`,
            caption: `Hình ảnh tư liệu hóa chất ${item.name} từ Wikimedia Commons.`
          };
          console.log(`[commons-fallback] ${item.id} <- ${cm.mediaTitle}`);
        }
      }
    }

    if (!chosen) {
      throw new Error(`Could not resolve unique image for substance: ${item.id} (${item.formula} / ${item.name})`);
    }

    const h = sha256(chosen.buf);
    usedHashes.add(h);
    if (chosen.url) usedUrls.add(normalizeUrlKey(chosen.url));
    saveBinary(SUBSTANCES_DIR, item.id, chosen.ext, chosen.buf);
    result.substances[item.id] = {
      image: `/assets/library/photos/substances/${item.id}.${chosen.ext}`,
      alt: chosen.alt,
      caption: chosen.caption,
      sourceName: chosen.sourceName,
      sourceUrl: chosen.sourceUrl,
      kind: chosen.kind,
      originUrl: chosen.url ? normalizeUrlKey(chosen.url) : null,
      hash: h
    };

    if ((idx + 1) % 25 === 0 || idx === nonElements.length - 1) {
      fs.writeFileSync(MAP_FILE, JSON.stringify(result, null, 2) + '\n');
      console.log(`substances progress: ${idx + 1}/${nonElements.length} (${item.id} -> ${result.substances[item.id].image})`);
    }
  }

  cleanupLegacyFlatPhotos();
  fs.writeFileSync(MAP_FILE, JSON.stringify(result, null, 2) + '\n');
  console.log('Saved', MAP_FILE, {
    authored: Object.keys(result.authored).length,
    elements: Object.keys(result.elements).length,
    substances: Object.keys(result.substances).length,
    isomerExamples: Object.keys(result.isomerExamples).length
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
