import {substanceStories} from './data/substance-stories.mjs';
import {applicationStories} from './data/substance-stories-applications.mjs';
import {substanceFeaturesWave2} from './data/substance-features-wave2.mjs';
import {substanceFeaturesWave3} from './data/substance-features-wave3.mjs';
import {substanceFeaturesWave4} from './data/substance-features-wave4.mjs';
import storyPhotos from './data/story-photo-sources.json' with {type: 'json'};

const photos = new Map(storyPhotos.photos.map(photo => [photo.id, photo]));
const substancePhotos = {
  'chi-thi-phenolphtalein-c20h14o4': 'phenolphthalein-concrete',
  'bac-nitrat-agno3': 'fbi-gibson-notebook',
  'sat-iii-oxit-gi-sat-fe2o3': 'opportunity-hematite-spherules',
  'nito-n2': 'cryopreservation-dewar',
  'glixerol-c3h8o3': 'cryopreservation-dewar',
  'benzen-c6h6': 'benzene-historical-stills',
  'dung-dich-natri-axetat-0-1-m-ch3coona': 'sodium-acetate-crystals',
  'hidro-h2': 'fuel-cell',
  'oxi-o2': 'fuel-cell',
  'ozon-o3': 'ozone',
  'canxi-cacbonat-da-voi-caco3': 'calcite-cave',
  'canxi-oxit-voi-song-cao': 'cement',
  'nuoc-voi-trong-canxi-hidroxit-ca-oh-2': 'cement',
  'aspirin-c9h8o4': 'aspirin-history',
  'xiclohexan-c6h12': 'nylon',
  'amoni-nitrat-nh4no3': 'fertilizer-plant',
};
const elementPhotos = {Li: 'lithium-battery-inside', Al: 'aluminium-recycling', Si: 'silicon-solar', Cu: 'copper-refining', Fe: 'iron-rust', Pt: 'catalytic-converter', Pd: 'catalytic-converter', Rh: 'catalytic-converter', Ga: 'blue-led'};

