import type { LocalSubmission } from './store';

export function firestoreValue(value: any): Record<string, any> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === 'object') return { mapValue: { fields: firestoreFields(value) } };
  return { stringValue: String(value) };
}
export function firestoreFields(value: Record<string, any>) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)]));
}

export async function uploadOfflineSubmission(projectId: string, token: string, record: LocalSubmission) {
  const name = `projects/${projectId}/databases/(default)/documents/submissions/${record.id}`;
  const fields = firestoreFields(record.submission);
  fields.submittedAt = { timestampValue: new Date(record.savedAt).toISOString() };
  fields.syncedAt = { timestampValue: new Date().toISOString() };
  fields.offlineSubmission = { booleanValue: true };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  // Create-only precondition is essential: rules do not allow students to read nonexistent
  // submissions, so a read-first client transaction cannot submit a new offline attempt.
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, {
    method: 'POST', headers, signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ writes: [{ update: { name, fields }, currentDocument: { exists: false } }] }),
  });
  if (response.ok) return;
  if (response.status === 409 || response.status === 412) {
    const existing = await fetch(`https://firestore.googleapis.com/v1/${name}`, { headers, signal: AbortSignal.timeout(30000) });
    if (existing.ok) {
      const { fields } = await existing.json();
      if (fields?.studentUid?.stringValue === record.uid && fields?.attemptId?.stringValue === record.submission.attemptId) return;
    }
    throw new Error('Mã bài nộp đã tồn tại. Bài làm vẫn được giữ trên máy.');
  }
  const error = new Error(response.status === 403 ? 'Máy chủ từ chối quyền ghi. Hãy đăng nhập lại hoặc liên hệ quản trị viên.' : 'Chưa gửi được. Hệ thống sẽ tự thử lại.');
  throw error;
}
