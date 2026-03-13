import React, { useState, useMemo } from 'react';
import { CloseIcon, SearchIcon, FilterIcon } from './Icons';

interface SelectionItem {
  id: string;
  label: string;
  subLabel?: string;
  imageUrl?: string;
  tags?: { label: string; color: string }[];
}

interface MultiSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: SelectionItem[];
  selectedIds: string[];
  onConfirm: (selectedIds: string[]) => void;
  filterTags?: { id: string; label: string; color: string }[]; // 可選：提供篩選用的標籤列表
}

const MultiSelectModal: React.FC<MultiSelectModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  selectedIds,
  onConfirm,
  filterTags,
}) => {
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 初始化選中狀態
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedIds(selectedIds);
      setSearchQuery('');
      setActiveTagFilters([]);
      setIsFilterOpen(false);
    }
  }, [isOpen, selectedIds]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 關鍵字搜尋
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          item.label.toLowerCase().includes(query) || 
          item.subLabel?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 標籤篩選
      if (activeTagFilters.length > 0) {
        if (!item.tags) return false;
        // 必須包含所有選中的標籤 (AND 邏輯)
        const itemTagLabels = item.tags.map(t => t.label);
        const matchesTags = activeTagFilters.every(filterLabel => 
          itemTagLabels.includes(filterLabel)
        );
        if (!matchesTags) return false;
      }

      return true;
    });
  }, [items, searchQuery, activeTagFilters]);

  const handleToggle = (id: string) => {
    setTempSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirm(tempSelectedIds);
    onClose();
  };

  const toggleTagFilter = (label: string) => {
    setActiveTagFilters(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[85vh] border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            {filterTags && filterTags.length > 0 && (
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`px-3 py-2 rounded border transition-colors flex items-center gap-2 ${
                  isFilterOpen || activeTagFilters.length > 0
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FilterIcon className="w-5 h-5" />
                {activeTagFilters.length > 0 && (
                  <span className="bg-indigo-800 text-xs px-1.5 py-0.5 rounded-full">
                    {activeTagFilters.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* 標籤篩選區塊 */}
          {isFilterOpen && filterTags && (
            <div className="p-3 bg-gray-700/50 rounded border border-gray-600 animate-fade-in">
              <div className="text-xs text-gray-400 mb-2">篩選標籤 (符合所有選取項目)</div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {filterTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTagFilter(tag.label)}
                    className={`px-2 py-1 rounded text-xs transition-colors border ${
                      activeTagFilters.includes(tag.label)
                        ? 'brightness-125 border-current'
                        : 'opacity-60 border-transparent hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: tag.color + '30', 
                      color: tag.color,
                      borderColor: activeTagFilters.includes(tag.label) ? tag.color : 'transparent'
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-2">
            {filteredItems.map(item => (
              <label
                key={item.id}
                className={`flex items-center p-3 rounded cursor-pointer transition-colors border ${
                  tempSelectedIds.includes(item.id)
                    ? 'bg-indigo-900/40 border-indigo-500'
                    : 'bg-gray-700/30 border-transparent hover:bg-gray-700/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={tempSelectedIds.includes(item.id)}
                  onChange={() => handleToggle(item.id)}
                  className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500 bg-gray-700 border-gray-600 mr-3 flex-shrink-0"
                />
                
                {/* 頭像 */}
                {item.imageUrl && (
                  <div className="mr-3 flex-shrink-0">
                    <img 
                      src={item.imageUrl} 
                      alt={item.label} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-600 bg-gray-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2YjcyODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjUiLz48cGF0aCBkPSJNMjAgMjFhOCA4IDAgMCAwLTE2IDAiLz48L3N2Zz4='; // Fallback icon
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-white truncate">{item.label}</div>
                  </div>
                  
                  {item.subLabel && (
                    <div className="text-xs text-gray-400 truncate mb-1">{item.subLabel}</div>
                  )}

                  {/* 顯示項目標籤 */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="text-[10px] px-1.5 rounded"
                          style={{ backgroundColor: tag.color + '30', color: tag.color }}
                        >
                          {tag.label}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[10px] px-1.5 rounded bg-gray-700 text-gray-400">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </label>
            ))}
            {filteredItems.length === 0 && (
              <div className="text-center text-gray-500 py-8 flex flex-col items-center">
                <SearchIcon className="w-8 h-8 mb-2 opacity-50" />
                <span>沒有找到符合的項目</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end gap-2 bg-gray-800 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm transition-colors"
          >
            確認選取 ({tempSelectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiSelectModal;
