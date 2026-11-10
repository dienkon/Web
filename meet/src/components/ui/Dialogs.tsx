import { create } from 'zustand';
import { Modal } from './Modal';
import { Button } from './Button';

interface DialogRequest { title: string; message: string; confirmLabel?: string; resolve: (accepted: boolean) => void }
const useDialogs = create<{ queue: DialogRequest[] }>(() => ({ queue: [] }));

export function confirmDialog(message: string, title = 'Xác nhận', confirmLabel = 'Xác nhận'): Promise<boolean> {
  return new Promise(resolve => useDialogs.setState(s => ({ queue: [...s.queue, { title, message, confirmLabel, resolve }] })));
}
export function showNotice(title: string, message: string) {
  useDialogs.setState(s => ({ queue: [...s.queue, { title, message, resolve: () => {} }] }));
}
export function Dialogs() {
  const request = useDialogs(s => s.queue[0]);
  const finish = (accepted: boolean) => {
    if (!request) return;
    useDialogs.setState(s => ({ queue: s.queue.slice(1) }));
    request.resolve(accepted);
  };
  return <div className="relative z-[100]">
    <Modal isOpen={!!request} title={request?.title} onClose={() => finish(false)} maxWidth="sm">
      <p className="text-sm text-slate-300 whitespace-pre-line">{request?.message}</p>
      <div className="flex justify-end gap-3 mt-6">
        {request?.confirmLabel && <Button variant="outline" onClick={() => finish(false)}>Hủy</Button>}
        <Button onClick={() => finish(true)}>{request?.confirmLabel || 'Đã hiểu'}</Button>
      </div>
    </Modal>
  </div>;
}
