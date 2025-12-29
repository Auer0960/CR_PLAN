import React, { useState, useEffect, useMemo } from 'react';
import type { TagCategory, Tag, CharacterImage, AiTagSuggestion } from '../types';
import { CloseIcon, SearchIcon, SparklesIcon, ChevronDownIcon, PlusIcon } from './Icons';
import { suggestTagsForImageWithGemini } from '../services/aiTagService';

interface TagSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagCategories: TagCategory[];
  selectedTagIds: string[];
  onSave: (newTagIds: string[]) => void;
  enableAiSuggestions: boolean;
  image?: CharacterImage | null;
  onAddTagToCategory?: (label: string, categoryName: string) => Tag | null;
}

const TagSelectorModal: React.FC<TagSelectorModalProps> = ({
  isOpen,
  onClose,
  tagCategories,
  selectedTagIds,
  onSave,
  enableAiSuggestions,
  image,
  onAddTagToCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSelectedIds, setCurrentSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiTagSuggestion | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentSelectedIds(new Set(selectedTagIds));
      setSearchTerm('');
      setAiSuggestions(null);
      setAiError(null);
      // Expand all categories by default when opening
      const initialExpanded: Record<string, boolean> = {};
      tagCategories.forEach(cat => {
        initialExpanded[cat.id] = true;
      });
      setExpandedCategories(initialExpanded);
    }
  }, [isOpen, selectedTagIds, tagCategories]);

  const allTagsMap = useMemo(() => {
    const map = new Map<string, Tag & { categoryName: string; color: string }>();
    tagCategories.forEach(cat => {
      cat.tags.forEach(tag => {
        map.set(tag.label.toLowerCase(), { ...tag, categoryName: cat.name, color: cat.color });
      });
    });
    return map;
  }, [tagCategories]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return tagCategories;
    }
    return tagCategories
      .map(category => ({
        ...category,
        tags: category.tags.filter(tag => tag.label.toLowerCase().includes(searchTerm.toLowerCase())),
      }))
      .filter(category => category.tags.length > 0);
  }, [tagCategories, searchTerm]);
  
  const handleGetAiSuggestions = async () => {
    if (!image) return;
    setIsAiLoading(true);
    setAiError(null);
    setAiSuggestions(null);
    try {
      const suggestions = await suggestTagsForImageWithGemini(image.imageDataUrl, tagCategories);
      setAiSuggestions(suggestions);
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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const toggleTag = (tagId: string) => {
    setCurrentSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleAddSuggestedTag = (tagLabel: string, isNew: boolean) => {
      if (!isNew) {
          const existingTag = allTagsMap.get(tagLabel.toLowerCase());
          if (existingTag) {
              toggleTag(existingTag.id);
          }
      } else {
          if (onAddTagToCategory) {
              // Try to find a sensible category, otherwise default to "外貌"
              const defaultCategory = tagCategories.find(c => c.name === '外貌') ? '外貌' : tagCategories[0]?.name || '新類別';
              const newTag = onAddTagToCategory(tagLabel, defaultCategory);
              if (newTag) {
                  toggleTag(newTag.id);
                  // Remove from suggestions list to indicate it's been added
                  setAiSuggestions(prev => {
                      if (!prev) return null;
                      return {
                          ...prev,
                          newTagSuggestions: prev.newTagSuggestions.filter(t => t !== tagLabel)
                      };
                  });
              }
          }
      }
  };

  const handleSave = () => {
    onSave(Array.from(currentSelectedIds));
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <CloseIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-indigo-400">選擇 Tag</h2>

        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋 Tag..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {enableAiSuggestions && image && onAddTagToCategory && (
            <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <button onClick={handleGetAiSuggestions} disabled={isAiLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 rounded-md font-semibold transition-colors text-sm">
                    <SparklesIcon className="w-5 h-5"/>
                    <span>{isAiLoading ? '分析中...' : 'AI 建議 Tag'}</span>
                </button>
                {aiError && <p className="text-red-400 text-xs mt-2">{aiError}</p>}
                {aiSuggestions && (
                    <div className="mt-3 text-sm">
                        <p className="font-semibold text-gray-300 mb-2">建議:</p>
                        <div className="flex flex-wrap gap-2">
                           {aiSuggestions.existingTags.map(tagLabel => {
                                const tag = allTagsMap.get(tagLabel.toLowerCase());
                                if (!tag) return null;
                                const isSelected = currentSelectedIds.has(tag.id);
                                return (
                                    <button key={`sug-exist-${tag.id}`} onClick={() => toggleTag(tag.id)} className={`text-xs font-medium px-2 py-1 rounded-full border transition-colors ${isSelected ? 'border-transparent text-white' : 'border-gray-500 text-gray-300 hover:border-white'}`} style={{ backgroundColor: isSelected ? tag.color : 'transparent' }}>
                                        {tag.label}
                                    </button>
                                );
                           })}
                           {aiSuggestions.newTagSuggestions.map(tagLabel => (
                                <button key={`sug-new-${tagLabel}`} onClick={() => handleAddSuggestedTag(tagLabel, true)} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-dashed border-emerald-500 text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                                    <PlusIcon className="w-3 h-3"/> {tagLabel} (新增)
                                </button>
                           ))}
                        </div>
                    </div>
                )}
            </div>
        )}
        
        <div className="overflow-y-auto pr-2 -mr-2 space-y-2 flex-grow border-t border-b border-gray-700 py-4">
          {tagCategories.length > 0 ? filteredCategories.map(category => (
            <div key={category.id}>
              <button onClick={() => toggleCategory(category.id)} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                  <h3 className="font-semibold">{category.name}</h3>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${expandedCategories[category.id] ? 'rotate-180' : ''}`} />
              </button>
              {expandedCategories[category.id] && (
                <div className="pt-2 pl-4 space-y-1">
                  {category.tags.map(tag => {
                    const isSelected = currentSelectedIds.has(tag.id);
                    return (
                      <label key={tag.id} className="flex items-center gap-3 p-1.5 rounded-md cursor-pointer hover:bg-gray-700/50">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTag(tag.id)}
                          className="w-5 h-5 rounded bg-gray-900 border-gray-500 text-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-gray-800 cursor-pointer"
                          style={{ accentColor: category.color }}
                        />
                        <span className="font-medium select-none">{tag.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-10 text-gray-500">
                <p className="text-lg">尚未建立任何 Tag。</p>
                <p>請先到「管理 Tag」頁面新增。</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end items-center gap-4 mt-6 pt-4 border-t border-gray-700">
          <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200">
            取消
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors duration-200">
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagSelectorModal;
