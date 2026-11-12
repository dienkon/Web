import React, { useEffect, useRef, useState } from 'react';
import visuals from '../../../shared/substance-visuals.generated.json';
import '../../../css/element-profile.css';

export function SubstanceVisuals({ slug }: { slug: string }) {
  const record = (visuals as Record<string, any>)[slug];
  const [opened, setOpened] = useState(false);
  const [crystalIndex, setCrystalIndex] = useState(0);
  const crystalRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setOpened(false); setCrystalIndex(0); }, [slug]);
  useEffect(() => {
    let widget: { destroy(): void } | undefined;
    let cancelled = false;
    if (opened && record?.crystals[crystalIndex] && crystalRef.current) {
      import('../../../js/three/published-crystal.js').then(({ mountPublishedCrystal }) => {
        if (!cancelled && crystalRef.current) widget = mountPublishedCrystal(crystalRef.current, record.crystals[crystalIndex]);
      });
    }
    return () => { cancelled = true; widget?.destroy(); };
  }, [opened, slug, crystalIndex]);
  if (!record || (!record.modelId && !record.crystals.length)) return null;
  return <section className="reader-visuals no-print" aria-label="Cấu trúc chất 3D">
    <div className="reader-visual-heading"><h2>Cấu trúc 3D · {record.formula}</h2><button type="button" aria-expanded={opened} onClick={() => setOpened(v => !v)}>{opened ? 'Ẩn mô hình' : 'Khám phá 3D'}</button></div>
    {opened && <>
      {record.crystals.length ? <>
        <p className="reader-visual-note">Pha rắn được ghi bên dưới; dung dịch và hỗn hợp không có chung một ô mạng.</p>
        {record.crystals.length > 1 && <label>Pha đang xem <select aria-label="Pha tinh thể" value={crystalIndex} onChange={e => setCrystalIndex(Number(e.target.value))}>{record.crystals.map((c: any, i: number) => <option key={c.id} value={i}>{c.mineralName} · {c.spaceGroup}</option>)}</select></label>}
        <div ref={crystalRef} />
      </> : <>
        <p className="reader-visual-note">{record.kind === 'molecule' ? 'Phân tử/cấu dạng' : record.kind === 'atom' ? 'Mô hình nguyên tử' : 'Mô hình thành phần'} · Chưa gắn dữ liệu ô mạng tinh thể đã kiểm chứng cho hồ sơ này.</p>
        <iframe title={`Cấu trúc 3D ${record.formula}`} src={`/tien-ich/cau-truc-3d/?embed=1&modelOnly=1&compound=${encodeURIComponent(record.modelId)}`} loading="lazy" allow="fullscreen" />
        {record.source && <a href={record.source} target="_blank" rel="noopener noreferrer">Nguồn tọa độ ↗</a>}
      </>}
    </>}
  </section>;
}
