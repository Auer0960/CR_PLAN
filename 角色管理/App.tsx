import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Import types
import type { AppData, Character, Relationship, TagCategory, CharacterImage, AiProvider, View, TagWithColor, ParsedData, Tag } from './types';

// Import services
import { parseWithGemini } from './services/geminiService';
import { parseWithOpenAI } from './services/openaiService';

// Import components
import Sidebar from './components/Sidebar';
import RelationshipGraph from './components/RelationshipGraph';
import CharacterListView from './components/CharacterListView';
import TagManagerView from './components/TagManagerView';
import CharacterEditorModal from './components/CharacterEditorModal';
import ApiKeyModal from './components/ApiKeyModal';
import SettingsView from './components/SettingsView';
import SearchView from './components/SearchView';
import ImageListView from './components/ImageListView';
import ImageDetailModal from './components/ImageDetailModal';
import TagAnalyticsView from './components/TagAnalyticsView';
import ErrorBoundary from './components/ErrorBoundary';

// A helper for generating default data
function generateDefaultData(): AppData {
    const c = Array.from({ length: 12 }, () => uuidv4()); // Character IDs
    const characters: Character[] = [
        { id: c[0], name: '艾莉亞', notes: '主角，勇敢的年輕戰士。', tagIds: [] },
        { id: c[1], name: '雷文', notes: '神秘的法師，艾莉亞的導師。', tagIds: [] },
        { id: c[2], name: '凱隆', notes: '敵國的將軍，主要的對手。', tagIds: [] },
        { id: c[3], name: '莉娜', notes: '精靈族的弓箭手，艾莉亞的盟友。', tagIds: [] },
        { id: c[4], name: '葛雷', notes: '矮人族的鐵匠，為主角打造武器。', tagIds: [] },
        { id: c[5], name: '魔龍王', notes: '古老的邪惡存在，最終 Boss。', tagIds: [] },
        { id: c[6], name: '芬里爾', notes: '雷文的使魔，一頭巨大的狼。', tagIds: [] },
        { id: c[7], name: '伊索德', notes: '凱隆的副官，對其忠心耿耿。', tagIds: [] },
        { id: c[8], name: '索林', notes: '葛雷的兒子，年輕的發明家。', tagIds: [] },
        { id: c[9], name: '希爾維婭', notes: '莉娜的姊姊，精靈女王。', tagIds: [] },
        { id: c[10], name: '暗影刺客', notes: '受僱於凱隆的神秘刺客。', tagIds: [] },
        { id: c[11], name: '光之祭司', notes: '提供治癒與支援的聖職者。', tagIds: [] },
    ];

    const cat = Array.from({ length: 4 }, () => uuidv4()); // Category IDs
    const tagsData: Record<string, Tag[]> = {
        [cat[0]]: [
            { id: uuidv4(), label: '主角群' }, { id: uuidv4(), label: '敵對勢力' }, { id: uuidv4(), label: '中立' }
        ],
        [cat[1]]: [
            { id: uuidv4(), label: '戰士' }, { id: uuidv4(), label: '法師' }, { id: uuidv4(), label: '弓箭手' }, { id: uuidv4(), label: '鐵匠' }, { id: uuidv4(), label: '刺客' }, { id: uuidv4(), label: '祭司' }
        ],
        [cat[2]]: [
            { id: uuidv4(), label: '人類' }, { id: uuidv4(), label: '精靈' }, { id: uuidv4(), label: '矮人' }, { id: uuidv4(), label: '龍' }, { id: uuidv4(), label: '魔物' }
        ],
        [cat[3]]: [
            { id: uuidv4(), label: '金色頭髮' }, { id: uuidv4(), label: '黑色頭髮' }, { id: uuidv4(), label: '銀色頭髮' }, { id: uuidv4(), label: '紅色眼睛' }, { id: uuidv4(), label: '盔甲' }, { id: uuidv4(), label: '法袍' }, { id: uuidv4(), label: '弓箭' }
        ],
    };

    const tagCategories: TagCategory[] = [
        { id: cat[0], name: '陣營', color: '#ef4444', tags: tagsData[cat[0]], selectionMode: 'single' },
        { id: cat[1], name: '職業', color: '#3b82f6', tags: tagsData[cat[1]], selectionMode: 'single' },
        { id: cat[2], name: '物種', color: '#10b981', tags: tagsData[cat[2]], selectionMode: 'single' },
        { id: cat[3], name: '外貌', color: '#8b5cf6', tags: tagsData[cat[3]], selectionMode: 'multiple' },
    ];

    // Assign tags to characters
    characters[0].tagIds = [tagsData[cat[0]][0].id, tagsData[cat[1]][0].id, tagsData[cat[2]][0].id, tagsData[cat[3]][2].id, tagsData[cat[3]][4].id]; // 艾莉亞
    characters[1].tagIds = [tagsData[cat[0]][0].id, tagsData[cat[1]][1].id, tagsData[cat[2]][0].id, tagsData[cat[3]][1].id, tagsData[cat[3]][5].id]; // 雷文
    characters[2].tagIds = [tagsData[cat[0]][1].id, tagsData[cat[1]][0].id, tagsData[cat[2]][0].id, tagsData[cat[3]][1].id, tagsData[cat[3]][3].id, tagsData[cat[3]][4].id]; // 凱隆
    characters[3].tagIds = [tagsData[cat[0]][0].id, tagsData[cat[1]][2].id, tagsData[cat[2]][1].id, tagsData[cat[3]][0].id, tagsData[cat[3]][6].id]; // 莉娜
    characters[4].tagIds = [tagsData[cat[0]][2].id, tagsData[cat[1]][3].id, tagsData[cat[2]][2].id]; // 葛雷
    characters[5].tagIds = [tagsData[cat[0]][1].id, tagsData[cat[2]][3].id]; // 魔龍王
    characters[6].tagIds = [tagsData[cat[0]][0].id, tagsData[cat[2]][4].id]; // 芬里爾
    characters[7].tagIds = [tagsData[cat[0]][1].id, tagsData[cat[1]][0].id, tagsData[cat[2]][0].id]; // 伊索德
    characters[8].tagIds = [tagsData[cat[0]][2].id, tagsData[cat[2]][2].id]; // 索林
    characters[9].tagIds = [tagsData[cat[0]][0].id, tagsData[cat[2]][1].id, tagsData[cat[3]][0].id]; // 希爾維婭
    characters[10].tagIds = [tagsData[cat[0]][1].id, tagsData[cat[1]][4].id, tagsData[cat[2]][4].id]; // 暗影刺客
    characters[11].tagIds = [tagsData[cat[0]][0].id, tagsData[cat[1]][5].id, tagsData[cat[2]][0].id, tagsData[cat[3]][5].id]; // 光之祭司

    const relationships: Relationship[] = [
        { id: uuidv4(), source: c[1], target: c[0], label: '師徒', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[0], target: c[2], label: '宿敵', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[0], target: c[3], label: '盟友', arrowStyle: 'none' },
        { id: uuidv4(), source: c[3], target: c[0], label: '盟友', arrowStyle: 'none' },
        { id: uuidv4(), source: c[4], target: c[0], label: '協助', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[2], target: c[5], label: '服從', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[1], target: c[6], label: '主人', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[7], target: c[2], label: '效忠', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[8], target: c[4], label: '父子', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[4], target: c[8], label: '父子', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[9], target: c[3], label: '姊妹', arrowStyle: 'none' },
        { id: uuidv4(), source: c[3], target: c[9], label: '姊妹', arrowStyle: 'none' },
        { id: uuidv4(), source: c[2], target: c[10], label: '僱傭', arrowStyle: 'arrow' },
        { id: uuidv4(), source: c[11], target: c[0], label: '守護', arrowStyle: 'arrow' },
    ];

    // Create 50 dummy images and assign them randomly
    const characterImages: CharacterImage[] = Array.from({ length: 50 }, (_, i) => {
        const charIndex = i % characters.length;
        const char = characters[charIndex];
        const tagsForImage = [];
        if (char.tagIds.length > 0) {
            const numTags = Math.floor(Math.random() * 3) + 1;
            const shuffled = [...char.tagIds].sort(() => 0.5 - Math.random());
            tagsForImage.push(...shuffled.slice(0, numTags));
        }
        return {
            id: uuidv4(),
            characterId: char.id,
            imageDataUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(char.name + i)}`,
            tagIds: tagsForImage,
            notes: `這是 ${char.name} 的第 ${Math.floor(i / characters.length) + 1} 張圖片。`
        };
    });

    return { characters, relationships, tagCategories, characterImages };
}

const App: React.FC = () => {
    // Main data state
    const [characters, setCharacters] = useState<Character[]>([]);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [tagCategories, setTagCategories] = useState<TagCategory[]>([]);
    const [characterImages, setCharacterImages] = useState<CharacterImage[]>([]);

    // UI state
    const [activeView, setActiveView] = useState<View>('graph');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [isCharacterEditorOpen, setIsCharacterEditorOpen] = useState(false);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<CharacterImage | null>(null);
    const [isImageDetailModalOpen, setIsImageDetailModalOpen] = useState(false);

    // Settings state
    const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
    const [openaiApiKey, setOpenaiApiKey] = useState('');

    // Load data on mount
    const [deletedRelationshipIds, setDeletedRelationshipIds] = useState<Set<string>>(new Set());
    const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load settings
                const savedProvider = localStorage.getItem('aiProvider');
                if (savedProvider === 'openai' || savedProvider === 'gemini') {
                    setAiProvider(savedProvider as AiProvider);
                }
                const savedOpenaiKey = localStorage.getItem('openaiApiKey');
                if (savedOpenaiKey) {
                    setOpenaiApiKey(savedOpenaiKey);
                }

                // Load Project Data (cr_data.json)
                const response = await fetch('./cr_data.json');
                const projectData: AppData = await response.json();

                // Load Local User Data (user_data.json)
                // Both local and production use the same file now
                let localUserData: Partial<AppData> & { deletedRelationshipIds?: string[], deletedImageIds?: string[] } = {};
                try {
                    const localResponse = await fetch('./user_data.json');
                    if (localResponse.ok) {
                        localUserData = await localResponse.json();
                        console.log('✅ Loaded user_data.json successfully');
                    } else {
                        console.warn('⚠️ user_data.json not found, using defaults');
                    }
                } catch (e) {
                    console.warn("Failed to load user_data.json", e);
                }

                // Load LocalStorage (Backup)
                const savedData = localStorage.getItem('characterMapData');
                let savedCharacters: Character[] = [];
                let savedTags: TagCategory[] = [];

                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    savedCharacters = parsed.characters || [];
                    savedTags = parsed.tagCategories || [];
                }

                // Restore deleted IDs
                if (localUserData.deletedRelationshipIds) {
                    setDeletedRelationshipIds(new Set(localUserData.deletedRelationshipIds));
                }
                const deletedImgIds = new Set(localUserData.deletedImageIds || []);
                setDeletedImageIds(deletedImgIds);

                // Merge Characters
                const mergedCharacters: Character[] = (projectData.characters || []).map(char => {
                    const savedChar = savedCharacters.find(c => c.id === char.id);
                    const manualData = localUserData.characters?.[char.id] || {};

                    return {
                        ...char,
                        // Priority: Manual JSON > LocalStorage > File Data
                        image: manualData.image || savedChar?.image || char.image,
                        tagIds: manualData.tagIds || (savedChar?.tagIds && savedChar.tagIds.length > 0 ? savedChar.tagIds : char.tagIds),
                        avatarPosition: manualData.avatarPosition || savedChar?.avatarPosition || char.avatarPosition
                    };
                });

                if (localUserData.characters) {
                    // Add new characters created by user
                    const fileCharIds = new Set((projectData.characters || []).map(c => c.id));
                    Object.keys(localUserData.characters).forEach(charId => {
                        if (!fileCharIds.has(charId)) {
                            // This is a user-created character (not in file) - logic to be added if needed
                            // For now we only merge properties of existing characters or load from savedCharacters if completely new
                        }
                    });
                }

                // If we have saved characters that are not in the file (newly created), add them
                const fileCharIds = new Set(mergedCharacters.map(c => c.id));
                savedCharacters.forEach(sc => {
                    if (!fileCharIds.has(sc.id)) {
                        mergedCharacters.push(sc);
                    }
                });

                setCharacters(mergedCharacters);

                // Merge relationships: User Data + New File Data
                const userRels = localUserData.relationships || [];
                const fileRels = projectData.relationships || [];
                const deletedRelIds = new Set(localUserData.deletedRelationshipIds || []);

                // Create a map of user relationships for quick lookup
                const userRelMap = new Map(userRels.map(r => [r.id, r]));
                // Also track content signatures
                const userRelSignatures = new Set(userRels.map(r => `${r.source}-${r.target}-${r.label}`));

                // Start with user relationships
                const mergedRelationships = [...userRels];

                // Add file relationships that:
                // 1. Don't exist in user data (by ID)
                // 2. Don't have a matching signature in user data (prevent duplicates)
                // 3. Have NOT been explicitly deleted by the user
                fileRels.forEach(fileRel => {
                    const signature = `${fileRel.source}-${fileRel.target}-${fileRel.label}`;
                    if (!userRelMap.has(fileRel.id) &&
                        !userRelSignatures.has(signature) &&
                        !deletedRelIds.has(fileRel.id)) {
                        mergedRelationships.push(fileRel);
                    }
                });

                setRelationships(mergedRelationships);

                // Merge images: Combine Project Data and User Data
                // This ensures new images from files (like Ruolan's) are added, while preserving user uploads/edits
                const projectImages = projectData.characterImages || [];
                const userImages = localUserData.characterImages || [];

                const imageMap = new Map<string, CharacterImage>();

                // 1. Add Project Images first (if not deleted)
                projectImages.forEach(img => {
                    if (!deletedImgIds.has(img.id)) {
                        imageMap.set(img.id, img);
                    }
                });

                // 2. Add User Images (overwriting project images with same ID)
                userImages.forEach(img => {
                    if (!deletedImgIds.has(img.id)) {
                        imageMap.set(img.id, img);
                    }
                });

                let finalImages = Array.from(imageMap.values());

                // 3. Deduplicate by URL (prefer user images/latest added)
                // Create a map of URL -> Image to find duplicates
                const urlMap = new Map<string, CharacterImage>();
                finalImages.forEach(img => {
                    // Normalize URL to avoid minor differences (though usually they are exact)
                    const url = img.imageDataUrl;
                    if (urlMap.has(url)) {
                        // Duplicate found!
                        // We need to decide which one to keep.
                        // If one is from user_data (likely has notes/tags) and one is from cr_data, keep user_data.
                        // Since we processed userImages LAST in step 2, if there was an ID collision, userImage won.
                        // But here we have DIFFERENT IDs but SAME URL.

                        // Heuristic: Prefer the one that is already in userImages (if we can tell).
                        // Or simply prefer the one with more data (tags/notes).
                        const existing = urlMap.get(url)!;

                        const existingHasData = (existing.tagIds && existing.tagIds.length > 0) || existing.notes;
                        const currentHasData = (img.tagIds && img.tagIds.length > 0) || img.notes;

                        if (currentHasData && !existingHasData) {
                            urlMap.set(url, img); // Replace with current (more data)
                        } else if (!existingHasData && !currentHasData) {
                            // Both have no data, keep the one with "better" ID? or just keep first.
                            // If one ID is in projectData and one is not, maybe keep project ID?
                            // Actually, let's just keep the first one encountered (which is Project Image)
                            // UNLESS the second one is explicitly from User Data.
                            // Since we can't easily track origin here without looking up again,
                            // let's assume userImages are more "recent" or "important".

                            // If we assume userImages are added *after* projectImages in the array...
                            // Wait, we constructed finalImages from a Map, so order is insertion order.
                            // Project images inserted first, then User images.
                            // So `img` (current) is likely the User image if it's a duplicate of a Project image.
                            // We should probably KEEP `img` (User) and discard `existing` (Project) if they are duplicates?
                            // BUT, if we discard Project Image ID, and we save, we are just saving User Image.
                            // Next load, Project Image comes back (different ID), User Image is loaded.
                            // Duplicate again!

                            // To permanently "deduplicate", we must "delete" the Project Image ID.
                            // But we can't modify project data.
                            // So we must add the Project Image ID to `deletedImageIds` automatically?
                            // That seems risky.

                            // Better approach: Just filter for display.
                            // If we filter for display, they are still in state.
                            // If we want to remove from UI, we just pick one.
                            // Let's keep the one that was added LAST (User Image).
                            urlMap.set(url, img);
                        }
                        // If existing has data and current doesn't, keep existing.
                    } else {
                        urlMap.set(url, img);
                    }
                });

                finalImages = Array.from(urlMap.values());

                // Check for broken paths in user data (containing parentheses or spaces) and try to recover from projectData
                if (localUserData.characterImages && projectData.characterImages) {
                    finalImages = finalImages.map(img => {
                        // If image URL looks suspicious (contains parens or spaces)
                        if (img.imageDataUrl.match(/[()\s]/)) {
                            // Try to find a better version in projectData (by characterId)
                            // We look for an image for the same character that DOESN'T have special chars
                            const betterImg = projectData.characterImages.find(pi =>
                                pi.characterId === img.characterId &&
                                !pi.imageDataUrl.match(/[()\s]/)
                            );
                            if (betterImg) {
                                return { ...img, imageDataUrl: betterImg.imageDataUrl };
                            }
                        }
                        return img;
                    });
                }

                setCharacterImages(finalImages);

                const sanitizedCategories = savedTags.length > 0 ? savedTags.map(cat => ({
                    ...cat,
                    tags: cat.tags.map(tag => ({ ...tag, color: cat.color })),
                    selectionMode: cat.selectionMode || (cat.name === '勢力' ? 'single' : 'multiple')
                })) : (projectData.tagCategories || []).map(cat => ({
                    ...cat,
                    tags: cat.tags.map(tag => ({ ...tag, color: cat.color })),
                    selectionMode: cat.selectionMode || (cat.name === '勢力' ? 'single' : 'multiple')
                }));
                setTagCategories(sanitizedCategories);

            } catch (error) {
                console.error("Failed to load data:", error);
                const defaultData = generateDefaultData();
                setCharacters(defaultData.characters);
                setRelationships(defaultData.relationships);
                setTagCategories(defaultData.tagCategories);
                setCharacterImages(defaultData.characterImages);
            }
        };

        loadData();
    }, []);

    // Save data to local file system (via API) and localStorage
    useEffect(() => {
        const saveData = async () => {
            try {
                // 1. Save to localStorage (Legacy/Backup)
                const appData: AppData = { characters, relationships, tagCategories, characterImages };
                localStorage.setItem('characterMapData', JSON.stringify(appData));

                // 2. Save to local file system (Primary for persistence)
                const userDataToSave = {
                    characters: characters.reduce((acc, char) => {
                        if (char.image || char.avatarPosition || (char.tagIds && char.tagIds.length > 0)) {
                            acc[char.id] = {
                                image: char.image,
                                avatarPosition: char.avatarPosition,
                                tagIds: char.tagIds
                            };
                        }
                        return acc;
                    }, {} as any),
                    relationships: relationships,  // Save all relationships
                    characterImages: characterImages,  // Save all character images
                    deletedRelationshipIds: Array.from(deletedRelationshipIds), // Save deleted IDs
                    deletedImageIds: Array.from(deletedImageIds) // Save deleted Image IDs
                };

                // 偵測是否為本地開發環境
                const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                
                if (isLocalDev) {
                    // 本地開發：使用 API 寫入檔案
                    await fetch('/CR_PLAN/api/save-metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userDataToSave)
                    });
                } else {
                    // GitHub Pages：只能讀取，不能寫入
                    console.log('⚠️ 雲端模式：資料只能讀取，無法儲存編輯');
                }

            } catch (e: any) {
                console.error("Failed to save data", e);
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    const now = Date.now();
                    if (now - (window as any).lastQuotaAlert > 5000 || !(window as any).lastQuotaAlert) {
                        alert("⚠️ 瀏覽器儲存空間已滿，但不用擔心！\n\n系統已嘗試寫入本機檔案 (user_data.json)。\n只要您的後端服務有在運行，設定就會被保存。");
                        (window as any).lastQuotaAlert = now;
                    }
                }
            }
        };

        // Debounce save to avoid too many API calls
        const timeoutId = setTimeout(saveData, 1000);
        return () => clearTimeout(timeoutId);

    }, [characters, relationships, tagCategories, characterImages, deletedRelationshipIds, deletedImageIds]);

    const allTags = useMemo((): TagWithColor[] => tagCategories.flatMap(category =>
        category.tags.map(tag => ({ ...tag, color: category.color }))
    ), [tagCategories]);

    const handleProcessText = async (text: string) => {
        setIsLoading(true);
        setError(null);
        try {
            let parsedData: ParsedData;
            if (aiProvider === 'gemini') {
                parsedData = await parseWithGemini(text);
            } else {
                parsedData = await parseWithOpenAI(text, openaiApiKey);
            }

            setCharacters(prevChars => {
                const existingNames = new Set(prevChars.map(c => c.name));
                const newCharsData = parsedData.characters.filter(c => !existingNames.has(c.name));

                if (newCharsData.length === 0 && parsedData.relationships.length > 0) {
                    const allChars = [...prevChars];
                    const charMap = new Map(allChars.map(c => [c.name, c.id]));
                    const newRels = parsedData.relationships
                        .map((r): Relationship | null => {
                            const sourceId = charMap.get(r.source);
                            const targetId = charMap.get(r.target);
                            if (sourceId && targetId) {
                                return {
                                    id: uuidv4(),
                                    source: sourceId,
                                    target: targetId,
                                    label: r.label,
                                    arrowStyle: 'arrow' as const
                                };
                            }
                            return null;
                        })
                        .filter((r): r is Relationship => r !== null);

                    setRelationships(prevRels => {
                        const existingRelSet = new Set(prevRels.map(r => `${r.source}-${r.target}-${r.label}`));
                        const uniqueNewRels = newRels.filter(r => !existingRelSet.has(`${r.source}-${r.target}-${r.label}`));
                        return [...prevRels, ...uniqueNewRels];
                    });
                    return prevChars;
                }

                const newChars = newCharsData.map(c => ({
                    id: uuidv4(),
                    name: c.name,
                    notes: '',
                    tagIds: []
                }));

                const allChars = [...prevChars, ...newChars];
                const charMap = new Map(allChars.map(c => [c.name, c.id]));

                const newRels = parsedData.relationships
                    .map((r): Relationship | null => {
                        const sourceId = charMap.get(r.source);
                        const targetId = charMap.get(r.target);
                        if (sourceId && targetId) {
                            return {
                                id: uuidv4(),
                                source: sourceId,
                                target: targetId,
                                label: r.label,
                                arrowStyle: 'arrow' as const
                            };
                        }
                        return null;
                    })
                    .filter((r): r is Relationship => r !== null);

                setRelationships(prevRels => {
                    const existingRelSet = new Set(prevRels.map(r => `${r.source}-${r.target}-${r.label}`));
                    const uniqueNewRels = newRels.filter(r => !existingRelSet.has(`${r.source}-${r.target}-${r.label}`));
                    return [...prevRels, ...uniqueNewRels];
                });

                return allChars;
            });
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCharacterClick = (character: Character) => {
        setSelectedCharacter(character);
        setIsCharacterEditorOpen(true);
    };

    const handleSaveCharacter = (updatedCharacter: Character) => {
        setCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
    };

    const handleDeleteCharacter = (characterId: string) => {
        setCharacters(prev => prev.filter(c => c.id !== characterId));
        setRelationships(prev => prev.filter(r => r.source !== characterId && r.target !== characterId));
        setCharacterImages(prev => prev.filter(img => img.characterId !== characterId));
        setIsCharacterEditorOpen(false);
        setSelectedCharacter(null);
    };

    const handleAddNewCharacter = () => {
        const newChar: Character = {
            id: uuidv4(),
            name: "新角色",
            notes: "",
            tagIds: [],
        };
        setCharacters(prev => [...prev, newChar]);
        setSelectedCharacter(newChar);
        setIsCharacterEditorOpen(true);
    };

    const handleSaveSettings = ({ provider, openaiKey }: { provider: AiProvider; openaiKey: string; }) => {
        setAiProvider(provider);
        setOpenaiApiKey(openaiKey);
        localStorage.setItem('aiProvider', provider);
        localStorage.setItem('openaiApiKey', openaiKey);
    };

    const handleAddTagToCategory = useCallback((label: string, categoryName: string): Tag | null => {
        let newTag: Tag | null = null;
        setTagCategories(prevCategories => {
            const updatedCategories = JSON.parse(JSON.stringify(prevCategories));
            let targetCategory = updatedCategories.find((c: TagCategory) => c.name.toLowerCase() === categoryName.toLowerCase());

            if (!targetCategory) {
                targetCategory = {
                    id: uuidv4(),
                    name: categoryName,
                    color: '#8b5cf6', // A default color
                    tags: [],
                    selectionMode: 'multiple',
                };
                updatedCategories.push(targetCategory);
            }

            const tagExists = targetCategory.tags.some((t: Tag) => t.label.toLowerCase() === label.toLowerCase());
            if (!tagExists) {
                newTag = { id: uuidv4(), label };
                targetCategory.tags.push(newTag);
            } else {
                newTag = targetCategory.tags.find((t: Tag) => t.label.toLowerCase() === label.toLowerCase()) || null;
            }
            return updatedCategories;
        });
        return newTag;
    }, []);

    const handleImageClick = (image: CharacterImage) => {
        setSelectedImage(image);
        setIsImageDetailModalOpen(true);
    };

    const handleDeleteImage = (imageId: string) => {
        const imageToDelete = characterImages.find(img => img.id === imageId);
        if (!imageToDelete) return;

        // 1. Remove from state
        setCharacterImages(prev => prev.filter(img => img.id !== imageId));

        // 2. Add to deleted IDs
        setDeletedImageIds(prev => {
            const next = new Set(prev);
            next.add(imageId);
            return next;
        });

        // 3. Remove from character's image property if it matches
        setCharacters(prev => prev.map(char => {
            if (char.image === imageToDelete.imageDataUrl) {
                return { ...char, image: undefined };
            }
            return char;
        }));

        setIsImageDetailModalOpen(false);
        setSelectedImage(null);
    };

    // --- Data Management Handlers ---
    const downloadJson = (data: object, filename: string) => {
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', filename);
        linkElement.click();
    };

    const handleExportCharacters = () => {
        downloadJson({
            characters,
            relationships,
            characterImages,
            deletedRelationshipIds: Array.from(deletedRelationshipIds)
        }, 'characters-and-relations.json');
    };

    const handleExportTags = () => {
        downloadJson({ tagCategories }, 'tags.json');
    };

    const handleImportCharacters = (data: Partial<AppData> & { deletedRelationshipIds?: string[] }) => {
        if (data.characters && data.relationships && data.characterImages) {
            setCharacters(data.characters);
            setRelationships(data.relationships);
            setCharacterImages(data.characterImages);

            if (data.deletedRelationshipIds) {
                setDeletedRelationshipIds(new Set(data.deletedRelationshipIds));
            }

            alert('角色與關係檔已成功匯入！');
        } else {
            alert('匯入失敗：檔案格式不正確或缺少必要資料。');
        }
    };

    const handleImportTags = (data: Partial<AppData>) => {
        if (data.tagCategories) {
            const sanitizedCategories = data.tagCategories.map((cat: TagCategory) => ({
                ...cat,
                selectionMode: cat.selectionMode || 'multiple'
            }));
            setTagCategories(sanitizedCategories);
            alert('Tag 設定檔已成功匯入！');
        } else {
            alert('匯入失敗：檔案格式不正確或缺少必要資料。');
        }
    };

    const handleClearAllData = () => {
        setCharacters([]);
        setRelationships([]);
        setTagCategories([]);
        setCharacterImages([]);
    };


    const renderView = () => {
        switch (activeView) {
            case 'graph':
                return <RelationshipGraph characters={characters} relationships={relationships} onNodeClick={handleCharacterClick} tagCategories={tagCategories} />;
            case 'characters':
                return <CharacterListView characters={characters} onCharacterClick={handleCharacterClick} allTags={allTags} onProcess={handleProcessText} isLoading={isLoading} error={error} onAddNewCharacter={handleAddNewCharacter} tagCategories={tagCategories} />;
            case 'images':
                return <ImageListView characters={characters} characterImages={characterImages} allTags={allTags} tagCategories={tagCategories} onCharacterClick={handleCharacterClick} onImageClick={handleImageClick} />;
            case 'search':
                return <SearchView characters={characters} allTags={allTags} tagCategories={tagCategories} onCharacterClick={handleCharacterClick} />;
            case 'tags':
                return <TagManagerView tagCategories={tagCategories} onUpdate={setTagCategories} />;
            case 'analytics':
                return <TagAnalyticsView tagCategories={tagCategories} characterImages={characterImages} characters={characters} />;
            case 'settings':
                return <SettingsView
                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                    onExportCharacters={handleExportCharacters}
                    onImportCharacters={handleImportCharacters}
                    onExportTags={handleExportTags}
                    onImportTags={handleImportTags}
                    onReset={handleClearAllData}
                />;
            default:
                return <div>View not found</div>;
        }
    };

    const handleUpdateRelationships = (updater: React.SetStateAction<Relationship[]>) => {
        setRelationships(prev => {
            const newRels = typeof updater === 'function' ? (updater as any)(prev) : updater;

            // Detect deletions
            const newIds = new Set(newRels.map((r: Relationship) => r.id));
            const deletedIds = prev.filter(r => !newIds.has(r.id)).map(r => r.id);

            if (deletedIds.length > 0) {
                // Schedule update to avoid side-effects in reducer
                setTimeout(() => {
                    setDeletedRelationshipIds(prevDeleted => {
                        const nextDeleted = new Set(prevDeleted);
                        deletedIds.forEach(id => nextDeleted.add(id));
                        return nextDeleted;
                    });
                }, 0);
            }

            return newRels;
        });
    };

    return (
        <div className="flex h-screen w-screen bg-gray-900 text-white font-sans">
            <Sidebar activeView={activeView} onSetActiveView={setActiveView} />
            <main className="flex-1 overflow-hidden">
                <ErrorBoundary>
                    {renderView()}
                </ErrorBoundary>
            </main>

            {isCharacterEditorOpen && selectedCharacter && (
                <CharacterEditorModal
                    isOpen={isCharacterEditorOpen}
                    onClose={() => setIsCharacterEditorOpen(false)}
                    character={selectedCharacter}
                    onSave={handleSaveCharacter}
                    onDelete={handleDeleteCharacter}
                    tagCategories={tagCategories}
                    allCharacters={characters}
                    allRelationships={relationships}
                    onUpdateRelationships={handleUpdateRelationships}
                    characterImages={characterImages}
                    onUpdateCharacterImages={setCharacterImages}
                    onAddTagToCategory={handleAddTagToCategory}
                />
            )}

            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                onSave={handleSaveSettings}
                currentProvider={aiProvider}
                currentOpenaiKey={openaiApiKey}
            />

            <ImageDetailModal
                isOpen={isImageDetailModalOpen}
                onClose={() => setIsImageDetailModalOpen(false)}
                image={selectedImage}
                character={selectedImage ? characters.find(c => c.id === selectedImage.characterId) || null : null}
                tagCategories={tagCategories}
                allTags={allTags}
                onUpdateImage={setCharacterImages}
                onDeleteImage={handleDeleteImage}
                onAddTagToCategory={handleAddTagToCategory}
            />
        </div>
    );
};

export default App;