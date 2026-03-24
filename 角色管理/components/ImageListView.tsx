import React, { useMemo, useState, forwardRef, useCallback } from 'react';
import type { Character, CharacterImage, TagWithColor, TagCategory } from '../types';
import SearchableSelect from './SearchableSelect';
import TagFilterModal from './TagFilterModal';
import { TagsIcon, CloseIcon } from './Icons';
import { VirtuosoGrid } from 'react-virtuoso';
import { listStorageImages, type StorageImageItem } from '../services/supabaseService';

// Helper to resolve image paths with base URL
const resolveImagePath = (imagePath: string | undefined): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
        return imagePath;
    }
    const base = import.meta.env.BASE_URL || '/';
    return `${base}${imagePath}`.replace(/\/+/g, '/');
};

interface ImageListViewProps {
    characters: Character[];
    characterImages: CharacterImage[];
    allTags: TagWithColor[];
    tagCategories: TagCategory[];
    onCharacterClick: (character: Character) => void;
    onImageClick: (image: CharacterImage) => void;
    storageImages: StorageImageItem[] | null;
    onSetStorageImages: React.Dispatch<React.SetStateAction<StorageImageItem[] | null>>;
}

// 統一顯示用的圖片型別（來源可以是 characterImages 或 Storage）
interface DisplayImage {
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    characterId: string;   // 空字串 = 無法確認所屬
    tagIds: string[];
    notes?: string;
    fromStorage: boolean;
    // 保留原始 CharacterImage 供 onImageClick 使用
    original?: CharacterImage;
}

