import React, { useState, useEffect, useMemo } from 'react';
import type { TagCategory } from '../types';
import { CloseIcon, SearchIcon, ChevronDownIcon } from './Icons';

interface TagFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagCategories: TagCategory[];
  selectedTagIds: string[];
  onApply: (newTagIds: string[]) => void;
}

const TagFilterModal: React.FC<TagFilterModalProps> = ({ isOpen, onClose, tagCategories, selectedTagIds, onApply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSelectedIds, setCurrentSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setCurrentSelectedIds(new Set(selectedTagIds));
      setSearchTerm('');
      // Collapse all categories by default when opening
      setExpandedCategories({});
    }
  }, [isOpen, selectedTagIds]);

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
  
  useEffect(() => {
    if (searchTerm.trim()) {
        const newExpandedState: Record<string, boolean> = {};
        filteredCategories.forEach(category => {
            newExpandedState[category.id] = true;
        });
        setExpandedCategories(newExpandedState);
    } else {
        setExpandedCategories({});
    }
  }, [searchTerm, filteredCategories]);

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

  const handleApply = () => {
    onApply(Array.from(currentSelectedIds));
    onClose();
  };
  
  const handleClear = () => {
    setCurrentSelectedIds(new Set());
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <CloseIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-indigo-400">篩選 Tag</h2>

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
        
        <div className="overflow-y-auto pr-2 -mr-2 space-y-4 flex-grow border-t border-b border-gray-700 py-4">
          {tagCategories.length > 0 ? filteredCategories.map(category => (
            <div key={category.id}>
              <button onClick={() => toggleCategory(category.id)} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                  <h3 className="font-semibold text-lg">{category.name}</h3>
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
                  {category.tags.length === 0 && (
                      <p className="text-sm text-gray-500 pl-4 py-1">此分類中尚無 Tag。</p>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-10 text-gray-500">
                <p className="text-lg">尚未建立任何 Tag。</p>
                <p>請先到「管理 Tag」頁面新增。</p>
            </div>
          )}
          {filteredCategories.length === 0 && searchTerm && (
            <div className="text-center py-10 text-gray-500">
                <p>找不到符合「{searchTerm}」的 Tag。</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
            <button onClick={handleClear} className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors">
                清除全部
            </button>
            <div className="flex items-center gap-4">
                <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200">
                    取消
                </button>
                <button onClick={handleApply} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors duration-200">
                    套用
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TagFilterModal;