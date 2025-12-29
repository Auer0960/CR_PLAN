import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TagCategory, Tag } from '../types';
import { PlusIcon, TrashIcon, SparklesIcon, ListIcon, EditIcon, CloseIcon } from './Icons';
import { extractTagsWithGemini } from '../services/aiTagService';
import CategoryManagerModal from './CategoryManagerModal';

interface TagManagerViewProps {
  tagCategories: TagCategory[];
  onUpdate: (categories: TagCategory[]) => void;
}

const TagManagerView: React.FC<TagManagerViewProps> = ({ tagCategories, onUpdate }) => {
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  // AI Tagging state
  const [aiTagText, setAiTagText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTargetCategory, setAiTargetCategory] = useState<string | null>(null);

  const addTag = (categoryId: string) => {
    const tagName = newTagInputs[categoryId]?.trim();
    if (tagName) {
      const newTag: Tag = { id: uuidv4(), label: tagName };
      const updatedCategories = tagCategories.map(c =>
        c.id === categoryId
          ? { ...c, tags: [...c.tags, newTag] }
          : c
      );
      onUpdate(updatedCategories);
      setNewTagInputs(prev => ({ ...prev, [categoryId]: '' }));
    }
  };

  const deleteTag = (categoryId: string, tagId: string) => {
    const updatedCategories = tagCategories.map(c =>
      c.id === categoryId
        ? { ...c, tags: c.tags.filter(t => t.id !== tagId) }
        : c
    );
    onUpdate(updatedCategories);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirmDeleteCategoryId === categoryId) {
      const updatedCategories = tagCategories.filter(c => c.id !== categoryId);
      onUpdate(updatedCategories);
      setConfirmDeleteCategoryId(null);
    } else {
      setConfirmDeleteCategoryId(categoryId);
      setTimeout(() => {
        // Only reset if it's still the same one to avoid race conditions
        setConfirmDeleteCategoryId(prev => (prev === categoryId ? null : prev));
      }, 3000);
    }
  };

  const handleAiExtract = async () => {
    if (!aiTagText.trim() || !aiTargetCategory) {
      setAiError("請輸入文字並選擇一個目標類別。");
      return;
    }
    setIsAiLoading(true);
    setAiError(null);
    try {
      const extractedTags = await extractTagsWithGemini(aiTagText);
      const updatedCategories = tagCategories.map(c => {
        if (c.id === aiTargetCategory) {
          const existingLabels = new Set(c.tags.map(t => t.label.toLowerCase()));
          const newTags: Tag[] = extractedTags
            .filter(label => !existingLabels.has(label.toLowerCase()))
            .map(label => ({ id: uuidv4(), label }));
          return { ...c, tags: [...c.tags, ...newTags] };
        }
        return c;
      });
      onUpdate(updatedCategories);
      setAiTagText('');
      setAiTargetCategory(null);
    } catch (e) {
      if (e instanceof Error) {
        setAiError(e.message);
      } else {
        setAiError('發生未知錯誤');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <>
      <div className="h-full w-full bg-gray-900 flex flex-col p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">管理 Tag</h1>
          <button
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-sm"
            title="管理分類"
          >
            <ListIcon className="w-5 h-5" />
            <span>管理分類</span>
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold mb-3 text-indigo-400 flex items-center gap-2"><SparklesIcon className="w-5 h-5" /> 用 AI 批次新增 Tag (暫時無法使用)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <textarea
              value={aiTagText}
              onChange={(e) => setAiTagText(e.target.value)}
              className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition md:col-span-2"
              placeholder="輸入文字來描述 Tag，例如：主角, 反派, 友方..."
              disabled={isAiLoading}
            />
            <div className="flex flex-col gap-2">
              <select
                value={aiTargetCategory || ''}
                onChange={(e) => setAiTargetCategory(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                disabled={isAiLoading || tagCategories.length === 0}
              >
                <option value="">選擇目標類別...</option>
                {tagCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <button
                onClick={handleAiExtract}
                disabled={isAiLoading || !aiTagText.trim() || !aiTargetCategory}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-md font-semibold transition-colors duration-200"
              >
                {isAiLoading ? '處理中...' : '生成 Tag'}
              </button>
            </div>
          </div>
          {aiError && <p className="text-red-400 text-sm mt-2">{aiError}</p>}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {tagCategories.map(category => (
            <div key={category.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                  <h3 className="font-bold text-xl text-white">{category.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className={`transition-colors text-sm font-bold p-1 rounded ${confirmDeleteCategoryId === category.id
                        ? 'bg-red-600 text-white px-2'
                        : 'text-gray-400 hover:text-red-400'
                      }`}
                    title="刪除類別"
                  >
                    {confirmDeleteCategoryId === category.id ? '確定？' : <TrashIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 min-h-[2.25rem] items-center">
                {category.tags.map(tag => (
                  <div key={tag.id} className="flex items-center text-sm font-medium pl-3 pr-1 py-1 rounded-full" style={{ backgroundColor: category.color }}>
                    <span className="text-white">{tag.label}</span>
                    <button onClick={() => deleteTag(category.id, tag.id)} className="ml-1 text-white/70 hover:text-white">
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {category.tags.length === 0 && <p className="text-sm text-gray-500 px-2">此類別中尚無 Tag。</p>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="新增 Tag..."
                  value={newTagInputs[category.id] || ''}
                  onChange={(e) => setNewTagInputs(prev => ({ ...prev, [category.id]: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && addTag(category.id)}
                  className="flex-grow p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={() => addTag(category.id)} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold text-sm">
                  新增
                </button>
              </div>
            </div>
          ))}
          {tagCategories.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p className="text-lg">尚未建立任何 Tag 類別。</p>
              <p>請使用上方的「管理分類」按鈕來新增您的第一個類別。</p>
            </div>
          )}
        </div>
      </div>
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={tagCategories}
        onSave={onUpdate}
      />
    </>
  );
};

export default TagManagerView;