import { NavLink } from 'react-router-dom';
declare const __DK_APP_VERSION__: string;
export default function MobileExamTabs() {
  return <div className="flex items-center justify-between gap-3 mb-5"><nav aria-label="Chế độ đề thi" className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
    {['online', 'offline'].map((tab) => <NavLink key={tab} to={`/student/${tab}`} className={({ isActive }) => `px-4 py-2 rounded-lg font-semibold text-sm ${isActive ? 'bg-blue-600 text-white' : ''}`}>{tab === 'online' ? 'Online' : 'Offline'}</NavLink>)}
  </nav><span className="text-xs text-slate-500">DkTEST {__DK_APP_VERSION__}</span></div>;
}
