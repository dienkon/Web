import React, {useState} from 'react';
import { DocMeta, getCategoryConfig } from '../utils/config';
import { DocCard } from './DocCard';
import { motion } from 'motion/react';

interface LibraryGridProps {
  docs: DocMeta[];
  onDocClick: (id: string) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

export function LibraryGrid({ docs, onDocClick, bookmarkedIds, onToggleBookmark, onTagClick }: LibraryGridProps) {
  // Reset the batch when the ordered result identities change, without losing
  // the user's position when a bookmark is toggled.
  const resultKey=docs.map(doc=>doc.id).join('|');
  const [batch,setBatch]=useState({key:resultKey,count:24});
  const visibleCount=batch.key===resultKey?batch.count:24;
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl text-slate-500">🔍</span>
        </div>
        <h3 className="text-xl font-medium text-slate-300 mb-2">Không tìm thấy tài liệu</h3>
        <p className="text-slate-500 max-w-md">Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác để xem thêm tài liệu.</p>
      </div>
    );
  }

  return (
    <section aria-label="Kết quả thư viện">
    <p className="mb-4 text-sm font-semibold text-slate-600" role="status">{docs.length} tài liệu · Đang hiển thị {Math.min(visibleCount,docs.length)}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
      {docs.slice(0,visibleCount).map((doc, index) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3, delay: (index % 3) * 0.04 }}
          className="h-full"
        >
          <DocCard 
            doc={doc}
            onClick={() => onDocClick(doc.id)}
            isBookmarked={bookmarkedIds.includes(doc.id)}
            onToggleBookmark={(e) => {
              e.stopPropagation();
              onToggleBookmark(doc.id);
            }}
            onTagClick={onTagClick}
          />
        </motion.div>
      ))}
    </div>
    {visibleCount<docs.length && <button className="mb-10 rounded-xl border border-sky-300 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={()=>setBatch({key:resultKey,count:visibleCount+24})}>Xem thêm tài liệu ({docs.length-visibleCount})</button>}
    </section>
  );
}
