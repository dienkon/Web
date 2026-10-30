import React, { useEffect, useMemo, useState } from 'react';

type Chain = {id:string;substances:string[];reactionIds:string[]};
export default function ReactionChainExamples({onSelect}:{onSelect:(substances:string[])=>void}) {
  const [chains, setChains] = useState<Chain[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => {
    let mounted = true;
    import('../../../shared/reaction-chains.generated.json').then(module => { if (mounted) setChains(module.default.chains); }).catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase().replace(/[₀-₉]/g, digit => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(digit)));
    return chains.filter(chain => !normalized || chain.substances.some(formula => formula.toLowerCase().includes(normalized)));
  }, [chains, query]);
  if (error) return <p role="alert">Không tải được chuỗi mẫu. Bạn vẫn có thể phân tích hoặc tìm chuỗi ở các ô bên trên.</p>;
  if (!chains.length) return <p role="status">Đang tải các chuỗi mẫu…</p>;
  return <section className="space-y-2 rounded border bg-white p-2" aria-label="Chuỗi mẫu có nguồn">
    <h4 className="font-semibold">{chains.length.toLocaleString('vi-VN')} chuỗi mẫu 3 bước</h4>
    <p>Các đường nối không lặp chất trung gian. Chọn một chuỗi để xem đủ phương trình, điều kiện và lưu ý tách mẫu.</p>
    <input aria-label="Lọc chuỗi mẫu theo chất" className="w-full rounded border p-2" value={query} placeholder="Ví dụ: Cu, FeCl2…" onChange={event => {setQuery(event.target.value);setPage(0);}} />
    <p role="status">{matches.length.toLocaleString('vi-VN')} chuỗi phù hợp</p>
    <div className="max-h-64 space-y-1 overflow-y-auto">{matches.slice(page*20,(page+1)*20).map(chain => <button key={chain.id} className="block w-full break-words rounded border p-2 text-left font-mono hover:border-teal-600" onClick={() => onSelect(chain.substances)}>{chain.substances.join(' → ')}</button>)}</div>
    <div className="flex justify-between"><button className="rounded border p-2 disabled:opacity-40" disabled={page===0} onClick={() => setPage(p=>p-1)}>Trước</button><button className="rounded border p-2 disabled:opacity-40" disabled={(page+1)*20>=matches.length} onClick={() => setPage(p=>p+1)}>Tiếp</button></div>
  </section>;
}
