import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useOnline } from '../../hooks/useOnline';
export default function OnlineOnly({ children }: { children: ReactNode }) {
  const online = useOnline();
  if (online) return children;
  return <div className="p-6 max-w-lg mx-auto space-y-4"><h1 className="text-xl font-bold">Chức năng này cần mạng</h1><p>Bạn vẫn có thể mở và làm các đề đã tải trên máy.</p><Link to="/student/offline" className="text-blue-600 underline">Mở kho đề offline</Link></div>;
}