const ImageListView: React.FC<ImageListViewProps> = ({ characters, characterImages, allTags, tagCategories, onImageClick, storageImages, onSetStorageImages: setStorageImages }) => {
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('all');
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
    const [isLoadingStorage, setIsLoadingStorage] = useState(false);
    const [storageError, setStorageError] = useState<string | null>(null);

    const characterMap = useMemo(() => {
        if (!Array.isArray(characters)) return new Map();
        return new Map(characters.map(c => [c.id, c]));
    }, [characters]);

    // 建立 URL → CharacterImage 對照表，以便從 Storage 圖片反查記錄
    const imageUrlMap = useMemo(() => {
        const map = new Map<string, CharacterImage>();
        (characterImages || []).forEach(img => {
            if (img.imageDataUrl) map.set(img.imageDataUrl, img);
        });
        return map;
    }, [characterImages]);

    // 建立 charIdPrefix → characterId 對照表（用檔名前綴反查完整 ID）
    const prefixToCharId = useMemo(() => {
        const map = new Map<string, string>();
        characters.forEach(c => {
            // 移除 UUID 破折號，取前 12 碼
            const prefix = c.id.replace(/-/g, '').substring(0, 12);
            map.set(prefix, c.id);
        });
        return map;
    }, [characters]);

    // 掃描 Storage
    const handleLoadFromStorage = useCallback(async () => {
        setIsLoadingStorage(true);
        setStorageError(null);
        try {
            const items = await listStorageImages();
            setStorageImages(items);
        } catch (e: any) {
            setStorageError(e?.message || '無法連接 Storage');
        } finally {
            setIsLoadingStorage(false);
        }
    }, []);

    // 合併來源：Storage 有資料時以 Storage 為主，否則用 characterImages
    const allDisplayImages = useMemo((): DisplayImage[] => {
        if (storageImages !== null) {
            // Storage 模式：每張圖嘗試反查角色資訊
            return storageImages.map(si => {
                const knownRecord = imageUrlMap.get(si.imageUrl);
                const charId = knownRecord?.characterId
                    || prefixToCharId.get(si.charIdPrefix)
                    || '';
                return {
                    id: si.id,
                    imageUrl: si.imageUrl,
                    thumbnailUrl: si.thumbnailUrl || si.imageUrl,
                    characterId: charId,
                    tagIds: knownRecord?.tagIds || [],
                    notes: knownRecord?.notes,
                    fromStorage: true,
                    original: knownRecord,
                };
            });
        }
        // 預設模式：用 characterImages
        return (characterImages || []).map(img => ({
            id: img.id,
            imageUrl: img.imageDataUrl,
            thumbnailUrl: img.thumbnailUrl || img.imageDataUrl,
            characterId: img.characterId,
            tagIds: img.tagIds,
            notes: img.notes,
            fromStorage: false,
            original: img,
        }));
    }, [storageImages, characterImages, imageUrlMap, prefixToCharId]);

    const characterOptions = useMemo(() => {
        if (!Array.isArray(characters)) return [{ value: 'all', label: '所有角色' }];
        return [
            { value: 'all', label: '所有角色' },
            ...characters.map(c => ({ value: c.id, label: c.name }))
        ];
    }, [characters]);

    const filteredImages = useMemo(() => {
        let list = allDisplayImages;
        if (selectedCharacterId !== 'all') {
            list = list.filter(img => img.characterId === selectedCharacterId);
        }
        if (selectedTagIds.length > 0) {
            list = list.filter(img => selectedTagIds.every(tagId => img.tagIds.includes(tagId)));
        }
        return list;
    }, [allDisplayImages, selectedCharacterId, selectedTagIds]);

    const selectedTags = useMemo(() => {
        return allTags.filter(tag => selectedTagIds.includes(tag.id));
    }, [allTags, selectedTagIds]);

    const handleRemoveTag = (tagIdToRemove: string) => {
        setSelectedTagIds(prev => prev.filter(id => id !== tagIdToRemove));
    };

    return (
        <div className="h-full w-full bg-gray-900 flex flex-col">
            <div className="p-8 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold text-white">
                        圖片庫
                        {storageImages !== null && (
                            <span className="ml-3 text-sm font-normal text-indigo-400">Storage 模式（{storageImages.length} 張）</span>
                        )}
                    </h1>
                    <div className="flex items-center gap-2">
                        {storageImages !== null && (
                            <button
                                onClick={() => setStorageImages(null)}
                                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300"
                            >
                                回到記錄模式
                            </button>
                        )}
                        <button
                            onClick={handleLoadFromStorage}
                            disabled={isLoadingStorage}
                            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md text-white font-medium"
                        >
                            {isLoadingStorage ? '掃描中…' : '從 Storage 掃描'}
                        </button>
                    </div>
                </div>
                {storageError && <p className="text-red-400 text-sm mb-3">⚠️ {storageError}</p>}
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
                            const handleClick = () => {
                                if (image.original) {
                                    onImageClick(image.original);
                                } else {
                                    // Storage 模式且無記錄：建立暫時物件供 modal 使用
                                    onImageClick({
                                        id: image.id,
                                        characterId: image.characterId,
                                        imageDataUrl: image.imageUrl,
                                        thumbnailUrl: image.thumbnailUrl,
                                        tagIds: image.tagIds,
                                        notes: image.notes,
                                    } as CharacterImage);
                                }
                            };
                            return (
                                <div
                                    onClick={handleClick}
                                    className="w-full h-full bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative border border-gray-700 shadow-sm hover:shadow-indigo-500/30 transition-shadow duration-200"
                                    style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' } as React.CSSProperties}
                                >
                                    <img
                                        src={resolveImagePath(image.thumbnailUrl) || resolveImagePath(image.imageUrl)}
                                        alt={character?.name || '未知角色'}
                                        className="w-full h-full object-cover object-top"
                                        loading="lazy"
                                        onError={(e) => {
                                            const el = e.currentTarget;
                                            const fallback = resolveImagePath(image.imageUrl);
                                            if (el.src !== fallback) el.src = fallback;
                                        }}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-sm font-bold truncate">
                                            {character?.name || (image.characterId ? `ID: ${image.characterId.slice(0,8)}…` : '未知角色')}
                                        </p>
                                    </div>
                                </div>
                            );
                        }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <p className="text-xl">找不到符合條件的圖片。</p>
                        {storageImages === null && (
                            <p className="mt-2">
                                沒有已記錄的圖片？試試右上角的「從 Storage 掃描」直接從雲端讀取。
                            </p>
                        )}
                        {storageImages !== null && (
                            <p className="mt-2">請嘗試調整篩選條件。</p>
                        )}
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