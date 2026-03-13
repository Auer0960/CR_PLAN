import React, { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TimelineData, TimelineEvent, TimelineLocation } from '../types';
import { CloseIcon, PlusIcon, TrashIcon } from './Icons';
import SearchableSelect from './SearchableSelect';

interface TimelineLocationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: TimelineData;
  onUpdateTimeline: (data: TimelineData) => void;
}

function normalizeLabel(label: string) {
  return (label || '').trim();
}

function ensureLocationNodes(data: TimelineData): TimelineLocation[] {
  const nodes = Array.isArray(data.locationNodes) ? data.locationNodes : [];
  // 若 nodes 為空但 locations 有值，先用 locations 生成「無層級」節點（不破壞既有 locations）
  if (nodes.length === 0 && Array.isArray(data.locations) && data.locations.length > 0) {
    const now = Date.now();
    const unique = Array.from(new Set(data.locations.map(l => normalizeLabel(l)).filter(Boolean)));
    return unique.map(label => ({
      id: `loc_${label}`,
      label,
      description: '',
      createdAt: now,
      updatedAt: now,
    }));
  }
  return nodes;
}

export default function TimelineLocationManager({
  isOpen,
  onClose,
  timelineData,
  onUpdateTimeline,
}: TimelineLocationManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const nodes = useMemo(() => ensureLocationNodes(timelineData), [timelineData]);
  const events = useMemo(() => (timelineData.events || []) as TimelineEvent[], [timelineData.events]);

  const nodesById = useMemo(() => {
    const m = new Map<string, TimelineLocation>();
    nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [nodes]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string | null, TimelineLocation[]>();
    nodes.forEach(n => {
      const key = n.parentId || null;
      const arr = m.get(key) || [];
      arr.push(n);
      m.set(key, arr);
    });
    // sort by label
    for (const [k, arr] of m) {
      arr.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
      m.set(k, arr);
    }
    return m;
  }, [nodes]);

  const directCountByLabel = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const loc = normalizeLabel(e.location);
      if (!loc) continue;
      m.set(loc, (m.get(loc) || 0) + 1);
    }
    return m;
  }, [events]);

  const aggregateCountById = useMemo(() => {
    const memo = new Map<string, number>();
    const dfs = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      const node = nodesById.get(id);
      if (!node) return 0;
      const self = directCountByLabel.get(node.label) || 0;
      const kids = childrenByParent.get(id) || [];
      const sum = self + kids.reduce((acc, c) => acc + dfs(c.id), 0);
      memo.set(id, sum);
      return sum;
    };
    nodes.forEach(n => dfs(n.id));
    return memo;
  }, [nodes, nodesById, directCountByLabel, childrenByParent]);

  const selected = selectedId ? nodesById.get(selectedId) || null : null;

  const parentOptions = useMemo(() => {
    const opts = nodes
      .map(n => ({ value: n.id, label: n.label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
    return [{ value: '', label: '（無上層）' }, ...opts];
  }, [nodes]);

  const filteredIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const matched = new Set<string>();
    nodes.forEach(n => {
      if (n.label.toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q)) {
        matched.add(n.id);
        // include ancestors
        let p = n.parentId;
        while (p) {
          matched.add(p);
          p = nodesById.get(p)?.parentId;
        }
      }
    });
    return matched;
  }, [search, nodes, nodesById]);

  const canSetParent = (childId: string, parentId: string | null) => {
    if (!parentId) return true;
    if (childId === parentId) return false;
    // 防止循環：往上追溯 parent 的祖先，若遇到 childId 則禁止
    let p: string | undefined = parentId;
    while (p) {
      if (p === childId) return false;
      p = nodesById.get(p)?.parentId;
    }
    return true;
  };

  const setParentByDrag = (dragId: string, dropParentId: string | null) => {
    if (!canSetParent(dragId, dropParentId)) {
      alert('不能把地點拖到自己的子孫底下（會形成循環）。');
      return;
    }
    upsertNode({ id: dragId, parentId: dropParentId || undefined });
  };

  const renderTree = (parentId: string | null, depth: number) => {
    const kids = childrenByParent.get(parentId) || [];
    if (kids.length === 0) return null;

    return (
      <div className="space-y-1">
        {kids
          .filter(n => (filteredIds ? filteredIds.has(n.id) : true))
          .map(n => {
            const isSelected = n.id === selectedId;
            const count = aggregateCountById.get(n.id) || 0;
            return (
              <div key={n.id}>
                <button
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                    isSelected ? 'bg-indigo-600/30 border border-indigo-500/40' : 'hover:bg-gray-700/40'
                  }`}
                  style={{ paddingLeft: `${8 + depth * 14}px` }}
                  onClick={() => setSelectedId(n.id)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', n.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // 避免冒泡到外層容器的 onDrop（不然會被改回最上層）
                    const dragId = e.dataTransfer.getData('text/plain');
                    if (!dragId) return;
                    if (dragId === n.id) return;
                    setParentByDrag(dragId, n.id);
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{n.label}</div>
                    {n.description && (
                      <div className="text-xs text-gray-400 truncate">{n.description}</div>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-200 flex-shrink-0">
                    {count}
                  </span>
                </button>
                <div className="mt-1">{renderTree(n.id, depth + 1)}</div>
              </div>
            );
          })}
      </div>
    );
  };

  const upsertNode = (patch: Partial<TimelineLocation> & { id: string }) => {
    const now = Date.now();
    const current = nodesById.get(patch.id);
    const nextNodes = current
      ? nodes.map(n => (n.id === patch.id ? { ...n, ...patch, updatedAt: now } : n))
      : [...nodes, { id: patch.id, label: patch.label || '', parentId: patch.parentId, description: patch.description || '', createdAt: now, updatedAt: now }];

    onUpdateTimeline({
      ...timelineData,
      locationNodes: nextNodes,
      // locations 保留作為歷史/相容清單：把 node labels 補進去（去重）
      locations: Array.from(new Set([...(timelineData.locations || []), ...nextNodes.map(n => n.label)].map(normalizeLabel).filter(Boolean))),
    });
  };

  const removeNode = (id: string) => {
    const target = nodesById.get(id);
    if (!target) return;

    const hasChildren = (childrenByParent.get(id) || []).length > 0;
    if (hasChildren) {
      alert('此地點底下還有子地點，請先移動/刪除子地點。');
      return;
    }

    const usedCount = directCountByLabel.get(target.label) || 0;
    if (usedCount > 0) {
      alert(`此地點目前被 ${usedCount} 個事件使用中，請先修改事件地點或用「改名」進行合併。`);
      return;
    }

    if (!confirm(`確定要刪除地點「${target.label}」嗎？`)) return;

    const nextNodes = nodes.filter(n => n.id !== id);
    onUpdateTimeline({
      ...timelineData,
      locationNodes: nextNodes,
      locations: Array.from(new Set((timelineData.locations || []).map(normalizeLabel).filter(Boolean))),
    });
    if (selectedId === id) setSelectedId(null);
  };

  const createLocation = (parentId?: string) => {
    const label = prompt('輸入新地點名稱（可先隨便填，之後可改名）');
    if (!label) return;
    const clean = normalizeLabel(label);
    if (!clean) return;

    // 若同名已存在，直接選取
    const existed = nodes.find(n => n.label === clean);
    if (existed) {
      setSelectedId(existed.id);
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    const nextNodes = [
      ...nodes,
      { id, label: clean, parentId: parentId || undefined, description: '', createdAt: now, updatedAt: now },
    ];
    onUpdateTimeline({
      ...timelineData,
      locationNodes: nextNodes,
      locations: Array.from(new Set([...(timelineData.locations || []), clean].map(normalizeLabel).filter(Boolean))),
    });
    setSelectedId(id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
      <div className="bg-gray-800 w-full max-w-5xl rounded-lg shadow-2xl border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <div className="text-lg font-bold text-white">地點管理</div>
            <div className="text-xs text-gray-400 mt-1">
              支援層級與說明；右側顯示「事件使用數」(含子地點累計)
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* 左：Tree */}
          <div
            className="border-r border-gray-700 p-4 overflow-y-auto custom-scrollbar"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              // 丟到左側空白處 => 設為最上層
              e.preventDefault();
              // 只有真的丟在「容器空白處」才處理，避免覆寫子項 onDrop 的結果
              if (e.target !== e.currentTarget) return;
              const dragId = e.dataTransfer.getData('text/plain');
              if (!dragId) return;
              setParentByDrag(dragId, null);
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋地點/說明…"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
              <button
                onClick={() => createLocation()}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                新增
              </button>
            </div>

            {nodes.length === 0 ? (
              <div className="text-gray-400 text-sm">尚無地點。你可以先按「新增」。</div>
            ) : (
              renderTree(null, 0)
            )}
            <div className="mt-3 text-xs text-gray-500">
              小技巧：把一個地點<strong>拖曳</strong>到另一個地點上，就會變成它的子地點；拖到左側空白處則回到最上層。
            </div>
          </div>

          {/* 右：Detail */}
          <div className="p-4 overflow-y-auto custom-scrollbar">
            {!selected ? (
              <div className="text-gray-400 text-sm">點左側地點以編輯詳細說明與層級。</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-400">正在編輯</div>
                    <div className="text-xl font-bold text-white">{selected.label}</div>
                  </div>
                  <button
                    onClick={() => removeNode(selected.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm flex items-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                    刪除
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">地點名稱</label>
                  <input
                    value={selected.label}
                    onChange={(e) => {
                      const v = normalizeLabel(e.target.value);
                      upsertNode({ id: selected.id, label: v });
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    建議：若要「合併地點」，直接把名稱改成另一個已存在的名稱即可（之後我也能幫你做正式合併流程）。
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">上層地點</label>
                  <SearchableSelect
                    value={selected.parentId || ''}
                    options={parentOptions}
                    placeholder="選擇上層地點…"
                    onChange={(next) => {
                      const parentId = next || undefined;
                      // 防止自己成為自己的 parent
                      if (parentId === selected.id) return;
                      upsertNode({ id: selected.id, parentId });
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">詳細說明</label>
                  <textarea
                    value={selected.description || ''}
                    onChange={(e) => upsertNode({ id: selected.id, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white min-h-[220px]"
                    placeholder="例如：地點背景、勢力控制、氛圍、可用場景…"
                  />
                </div>

                <div className="rounded border border-gray-700 bg-gray-900/30 p-3 text-sm text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">事件使用數（含子地點累計）</span>
                    <span className="px-2 py-0.5 rounded bg-gray-700">
                      {aggregateCountById.get(selected.id) || 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    目前事件仍是以「地點文字」儲存；地點管理提供層級與說明，不會破壞既有事件資料。
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => createLocation(selected.id)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    新增子地點
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}


