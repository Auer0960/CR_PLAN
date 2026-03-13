import React, { useState, useEffect, Fragment } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

/**
 * 讓 Markdown 渲染更直觀：
 * - 一般段落：單次 Enter 就換行（加兩個尾部空格 = hard break）
 * - 標題行（# ## ###）：自動在前後插入空行，確保被正確解析
 */
function prepareMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  const isHeading = (s: string) => /^#{1,6}(\s|$)/.test(s.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] ?? '';
    const prevResult = result[result.length - 1] ?? '';
    const empty = line.trim() === '';
    const heading = isHeading(line);
    const nextHeading = isHeading(nextLine);
    const nextEmpty = nextLine.trim() === '';

    // 標題前若不是空行，先插入空行
    if (heading && prevResult.trim() !== '' && result.length > 0) {
      result.push('');
    }

    result.push(line);

    // 標題後若不是空行，插入空行
    if (heading && !nextEmpty) {
      result.push('');
      continue;
    }

    // 一般文字行：尾部加兩個空格讓單次 Enter 換行（不管下一行是否為空）
    if (!empty && !heading && !nextHeading && !line.endsWith('  ')) {
      result[result.length - 1] = line + '  ';
    }
  }

  return result.join('\n');
}
import type { GlossaryTerm, GlossaryDraft, Character, TimelineEvent, AppUser, ModLogChange, ModLogEntry, ProfileField } from '../types';

const DRAFT_KEY = (code: string) => `cr_glossary_draft_${code}`;
import { computeLineDiff } from '../utils/diffLine';
import { CloseIcon, TrashIcon, EditIcon } from './Icons';
import MultiSelectModal from './MultiSelectModal';

const PRESET_CATEGORIES = ['地名', '組織', '術語', '其他'];

type GlossaryMode = 'view' | 'edit' | 'log';

interface GlossaryTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  term: GlossaryTerm | null;
  onSave: (term: GlossaryTerm) => void;
  onDelete?: () => void;
  characters: Character[];
  timelineEvents: TimelineEvent[];
  onCharacterClick: (character: Character) => void;
  isAdmin?: boolean;
  currentUser?: AppUser | null;
  onDraftChange?: () => void;
  autoRestoreDraft?: boolean;
  duplicateFrom?: GlossaryTerm | null;
}

