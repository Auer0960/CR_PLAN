import React, { useState, useMemo } from 'react';
import type { Character, TagWithColor, TagCategory } from '../types';
import TagFilterModal from './TagFilterModal';
import { TagsIcon, CloseIcon, SearchIcon } from './Icons';
import { Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface SearchViewProps {
  characters: Character[];
  allTags: TagWithColor[];
  tagCategories: TagCategory[];
  onCharacterClick: (character: Character) => void;
}

const SearchView: React.FC<SearchViewProps> = ({ characters, allTags, tagCategories, onCharacterClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);

  const filteredCharacters = useMemo(() => {
    let charactersToFilter = [...characters];

    if (searchTerm.trim()) {
      charactersToFilter = charactersToFilter.filter(character =>
        character.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTagIds.length > 0) {
      charactersToFilter = charactersToFilter.filter(character => {
        return selectedTagIds.every(tagId => character.tagIds.includes(tagId));
      });
    }

    return charactersToFilter;
  }, [characters, searchTerm, selectedTagIds]);

  const selectedTags = useMemo(() => {
    return allTags.filter(tag => selectedTagIds.includes(tag.id));
  }, [allTags, selectedTagIds]);

  const handleRemoveTag = (tagIdToRemove: string) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagIdToRemove));
  };

  const cellData = useMemo(() => ({
    characters: filteredCharacters,
    columnCount: 1, // Placeholder, will be overwritten by Grid
    onCharacterClick,
    allTags
  }), [filteredCharacters, onCharacterClick, allTags]);

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col">
      <div className="p-8 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-3xl font-bold text-white mb-6">搜尋角色</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">關鍵字搜尋</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="輸入角色名稱或備註..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Tag 篩選</label>
            <button
              onClick={() => setIsTagFilterOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 text-gray-300">
                <TagsIcon className="w-5 h-5" />
                {selectedTagIds.length > 0 ? `已選擇 ${selectedTagIds.length} 個 Tag` : '篩選 Tag...'}
              </span>
              <span className="text-gray-500">▼</span>
            </button>
          </div>
        </div>

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {selectedTags.map(tag => (
              <div key={tag.id} className="flex items-center text-xs font-medium pl-2 pr-1 py-0.5 rounded-full" style={{ backgroundColor: tag.color }}>
                <span className="text-white">{tag.label}</span>
                <button onClick={() => handleRemoveTag(tag.id)} className="ml-1 text-white/70 hover:text-white">
                  <CloseIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        {filteredCharacters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCharacters.map((character) => {
              const characterTags = allTags.filter(tag => character.tagIds.includes(tag.id));
              return (
                <div
                  key={character.id}
                  onClick={() => onCharacterClick(character)}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-200 shadow-lg hover:shadow-indigo-500/30 border border-gray-700 flex flex-col h-[400px]"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' } as React.CSSProperties}
                >
                  <div className="w-full flex-grow bg-gray-700 relative overflow-hidden">
                    <img
                      src={character.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(character.name)}`}
                      alt={character.name}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                      style={{ imageRendering: 'auto' }}
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-lg font-bold text-white truncate drop-shadow-lg">{character.name}</h3>
                    </div>
                  </div>
                  <div className="px-2 py-1.5 bg-gray-800/95">
                    <div className="overflow-hidden">
                      {characterTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {characterTags.slice(0, 3).map(tag => (
                            <span key={tag.id} className="text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: tag.color, color: '#fff' }}>
                              {tag.label}
                            </span>
                          ))}
                          {characterTags.length > 3 && <span className="text-xs text-gray-400 self-center">+{characterTags.length - 3}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 italic">無標籤</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p className="text-xl">找不到符合條件的角色。</p>
            <p className="mt-2">請嘗試使用不同的關鍵字或 Tag。</p>
          </div>
        )}
      </div>

      <TagFilterModal
        isOpen={isTagFilterOpen}
        onClose={() => setIsTagFilterOpen(false)}
        tagCategories={tagCategories}
        selectedTagIds={selectedTagIds}
        onApply={setSelectedTagIds}
      />
    </div>
  );
};

const SearchCell = ({ columnIndex, rowIndex, style, data }: any) => {
  const { characters, columnCount, onCharacterClick, allTags } = data;
  const index = rowIndex * columnCount + columnIndex;

  if (index >= characters.length) {
    return null;
  }

  const character = characters[index];
  const characterTags = allTags.filter((tag: TagWithColor) => character.tagIds.includes(tag.id));

  return (
    <div style={{ ...style, padding: '12px' }}>
      <div
        onClick={() => onCharacterClick(character)}
        className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-transform duration-200 shadow-lg hover:shadow-indigo-500/30 border border-gray-700 flex flex-col h-full"
      >
        <div className="w-full h-40 bg-gray-700 flex-shrink-0">
          <img
            src={character.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(character.name)}`}
            alt={character.name}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{character.name}</h3>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">{character.notes}</p>
          <div className="flex-grow mt-auto overflow-hidden">
            {characterTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {characterTags.slice(0, 3).map((tag: TagWithColor) => (
                  <span key={tag.id} className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: tag.color, color: '#fff' }}>
                    {tag.label}
                  </span>
                ))}
                {characterTags.length > 3 && <span className="text-xs text-gray-400">+...</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchView;