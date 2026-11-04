import { NavLink } from 'react-router-dom';

// Arena-specific destinations remain available below the shared site navigation.
const destinations = [
  ['/', 'Tổng quan'], ['/create-room', 'Tạo phòng'], ['/join', 'Ghép phòng'],
  ['/practice', 'Luyện tập'], ['/daily', 'Thử thách ngày'], ['/mistakes', 'Sổ tay câu sai'],
  ['/chapters', 'Ôn chuyên đề'], ['/leaderboard', 'BXH'], ['/history', 'Lịch sử đấu'],
  ['/profile', 'Hồ sơ'], ['/settings', 'Cài đặt'], ['/help', 'Hướng dẫn'], ['/terms', 'Chính sách'],
];
export default function ArenaNavigation() {
  return <nav aria-label="Điều hướng đấu trường" className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-700 bg-slate-800 px-4 py-3">
    {destinations.map(([path, label]) => <NavLink key={path} to={path} end={path === '/'}
      className={({isActive}) => `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${isActive ? 'bg-blue-500/20 text-cyan-300' : 'text-slate-300 hover:bg-slate-700'}`}>
      {label}
    </NavLink>)}
  </nav>;
}
