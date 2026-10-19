export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '0 ms';
  return milliseconds < 1000 ? `${milliseconds.toFixed(milliseconds < 10 ? 1 : 0)} ms` : `${(milliseconds / 1000).toFixed(2)} s`;
}

export function completionText(success: boolean, executionMs: number, totalMs: number): string {
  return `${success ? 'Chạy xong.' : 'Kết thúc có lỗi.'} Thực thi: ${formatDuration(executionMs)} · Tổng: ${formatDuration(totalMs)}`;
}
