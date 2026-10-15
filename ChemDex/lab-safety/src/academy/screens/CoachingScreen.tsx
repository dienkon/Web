import React, { useMemo, useState } from 'react';
import { useAcademy } from '../core/store';
import { learningInsights } from '../core/coaching';
import { EmptyState } from '../components/GameUI';

export function CoachingScreen({ onPlay }: { onPlay: (id: string) => void }) {
  const profile = useAcademy(state => state.profile);
  const insights = useMemo(() => learningInsights(profile), [profile]);
  const [saved, setSaved] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? insights : insights.slice(0, 6);
  return (
    <section className="academy-coaching">
      <div className="academy-section-heading">
        <div>
          <p className="academy-eyebrow">Phản hồi dựa trên lượt thực hành</p>
          <h2>Điều nên luyện tiếp</h2>
          <p>Các gợi ý dùng kết quả đang lưu trên thiết bị; không xếp hạng hay so sánh em với người khác.</p>
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon="🌱" title="Sẵn sàng cho một trải nghiệm mới" text="Hoàn thành bài để có gợi ý gắn với thao tác của em." />
      ) : (
        <div className="academy-skill-grid">
          {visible.map(insight => (
            <article className="academy-skill-card" key={insight.id}>
              <div><h3>{insight.icon} {insight.title}</h3></div>
              <p>{insight.explanation}</p>
              <p className="academy-fineprint">{insight.evidence}</p>
              <div className="academy-action-row">
                {insight.gameId && (
                  <button type="button" className="academy-button academy-button--primary" onClick={() => onPlay(insight.gameId!)}>
                    Luyện lại nguyên tắc này
                  </button>
                )}
                <button
                  type="button"
                  className="academy-button"
                  disabled={saved.includes(insight.id)}
                  onClick={() => {
                    useAcademy.getState().writeNote({
                      title: insight.title,
                      text: `${insight.explanation}\n\nĐiều em cần tự giải thích: Vì sao lựa chọn này phù hợp trong tình huống được học?`,
                      source: insight.gameId ?? 'coaching',
                    });
                    setSaved(current => [...current, insight.id]);
                  }}
                >
                  {saved.includes(insight.id) ? '✓ Đã lưu' : 'Lưu điều cần nhớ'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {insights.length > 6 && (
        <button type="button" className="academy-button" style={{ marginTop: 20 }} onClick={() => setShowAll(value => !value)}>
          {showAll ? 'Thu gọn gợi ý' : `Xem cả ${insights.length} gợi ý`}
        </button>
      )}
      <aside className="academy-coach-panel" style={{ marginTop: 24 }}>
        <h3>Một lượt học có ích</h3>
        <ol>
          <li>Đọc lại điều kiện và mục tiêu của bài.</li>
          <li>Thử thao tác ở mức Khám phá.</li>
          <li>Khi sai, giải thích bằng lời của em trước khi thử lại.</li>
          <li>Đổi sang mức Luyện tập khi đã hiểu nguyên tắc.</li>
        </ol>
      </aside>
    </section>
  );
}
