import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export function SearchBar({ value, onChange, className = '', placeholder = 'Tìm kiếm tài liệu, tác giả...' }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={18} className="text-slate-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 text-sm rounded-full leading-5 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
