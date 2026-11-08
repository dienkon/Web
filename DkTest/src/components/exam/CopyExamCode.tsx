import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { safeCopyText } from '../../utils/mobileCompat';

export default function CopyExamCode({ code, className = '' }: { code?: string; className?: string }) {
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 2500);
    return () => clearTimeout(timer);
  }, [status]);
  if (!code) return null;
  return <button type="button" className={`inline-flex items-center gap-1.5 cursor-pointer ${className}`} title="Sao chép mã đề" aria-label={`Sao chép mã đề ${code}`} onClick={async () => {
    setStatus(await safeCopyText(code) ? 'Đã sao chép mã đề' : 'Chưa sao chép được mã đề');
  }}>{status === 'Đã sao chép mã đề' ? <Check size={13} /> : <Copy size={13} />}<span>MÃ BÀI: {code}</span><span role="status" className="sr-only">{status}</span></button>;
}
