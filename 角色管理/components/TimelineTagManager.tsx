import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TimelineTag, TimelineEvent } from '../types';
import { PlusIcon, TrashIcon, CloseIcon, EditIcon } from './Icons';

interface TimelineTagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TimelineTag[];
  events: TimelineEvent[];
  onUpdateTags: (tags: TimelineTag[]) => void;
}

const DEFAULT_COLORS = [
  '#ef4444', // 紅色 - 戰爭
  '#3b82f6', // 藍色 - 政治
  '#ec4899', // 粉色 - 愛情
  '#8b5cf6', // 紫色 - 陰謀
  '#10b981', // 綠色 - 經濟
  '#06b6d4', // 青色 - 科技
  '#f97316', // 橙色 - 文化
];

const DEFAULT_LABELS = ['戰爭', '政治', '愛情', '陰謀', '經濟', '科技', '文化'];

const TimelineTagManager: React.FC<TimelineTagManagerProps> = ({
  isOpen,
  onClose,
  tags,
  events,
  onUpdateTags,
}) => {
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_COLORS[0]);
  const [editTagLabel, setEditTagLabel] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  if (!isOpen) return null;

  const getTagUsageCount = (tagId: string) => {
    return events.filter(e => e.tagIds.includes(tagId)).length;
  };

  const handleAddTag = () => {
    if (!newTagLabel.trim()) return;
    
    const newTag: TimelineTag = {
      id: uuidv4(),
      label: newTagLabel.trim(),
      color: newTagColor,
    };
    
    onUpdateTags([...tags, newTag]);
    setNewTagLabel('');
  };

  const handleStartEdit = (tag: TimelineTag) => {
    setEditingTagId(tag.id);
    setEditTagLabel(tag.label);
    setEditTagColor(tag.color);
  };

  const handleSaveEdit = () => {
    if (!editingTagId || !editTagLabel.trim()) return;
    
    const updatedTags = tags.map(tag =>
      tag.id === editingTagId
        ? { ...tag, label: editTagLabel.trim(), color: editTagColor }
        : tag
    );
    
    onUpdateTags(updatedTags);
    setEditingTagId(null);
    setEditTagLabel('');
    setEditTagColor('');
  };

  const handleDeleteTag = (tagId: string) => {
    if (getTagUsageCount(tagId) > 0) {
      if (!confirm(`此標籤已被 ${getTagUsageCount(tagId)} 個事件使用，確定要刪除嗎？`)) {
        return;
      }
    }
    
    const updatedTags = tags.filter(t => t.id !== tagId);
    onUpdateTags(updatedTags);
  };

  const handleAddDefaultTags = () => {
    const existingLabels = new Set(tags.map(t => t.label));
    const tagsToAdd = DEFAULT_LABELS.map((label, index) => ({
      id: uuidv4(),
      label,
      color: DEFAULT_COLORS[index],
    })).filter(tag => !existingLabels.has(tag.label));
    
    if (tagsToAdd.length > 0) {
      onUpdateTags([...tags, ...tagsToAdd]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">標籤管理</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 內容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 新增標籤 */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">新增標籤</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="標籤名稱"
                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>新增</span>
              </button>
            </div>
            <button
              onClick={handleAddDefaultTags}
              className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
            >
              新增預設標籤
            </button>
          </div>

          {/* 標籤列表 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">現有標籤</h3>
            <div className="space-y-2">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  {editingTagId === tag.id ? (
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editTagLabel}
                          onChange={(e) => setEditTagLabel(e.target.value)}
                          className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        />
                        <input
                          type="color"
                          value={editTagColor}
                          onChange={(e) => setEditTagColor(e.target.value)}
                          className="w-10 h-8 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                        >
                          儲存
                        </button>
                        <button
                          onClick={() => {
                            setEditingTagId(null);
                            setEditTagLabel('');
                            setEditTagColor('');
                          }}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-3 py-1 rounded text-sm font-medium"
                          style={{ backgroundColor: tag.color + '40', color: tag.color }}
                        >
                          {tag.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({getTagUsageCount(tag.id)} 個事件)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(tag)}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {tags.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  尚無標籤，請新增標籤
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineTagManager;



