import React, { useState, useEffect, useRef } from 'react';
import type { TagCategory } from '../types';
import { CloseIcon, TrashIcon, DragHandleIcon, PlusIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TagCategory[];
  onSave: (updatedCategories: TagCategory[]) => void;
}

const defaultColors = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#d946ef', // fuchsia-500
  '#64748b', // slate-500
];

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, categories, onSave }) => {
  const [editedCategories, setEditedCategories] = useState<TagCategory[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditedCategories(JSON.parse(JSON.stringify(categories)));
      setConfirmDeleteId(null);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleInputChange = (id: string, field: 'name' | 'color' | 'selectionMode', value: string) => {
    setEditedCategories(prev =>
      prev.map(cat => (cat.id === id ? { ...cat, [field]: value } : cat))
    );
  };

  const handleAddCategory = () => {
    const newColor = defaultColors[editedCategories.length % defaultColors.length];
    const newCategory: TagCategory = {
      id: uuidv4(),
      name: '新類別',
      color: newColor,
      tags: [],
      selectionMode: 'multiple',
    };
    setEditedCategories(prev => [...prev, newCategory]);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirmDeleteId === id) {
        setEditedCategories(prev => prev.filter(cat => cat.id !== id));
        setConfirmDeleteId(null);
    } else {
        setConfirmDeleteId(id);
        setTimeout(() => {
            setConfirmDeleteId(prev => (prev === id ? null : prev));
        }, 3000);
    }
  };

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const categoriesCopy = [...editedCategories];
    const draggedItemContent = categoriesCopy.splice(dragItem.current, 1)[0];
    categoriesCopy.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;

    setEditedCategories(categoriesCopy);
  };

  const handleSave = () => {
    onSave(editedCategories);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="flex justify-between items-center mb-4 pr-10">
            <h2 className="text-2xl font-bold text-indigo-400">管理分類</h2>
            <button
                onClick={handleAddCategory}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors text-sm"
            >
                <PlusIcon className="w-4 h-4"/>
                <span>新增類別</span>
            </button>
        </div>
        
        <div className="overflow-y-auto pr-2 -mr-2 space-y-3 flex-grow">
          {editedCategories.map((category, index) => (
            <div 
              key={category.id} 
              className="flex items-center gap-3 p-2 bg-gray-700 rounded-md"
              draggable
              onDragStart={() => dragItem.current = index}
              onDragEnter={() => dragOverItem.current = index}
              onDragEnd={handleDragSort}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className="cursor-grab text-gray-500" title="拖曳排序">
                <DragHandleIcon className="w-5 h-5" />
              </span>
              <input
                type="color"
                value={category.color}
                onChange={(e) => handleInputChange(category.id, 'color', e.target.value)}
                className="p-0 h-8 w-8 block bg-transparent border-none cursor-pointer rounded-md"
              />
              <input
                type="text"
                value={category.name}
                onChange={(e) => handleInputChange(category.id, 'name', e.target.value)}
                className="flex-grow p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={category.selectionMode || 'multiple'}
                onChange={(e) => handleInputChange(category.id, 'selectionMode', e.target.value)}
                className="p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
                title="選擇模式"
              >
                  <option value="multiple">多選</option>
                  <option value="single">單選</option>
              </select>
              <button 
                onClick={() => handleDeleteCategory(category.id)} 
                className={`transition-colors text-sm font-bold p-1 rounded ${
                    confirmDeleteId === category.id
                        ? 'bg-red-600 text-white px-2'
                        : 'text-gray-400 hover:text-red-400'
                }`}
                title="刪除類別"
              >
                {confirmDeleteId === category.id ? '確定？' : <TrashIcon className="w-5 h-5" />}
              </button>
            </div>
          ))}
          {editedCategories.length === 0 && (
             <div className="text-center py-10 text-gray-500">
                <p>尚無類別。</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end items-center gap-4 mt-6 pt-4 border-t border-gray-700">
          <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200">
            取消
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors duration-200">
            儲存變更
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;