const clean = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const sourceList = sources => [...new Map(sources.filter(([,url]) => /^https:\/\//.test(url)).map(row => [row[1], row])).values()];
const elementSources = detail => sourceList((detail?.sources ?? []).filter(s => /periodic-table\.rsc\.org/.test(s.url ?? '')).map(s => [s.title, s.url]));
const applications = detail => (detail?.applications ?? []).filter(a => clean(a.desc) && !/^nó chủ yếu|^bao gồm/i.test(clean(a.title)) && !(clean(a.title) === 'Ứng dụng' && clean(a.desc).split(/\s+/).length < 8));

function compose({story, scope, contextLabel, reviewBasis = 'source-read-2026-11-15', applicationScope = scope, applicationTitle, applicationKind = 'use', extraLead = '', applicationText, photo}) {
  const storyHeading = scope === 'substance' || scope === 'element' ? story.headline : `Câu chuyện liên quan: ${story.headline}`;
  const applicationHeading = applicationTitle ?? (applicationScope === 'substance' || applicationScope === 'element' ? 'Từ câu chuyện đến ứng dụng hôm nay' : 'Ứng dụng của bối cảnh và điều cần phân biệt');
  const sources = sourceList(story.sources);
  const storyText = [extraLead, story.lead, story.story].filter(Boolean).join('\n\n');
  const image = photo?.image ?? photo?.src, imageSource = photo?.sourceUrl ?? photo?.source;
  const photoText = image && imageSource ? `\n\n![${clean(photo.alt).replace(/[\[\]]/g, '')}](${image})\n\n*${clean(photo.caption)} [Nguồn ảnh](${imageSource}) · ${clean(photo.author)} · ${photo.licenseUrl ? `[${clean(photo.license)}](${photo.licenseUrl})` : clean(photo.license)}${photo.changes ? ` · ${clean(photo.changes)}` : ''}.*` : '';
  const sections = [
    `## ${storyHeading}\n\n${storyText}`,
    `## ${applicationHeading}\n\n${applicationText ?? story.application}${photoText}\n\n${sources.map(([label,url]) => `[${label}](${url})`).join(' · ')}`,
  ];
  return {
    title: story.headline,
    image: photo?.id && image && imageSource ? image : undefined,
    summary: extraLead || story.lead,
    sections,
    editorialEvidence: {
      language: 'vi', scope, contextLabel, reviewBasis,
      story: {status: 'documented', section: storyHeading, sources: sources.map(([,url]) => url)},
      application: {status: ['substance', 'element'].includes(applicationScope) ? 'documented' : 'context-only', kind: applicationKind, scope: applicationScope, section: applicationHeading, sources: sources.map(([,url]) => url)},
    },
  };
}

function forElement({name, element, detail}) {
  const history = clean(detail?.history?.description);
  const sources = elementSources(detail);
  if (!history || !sources.length) return null;
  const apps = applications(detail);
  const researchOnly = element.z >= 99 || ['At', 'Fr', 'Pa', 'Bk'].includes(element.symbol);
  // Do not turn predicted chemistry of the heaviest elements into a demonstrated use.
  const selected = apps.filter(a => clean(a.title) !== 'Ứng dụng' && !(element.z >= 109 && /hóa học|electron|tương đối tính|cấu trúc nguyên tử/i.test(clean(a.title)))).slice(0, element.z >= 99 ? 1 : 3);
  const hasHistoricalUse = selected.some(a => /\btừng\b|lịch sử|thế kỷ XX|đã bị loại bỏ/.test(`${a.title} ${a.desc}`));
  const anchor = researchOnly ? 'Một phát hiện mở thêm câu hỏi nghiên cứu' : selected[0] ? `Từ dấu mốc khám phá đến ${clean(selected[0].title).toLocaleLowerCase('vi')}` : 'Một nguyên tố đã được nhận ra như thế nào?';
  const practical = element.symbol === 'Fr'
    ? 'RSC không ghi nhận ứng dụng của francium. Đồng vị sống lâu nhất của nó cũng chỉ có chu kỳ bán rã khoảng 22 phút; một phát hiện có ý nghĩa khoa học không nhất thiết trở thành một nguyên liệu dùng trong đời sống.'
    : [...(element.z >= 99 ? [`${name} hiện chỉ phục vụ nghiên cứu; chưa có ứng dụng công nghiệp hay đời sống được ghi nhận trong nguồn RSC dẫn ở đây.`] : []), ...selected.map(a => clean(a.desc))].join('\n\n');
  const story = {
    headline: anchor,
    lead: history,
    story: '',
    application: practical || `Hồ sơ chưa nêu ứng dụng cụ thể đã đối chiếu cho ${name}. Phần tra cứu phía dưới giúp theo dõi những dữ kiện đang có, thay vì suy công dụng từ vị trí trong bảng tuần hoàn.`,
    sources,
  };
  return compose({story, scope: 'element', contextLabel: name, reviewBasis: element.symbol === 'Fr' ? 'source-read-2026-11-15' : 'existing-element-dossier', applicationScope: practical ? 'element' : 'related-element', applicationKind: element.symbol === 'Fr' ? 'no-known-use' : researchOnly ? 'research-only' : hasHistoricalUse ? 'historical-and-current' : 'use', applicationTitle: researchOnly ? 'Vai trò trong nghiên cứu và giới hạn ứng dụng' : hasHistoricalUse ? 'Từ các ứng dụng trước đây đến hướng nghiên cứu hiện nay' : undefined, photo: photos.get(elementPhotos[element.symbol]) ?? selected.find(a => a.applicationImage)?.applicationImage});
}

export function substanceNarrative({id, subject, name, element, detail}) {
  const exact = [...substanceFeaturesWave4, ...substanceFeaturesWave3, ...substanceFeaturesWave2, ...substanceStories, ...applicationStories].find(story => story.ids.includes(id));
  if (exact) return compose({story: exact, scope: 'substance', applicationScope: exact.applicationScope ?? 'substance', contextLabel: name, photo: photos.get(substancePhotos[id])});
  if (element) {
    const narrative = forElement({name, element, detail});
    if (narrative) return narrative;
  }
  const reason = `Chưa có câu chuyện và ứng dụng được đối chiếu riêng cho ${name} (${subject.formula}); giữ nguyên bài tra cứu, không gán lịch sử hay công dụng của nguyên tố thành phần cho hợp chất.`;
  return {title: null, summary: null, sections: [], editorialEvidence: {
    language: 'vi', scope: 'substance', contextLabel: name, reviewBasis: 'editorial-audit-2026-11-15',
    story: {status: 'missing', sources: [], reason},
    application: {status: 'missing', sources: [], reason},
  }};
}
