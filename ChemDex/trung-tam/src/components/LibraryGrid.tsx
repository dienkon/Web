import React from 'react';
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
      {docs.map((doc, index) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: index * 0.05 }}
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
  );
}
