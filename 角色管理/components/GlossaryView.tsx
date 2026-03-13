import React, { useState, useMemo, useEffect } from 'react';
import type { GlossaryTerm, GlossaryDraft, Character, TimelineEvent, AppUser } from '../types';
import { SearchIcon, PlusIcon } from './Icons';
import GlossaryTermModal from './GlossaryTermModal';

const DRAFT_KEY = (code: string) => `cr_glossary_draft_${code}`;

const PRESET_CATEGORIES = ['地名', '組織', '術語', '其他'];

interface GlossaryViewProps {
  glossaryTerms: GlossaryTerm[];
  onSaveTerm: (term: GlossaryTerm) => void;
  onDeleteTerm: (termId: string) => void;
  characters: Character[];
  timelineEvents: TimelineEvent[];
  onCharacterClick: (character: Character) => void;
  currentUser?: AppUser | null;
}

const GlossaryView: React.FC<GlossaryViewProps> = ({
  glossaryTerms,
  onSaveTerm,
  onDeleteTerm,
  characters,
  timelineEvents,
  onCharacterClick,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('全部');
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draft, setDraft] = useState<GlossaryDraft | null>(null);
  const [openAsDraft, setOpenAsDraft] = useState(false);
  const [duplicateFrom, setDuplicateFrom] = useState<GlossaryTerm | null>(null);

  const refreshDraft = () => {
    if (!currentUser) { setDraft(null); return; }
    try {
      const raw = localStorage.getItem(DRAFT_KEY(currentUser.code));
      setDraft(raw ? JSON.parse(raw) : null);
    } catch { setDraft(null); }
  };

  useEffect(() => {
    refreshDraft();
  }, [currentUser]);

  const categories = useMemo(() => {
    const fromTerms = new Set(glossaryTerms.map(t => t.category).filter(Boolean));
    return ['全部', ...PRESET_CATEGORIES, ...Array.from(fromTerms).filter(c => !PRESET_CATEGORIES.includes(c))];
  }, [glossaryTerms]);

  const filteredTerms = useMemo(() => {
    return glossaryTerms.filter(term => {
      const matchSearch =
        !searchQuery.trim() ||
        term.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (term.fields || []).some(f => f.content?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (term.aliases || []).some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory =
        categoryFilter === '全部' || term.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [glossaryTerms, searchQuery, categoryFilter]);

  const handleAddNew = () => {
    setEditingTerm(null);
    setOpenAsDraft(false);
    setDuplicateFrom(null);
    setIsAddOpen(true);
  };

  const handleDuplicate = (term: GlossaryTerm) => {
    setEditingTerm(null);
    setOpenAsDraft(false);
    setDuplicateFrom(term);
    setIsAddOpen(true);
  };

  const handleOpenDraft = () => {
    setEditingTerm(null);
    setOpenAsDraft(true);
    setDuplicateFrom(null);
    setIsAddOpen(true);
  };

  const handleDeleteDraft = () => {
    if (!currentUser) return;
    localStorage.removeItem(DRAFT_KEY(currentUser.code));
    setDraft(null);
  };

  const handleEdit = (term: GlossaryTerm) => {
    setEditingTerm(term);
    setOpenAsDraft(false);
    setDuplicateFrom(null);
    setIsAddOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setEditingTerm(null);
    setOpenAsDraft(false);
    setDuplicateFrom(null);
    refreshDraft();
  };

  const handleSave = (term: GlossaryTerm) => {
    onSaveTerm(term);
    // 不在此關閉 modal，讓 modal 自行切回 view 模式
  };

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-700 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">名詞專頁</h1>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            新增名詞
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋名詞..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredTerms.length === 0 && !draft ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">尚無名詞</p>
            <p className="text-sm">點擊「新增名詞」開始建立</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Draft card — only visible to the current user */}
            {draft && currentUser && (
              <div className="relative group">
                <div
                  onClick={handleOpenDraft}
                  className="p-4 rounded-lg border-2 border-dashed border-indigo-700/50 bg-indigo-950/20 opacity-60 hover:opacity-90 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-indigo-300 truncate">
                      {draft.name || '未命名草稿'}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-400 border border-indigo-800/60 flex-shrink-0">
                      草稿
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {draft.fields?.[0]?.content || '（無說明）'}
                  </p>
                  <div className="text-xs text-gray-600">
                    上次儲存：{new Date(draft.savedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDraft(); }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-700 hover:bg-red-900/60 text-gray-500 hover:text-red-400 flex items-center justify-center text-xs transition-colors"
                  title="刪除草稿"
                >
                  ✕
                </button>
              </div>
            )}
            {filteredTerms.map(term => (
              <div key={term.id} className="relative group">
                <div
                  onClick={() => handleEdit(term)}
                  className="p-4 rounded-lg border border-gray-700 bg-gray-800/60 hover:bg-gray-800 cursor-pointer transition-colors h-full"
                >
                  <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                    <h3 className="font-semibold text-white truncate">{term.name}</h3>
                    {term.category && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 flex-shrink-0">
                        {term.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-2">
                    {term.fields && term.fields[0]?.content
                      ? term.fields[0].content
                      : '（無說明）'}
                  </p>
                  <div className="flex gap-2 text-xs text-gray-500">
                    {term.relatedCharacterIds.length > 0 && (
                      <span>👤 {term.relatedCharacterIds.length}</span>
                    )}
                    {term.relatedEventIds.length > 0 && (
                      <span>📅 {term.relatedEventIds.length}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(term); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded bg-gray-700 hover:bg-indigo-700 text-gray-400 hover:text-white flex items-center justify-center text-xs transition-all"
                  title="複製此名詞"
                >
                  ⧉
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {(isAddOpen || editingTerm) && (
        <GlossaryTermModal
          isOpen={true}
          onClose={handleCloseModal}
          term={editingTerm}
          onSave={handleSave}
          onDelete={editingTerm ? () => { onDeleteTerm(editingTerm.id); handleCloseModal(); } : undefined}
          characters={characters}
          timelineEvents={timelineEvents}
          onCharacterClick={onCharacterClick}
          isAdmin={currentUser?.code === '01069'}
          currentUser={currentUser}
          onDraftChange={refreshDraft}
          autoRestoreDraft={openAsDraft}
          duplicateFrom={duplicateFrom}
        />
      )}
    </div>
  );
};

export default GlossaryView;
