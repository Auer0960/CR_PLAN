import React, { useState, useMemo, useEffect, forwardRef } from 'react';
import type { Character, TagWithColor, TagCategory } from '../types';
import { PlusIcon, SearchIcon, TagsIcon, CloseIcon } from './Icons';
import TagFilterModal from './TagFilterModal';
import { VirtuosoGrid } from 'react-virtuoso';

interface CharacterListViewProps {
  characters: Character[];
  onCharacterClick: (character: Character) => void;
  allTags: TagWithColor[];
  onProcess: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onAddNewCharacter: () => void;
  tagCategories: TagCategory[];
}

const CharacterListView: React.FC<CharacterListViewProps> = ({
  characters,
  onCharacterClick,
  allTags,
  onAddNewCharacter,
  tagCategories,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const selectedTags = useMemo(() => {
    return allTags.filter((tag) => selectedTagIds.includes(tag.id));
  }, [allTags, selectedTagIds]);

  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    if (searchTerm) {
      filtered = filtered.filter((character) =>
        character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        character.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTagIds.length > 0) {
      filtered = filtered.filter((character) =>
        selectedTagIds.every((tagId) => character.tagIds.includes(tagId))
      );
    }

    return filtered;
  }, [characters, searchTerm, selectedTagIds]);

  const handleRemoveTag = (tagIdToRemove: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagIdToRemove));
  };

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col">
      <div className="p-8 border-b border-gray-700 flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">角色列表</h1>
          <button
            onClick={onAddNewCharacter}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors shadow-lg shadow-indigo-500/30"
          >
            <PlusIcon className="w-5 h-5" />
            <span>新增角色</span>
          </button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜尋角色..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={() => setIsTagFilterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <TagsIcon className="w-5 h-5" />
            <span>
              {selectedTagIds.length > 0 ? `已選擇 ${selectedTagIds.length} 個 Tag` : '篩選 Tag'}
            </span>
          </button>
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

      <div className="flex-grow p-4 overflow-hidden">
        {filteredCharacters.length > 0 ? (
          <VirtuosoGrid
            style={{ height: '100%' }}
            totalCount={filteredCharacters.length}
            components={{
              List: forwardRef(({ style, children, ...props }, ref) => (
                <div
                  ref={ref}
                  {...props}
                  style={style}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4"
                >
                  {children}
                </div>
              )),
              Item: forwardRef(({ children, ...props }, ref) => (
                <div {...props} ref={ref} className="h-full">
                  {children}
                </div>
              ))
            }}
            itemContent={(index) => {
              const character = filteredCharacters[index];
              const characterTags = allTags.filter(tag => character.tagIds.includes(tag.id));
              return (
                <div
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
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p className="text-xl">找不到符合條件的角色。</p>
            <p className="mt-2">請嘗試使用不同的關鍵字或 Tag，或新增角色。</p>
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

export default CharacterListView;