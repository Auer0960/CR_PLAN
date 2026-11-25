import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, SearchIcon } from './Icons';
import { orderByRecent, pushRecent, readRecent } from '../recentSelect';
import { buildVisibleOptions } from '../selectUtils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /**
   * 額外比對（例如角色的造型）：傳入已小寫、去空白的查詢字串，
   * 命中時回傳要顯示的命中原因（如「造型：乳牛貝兒」），沒命中回傳 null。
   */
  matchHint?: (query: string) => string | null;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  /** 有給 key 時，空搜尋的下拉會先排最近選過的值。 */
  recentStorageKey?: string;
  /**
   * 是否允許把輸入的新字串當成值（顯示「新增：xxx」）。預設 true（地點等自由輸入欄位）。
   * 設為 false 時只能從清單挑選：不顯示「新增」、Enter 只會選高亮的現有選項、沒有符合項目時不改變值。
   */
  allowCreate?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  options,
  placeholder = '輸入或搜尋…',
  onChange,
  recentStorageKey,
  allowCreate = true,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!recentStorageKey) {
      setRecent([]);
      return;
    }
    setRecent(readRecent(localStorage, recentStorageKey));
  }, [recentStorageKey]);

  useEffect(() => {
    // 關閉狀態下，輸入框顯示目前值；開啟時不強制覆蓋（避免打字中被重設）
    if (!isOpen) setQuery(value || '');
  }, [value, isOpen]);

  const refreshRecent = () => {
    if (!recentStorageKey) return;
    setRecent(readRecent(localStorage, recentStorageKey));
  };

  // 打開下拉時，預設顯示「全部選項」，不要用目前值來過濾（更像 EAGLE 的體驗）
  // 最近搜尋存在另一個分頁也可能剛寫入，打開時重讀。
  const openDropdown = () => {
    refreshRecent();
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
      if (!map.has(key)) map.set(key, { value: key, label: opt.label?.trim() || key, matchHint: opt.matchHint });
    }
    const sorted = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
    return recentStorageKey ? orderByRecent(sorted, recent) : sorted;
  }, [options, recent, recentStorageKey]);

  const displayLabel = useMemo(() => {
    const v = (value || '').trim();
    if (!v) return '';
    const found = normalizedOptions.find(o => o.value === v);
    return found ? found.label : v;
  }, [value, normalizedOptions]);


  // 只有「label 沒命中、純粹因 matchHint 命中」的選項才顯示命中原因
  const hintFor = (opt: SearchableSelectOption): string | null => {
    const q = query.trim().toLowerCase();
    if (!q || !opt.matchHint || opt.label.toLowerCase().includes(q)) return null;
    return opt.matchHint(q);
  };

  const queryTrimmed = query.trim();
  // 「新增」判斷同時比對 value 與 label，避免輸入的名稱剛好等於某選項顯示名稱時還跳出新增
  const visibleOptions = useMemo(
    () => buildVisibleOptions(normalizedOptions, query, allowCreate),
    [normalizedOptions, query, allowCreate]
  );

  const commitValue = (v: string) => {
    const next = v.trim();
    onChange(next);
    if (recentStorageKey && next) {
      setRecent(pushRecent(localStorage, recentStorageKey, next));
    }
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
      else if (allowCreate && queryTrimmed) commitValue(queryTrimmed);
      // allowCreate=false 且沒有符合項目：不改變值
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
          onBlur={(e) => {
            // 焦點移到元件外（例如 Tab 離開）：關閉下拉，輸入框還原顯示目前正式值，不會把輸入文字當成值
            const next = e.relatedTarget as Node | null;
            if (next && wrapperRef.current?.contains(next)) return;
            setIsOpen(false);
          }}
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
                // 打開：顯示全部選項，最近搜尋排前面
                refreshRecent();
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
              <div className="px-3 py-2 text-sm text-gray-400">沒有符合的選項</div>
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
                  {hintFor(opt) && <span className="ml-2 text-xs text-purple-300">{hintFor(opt)}</span>}
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
