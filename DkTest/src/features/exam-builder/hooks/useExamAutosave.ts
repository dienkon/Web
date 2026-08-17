import { useEffect } from 'react';

export function useExamAutosave(_delayMs = 1500) {
  // Local state persistence only: Admin must click "Lưu / Xuất bản" to write to Firestore.
  // This prevents Firestore "Write stream exhausted maximum allowed queued writes" errors.
  useEffect(() => {
    // No-op background autosave
  }, []);
}