const GlossaryTermModal: React.FC<GlossaryTermModalProps> = ({
  isOpen,
  onClose,
  term,
  onSave,
  onDelete,
  characters,
  timelineEvents,
  onCharacterClick,
  isAdmin = false,
  currentUser,
  onDraftChange,
  autoRestoreDraft = false,
  duplicateFrom = null,
}) => {
  const [mode, setMode] = useState<GlossaryMode>('view');
  const [localTerm, setLocalTerm] = useState<GlossaryTerm | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<GlossaryDraft | null>(null);

  // Edit form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [relatedCharacterIds, setRelatedCharacterIds] = useState<string[]>([]);
  const [relatedEventIds, setRelatedEventIds] = useState<string[]>([]);
  const [isCharPickerOpen, setIsCharPickerOpen] = useState(false);
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);

  // Event popup in view mode
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // Log mode state
  const [expandedLogIndices, setExpandedLogIndices] = useState<Set<number>>(new Set());
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (term) {
        setLocalTerm(term);
        setMode('view');
        syncFormFromTerm(term);
        setShowDraftBanner(false);
        setPendingDraft(null);
      } else {
        setLocalTerm(null);
        setMode('edit');

        // Pre-fill from duplicate source (takes priority over draft)
        if (duplicateFrom) {
          setName(`複製 - ${duplicateFrom.name}`);
          setCategory(duplicateFrom.category || '');
          // Deep-copy fields with new IDs to avoid conflicts
          setFields((duplicateFrom.fields || []).map(f => ({ ...f, id: uuidv4() })));
          setAliases(duplicateFrom.aliases ? [...duplicateFrom.aliases] : []);
          setRelatedCharacterIds([...duplicateFrom.relatedCharacterIds]);
          setRelatedEventIds([...duplicateFrom.relatedEventIds]);
          setShowDraftBanner(false);
          setPendingDraft(null);
        } else {
          setName('');
          setCategory('');
          setFields([]);
          setAliases([]);
          setRelatedCharacterIds([]);
          setRelatedEventIds([]);
        }

        // Check for saved draft (only when not duplicating)
        if (!duplicateFrom && currentUser) {
          try {
            const raw = localStorage.getItem(DRAFT_KEY(currentUser.code));
            if (raw) {
              const d: GlossaryDraft = JSON.parse(raw);
              if (autoRestoreDraft) {
                setName(d.name || '');
                setCategory(d.category || '');
                setFields(d.fields || []);
                setAliases(d.aliases || []);
                setRelatedCharacterIds(d.relatedCharacterIds || []);
                setRelatedEventIds(d.relatedEventIds || []);
                setShowDraftBanner(false);
                setPendingDraft(null);
              } else {
                setPendingDraft(d);
                setShowDraftBanner(true);
              }
            } else {
              setShowDraftBanner(false);
              setPendingDraft(null);
            }
          } catch {
            setShowDraftBanner(false);
            setPendingDraft(null);
          }
        } else {
          setShowDraftBanner(false);
          setPendingDraft(null);
        }
      }
      setAliasInput('');
      setActiveEventId(null);
      setExpandedLogIndices(new Set());
      setEditingNoteIndex(null);
    }
  }, [isOpen, term]);

  const syncFormFromTerm = (t: GlossaryTerm) => {
    setName(t.name);
    setCategory(t.category || '');
    setFields(t.fields || []);
    setAliases(t.aliases || []);
    setRelatedCharacterIds(t.relatedCharacterIds || []);
    setRelatedEventIds(t.relatedEventIds || []);
  };

  // Draft helpers
  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    setName(pendingDraft.name || '');
    setCategory(pendingDraft.category || '');
    setFields(pendingDraft.fields || []);
    setAliases(pendingDraft.aliases || []);
    setRelatedCharacterIds(pendingDraft.relatedCharacterIds || []);
    setRelatedEventIds(pendingDraft.relatedEventIds || []);
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    if (currentUser) {
      localStorage.removeItem(DRAFT_KEY(currentUser.code));
      onDraftChange?.();
    }
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  // Close handler that auto-saves draft when closing a new (unsaved) term with content
  const handleClose = () => {
    if (mode === 'edit' && !localTerm && currentUser) {
      const hasContent =
        name.trim() !== '' ||
        fields.some(f => f.content.trim() !== '') ||
        aliases.length > 0;
      if (hasContent) {
        const d: GlossaryDraft = {
          name,
          category,
          fields,
          aliases,
          relatedCharacterIds,
          relatedEventIds,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY(currentUser.code), JSON.stringify(d));
        onDraftChange?.();
      }
    }
    onClose();
  };

  const handleAddAlias = () => {
    const v = aliasInput.trim();
    if (v && !aliases.includes(v)) {
      setAliases(prev => [...prev, v]);
      setAliasInput('');
    }
  };

  const handleRemoveAlias = (a: string) => {
    setAliases(prev => prev.filter(x => x !== a));
  };

  const updateField = (idx: number, patch: Partial<ProfileField>) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };

  const addField = () => {
    setFields(prev => [...prev, { id: uuidv4(), label: '新欄位', content: '' }]);
  };

  const deleteField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    setFields(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // Build diff between old and new values
  const buildDiff = (): ModLogChange[] => {
    const changes: ModLogChange[] = [];
    const base = localTerm;
    const newName = name.trim();
    const newCat = category.trim() || '其他';
    const newAliases = aliases.join(', ');
    const oldAliases = (base?.aliases || []).join(', ');
    const newChars = [...relatedCharacterIds].sort().join(',');
    const oldChars = [...(base?.relatedCharacterIds || [])].sort().join(',');
    const newEvts = [...relatedEventIds].sort().join(',');
    const oldEvts = [...(base?.relatedEventIds || [])].sort().join(',');

    if (!base) return []; // new term, no diff needed
    if (base.name !== newName) changes.push({ field: 'name', label: '名稱', before: base.name, after: newName });
    if (base.category !== newCat) changes.push({ field: 'category', label: '分類', before: base.category, after: newCat });

    // Fields diff: per-field by id
    const oldFields = base.fields || [];
    const oldMap = new Map(oldFields.map(f => [f.id, f]));
    for (const f of fields) {
      const oldF = oldMap.get(f.id);
      if (!oldF) {
        changes.push({ field: `field_${f.id}`, label: `新增：${f.label}`, before: '', after: f.content });
      } else if (oldF.content !== f.content || oldF.label !== f.label) {
        if (oldF.content !== f.content) {
          changes.push({ field: `field_${f.id}`, label: f.label, before: oldF.content, after: f.content });
        }
        if (oldF.label !== f.label) {
          changes.push({ field: `field_label_${f.id}`, label: `${f.label}（標題）`, before: oldF.label, after: f.label });
        }
      }
    }
    for (const oldF of oldFields) {
      if (!fields.some(f => f.id === oldF.id)) {
        changes.push({ field: `field_${oldF.id}`, label: `刪除：${oldF.label}`, before: oldF.content, after: '' });
      }
    }

    if (oldAliases !== newAliases) changes.push({ field: 'aliases', label: '別名', before: oldAliases || '（無）', after: newAliases || '（無）' });
    if (oldChars !== newChars) {
      const oldNames = (base.relatedCharacterIds || []).map(id => characters.find(c => c.id === id)?.name || id).join(', ');
      const newNames = relatedCharacterIds.map(id => characters.find(c => c.id === id)?.name || id).join(', ');
      changes.push({ field: 'relatedCharacters', label: '關聯角色', before: oldNames || '（無）', after: newNames || '（無）' });
    }
    if (oldEvts !== newEvts) {
      const oldNames = (base.relatedEventIds || []).map(id => timelineEvents.find(e => e.id === id)?.title || id).join(', ');
      const newNames = relatedEventIds.map(id => timelineEvents.find(e => e.id === id)?.title || id).join(', ');
      changes.push({ field: 'relatedEvents', label: '關聯事件', before: oldNames || '（無）', after: newNames || '（無）' });
    }
    return changes;
  };

  const doSave = () => {
    if (!name.trim()) return;
    const now = Date.now();
    const changes = buildDiff();
    const existingModLog = localTerm?.modLog || [];
    const newModLog: ModLogEntry[] = (currentUser && changes.length > 0)
      ? [...existingModLog, { at: now, by: currentUser.name, changes }]
      : existingModLog;

    const finalTerm: GlossaryTerm = {
      id: localTerm?.id ?? uuidv4(),
      name: name.trim(),
      category: category.trim() || '其他',
      fields: fields.length > 0 ? fields : undefined,
      aliases: aliases.length > 0 ? aliases : undefined,
      relatedCharacterIds,
      relatedEventIds,
      modLog: newModLog.length > 0 ? newModLog : undefined,
      createdAt: localTerm?.createdAt ?? now,
      updatedAt: now,
    };

    setLocalTerm(finalTerm);
    onSave(finalTerm);
    // Clear draft on successful save
    if (currentUser) {
      localStorage.removeItem(DRAFT_KEY(currentUser.code));
      onDraftChange?.();
    }
    setShowDraftBanner(false);
    setPendingDraft(null);
    setMode('view');
  };

  const handleCancelEdit = () => {
    if (localTerm) {
      syncFormFromTerm(localTerm);
      setMode('view');
    } else {
      handleClose(); // Will auto-save draft if content exists
    }
  };

  // Log helpers
  const handleSaveNoteForEntry = (displayIndex: number) => {
    if (!localTerm) return;
    const modLog = [...(localTerm.modLog || [])];
    const realIndex = modLog.length - 1 - displayIndex;
    modLog[realIndex] = { ...modLog[realIndex], note: editingNoteText.trim() || undefined };
    const updated = { ...localTerm, modLog };
    setLocalTerm(updated);
    onSave(updated);
    setEditingNoteIndex(null);
    setEditingNoteText('');
  };

  const handleDeleteLogEntry = (displayIndex: number) => {
    if (!localTerm) return;
    const modLog = [...(localTerm.modLog || [])];
    const realIndex = modLog.length - 1 - displayIndex;
    modLog.splice(realIndex, 1);
    const updated = { ...localTerm, modLog };
    setLocalTerm(updated);
    onSave(updated);
  };

  const selectedChars = characters.filter(c => relatedCharacterIds.includes(c.id));
  const selectedEvents = timelineEvents.filter(e => relatedEventIds.includes(e.id));
  const viewChars = characters.filter(c => (localTerm?.relatedCharacterIds || []).includes(c.id));
  const viewEvents = timelineEvents.filter(e => (localTerm?.relatedEventIds || []).includes(e.id));
  const activeEventDetail = activeEventId ? timelineEvents.find(e => e.id === activeEventId) : null;

  const characterItems = characters.map(c => ({ id: c.id, label: c.name, imageUrl: c.image || undefined }));
  const eventItems = timelineEvents.map(ev => ({ id: ev.id, label: ev.title, subLabel: `年份 ${ev.startYear}` }));

  const categoryColor: Record<string, string> = {
    地名: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
    組織: 'bg-blue-900/60 text-blue-300 border border-blue-700/50',
    術語: 'bg-purple-900/60 text-purple-300 border border-purple-700/50',
    其他: 'bg-gray-700/60 text-gray-300 border border-gray-600/50',
  };
  const catStyle = (cat: string) => categoryColor[cat] || 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50';

  const tabBtn = (label: string, target: GlossaryMode, badge?: number) => (
    <button
      onClick={() => setMode(target)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
        mode === target
          ? 'border-indigo-500 text-indigo-300'
          : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="text-xs bg-gray-700 rounded-full px-1.5 py-0.5">{badge}</span>
      )}
    </button>
  );

  if (!isOpen) return null;

  return (
    <Fragment>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleClose}>
        <div
          className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-0 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">
                {!localTerm ? '新增名詞' : localTerm.name}
              </h2>
              {localTerm && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${catStyle(localTerm.category)}`}>
                  {localTerm.category}
                </span>
              )}
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-white mb-1">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Tab bar — only for existing terms */}
          {localTerm && (
            <div className="flex gap-1 px-5 border-b border-gray-700 flex-shrink-0">
              {tabBtn('📖 閱覽', 'view')}
              {tabBtn('✏️ 編輯', 'edit')}
              {tabBtn('📋 修改紀錄', 'log', localTerm.modLog?.length)}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── VIEW MODE ── */}
            {mode === 'view' && localTerm && (
              <div className="p-5 space-y-5 animate-fadeIn">
                {/* Aliases */}
                {localTerm.aliases && localTerm.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-gray-500">別名：</span>
                    {localTerm.aliases.map(a => (
                      <span key={a} className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{a}</span>
                    ))}
                  </div>
                )}

                {/* Fields */}
                {localTerm.fields && localTerm.fields.length > 0 && (
                  <div className="divide-y divide-gray-700/60 space-y-5">
                    {localTerm.fields.map((field) => (
                      <div key={field.id} className="pt-5 first:pt-0">
                        <div className="text-sm font-semibold text-indigo-300 mb-2">{field.label}</div>
                        {field.content ? (
                          <div className="prose prose-invert prose-sm max-w-none bg-gray-900/50 rounded-lg p-4 text-gray-200 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {prepareMarkdown(field.content)}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm italic bg-gray-900/30 rounded-lg p-4">（無內容）</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Related Characters */}
                {viewChars.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">關聯角色</div>
                    <div className="flex flex-wrap gap-2">
                      {viewChars.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { onCharacterClick(c); onClose(); }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/70 border border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/30 transition-colors group"
                          title={`點擊查看 ${c.name} 的資料`}
                        >
                          {c.image ? (
                            <img
                              src={c.image}
                              alt={c.name}
                              className="w-7 h-7 rounded-full object-cover border border-gray-600 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-700/60 flex items-center justify-center text-xs text-white flex-shrink-0">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm text-gray-200 group-hover:text-white">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Events */}
                {viewEvents.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">關聯事件</div>
                    <div className="flex flex-col gap-2">
                      {viewEvents.map(ev => (
                        <div key={ev.id}>
                          <button
                            onClick={() => setActiveEventId(activeEventId === ev.id ? null : ev.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 hover:border-yellow-600/60 hover:bg-yellow-900/10 transition-colors text-left group"
                          >
                            <span className="text-yellow-500 text-sm">📅</span>
                            <span className="text-sm text-gray-200 group-hover:text-white flex-1">{ev.title}</span>
                            <span className="text-xs text-gray-500">{ev.startYear} 年</span>
                            <span className="text-xs text-gray-600">{activeEventId === ev.id ? '▾' : '▸'}</span>
                          </button>
                          {activeEventId === ev.id && (
                            <div className="mt-1 ml-4 p-3 rounded-lg bg-gray-900/60 border border-yellow-900/40 text-sm text-gray-300 space-y-2">
                              {ev.location && <div className="text-xs text-gray-500">📍 {ev.location}</div>}
                              {ev.publicInfo && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">事件資訊</div>
                                  <p className="text-gray-300 text-sm leading-relaxed">{ev.publicInfo}</p>
                                </div>
                              )}
                              {ev.notes && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">備註</div>
                                  <p className="text-gray-400 text-sm leading-relaxed">{ev.notes}</p>
                                </div>
                              )}
                              {!ev.publicInfo && !ev.notes && (
                                <p className="text-gray-500 italic text-xs">（無詳細資訊）</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewChars.length === 0 && viewEvents.length === 0 && (!localTerm.fields || localTerm.fields.length === 0) && (
                  <div className="text-center py-8 text-gray-600 text-sm">
                    此名詞尚無任何資料
                  </div>
                )}
              </div>
            )}

            {/* ── EDIT MODE ── */}
            {mode === 'edit' && (
              <form
                onSubmit={e => { e.preventDefault(); doSave(); }}
                className="p-5 space-y-4 animate-fadeIn"
              >
                {/* Draft restore banner */}
                {showDraftBanner && pendingDraft && (
                  <div className="p-3 rounded-lg bg-indigo-950/70 border border-indigo-700/60 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-indigo-300 font-medium mb-0.5">發現未完成的草稿</div>
                      <div className="text-xs text-gray-400 truncate">
                        {pendingDraft.name || '（未命名）'} · 儲存於 {new Date(pendingDraft.savedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRestoreDraft}
                      className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded flex-shrink-0"
                    >
                      恢復草稿
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded flex-shrink-0"
                    >
                      捨棄
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">名稱 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="輸入名詞名稱"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                    autoFocus={!localTerm}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">分類</label>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={PRESET_CATEGORIES.includes(category) ? category : ''}
                      onChange={e => setCategory(e.target.value || category)}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- 選擇或下方自訂 --</option>
                      {PRESET_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={PRESET_CATEGORIES.includes(category) ? '' : category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="自訂分類"
                      className="flex-1 min-w-[120px] px-3 py-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">說明欄位（支援 Markdown）</label>
                  <div className="space-y-4">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateField(idx, { label: e.target.value })}
                            className="flex-1 px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded text-sm font-semibold focus:border-indigo-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => moveField(idx, -1)}
                            disabled={idx === 0}
                            title="上移"
                            className="px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                          >▲</button>
                          <button
                            type="button"
                            onClick={() => moveField(idx, 1)}
                            disabled={idx === fields.length - 1}
                            title="下移"
                            className="px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                          >▼</button>
                          <button
                            type="button"
                            onClick={() => deleteField(idx)}
                            title="刪除欄位"
                            className="px-2 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-900/30 text-xs"
                          >✕</button>
                        </div>
                        <textarea
                          value={field.content}
                          onChange={(e) => updateField(idx, { content: e.target.value })}
                          placeholder={`${field.label}內容（支援 Markdown）`}
                          className="w-full px-3 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-mono resize-y min-h-[120px]"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addField}
                      className="w-full py-2 rounded-lg border-2 border-dashed border-gray-600 hover:border-indigo-500 text-gray-400 hover:text-indigo-400 text-sm transition-colors"
                    >
                      ＋ 新增欄位
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">別名</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    {aliases.map(a => (
                      <span key={a} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-sm">
                        {a}
                        <button type="button" onClick={() => handleRemoveAlias(a)} className="text-gray-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={aliasInput}
                        onChange={e => setAliasInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAlias())}
                        placeholder="輸入別名後 Enter"
                        className="w-32 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm"
                      />
                      <button type="button" onClick={handleAddAlias} className="text-indigo-400 hover:underline text-sm">＋</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">關聯角色</label>
                  <button
                    type="button"
                    onClick={() => setIsCharPickerOpen(true)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-left text-sm hover:border-indigo-500 transition-colors min-h-[40px]"
                  >
                    {selectedChars.length === 0 ? (
                      <span className="text-gray-500">點擊選擇角色…</span>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        {selectedChars.map(c => (
                          <div key={c.id} className="flex items-center gap-1.5">
                            {c.image ? (
                              <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full object-cover border border-gray-600 bg-gray-800 flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-indigo-700/60 flex items-center justify-center flex-shrink-0 text-xs text-white">
                                {c.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-white text-sm">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">關聯事件</label>
                  <button
                    type="button"
                    onClick={() => setIsEventPickerOpen(true)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-left text-sm hover:border-indigo-500 transition-colors min-h-[40px]"
                  >
                    {selectedEvents.length === 0 ? (
                      <span className="text-gray-500">點擊選擇事件…</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {selectedEvents.map(ev => (
                          <div key={ev.id} className="flex items-center gap-2 text-white">
                            <span className="text-gray-500 text-xs">📅</span>
                            <span>{ev.title}</span>
                            <span className="text-gray-500 text-xs">（{ev.startYear} 年）</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── LOG MODE ── */}
            {mode === 'log' && localTerm && (
              <div className="p-5 animate-fadeIn">
                <h3 className="text-base font-semibold text-gray-200 mb-4">修改紀錄</h3>
                {!localTerm.modLog || localTerm.modLog.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">尚無修改紀錄</p>
                    <p className="text-xs mt-1">登入後儲存名詞資料即開始記錄</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...localTerm.modLog].reverse().map((entry, i) => {
                      const isExpanded = expandedLogIndices.has(i);
                      const toggle = () => setExpandedLogIndices(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      });
                      const isEditingThisNote = editingNoteIndex === i;
                      return (
                        <div key={i} className="rounded-lg border border-gray-700 overflow-hidden">
                          <div className="px-4 py-2.5 bg-gray-800/80">
                            <div
                              onClick={toggle}
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/60 -mx-2 px-2 py-1 rounded transition-colors select-none"
                            >
                              <span className="text-gray-500 text-sm">{isExpanded ? '▾' : '▸'}</span>
                              <span className="font-semibold text-indigo-400 text-sm">{entry.by}</span>
                              <span className="text-gray-600">·</span>
                              <span className="text-gray-400 text-xs">{new Date(entry.at).toLocaleString()}</span>
                              {entry.changes && entry.changes.length > 0 && (
                                <span className="text-xs text-gray-500">{entry.changes.length} 項變更</span>
                              )}
                              <div className="ml-auto flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                {!isEditingThisNote && (
                                  <button
                                    onClick={() => { setEditingNoteIndex(i); setEditingNoteText(entry.note || ''); }}
                                    className="text-xs text-gray-500 hover:text-yellow-400 px-1.5 py-0.5 rounded hover:bg-yellow-900/20 transition-colors"
                                    title={entry.note ? '編輯備註' : '新增備註'}
                                  >
                                    {entry.note ? '✏️ 備註' : '+ 備註'}
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() => { if (window.confirm('確定刪除此筆修改紀錄？')) handleDeleteLogEntry(i); }}
                                    className="text-xs text-gray-600 hover:text-red-400 px-1 py-0.5 rounded hover:bg-red-900/20 transition-colors"
                                    title="刪除此筆紀錄"
                                  >
                                    🗑
                                  </button>
                                )}
                              </div>
                            </div>

                            {isEditingThisNote ? (
                              <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
                                <textarea
                                  autoFocus
                                  value={editingNoteText}
                                  onChange={e => setEditingNoteText(e.target.value)}
                                  placeholder="輸入備註說明..."
                                  rows={2}
                                  className="flex-1 px-2 py-1 rounded bg-gray-900 border border-yellow-700/50 text-xs text-white resize-none focus:border-yellow-500 outline-none"
                                />
                                <div className="flex flex-col gap-1">
                                  <button onClick={() => handleSaveNoteForEntry(i)} className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded">儲存</button>
                                  <button onClick={() => { setEditingNoteIndex(null); setEditingNoteText(''); }} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">取消</button>
                                </div>
                              </div>
                            ) : entry.note ? (
                              <div className="mt-1.5 text-xs text-yellow-300/80 bg-yellow-900/20 border border-yellow-800/30 rounded px-2 py-1">
                                💬 {entry.note}
                              </div>
                            ) : null}
                          </div>

                          {isExpanded && entry.changes && entry.changes.length > 0 && (
                            <div className="divide-y divide-gray-800/60 border-t border-gray-700">
                              {entry.changes.map((change: ModLogChange, j: number) => {
                                const diffLines = computeLineDiff(change.before, change.after);
                                return (
                                  <div key={j} className="px-4 py-3 bg-gray-900/40">
                                    <div className="text-xs font-mono text-gray-500 mb-2 flex items-center gap-1">
                                      <span className="text-yellow-600">@@</span>
                                      <span>{change.label}</span>
                                    </div>
                                    {diffLines.length === 0 ? (
                                      <div className="text-xs text-gray-600 italic">（無變更）</div>
                                    ) : (
                                      <div className="font-mono text-xs max-h-40 overflow-y-auto space-y-0.5">
                                        {diffLines.map((dl, li) => (
                                          <div
                                            key={li}
                                            className={`flex gap-1 px-2 py-0.5 rounded ${
                                              dl.type === 'removed'
                                                ? 'bg-red-950/40 text-red-300'
                                                : 'bg-green-950/40 text-green-300'
                                            }`}
                                          >
                                            <span className="opacity-70 select-none flex-shrink-0">
                                              {dl.type === 'removed' ? '−' : '＋'}
                                            </span>
                                            <span className="break-all">{dl.text || ' '}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {isExpanded && (!entry.changes || entry.changes.length === 0) && (
                            <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-600">（無詳細變更記錄）</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-700 flex-shrink-0">
            <div>
              {isAdmin && localTerm && onDelete && mode === 'view' && (
                <button
                  type="button"
                  onClick={() => window.confirm('確定刪除此名詞？') && onDelete()}
                  className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm"
                >
                  <TrashIcon className="w-4 h-4" />
                  刪除
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {mode === 'view' && (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
                  >
                    關閉
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                  >
                    <EditIcon className="w-4 h-4" />
                    編輯
                  </button>
                </>
              )}
              {mode === 'edit' && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={doSave}
                    disabled={!name.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
                  >
                    儲存
                  </button>
                </>
              )}
              {mode === 'log' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
                >
                  關閉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isCharPickerOpen && (
        <MultiSelectModal
          isOpen={true}
          onClose={() => setIsCharPickerOpen(false)}
          title="選擇關聯角色"
          items={characterItems}
          selectedIds={relatedCharacterIds}
          onConfirm={setRelatedCharacterIds}
        />
      )}
      {isEventPickerOpen && (
        <MultiSelectModal
          isOpen={true}
          onClose={() => setIsEventPickerOpen(false)}
          title="選擇關聯事件"
          items={eventItems}
          selectedIds={relatedEventIds}
          onConfirm={setRelatedEventIds}
        />
      )}
    </Fragment>
  );
};

export default GlossaryTermModal;
