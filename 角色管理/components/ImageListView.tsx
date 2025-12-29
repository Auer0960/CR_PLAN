import React, { useMemo, useState, forwardRef } from 'react';
import type { Character, CharacterImage, TagWithColor, TagCategory } from '../types';
import SearchableSelect from './SearchableSelect';
import TagFilterModal from './TagFilterModal';
import { TagsIcon, CloseIcon } from './Icons';
import { VirtuosoGrid } from 'react-virtuoso';

interface ImageListViewProps {
    characters: Character[];
    characterImages: CharacterImage[];
    allTags: TagWithColor[];
    tagCategories: TagCategory[];
    onCharacterClick: (character: Character) => void;
    onImageClick: (image: CharacterImage) => void;
}

const ImageListView: React.FC<ImageListViewProps> = ({ characters, characterImages, allTags, tagCategories, onImageClick }) => {
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('all');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);

    const characterMap = useMemo(() => {
        if (!Array.isArray(characters)) return new Map();
        return new Map(characters.map(c => [c.id, c]));
    }, [characters]);

    const characterOptions = useMemo(() => {
        if (!Array.isArray(characters)) return [{ value: 'all', label: '所有角色' }];
        return [
            { value: 'all', label: '所有角色' },
            ...characters.map(c => ({ value: c.id, label: c.name }))
        ];
    }, [characters]);

    const filteredImages = useMemo(() => {
        if (!Array.isArray(characterImages)) return [];
        let imagesToFilter = [...characterImages];

        if (selectedCharacterId !== 'all') {
            imagesToFilter = imagesToFilter.filter(img => img.characterId === selectedCharacterId);
        }

        if (selectedTagIds.length > 0) {
            imagesToFilter = imagesToFilter.filter(img => {
                return selectedTagIds.every(tagId => img.tagIds.includes(tagId));
            });
        }

        return imagesToFilter;

    }, [characterImages, selectedCharacterId, selectedTagIds]);

    const selectedTags = useMemo(() => {
        return allTags.filter(tag => selectedTagIds.includes(tag.id));
    }, [allTags, selectedTagIds]);

    const handleRemoveTag = (tagIdToRemove: string) => {
        setSelectedTagIds(prev => prev.filter(id => id !== tagIdToRemove));
    };

    return (
        <div className="h-full w-full bg-gray-900 flex flex-col">
            <div className="p-8 border-b border-gray-700 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white mb-4">圖片庫</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h2 className="text-sm font-medium text-gray-400 mb-2">依角色篩選</h2>
                        <SearchableSelect
                            options={characterOptions}
                            value={selectedCharacterId}
                            onChange={setSelectedCharacterId}
                            placeholder="搜尋並選擇角色..."
                        />
                    </div>
                    <div>
                        <h2 className="text-sm font-medium text-gray-400 mb-2">依 Tag 篩選</h2>
                        <button
                            onClick={() => setIsTagFilterOpen(true)}
                            className="w-full flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors text-sm text-left h-[42px]"
                        >
                            <TagsIcon className="w-5 h-5" />
                            <span>
                                篩選 Tag {selectedTagIds.length > 0 ? `(已選 ${selectedTagIds.length} 個)` : ''}
                            </span>
                        </button>
                    </div>
                </div>
                {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
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
                {filteredImages.length > 0 ? (
                    <VirtuosoGrid
                        style={{ height: '100%' }}
                        totalCount={filteredImages.length}
                        components={{
                            List: forwardRef(({ style, children, ...props }, ref) => (
                                <div
                                    ref={ref}
                                    {...props}
                                    style={style}
                                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                                >
                                    {children}
                                </div>
                            )),
                            Item: forwardRef(({ children, ...props }, ref) => (
                                <div {...props} ref={ref} className="aspect-square">
                                    {children}
                                </div>
                            ))
                        }}
                        itemContent={(index) => {
                            const image = filteredImages[index];
                            const character = characterMap.get(image.characterId);
                            return (
                                <div
                                    onClick={() => onImageClick(image)}
                                    className="w-full h-full bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative border border-gray-700 shadow-sm hover:shadow-indigo-500/30 transition-shadow duration-200"
                                    style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' } as React.CSSProperties}
                                >
                                    <img
                                        src={image.thumbnailUrl || image.imageDataUrl}
                                        alt={character?.name || 'Character image'}
                                        className="w-full h-full object-cover object-top"
                                        loading="lazy"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-sm font-bold truncate">{character?.name}</p>
                                    </div>
                                </div>
                            );
                        }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <p className="text-xl">找不到符合條件的圖片。</p>
                        <p className="mt-2">請嘗試調整您的篩選條件，或到角色編輯器中上傳圖片。</p>
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

export default ImageListView;