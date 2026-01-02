import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, SearchIcon } from './Icons';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  options,
  placeholder = '輸入或搜尋…',
  onChange,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // 關閉狀態下，輸入框顯示目前值；開啟時不強制覆蓋（避免打字中被重設）
    if (!isOpen) setQuery(value || '');
  }, [value, isOpen]);

  // 打開下拉時，預設顯示「全部選項」，不要用目前值來過濾（更像 EAGLE 的體驗）
  const openDropdown = () => {
    setIsOpen(true);
    setQuery('');
    setActiveIndex(0);
  };

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const normalizedOptions = useMemo(() => {
    // 去重（以 label/value 去重），並排序
    const map = new Map<string, SearchableSelectOption>();
    for (const opt of options) {
      if (!opt?.value?.trim()) continue;
      const key = opt.value.trim();
      if (!map.has(key)) map.set(key, { value: key, label: opt.label?.trim() || key });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
  }, [options]);

  const displayLabel = useMemo(() => {
    const v = (value || '').trim();
    if (!v) return '';
    const found = normalizedOptions.find(o => o.value === v);
    return found ? found.label : v;
  }, [value, normalizedOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(opt => opt.label.toLowerCase().includes(q));
  }, [normalizedOptions, query]);

  const queryTrimmed = query.trim();
  const exactExists = queryTrimmed
    ? normalizedOptions.some(opt => opt.value.toLowerCase() === queryTrimmed.toLowerCase())
    : false;

  const showCreate = queryTrimmed.length > 0 && !exactExists;

  const visibleOptions = useMemo(() => {
    const base = filtered;
    if (!showCreate) return base;
    return [{ value: queryTrimmed, label: `新增：${queryTrimmed}` }, ...base];
  }, [filtered, showCreate, queryTrimmed]);

  const commitValue = (v: string) => {
    const next = v.trim();
    onChange(next);
    setIsOpen(false);
    setActiveIndex(0);
    // 讓輸入框顯示正式值
    setQuery(next);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, Math.max(visibleOptions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = visibleOptions[activeIndex];
      if (picked) commitValue(picked.value);
      else if (queryTrimmed) commitValue(queryTrimmed);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full" ref={wrapperRef}>
      {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}

      <div className="relative">
        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => openDropdown()}
          onKeyDown={onKeyDown}
          placeholder={displayLabel && !isOpen ? displayLabel : placeholder}
          className="w-full pl-9 pr-10 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(v => {
              const next = !v;
              if (next) {
                // 打開：顯示全部選項
                setQuery('');
                setActiveIndex(0);
                setTimeout(() => inputRef.current?.focus(), 0);
              } else {
                // 關閉：回復顯示目前值
                setQuery(value || '');
              }
              return next;
            });
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
          aria-label="toggle"
        >
          <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-[70] mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-xl max-h-64 overflow-y-auto custom-scrollbar">
            {visibleOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">沒有符合的地點</div>
            ) : (
              visibleOptions.map((opt, idx) => (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    idx === activeIndex
                      ? 'bg-indigo-600/30 text-white'
                      : 'text-gray-200 hover:bg-gray-700'
                  }`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()} // 防止 input blur 先關掉 dropdown
                  onClick={() => commitValue(opt.value)}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;
