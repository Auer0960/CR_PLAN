import React, { useMemo, useState } from 'react';
import type { TimelineData, Character, TagWithColor } from '../types';
import MultiSelectModal from './MultiSelectModal';

interface FilterState {
  yearRange: [number, number] | null;
  sizes: ('large' | 'medium' | 'small')[];
  characterIds: string[];
  locations: string[];
  tagIds: string[];
}

interface TimelineFilterPanelProps {
  timelineData: TimelineData;
  characters: Character[];
  allTags: TagWithColor[];
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
  yearRange: { min: number; max: number };
}

const TimelineFilterPanel: React.FC<TimelineFilterPanelProps> = ({
  timelineData,
  characters,
  allTags,
  filterState,
  onFilterChange,
  yearRange,
}) => {
  const [localYearRange, setLocalYearRange] = useState<[number, number]>(
    filterState.yearRange || [yearRange.min, yearRange.max]
  );
  const [activeModal, setActiveModal] = useState<'characters' | 'locations' | 'tags' | null>(null);

  const handleSizeToggle = (size: 'large' | 'medium' | 'small') => {
    const newSizes = filterState.sizes.includes(size)
      ? filterState.sizes.filter(s => s !== size)
      : [...filterState.sizes, size];
    onFilterChange({ ...filterState, sizes: newSizes });
  };

  const applyYearRange = () => {
    onFilterChange({ ...filterState, yearRange: localYearRange });
  };

  const characterItems = useMemo(() => {
    const safeAllTags = Array.isArray(allTags) ? allTags : [];
    return characters.map(c => {
      const charTags = (c.tagIds || [])
        .map(tagId => safeAllTags.find(t => t && t.id === tagId))
        .filter((t): t is TagWithColor => t !== undefined)
        .map(t => ({ label: t.label, color: t.color }));

      return {
        id: c.id,
        label: c.name,
        subLabel: c.notes ? (c.notes.length > 20 ? c.notes.substring(0, 20) + '...' : c.notes) : '',
        imageUrl: c.image,
        tags: charTags,
      };
    });
  }, [characters, allTags]);

  const characterFilterTags = useMemo(() => {
    const safeAllTags = Array.isArray(allTags) ? allTags : [];
    const unique = new Map<string, { id: string; label: string; color: string }>();
    safeAllTags.forEach(tag => {
      if (!tag) return;
      if (!unique.has(tag.label)) unique.set(tag.label, { id: tag.id, label: tag.label, color: tag.color });
    });
    return Array.from(unique.values());
  }, [allTags]);

  const locationItems = useMemo(() => {
    const fromEvents = (timelineData.events || [])
      .map(e => (e.location || '').trim())
      .filter(Boolean);
    const fromList = (timelineData.locations || [])
      .map(l => (l || '').trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...fromEvents, ...fromList])).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    return unique.map(loc => ({ id: loc, label: loc, subLabel: '地點' }));
  }, [timelineData.events, timelineData.locations]);

  const tagItems = useMemo(() => {
    return (timelineData.tags || []).map(t => ({
      id: t.id,
      label: t.label,
      subLabel: '事件標籤',
      tags: [{ label: t.label, color: t.color }],
    }));
  }, [timelineData.tags]);

  const selectedCharacterChips = useMemo(() => {
    const byId = new Map(characters.map(c => [c.id, c]));
    return filterState.characterIds
      .map(id => byId.get(id))
      .filter((c): c is Character => !!c);
  }, [filterState.characterIds, characters]);

  const selectedTagChips = useMemo(() => {
    const byId = new Map((timelineData.tags || []).map(t => [t.id, t]));
    return filterState.tagIds
      .map(id => byId.get(id))
      .filter((t): t is { id: string; label: string; color: string } => !!t);
  }, [filterState.tagIds, timelineData.tags]);

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">篩選條件</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 年份範圍 */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">年份範圍</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={localYearRange[0]}
                onChange={(e) => setLocalYearRange([Number(e.target.value), localYearRange[1]])}
                min={yearRange.min}
                max={yearRange.max}
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <span className="text-gray-400">~</span>
              <input
                type="number"
                value={localYearRange[1]}
                onChange={(e) => setLocalYearRange([localYearRange[0], Number(e.target.value)])}
                min={yearRange.min}
                max={yearRange.max}
                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
              <button
                onClick={applyYearRange}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs"
              >
                套用
              </button>
            </div>
          </div>

          {/* 事件大小 */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">事件大小</label>
            <div className="flex flex-col gap-1">
              {(['large', 'medium', 'small'] as const).map(size => (
                <label key={size} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterState.sizes.includes(size)}
                    onChange={() => handleSizeToggle(size)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-300">
                    {size === 'large' ? '大' : size === 'medium' ? '中' : '小'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 參與者 */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">參與者</label>
            <div className="bg-gray-900/30 border border-gray-700 rounded p-2">
              <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
                {selectedCharacterChips.length === 0 ? (
                  <span className="text-xs text-gray-500">未選擇</span>
                ) : (
                  selectedCharacterChips.slice(0, 6).map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
                      {c.image && <img src={c.image} alt="" className="w-4 h-4 rounded-full object-cover" />}
                      {c.name}
                    </span>
                  ))
                )}
                {selectedCharacterChips.length > 6 && (
                  <span className="text-xs text-gray-400">+{selectedCharacterChips.length - 6}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModal('characters')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  選擇/搜尋
                </button>
                {filterState.characterIds.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filterState, characterIds: [] })}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 地點 */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">地點</label>
            <div className="bg-gray-900/30 border border-gray-700 rounded p-2">
              <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
                {filterState.locations.length === 0 ? (
                  <span className="text-xs text-gray-500">未選擇</span>
                ) : (
                  filterState.locations.slice(0, 6).map(loc => (
                    <span key={loc} className="inline-flex items-center px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs">
                      {loc}
                    </span>
                  ))
                )}
                {filterState.locations.length > 6 && (
                  <span className="text-xs text-gray-400">+{filterState.locations.length - 6}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModal('locations')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  選擇/搜尋
                </button>
                {filterState.locations.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filterState, locations: [] })}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 標籤 */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">標籤</label>
            <div className="bg-gray-900/30 border border-gray-700 rounded p-2">
              <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
                {selectedTagChips.length === 0 ? (
                  <span className="text-xs text-gray-500">未選擇</span>
                ) : (
                  selectedTagChips.slice(0, 6).map(t => (
                    <span
                      key={t.id}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: t.color + '40', color: t.color }}
                    >
                      {t.label}
                    </span>
                  ))
                )}
                {selectedTagChips.length > 6 && (
                  <span className="text-xs text-gray-400">+{selectedTagChips.length - 6}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModal('tags')}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                >
                  選擇/搜尋
                </button>
                {filterState.tagIds.length > 0 && (
                  <button
                    onClick={() => onFilterChange({ ...filterState, tagIds: [] })}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 參與者彈窗 */}
      <MultiSelectModal
        isOpen={activeModal === 'characters'}
        onClose={() => setActiveModal(null)}
        title="篩選：參與者"
        items={characterItems}
        selectedIds={filterState.characterIds}
        onConfirm={(ids) => onFilterChange({ ...filterState, characterIds: ids })}
        filterTags={characterFilterTags}
      />

      {/* 地點彈窗 */}
      <MultiSelectModal
        isOpen={activeModal === 'locations'}
        onClose={() => setActiveModal(null)}
        title="篩選：地點"
        items={locationItems}
        selectedIds={filterState.locations}
        onConfirm={(ids) => onFilterChange({ ...filterState, locations: ids })}
      />

      {/* 標籤彈窗 */}
      <MultiSelectModal
        isOpen={activeModal === 'tags'}
        onClose={() => setActiveModal(null)}
        title="篩選：事件標籤"
        items={tagItems}
        selectedIds={filterState.tagIds}
        onConfirm={(ids) => onFilterChange({ ...filterState, tagIds: ids })}
      />
    </div>
  );
};

export default TimelineFilterPanel;


