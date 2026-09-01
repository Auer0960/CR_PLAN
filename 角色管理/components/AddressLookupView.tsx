import React, { useEffect, useMemo, useState } from 'react';
import type { AddressBook, AddressEntry, AddressIdentityTerm, Character } from '../types';
import SearchableSelect from './SearchableSelect';
import { ChevronDownIcon, SearchIcon } from './Icons';

type DirectionFilter = 'outgoing' | 'incoming';

interface AddressLookupViewProps {
  characters: Character[];
}

interface DisplayRow extends AddressEntry {
  direction: DirectionFilter;
}

const resolveImagePath = (imagePath: string | undefined): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${imagePath}`.replace(/\/+/g, '/');
};

const joinTerms = (values: string[]): string => {
  if (!values || values.length === 0) return '（不指名）';
  return values.join('／');
};

const matchesKeyword = (entry: AddressEntry, keyword: string): boolean => {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    entry.target,
    ...entry.nameAddress,
    ...entry.pronoun,
    entry.context,
    ...entry.quotes,
  ].join(' ').toLowerCase();
  return haystack.includes(q);
};

const matchesIdentityKeyword = (term: AddressIdentityTerm, keyword: string): boolean => {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const haystack = [term.label, ...term.terms, term.context, ...term.quotes].join(' ').toLowerCase();
  return haystack.includes(q);
};

const collectEntries = (books: AddressBook[], from: string, to: string): AddressEntry[] => {
  const fromBook = books.find(book => book.character === from);
  const toBook = books.find(book => book.character === to);
  const outgoing = fromBook?.outgoing.filter(entry => entry.target === to) ?? [];
  if (outgoing.length > 0) return outgoing;
  return toBook?.incoming.filter(entry => entry.target === from) ?? [];
};

const fetchAddressBooks = async (): Promise<AddressBook[]> => {
  const prefix = window.location.pathname.startsWith('/CR_PLAN') ? '/CR_PLAN' : '';
  const candidates = [`${prefix}/api/address-books`, '/api/address-books'];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data?.books)) return data.books as AddressBook[];
    } catch {
      // try next
    }
  }
  return [];
};

const AddressTable: React.FC<{
  rows: DisplayRow[];
  emptyText: string;
  expandedKey: string | null;
  onToggle: (key: string) => void;
  keyPrefix: string;
}> = ({ rows, emptyText, expandedKey, onToggle, keyPrefix }) => {
  if (rows.length === 0) {
    return <div className="text-gray-500 text-sm px-1 py-3">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-800 text-gray-300">
          <tr>
            <th className="w-10 px-2 py-3" aria-hidden="true" />
            <th className="text-left font-medium px-4 py-3 w-40">對象</th>
            <th className="text-left font-medium px-4 py-3 w-48">名字稱呼</th>
            <th className="text-left font-medium px-4 py-3 w-32">指稱</th>
            <th className="text-left font-medium px-4 py-3">場合／語氣</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowKey = `${keyPrefix}-${row.direction}-${row.target}-${index}`;
            const isOpen = expandedKey === rowKey;
            return (
              <React.Fragment key={rowKey}>
                <tr
                  className={`border-t border-gray-800 align-top cursor-pointer ${isOpen ? 'bg-gray-800/70' : 'hover:bg-gray-800/40'}`}
                  onClick={() => onToggle(rowKey)}
                  aria-expanded={isOpen}
                >
                  <td className="px-2 py-3 text-gray-400">
                    <ChevronDownIcon
                      className={`w-4 h-4 mx-auto transition-transform ${isOpen ? 'rotate-180 text-indigo-300' : ''}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-white">
                    <div>{row.target}</div>
                    {row.targetKind !== 'character' && (
                      <div className="text-xs text-gray-500 mt-1">
                        {row.targetKind === 'generic' ? '無特定對話' : 'NPC'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-indigo-300">{joinTerms(row.nameAddress)}</td>
                  <td className="px-4 py-3 text-amber-300">{joinTerms(row.pronoun)}</td>
                  <td className="px-4 py-3 text-gray-300">{row.context}</td>
                </tr>
                {isOpen && (
                  <tr className="bg-gray-950/80">
                    <td colSpan={5} className="px-6 py-4 border-t border-gray-800">
                      <div className="text-xs text-gray-500 mb-2">台詞</div>
                      {row.quotes.length === 0 ? (
                        <div className="text-gray-500">沒有摘錄台詞。</div>
                      ) : (
                        <ul className="space-y-2 text-gray-200">
                          {row.quotes.slice(0, 3).map((quote) => (
                            <li key={quote} className="leading-relaxed">「{quote}」</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const IdentityTable: React.FC<{
  terms: AddressIdentityTerm[];
  expandedKey: string | null;
  onToggle: (key: string) => void;
}> = ({ terms, expandedKey, onToggle }) => {
  if (terms.length === 0) {
    return <div className="text-gray-500 text-sm px-1 py-3">暫無</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-800 text-gray-300">
          <tr>
            <th className="w-10 px-2 py-3" aria-hidden="true" />
            <th className="text-left font-medium px-4 py-3 w-32">項目</th>
            <th className="text-left font-medium px-4 py-3 w-48">用詞</th>
            <th className="text-left font-medium px-4 py-3">場合／語氣</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((term, index) => {
            const rowKey = `identity-${term.kind}-${term.terms.join(',')}-${index}`;
            const isOpen = expandedKey === rowKey;
            const canExpand = term.quotes.length > 0;
            return (
              <React.Fragment key={rowKey}>
                <tr
                  className={`border-t border-gray-800 align-top ${canExpand ? 'cursor-pointer' : ''} ${isOpen ? 'bg-gray-800/70' : canExpand ? 'hover:bg-gray-800/40' : ''}`}
                  onClick={() => canExpand && onToggle(rowKey)}
                  aria-expanded={canExpand ? isOpen : undefined}
                >
                  <td className="px-2 py-3 text-gray-400">
                    {canExpand && (
                      <ChevronDownIcon
                        className={`w-4 h-4 mx-auto transition-transform ${isOpen ? 'rotate-180 text-indigo-300' : ''}`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-white">{term.label}</td>
                  <td className="px-4 py-3 text-indigo-300">{joinTerms(term.terms)}</td>
                  <td className="px-4 py-3 text-gray-300">{term.context}</td>
                </tr>
                {isOpen && canExpand && (
                  <tr className="bg-gray-950/80">
                    <td colSpan={4} className="px-6 py-4 border-t border-gray-800">
                      <div className="text-xs text-gray-500 mb-2">台詞</div>
                      <ul className="space-y-2 text-gray-200">
                        {term.quotes.slice(0, 3).map((quote) => (
                          <li key={quote} className="leading-relaxed">「{quote}」</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const AddressLookupView: React.FC<AddressLookupViewProps> = ({ characters }) => {
  const [books, setBooks] = useState<AddressBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState('');
  const [target, setTarget] = useState('');
  const [direction, setDirection] = useState<DirectionFilter>('outgoing');
  const [keyword, setKeyword] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loaded = await fetchAddressBooks();
        if (cancelled) return;
        setBooks(loaded);
        if (loaded.length > 0) {
          setSpeaker(prev => prev || loaded[0].character);
        }
      } catch (e) {
        if (!cancelled) setError('讀取稱呼表失敗。請確認本地 API 與角色資料夾。');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const speakerOptions = useMemo(() => {
    const names = new Set<string>();
    books.forEach(book => names.add(book.character));
    characters.forEach(character => names.add(character.name));
    return Array.from(names)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
      .map(name => ({ value: name, label: name }));
  }, [books, characters]);

  const currentBook = useMemo(
    () => books.find(book => book.character === speaker) || null,
    [books, speaker]
  );

  const isPairMode = Boolean(speaker && target);

  const targetOptions = useMemo(() => {
    const names = new Set<string>();
    books.forEach(book => {
      if (book.character === speaker) {
        book.outgoing.forEach(entry => names.add(entry.target));
        book.incoming.forEach(entry => names.add(entry.target));
      }
      book.outgoing.forEach(entry => {
        if (entry.target === speaker) names.add(book.character);
      });
      book.incoming.forEach(entry => {
        if (entry.target === speaker) names.add(book.character);
      });
    });
    return Array.from(names)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
      .map(name => ({ value: name, label: name }));
  }, [books, speaker]);

  const listRows = useMemo<DisplayRow[]>(() => {
    if (!currentBook || isPairMode) return [];
    const source = direction === 'outgoing' ? currentBook.outgoing : currentBook.incoming;
    return source
      .filter(entry => matchesKeyword(entry, keyword))
      .map(entry => ({ ...entry, direction }));
  }, [currentBook, direction, keyword, isPairMode]);

  const forwardRows = useMemo<DisplayRow[]>(() => {
    if (!isPairMode) return [];
    return collectEntries(books, speaker, target)
      .filter(entry => matchesKeyword(entry, keyword))
      .map(entry => ({ ...entry, direction: 'outgoing' as const }));
  }, [books, speaker, target, keyword, isPairMode]);

  const reverseRows = useMemo<DisplayRow[]>(() => {
    if (!isPairMode) return [];
    return collectEntries(books, target, speaker)
      .filter(entry => matchesKeyword(entry, keyword))
      .map(entry => ({ ...entry, direction: 'incoming' as const }));
  }, [books, speaker, target, keyword, isPairMode]);

  const identityTerms = useMemo<AddressIdentityTerm[]>(() => {
    if (!currentBook) return [];
    return (currentBook.identity || []).filter(term => matchesIdentityKeyword(term, keyword));
  }, [currentBook, keyword]);

  useEffect(() => {
    setExpandedKey(null);
  }, [speaker, direction, target, keyword]);

  const characterMap = useMemo(() => {
    const map = new Map<string, Character>();
    characters.forEach(character => map.set(character.name, character));
    return map;
  }, [characters]);

  const speakerAvatar = resolveImagePath(characterMap.get(speaker)?.image);
  const targetAvatar = resolveImagePath(characterMap.get(target)?.image);

  const toggleRow = (key: string) => {
    setExpandedKey(prev => (prev === key ? null : key));
  };

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col">
      <div className="p-8 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-3xl font-bold text-white mb-2">稱呼查詢器</h1>
        <p className="text-sm text-gray-400 mb-6">
          查角色怎麼叫人、怎麼被叫。選了對象後會同時顯示雙向。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SearchableSelect
            label="說話者"
            value={speaker}
            options={speakerOptions}
            placeholder="選擇角色…"
            onChange={(value) => {
              setSpeaker(value);
              setTarget('');
            }}
          />
          <div>
            <SearchableSelect
              label="對象"
              value={target}
              options={targetOptions}
              placeholder="全部對象"
              onChange={setTarget}
            />
            {target && (
              <button
                type="button"
                className="mt-1 text-xs text-indigo-300 hover:text-indigo-200"
                onClick={() => setTarget('')}
              >
                清除，顯示全部對象
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">方向</label>
            {isPairMode ? (
              <div className="px-3 py-2 text-sm rounded-md border border-gray-700 bg-gray-800 text-indigo-200">
                雙向對照
              </div>
            ) : (
              <div className="flex rounded-md overflow-hidden border border-gray-700">
                <button
                  className={`flex-1 px-3 py-2 text-sm ${direction === 'outgoing' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  onClick={() => setDirection('outgoing')}
                >
                  她怎麼叫別人
                </button>
                <button
                  className={`flex-1 px-3 py-2 text-sm ${direction === 'incoming' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  onClick={() => setDirection('incoming')}
                >
                  別人怎麼叫她
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">關鍵字</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="稱呼、指稱、台詞…"
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {isLoading && <div className="text-gray-400">讀取稱呼表中…</div>}
        {error && <div className="text-red-400">{error}</div>}
        {!isLoading && !error && books.length === 0 && (
          <div className="text-gray-400">還沒有任何 <code className="text-indigo-300">稱呼表.md</code>。先從角色資料夾整理一份即可。</div>
        )}
        {!isLoading && !error && books.length > 0 && !speaker && (
          <div className="text-gray-400">請先選說話者。</div>
        )}
        {!isLoading && !error && books.length > 0 && speaker && !isPairMode && !currentBook && (
          <div className="text-gray-400">「{speaker}」還沒有稱呼表。選一個對象後，會改從對方的稱呼表反查。</div>
        )}

        {currentBook && identityTerms.length > 0 && (
          <section className={isPairMode || listRows.length > 0 ? 'mb-8' : ''}>
            <div className="mb-3 flex items-center gap-3 text-sm text-gray-400">
              {speakerAvatar && (
                <img src={speakerAvatar} alt={speaker} className="w-8 h-8 rounded-full object-cover border border-gray-600" />
              )}
              <span className="text-white">名稱與自稱</span>
            </div>
            <IdentityTable
              terms={identityTerms}
              expandedKey={expandedKey}
              onToggle={toggleRow}
            />
          </section>
        )}

        {isPairMode && (
          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center gap-3 text-sm text-gray-400">
                {speakerAvatar && (
                  <img src={speakerAvatar} alt={speaker} className="w-8 h-8 rounded-full object-cover border border-gray-600" />
                )}
                <span className="text-white">{speaker} → {target}</span>
                <span className="ml-auto">{forwardRows.length} 筆</span>
              </div>
              <AddressTable
                rows={forwardRows}
                emptyText="暫無"
                expandedKey={expandedKey}
                onToggle={toggleRow}
                keyPrefix="forward"
              />
            </section>
            <section>
              <div className="mb-3 flex items-center gap-3 text-sm text-gray-400">
                {targetAvatar && (
                  <img src={targetAvatar} alt={target} className="w-8 h-8 rounded-full object-cover border border-gray-600" />
                )}
                <span className="text-white">{target} → {speaker}</span>
                <span className="ml-auto">{reverseRows.length} 筆</span>
              </div>
              <AddressTable
                rows={reverseRows}
                emptyText="暫無"
                expandedKey={expandedKey}
                onToggle={toggleRow}
                keyPrefix="reverse"
              />
            </section>
          </div>
        )}

        {!isPairMode && currentBook && (
          <>
            <div className="mb-4 flex items-center gap-3 text-sm text-gray-400">
              {speakerAvatar && (
                <img src={speakerAvatar} alt={speaker} className="w-8 h-8 rounded-full object-cover border border-gray-600" />
              )}
              <span>
                {direction === 'outgoing' ? `${currentBook.character} → 對象` : `對象 → ${currentBook.character}`}
              </span>
              <span className="ml-auto">{listRows.length} 筆</span>
            </div>
            <AddressTable
              rows={listRows}
              emptyText="沒有符合條件的稱呼列。"
              expandedKey={expandedKey}
              onToggle={toggleRow}
              keyPrefix="list"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AddressLookupView;
