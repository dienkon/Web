const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function applicationImageMarkup(app){
  const photo=app.applicationImage;
  if(!photo?.src)return '';
  const license=photo.licenseUrl?`<a href="${escape(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(photo.license)}</a>`:escape(photo.license);
  return `<figure class="application-figure"><a href="${escape(photo.source)}" target="_blank" rel="noopener noreferrer" aria-label="Mở nguồn ảnh ${escape(app.title)}"><img src="${escape(photo.src)}" alt="${escape(photo.alt)}" loading="lazy" decoding="async"></a><figcaption><p>${escape(photo.caption)}</p><span>${escape(photo.author)} · ${license} · <a href="${escape(photo.source)}" target="_blank" rel="noopener noreferrer">Nguồn ảnh ↗</a></span></figcaption></figure>`;
}
