import React, { useMemo, useState, useEffect } from 'react';
import type { TimelineEvent, TimelineData, TimelineTag, Character, TagWithColor } from '../types';
import { CloseIcon, TrashIcon, PlusIcon } from './Icons';
import MultiSelectModal from './MultiSelectModal';
import SearchableSelect from './SearchableSelect';

interface TimelineEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: TimelineEvent;
  timelineData: TimelineData;
  characters: Character[];
  allTags: TagWithColor[];
  onSave: (event: TimelineEvent) => void;
  onDelete: (eventId: string) => void;
}

type ModalType = 'parent' | 'related' | 'character' | null;
type EventTab = 'content' | 'settings';

const TimelineEventModal: React.FC<TimelineEventModalProps> = ({
  isOpen,
  onClose,
  event,
  timelineData,
  characters,
  allTags,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<TimelineEvent>(event);
  const [npcInput, setNpcInput] = useState('');
  const [startAbsInput, setStartAbsInput] = useState<string>('');
  const [endAbsInput, setEndAbsInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<EventTab>('content');
  
  // Modal 狀態控制
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  useEffect(() => {
    setFormData(event);
    setNpcInput(event.npcNames.join(', '));
    setStartAbsInput(String(timelineData.gameStartYear + event.startYear));
    setEndAbsInput(event.endYear === undefined ? '' : String(timelineData.gameStartYear + event.endYear));
    setActiveTab('content');
  }, [event, timelineData.gameStartYear]);

  // 當 formData 變更時，同步顯示用的「絕對年份」輸入框（避免打字中被覆蓋：僅在值不一致時更新）
  const startAbsComputed = useMemo(() => timelineData.gameStartYear + formData.startYear, [timelineData.gameStartYear, formData.startYear]);
  const endAbsComputed = useMemo(() => (formData.endYear === undefined ? '' : String(timelineData.gameStartYear + formData.endYear)), [timelineData.gameStartYear, formData.endYear]);

  useEffect(() => {
    const next = String(startAbsComputed);
    if (startAbsInput !== next) setStartAbsInput(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAbsComputed]);

  useEffect(() => {
    if (endAbsInput !== endAbsComputed) setEndAbsInput(endAbsComputed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAbsComputed]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedEvent: TimelineEvent = {
      ...formData,
      updatedAt: Date.now(),
    };
    onSave(updatedEvent);
  };

  const handleDelete = () => {
    if (confirm('確定要刪除此事件嗎？')) {
      onDelete(event.id);
    }
  };

  const handleNpcChange = (value: string) => {
    setNpcInput(value);
    const npcNames = value.split(',').map(n => n.trim()).filter(n => n);
    setFormData({ ...formData, npcNames });
  };

  const duration = formData.isContinuous
    ? '持續中'
    : formData.endYear
    ? `${formData.endYear - formData.startYear} 年`
    : '單一事件';

  const availableEvents = timelineData.events.filter(e => e.id !== event.id);

  const locationOptions = React.useMemo(() => {
    const fromEvents = (timelineData.events || [])
      .map(e => (e.location || '').trim())
      .filter(Boolean);
    const fromList = (timelineData.locations || [])
      .map(l => (l || '').trim())
      .filter(Boolean);
    const fromNodes = (timelineData.locationNodes || [])
      .map(n => (n.label || '').trim())
      .filter(Boolean);

    const unique = Array.from(new Set([...fromEvents, ...fromList, ...fromNodes]));
    return unique.map(loc => ({ value: loc, label: loc }));
  }, [timelineData.events, timelineData.locations, timelineData.locationNodes]);

  // 準備給 MultiSelectModal 的資料
  const getEventItems = () => availableEvents.map(e => ({
    id: e.id,
    label: e.title,
    subLabel: `${e.startYear}年`
  }));

  const getCharacterItems = () => {
    if (!allTags || !Array.isArray(allTags)) {
      return characters.map(c => ({
        id: c.id,
        label: c.name,
        subLabel: c.notes ? (c.notes.length > 20 ? c.notes.substring(0, 20) + '...' : c.notes) : '',
        imageUrl: c.image,
        tags: []
      }));
    }

    return characters.map(c => {
      // 取得角色的標籤詳細資訊
      const charTags = (c.tagIds || [])
        .map(tagId => allTags.find(t => t && t.id === tagId))
        .filter((t): t is TagWithColor => t !== undefined)
        .map(t => ({ label: t.label, color: t.color }));

      return {
        id: c.id,
        label: c.name,
        subLabel: c.notes ? (c.notes.length > 20 ? c.notes.substring(0, 20) + '...' : c.notes) : '',
        imageUrl: c.image,
        tags: charTags
      };
    });
  };

  // 準備篩選用的標籤列表 (不重複)
  const getFilterTags = () => {
    if (!allTags) return [];
    
    const uniqueTagsMap = new Map<string, { id: string; label: string; color: string }>();
    allTags.forEach(tag => {
      // 用標籤名稱當 key 避免重複 (如果不同類別有相同名稱)
      if (tag && !uniqueTagsMap.has(tag.label)) {
        uniqueTagsMap.set(tag.label, { id: tag.id, label: tag.label, color: tag.color });
      }
    });
    return Array.from(uniqueTagsMap.values());
  };

  // 通用的移除項目函式
  const handleRemoveItem = (field: 'parentEventIds' | 'relatedEventIds' | 'characterIds', idToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(id => id !== idToRemove)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">編輯事件</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 內容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 分頁列 */}
          <div className="flex flex-wrap gap-2 mb-5">
            {([
              { key: 'content', label: '內容（表/裡）' },
              { key: 'settings', label: '設定（基本/關聯/參與者/地點/標籤）' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 快速摘要列（避免看不到事件時間） */}
          <div className="mb-6 rounded border border-gray-700 bg-gray-900/30 p-3 text-sm text-gray-200">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-white">{formData.title || '（未命名事件）'}</span>
              <span className="text-gray-400">
                {timelineData.gameStartYear + formData.startYear}年
              </span>
              {!formData.isContinuous && formData.endYear !== undefined && (
                <span className="text-gray-400">
                  ～ {timelineData.gameStartYear + formData.endYear}年
                </span>
              )}
              {formData.isContinuous && <span className="text-gray-400">持續中</span>}
              {formData.isMainStory && <span className="text-indigo-300">主線</span>}
              {!formData.isMainStory && (
                <span className="text-gray-400">
                  大小：{formData.size === 'large' ? '大' : formData.size === 'medium' ? '中' : '小'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* 基本 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">基本</h3>
                  <div className="space-y-4">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">開始年份（絕對年）</label>
                        <input
                          type="number"
                          value={startAbsInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            setStartAbsInput(v);
                            const parsed = Number(v);
                            if (Number.isFinite(parsed)) {
                              setFormData({ ...formData, startYear: parsed - timelineData.gameStartYear });
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                          placeholder="例如：150"
                        />
                        <div className="mt-1 text-xs text-gray-500 min-h-[16px]">
                          相對年份：{formData.startYear > 0 ? '+' : ''}{formData.startYear}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm text-gray-400">結束年份（絕對年）</label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formData.isContinuous}
                              onChange={(e) => setFormData({ ...formData, isContinuous: e.target.checked, endYear: e.target.checked ? undefined : formData.endYear })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-400">持續中</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          value={formData.isContinuous ? '' : endAbsInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEndAbsInput(v);
                            if (!v.trim()) {
                              setFormData({ ...formData, endYear: undefined });
                              return;
                            }
                            const parsed = Number(v);
                            if (Number.isFinite(parsed)) {
                              setFormData({ ...formData, endYear: parsed - timelineData.gameStartYear });
                            }
                          }}
                          disabled={formData.isContinuous}
                          className={`w-full px-3 py-2 border rounded text-white ${
                            formData.isContinuous
                              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-700 border-gray-600'
                          }`}
                          placeholder={formData.isContinuous ? '持續中（不需填結束年）' : '例如：160'}
                        />
                        <div className="mt-1 text-xs text-gray-500 min-h-[16px]">
                          {formData.isContinuous
                            ? '相對年份：—'
                            : `相對年份：${formData.endYear !== undefined ? `${formData.endYear > 0 ? '+' : ''}${formData.endYear}` : '—'}`}
                        </div>
                      </div>
                    </div>

                    {!formData.isContinuous && formData.endYear !== undefined && (
                      <div className="text-sm text-gray-400">
                        持續時間：{duration}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">事件大小</label>
                        <div className="flex gap-2">
                          {(['large', 'medium', 'small'] as const).map(size => (
                            <button
                              key={size}
                              onClick={() => setFormData({ ...formData, size })}
                              className={`px-4 py-2 rounded ${
                                formData.size === size
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {size === 'large' ? '大' : size === 'medium' ? '中' : '小'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.isMainStory}
                            onChange={(e) => setFormData({ ...formData, isMainStory: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300">主線故事（時間軸用菱形大標記）</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 關聯 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">關聯</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    上位事件 = 因為先有A才有B；關聯事件 = 相關但無直接因果
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">上位事件</label>
                      <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-gray-700/50 rounded border border-gray-600">
                        {formData.parentEventIds.map(id => {
                          const parentEvent = availableEvents.find(e => e.id === id);
                          return parentEvent ? (
                            <span key={id} className="flex items-center gap-1 px-2 py-1 bg-indigo-900/50 text-indigo-200 rounded text-sm border border-indigo-500/30">
                              {parentEvent.title}
                              <button onClick={() => handleRemoveItem('parentEventIds', id)} className="hover:text-white ml-1">
                                <CloseIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                        <button
                          onClick={() => setActiveModal('parent')}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm border border-gray-500 border-dashed"
                        >
                          <PlusIcon className="w-3 h-3" />
                          <span>新增</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">關聯事件</label>
                      <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-gray-700/50 rounded border border-gray-600">
                        {formData.relatedEventIds.map(id => {
                          const relatedEvent = availableEvents.find(e => e.id === id);
                          return relatedEvent ? (
                            <span key={id} className="flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-200 rounded text-sm border border-blue-500/30">
                              {relatedEvent.title}
                              <button onClick={() => handleRemoveItem('relatedEventIds', id)} className="hover:text-white ml-1">
                                <CloseIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                        <button
                          onClick={() => setActiveModal('related')}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm border border-gray-500 border-dashed"
                        >
                          <PlusIcon className="w-3 h-3" />
                          <span>新增</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 參與者 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">參與者</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">角色</label>
                      <div className="flex flex-wrap gap-2 min-h-[42px] p-2 bg-gray-700/50 rounded border border-gray-600">
                        {formData.characterIds.map(id => {
                          const char = characters.find(c => c.id === id);
                          return char ? (
                            <span key={id} className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-200 rounded text-sm border border-gray-500">
                              {char.image && (
                                <img src={char.image} alt="" className="w-4 h-4 rounded-full object-cover" />
                              )}
                              {char.name}
                              <button onClick={() => handleRemoveItem('characterIds', id)} className="hover:text-white ml-1">
                                <CloseIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                        <button
                          onClick={() => setActiveModal('character')}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm border border-gray-500 border-dashed"
                        >
                          <PlusIcon className="w-3 h-3" />
                          <span>新增</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">NPC（逗號分隔）</label>
                      <input
                        type="text"
                        value={npcInput}
                        onChange={(e) => handleNpcChange(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        placeholder="NPC1, NPC2, NPC3"
                      />
                    </div>
                  </div>
                </div>

                {/* 地點 / 標籤 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">地點 / 標籤</h3>
                  <div className="space-y-4">
                    <div>
                      <SearchableSelect
                        label="地點"
                        value={formData.location}
                        options={locationOptions}
                        placeholder="輸入或搜尋地點…"
                        onChange={(next) => setFormData({ ...formData, location: next })}
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        會自動匯聚所有事件使用過的地點，支援搜尋與新增
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">標籤</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {timelineData.tags.map(tag => (
                          <label
                            key={tag.id}
                            className={`px-3 py-1 rounded cursor-pointer ${
                              formData.tagIds.includes(tag.id)
                                ? 'opacity-100'
                                : 'opacity-50'
                            }`}
                            style={{ backgroundColor: tag.color + '40', color: tag.color }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.tagIds.includes(tag.id)}
                              onChange={(e) => {
                                const newTagIds = e.target.checked
                                  ? [...formData.tagIds, tag.id]
                                  : formData.tagIds.filter(id => id !== tag.id);
                                setFormData({ ...formData, tagIds: newTagIds });
                              }}
                              className="hidden"
                            />
                            {tag.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">事件標題 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="輸入事件標題"
                  />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">表裡資訊</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">（表）事件資訊 *</label>
                    <textarea
                      value={formData.publicInfo}
                      onChange={(e) => setFormData({ ...formData, publicInfo: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white min-h-[220px]"
                      placeholder="輸入一般認知的事件資訊"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">（裡）深層設定</label>
                    <textarea
                      value={formData.deepInfo}
                      onChange={(e) => setFormData({ ...formData, deepInfo: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white min-h-[200px]"
                      placeholder="輸入陰謀、真相、隱藏設定"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">（裡）額外補充</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white min-h-[160px]"
                      placeholder="輸入備註、創作筆記"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-gray-700 flex justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            <TrashIcon className="w-4 h-4" />
            <span>刪除</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
            >
              儲存
            </button>
          </div>
        </div>
      </div>

      {/* 彈出式選擇器 */}
      {/* 上位事件選擇器 */}
      <MultiSelectModal
        isOpen={activeModal === 'parent'}
        onClose={() => setActiveModal(null)}
        title="選擇上位事件"
        items={getEventItems()}
        selectedIds={formData.parentEventIds}
        onConfirm={(ids) => setFormData({ ...formData, parentEventIds: ids })}
      />

      {/* 關聯事件選擇器 */}
      <MultiSelectModal
        isOpen={activeModal === 'related'}
        onClose={() => setActiveModal(null)}
        title="選擇關聯事件"
        items={getEventItems()}
        selectedIds={formData.relatedEventIds}
        onConfirm={(ids) => setFormData({ ...formData, relatedEventIds: ids })}
      />

      {/* 角色選擇器 */}
      <MultiSelectModal
        isOpen={activeModal === 'character'}
        onClose={() => setActiveModal(null)}
        title="選擇參與角色"
        items={getCharacterItems()}
        selectedIds={formData.characterIds}
        onConfirm={(ids) => setFormData({ ...formData, characterIds: ids })}
        filterTags={getFilterTags()} // 傳入篩選用的標籤
      />
    </div>
  );
};

export default TimelineEventModal;
