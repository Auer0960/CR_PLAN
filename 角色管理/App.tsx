import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Import types
import type { AppData, Character, Relationship, TagCategory, CharacterImage, AiProvider, View, TagWithColor, ParsedData, Tag, TimelineData, AppUser, ProfileField, ModLogChange, GlossaryTerm } from './types';

// Import services
import { parseWithGemini } from './services/geminiService';
import { parseWithOpenAI } from './services/openaiService';
import { loadAppData, saveAppData, loadTimelineData, saveTimelineData, getUserByCode } from './services/supabaseService';
import { supabase } from './supabase';

// Import components
import Sidebar from './components/Sidebar';
import RelationshipGraph from './components/RelationshipGraph';
import CharacterListView from './components/CharacterListView';
import TagManagerView from './components/TagManagerView';
import CharacterEditorModal from './components/CharacterEditorModal';
import ApiKeyModal from './components/ApiKeyModal';
import UserLoginModal from './components/UserLoginModal';
import SettingsView from './components/SettingsView';
import SearchView from './components/SearchView';
import ImageListView from './components/ImageListView';
import ImageDetailModal from './components/ImageDetailModal';
import TagAnalyticsView from './components/TagAnalyticsView';
import ErrorBoundary from './components/ErrorBoundary';
import TimelineView from './components/TimelineView';
import GlossaryView from './components/GlossaryView';

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
    const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
    const [timelineData, setTimelineData] = useState<TimelineData>({
        gameStartYear: 200,
        events: [],
        locations: [],
        tags: [],
    });

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

    // Save status (so user can tell if persistence succeeded)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'readonly' | 'error'>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // User login (使用者代碼)
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [isLoginChecked, setIsLoginChecked] = useState(false);
    const modifiedCharacterIdsRef = React.useRef<Set<string>>(new Set());

    // Realtime sync toast
    const [realtimeToast, setRealtimeToast] = useState<string | null>(null);
    const isSavingRef = React.useRef(false); // 自己儲存時不重新載入
    // Prevents save effects from firing before the initial data load completes
    const isDataReadyRef = React.useRef(false);
    // Set to true when data loading failed and fell back to placeholder — blocks auto-save
    const isDataFromErrorRef = React.useRef(false);
    // Snapshot of the character+relationships taken when the editor opens, used for diff on close
    const editorOpenSnapshotRef = React.useRef<{
        character: Character;
        relationships: Relationship[];
    } | null>(null);

    // Helper: get profileFields from a character (migrates old profile format)
    const getProfileFieldsFromChar = (char: Character): ProfileField[] => {
        if (char.profileFields && char.profileFields.length > 0) return char.profileFields;
        const old = char.profile || {};
        return [
            { id: 'appearance', label: '外觀設定', content: old.appearance || '' },
            { id: 'personality', label: '性格特徵', content: old.personality || '' },
            { id: 'background', label: '背景故事', content: old.background || '' },
            { id: 'specialty', label: '專長與興趣', content: old.specialty || '' },
            { id: 'quote', label: '語氣示例', content: old.quote || '' },
        ];
    };

    // Load data on mount
    const [deletedRelationshipIds, setDeletedRelationshipIds] = useState<Set<string>>(new Set());
    const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set());

    // Canonical ID mapping to prevent duplicate "same-name different-id" characters from appearing.
    // These canonical IDs are the ones in cr_data.json.
    const CANONICAL_ID_MAP: Record<string, string> = useMemo(() => ({
        // 安東 (old -> canonical)
        'c8a2b1d3e4f5': '1a4889cddbd5',
        // 藤原 亞璃紗 (old -> canonical)
        '8f7c3e9a2b1d': '5b0ba53871bb',
        // 相田 龍之介 (old -> canonical)
        'e4a5d8f9b2c3': 'c5c6abfed105',
    }), []);

    const normalizeId = useCallback((id: string) => CANONICAL_ID_MAP[id] || id, [CANONICAL_ID_MAP]);

    const mergeCharacterFields = useCallback((base: Character, extra: Character): Character => {
        // Prefer base fields, but fill missing from extra; union tagIds
        const tagIds = Array.from(new Set([...(base.tagIds || []), ...(extra.tagIds || [])].filter(Boolean)));
        return {
            ...base,
            name: base.name || extra.name,
            notes: base.notes || extra.notes,
            image: base.image || extra.image,
            avatarPosition: base.avatarPosition || extra.avatarPosition,
            tagIds,
        };
    }, []);

    const getApiPrefix = () => {
        // Support both root and sub-path deployments (e.g. /CR_PLAN)
        return window.location.pathname.startsWith('/CR_PLAN') ? '/CR_PLAN' : '';
    };

    const fetchJsonNoCache = async (url: string) => {
        const res = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache',
            },
        });
        return res;
    };

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

                // ── Supabase 單一來源讀取 ──────────────────────────────────
                const supabaseAppData = await loadAppData();

                if (supabaseAppData) {
                    // Supabase 有資料：直接使用（單一來源，不需合併）
                    console.log('✅ Loaded app data from Supabase');
                    setCharacters(supabaseAppData.characters || []);
                    setRelationships(supabaseAppData.relationships || []);
                    setCharacterImages(supabaseAppData.characterImages || []);
                    if (supabaseAppData.deletedRelationshipIds) {
                        setDeletedRelationshipIds(new Set(supabaseAppData.deletedRelationshipIds));
                    }
                    if (supabaseAppData.deletedImageIds) {
                        setDeletedImageIds(new Set(supabaseAppData.deletedImageIds));
                    }
                    const cats = (supabaseAppData.tagCategories || []).map(cat => ({
                        ...cat,
                        tags: cat.tags.map(tag => ({ ...tag, color: cat.color })),
                        selectionMode: cat.selectionMode || (cat.name === '勢力' ? 'single' : 'multiple'),
                    }));
                    setTagCategories(cats);
                    setGlossaryTerms(supabaseAppData.glossaryTerms || []);

                    // Load timeline from Supabase; if empty, fall back to static file and migrate
                    const supabaseTimeline = await loadTimelineData();
                    if (supabaseTimeline && (supabaseTimeline.events?.length ?? 0) > 0) {
                        console.log('✅ Loaded timeline data from Supabase');
                        setTimelineData(supabaseTimeline);
                    } else {
                        console.warn('⚠️ Supabase timeline empty, loading from static file...');
                        try {
                            const staticResp = await fetch('./timeline_data.json');
                            if (staticResp.ok) {
                                const staticTimeline: TimelineData = await staticResp.json();
                                console.log('✅ Loaded timeline_data.json (static), migrating to Supabase...');
                                setTimelineData(staticTimeline);
                                // Auto-migrate to Supabase so future loads work
                                await saveTimelineData(staticTimeline);
                                console.log('✅ Timeline data migrated to Supabase');
                            }
                        } catch (e) {
                            console.warn('⚠️ Static timeline fallback failed', e);
                        }
                    }
                    return; // 直接結束，不進入舊的 A+B 合併邏輯
                }

                // Supabase 無資料（首次使用）：從 cr_data.json 讀取作為初始資料
                console.log('⚠️ Supabase empty, falling back to cr_data.json for initial load');
                const response = await fetch('./cr_data.json');
                const projectData: AppData = await response.json();

                // Load Local User Data (user_data)
                type LocalUserData = {
                    // NOTE: user_data.json stores character overrides as a map keyed by characterId (not Character[])
                    characters?: Record<string, {
                        name?: string;
                        notes?: string;
                        image?: string;
                        avatarPosition?: any;
                        tagIds?: string[];
                    }>;
                    relationships?: Relationship[];
                    tagCategories?: TagCategory[];
                    characterImages?: CharacterImage[];
                    deletedRelationshipIds?: string[];
                    deletedImageIds?: string[];
                };

                let localUserData: LocalUserData = {};
                try {
                    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    if (isLocalDev) {
                        // In local dev, ALWAYS load from local API (the same place we write to),
                        // otherwise refresh (F5) may read stale public/user_data.json.
                        const prefix = getApiPrefix();
                        const apiCandidates = [`${prefix}/api/user-data`, `/api/user-data`].filter((v, i, a) => a.indexOf(v) === i);
                        let loaded = false;

                        for (const apiUrl of apiCandidates) {
                            try {
                                const apiRes = await fetchJsonNoCache(apiUrl);
                                if (apiRes.ok) {
                                    localUserData = await apiRes.json();
                                    console.log(`✅ Loaded user data from API: ${apiUrl}`);
                                    loaded = true;
                                    break;
                                }
                            } catch {
                                // try next candidate
                            }
                        }

                        if (!loaded) {
                            // Fallback: if API isn't running, try static file to avoid blank data.
                            const localResponse = await fetchJsonNoCache('./user_data.json');
                            if (localResponse.ok) {
                                localUserData = await localResponse.json();
                                console.log('✅ Loaded user_data.json (static fallback)');
                            } else {
                                console.warn('⚠️ user data not found (API/static), using defaults');
                            }
                        }
                    } else {
                        // Production (e.g. GitHub Pages): static only
                        const localResponse = await fetchJsonNoCache('./user_data.json');
                        if (localResponse.ok) {
                            localUserData = await localResponse.json();
                            console.log('✅ Loaded user_data.json successfully');
                        } else {
                            console.warn('⚠️ user_data.json not found, using defaults');
                        }
                    }
                } catch (e) {
                    console.warn("Failed to load user_data.json", e);
                }

                // --- Normalize user_data.json (old IDs / duplicate names) BEFORE merging ---
                // This prevents "same-name different-id" duplicates from being re-added by recovery logic.
                const normalizeUserData = (ud: LocalUserData) => {
                    if (!ud) return ud;

                    // 1) characters: key remap oldId -> canonicalId and merge fields
                    const inputChars = (ud.characters && typeof ud.characters === 'object') ? ud.characters : {};
                    const normalizedChars: Record<string, any> = {};

                    Object.keys(inputChars).forEach((rawId) => {
                        const nid = normalizeId(rawId);
                        const entry = (inputChars as any)[rawId] || {};

                        // normalize image path if it contains old IDs in filename
                        const normalizedEntry = {
                            ...entry,
                            image: typeof entry.image === 'string' ? entry.image.replace(rawId, nid) : entry.image,
                        };

                        if (!normalizedChars[nid]) {
                            normalizedChars[nid] = normalizedEntry;
                        } else {
                            // merge fields (prefer existing but fill missing, union tagIds)
                            const a = normalizedChars[nid];
                            const tagIds = Array.from(new Set([...(a.tagIds || []), ...(normalizedEntry.tagIds || [])].filter(Boolean)));
                            normalizedChars[nid] = {
                                ...a,
                                name: a.name || normalizedEntry.name,
                                notes: a.notes || normalizedEntry.notes,
                                image: a.image || normalizedEntry.image,
                                avatarPosition: a.avatarPosition || normalizedEntry.avatarPosition,
                                tagIds,
                            };
                        }
                    });

                    // 2) relationships: source/target remap
                    const normalizedRels = (ud.relationships || []).map((r: any) => ({
                        ...r,
                        source: normalizeId(r.source),
                        target: normalizeId(r.target),
                    }));

                    // 3) characterImages: characterId remap + imageDataUrl filename remap
                    const normalizedImgs = (ud.characterImages || []).map((img: any) => {
                        const cid = normalizeId(img.characterId);
                        let url = img.imageDataUrl;
                        if (typeof url === 'string') {
                            // Apply known old->canonical replacements in filenames
                            url = url
                                .replace('c8a2b1d3e4f5', '1a4889cddbd5')
                                .replace('8f7c3e9a2b1d', '5b0ba53871bb')
                                .replace('e4a5d8f9b2c3', 'c5c6abfed105');
                        }
                        return { ...img, characterId: cid, imageDataUrl: url };
                    });

                    return {
                        ...ud,
                        characters: normalizedChars as any,
                        relationships: normalizedRels as any,
                        characterImages: normalizedImgs as any,
                    };
                };

                localUserData = normalizeUserData(localUserData);

                // Load LocalStorage (Backup)
                const savedData = localStorage.getItem('characterMapData');
                let savedCharacters: Character[] = [];
                let savedTags: TagCategory[] = [];

                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    savedCharacters = parsed.characters || [];
                    savedTags = parsed.tagCategories || [];
                }

                // Normalize LocalStorage characters to canonical IDs and dedupe.
                if (savedCharacters.length > 0) {
                    const byId = new Map<string, Character>();
                    for (const sc of savedCharacters) {
                        const nid = normalizeId(sc.id);
                        const normalized: Character = { ...sc, id: nid };
                        const existing = byId.get(nid);
                        byId.set(nid, existing ? mergeCharacterFields(existing, normalized) : normalized);
                    }
                    savedCharacters = Array.from(byId.values());
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
                    // Normalize old IDs to canonical IDs so we don't create duplicates.
                    const nid = normalizeId(sc.id);

                    // If canonical already exists, merge fields into the existing character.
                    if (fileCharIds.has(nid)) {
                        const idx = mergedCharacters.findIndex(c => c.id === nid);
                        if (idx >= 0) {
                            mergedCharacters[idx] = mergeCharacterFields(mergedCharacters[idx], { ...sc, id: nid });
                        }
                        return;
                    }

                    // If same name exists (but different id), DO NOT add a duplicate node; merge into the existing one.
                    const nameMatchIdx = mergedCharacters.findIndex(c => c.name === sc.name);
                    if (nameMatchIdx >= 0) {
                        mergedCharacters[nameMatchIdx] = mergeCharacterFields(mergedCharacters[nameMatchIdx], { ...sc, id: mergedCharacters[nameMatchIdx].id });
                        return;
                    }

                    mergedCharacters.push({ ...sc, id: nid });
                    fileCharIds.add(nid); // Update set
                });

                // 3. If we have characters in User Data that are not in File or Saved (e.g. lost local storage), recover them
                if (localUserData.characters) {
                    Object.keys(localUserData.characters).forEach(id => {
                        const nid = normalizeId(id);
                        const manualData = (localUserData.characters as any)![id];

                        // If canonical already exists, merge minimal fields into it (do NOT add duplicates)
                        if (fileCharIds.has(nid)) {
                            const idx = mergedCharacters.findIndex(c => c.id === nid);
                            if (idx >= 0) {
                                mergedCharacters[idx] = mergeCharacterFields(
                                    mergedCharacters[idx],
                                    {
                                        id: nid,
                                        name: (manualData as any).name || mergedCharacters[idx].name,
                                        notes: (manualData as any).notes || mergedCharacters[idx].notes || '',
                                        tagIds: manualData.tagIds || [],
                                        image: manualData.image,
                                        avatarPosition: manualData.avatarPosition
                                    } as any
                                );
                            }
                            return;
                        }

                        // If same name exists, merge into that existing character
                        const manualName = (manualData as any).name;
                        if (manualName) {
                            const nameIdx = mergedCharacters.findIndex(c => c.name === manualName);
                            if (nameIdx >= 0) {
                                mergedCharacters[nameIdx] = mergeCharacterFields(
                                    mergedCharacters[nameIdx],
                                    {
                                        id: mergedCharacters[nameIdx].id,
                                        name: manualName,
                                        notes: (manualData as any).notes || mergedCharacters[nameIdx].notes || '',
                                        tagIds: manualData.tagIds || [],
                                        image: manualData.image,
                                        avatarPosition: manualData.avatarPosition
                                    } as any
                                );
                                return;
                            }
                        }

                        // Otherwise, recover as a real new character (rare)
                        if (!fileCharIds.has(nid)) {
                            mergedCharacters.push({
                                id: nid,
                                name: (manualData as any).name || "未知角色",
                                notes: (manualData as any).notes || "此角色僅存在於關聯資料中，原始設定可能已遺失。",
                                tagIds: manualData.tagIds || [],
                                image: manualData.image,
                                avatarPosition: manualData.avatarPosition
                            });
                            fileCharIds.add(nid);
                        }
                    });
                }

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

                // Merge TAG Categories: Priority order:
                // 1. user_data.json (if has tags)
                // 2. localStorage (savedTags)
                // 3. cr_data.json (projectData)
                const userTags = localUserData.tagCategories || [];
                let finalTags = [];
                
                if (userTags.length > 0) {
                    // Use user_data.json tags (highest priority)
                    finalTags = userTags;
                    console.log('✅ Using TAG categories from user_data.json');
                } else if (savedTags.length > 0) {
                    // Fallback to localStorage
                    finalTags = savedTags;
                    console.log('✅ Using TAG categories from localStorage');
                } else {
                    // Fallback to cr_data.json
                    finalTags = projectData.tagCategories || [];
                    console.log('✅ Using TAG categories from cr_data.json');
                }

                const sanitizedCategories = finalTags.map(cat => ({
                    ...cat,
                    tags: cat.tags.map(tag => ({ ...tag, color: cat.color })),
                    selectionMode: cat.selectionMode || (cat.name === '勢力' ? 'single' : 'multiple')
                }));
                setTagCategories(sanitizedCategories);

                // Load Timeline Data
                try {
                    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    let timelineData: TimelineData = {
                        gameStartYear: 200,
                        events: [],
                        locations: [],
                        tags: [],
                    };

                    if (isLocalDev) {
                        // Try API first
                        const prefix = getApiPrefix();
                        const apiCandidates = [`${prefix}/api/timeline-data`, `/api/timeline-data`].filter((v, i, a) => a.indexOf(v) === i);
                        let loaded = false;

                        for (const apiUrl of apiCandidates) {
                            try {
                                const apiRes = await fetchJsonNoCache(apiUrl);
                                if (apiRes.ok) {
                                    timelineData = await apiRes.json();
                                    console.log(`✅ Loaded timeline data from API: ${apiUrl}`);
                                    loaded = true;
                                    break;
                                }
                            } catch {
                                // try next candidate
                            }
                        }

                        if (!loaded) {
                            // Fallback: try static file
                            const timelineResponse = await fetchJsonNoCache('./timeline_data.json');
                            if (timelineResponse.ok) {
                                timelineData = await timelineResponse.json();
                                console.log('✅ Loaded timeline_data.json (static fallback)');
                            } else {
                                console.warn('⚠️ timeline data not found, using defaults');
                            }
                        }
                    } else {
                        // Production: static only
                        const timelineResponse = await fetchJsonNoCache('./timeline_data.json');
                        if (timelineResponse.ok) {
                            timelineData = await timelineResponse.json();
                            console.log('✅ Loaded timeline_data.json successfully');
                        } else {
                            console.warn('⚠️ timeline_data.json not found, using defaults');
                        }
                    }

                    setTimelineData(timelineData);
                } catch (e) {
                    console.warn("Failed to load timeline data", e);
                }

            } catch (error) {
                console.error("Failed to load data:", error);
                const defaultData = generateDefaultData();
                setCharacters(defaultData.characters);
                setRelationships(defaultData.relationships);
                setTagCategories(defaultData.tagCategories);
                setCharacterImages(defaultData.characterImages);
                // 標記為錯誤狀態：資料來自 fallback，禁止自動儲存以防覆蓋 Supabase 真實資料
                isDataFromErrorRef.current = true;
            } finally {
                // 用 setTimeout(0) 讓旗標在 React 處理完所有狀態更新、執行完 Effect 之後才設為 true。
                // 這樣能避免「剛從 Supabase 讀進來的資料」立刻觸發自動儲存（存回完全相同的資料）。
                setTimeout(() => { isDataReadyRef.current = true; }, 0);
            }
        };

        loadData();
    }, []);

    // Check saved user code on mount
    useEffect(() => {
        const savedCode = localStorage.getItem('userCode');
        if (!savedCode) {
            setIsLoginChecked(true);
            return;
        }
        getUserByCode(savedCode)
            .then((user) => {
                if (user) setCurrentUser(user);
                else localStorage.removeItem('userCode');
            })
            .catch(() => localStorage.removeItem('userCode'))
            .finally(() => setIsLoginChecked(true));
    }, []);

    const handleLogin = (user: AppUser) => {
        setCurrentUser(user);
        localStorage.setItem('userCode', user.code);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('userCode');
    };

    // Supabase Realtime — 有人更新資料時自動重新載入
    useEffect(() => {
        if (!isDataReadyRef.current) return;

        const channel = supabase
            .channel('app_data_realtime')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'app_data',
                filter: 'key=eq.main',
            }, async () => {
                // 自己儲存觸發的通知，略過
                if (isSavingRef.current) return;
                // 正在編輯角色時不打斷，只在背景靜默更新
                const fresh = await loadAppData();
                if (!fresh) return;
                setCharacters(fresh.characters || []);
                setRelationships(fresh.relationships || []);
                setCharacterImages(fresh.characterImages || []);
                const cats = (fresh.tagCategories || []).map((cat: any) => ({
                    ...cat,
                    tags: cat.tags.map((tag: any) => ({ ...tag, color: cat.color })),
                    selectionMode: cat.selectionMode || (cat.name === '勢力' ? 'single' : 'multiple'),
                }));
                setTagCategories(cats);
                setGlossaryTerms(fresh.glossaryTerms || []);
                // 顯示 toast
                setRealtimeToast('資料已同步更新');
                setTimeout(() => setRealtimeToast(null), 3000);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isDataReadyRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

    // 使用者是否已實際修改過資料（登入或初始載入不算，只有真正改資料才設為 true）
    const hasUserEditedRef = React.useRef(false);

    // 監聽資料變化：isDataReadyRef 為 true 之後才開始記錄「使用者有修改」
    useEffect(() => {
        if (!isDataReadyRef.current) return;
        if (isDataFromErrorRef.current) return;
        hasUserEditedRef.current = true;
    }, [characters, relationships, tagCategories, characterImages, glossaryTerms, deletedRelationshipIds, deletedImageIds]); // eslint-disable-line react-hooks/exhaustive-deps

    // Save data to Supabase (single source, works in both local dev and production)
    useEffect(() => {
        if (!isDataReadyRef.current) return; // 資料尚未載入完成，不儲存
        if (isDataFromErrorRef.current) return; // 載入失敗（使用暫代資料），禁止儲存以防覆蓋真實資料
        if (!currentUser) return; // 未登入不儲存
        if (!hasUserEditedRef.current) return; // 使用者尚未實際修改資料，不儲存（避免登入/載入觸發多餘儲存）

        const saveData = async () => {
            try {
                isSavingRef.current = true;
                setSaveStatus('saving');
                setSaveError(null);

                const appData: AppData = {
                    characters,
                    relationships,
                    tagCategories,
                    characterImages,
                    glossaryTerms,
                    deletedRelationshipIds: Array.from(deletedRelationshipIds),
                    deletedImageIds: Array.from(deletedImageIds),
                };

                await saveAppData(appData);
                setSaveStatus('saved');
                setLastSavedAt(Date.now());
                // 延遲解鎖，讓 Realtime 通知先到再略過
                setTimeout(() => { isSavingRef.current = false; }, 2000);

            } catch (e: any) {
                console.error("Failed to save data", e);
                setSaveStatus('error');
                setSaveError(e?.message || String(e));
                isSavingRef.current = false;
            }
        };

        const timeoutId = setTimeout(saveData, 1000);
        return () => clearTimeout(timeoutId);

    }, [characters, relationships, tagCategories, characterImages, glossaryTerms, deletedRelationshipIds, deletedImageIds, currentUser]);

    // Save timeline data to Supabase
    useEffect(() => {
        if (!isDataReadyRef.current) return; // 資料尚未載入完成，不儲存
        if (isDataFromErrorRef.current) return; // 載入失敗，禁止儲存

        const saveTimeline = async () => {
            try {
                await saveTimelineData(timelineData);
                console.log('✅ Timeline data saved to Supabase');
            } catch (e) {
                console.error("Failed to save timeline data", e);
            }
        };

        // Debounce save
        const timeoutId = setTimeout(saveTimeline, 1000);
        return () => clearTimeout(timeoutId);
    }, [timelineData]);

    const handleSaveTimeline = (data: TimelineData) => {
        setTimelineData(data);
    };

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

    const handleCharacterClick = useCallback((character: Character) => {
        const charRels = relationships.filter(r => r.source === character.id || r.target === character.id);
        editorOpenSnapshotRef.current = {
            character: JSON.parse(JSON.stringify(character)),
            relationships: JSON.parse(JSON.stringify(charRels)),
        };
        setSelectedCharacter(character);
        setIsCharacterEditorOpen(true);
    }, [relationships]);

    const handleEditorClose = (_note?: string) => {
        if (currentUser && selectedCharacter && editorOpenSnapshotRef.current) {
            const snapshot = editorOpenSnapshotRef.current;
            // Read latest character from functional update to avoid stale closure
            setCharacters(prev => {
                const finalChar = prev.find(c => c.id === selectedCharacter.id);
                if (!finalChar) return prev;

                const changes: ModLogChange[] = [];
                const orig = snapshot.character;

                // name
                if (orig.name !== finalChar.name)
                    changes.push({ field: 'name', label: '角色名稱', before: orig.name, after: finalChar.name });

                // notes
                if ((orig.notes || '') !== (finalChar.notes || ''))
                    changes.push({ field: 'notes', label: '備註', before: orig.notes || '', after: finalChar.notes || '' });

                // 一般資料欄位
                if ((orig.characterCode || '') !== (finalChar.characterCode || ''))
                    changes.push({ field: 'characterCode', label: '角色編號', before: orig.characterCode || '', after: finalChar.characterCode || '' });
                if ((orig.birthday || '') !== (finalChar.birthday || ''))
                    changes.push({ field: 'birthday', label: '生日', before: orig.birthday || '', after: finalChar.birthday || '' });
                if ((orig.title || '') !== (finalChar.title || ''))
                    changes.push({ field: 'title', label: '稱號', before: orig.title || '', after: finalChar.title || '' });
                if ((orig.height || '') !== (finalChar.height || ''))
                    changes.push({ field: 'height', label: '身高', before: orig.height || '', after: finalChar.height || '' });
                if ((orig.weight || '') !== (finalChar.weight || ''))
                    changes.push({ field: 'weight', label: '體重', before: orig.weight || '', after: finalChar.weight || '' });
                if ((orig.bust || '') !== (finalChar.bust || ''))
                    changes.push({ field: 'bust', label: '胸圍', before: orig.bust || '', after: finalChar.bust || '' });
                if ((orig.introduction || '') !== (finalChar.introduction || ''))
                    changes.push({ field: 'introduction', label: '人物介紹', before: orig.introduction || '', after: finalChar.introduction || '' });

                // profileFields
                const oldFields = getProfileFieldsFromChar(orig);
                const newFields = getProfileFieldsFromChar(finalChar);
                const oldFieldMap = new Map(oldFields.map(f => [f.id, f]));
                const newFieldMap = new Map(newFields.map(f => [f.id, f]));
                for (const [id, nf] of newFieldMap) {
                    const of_ = oldFieldMap.get(id);
                    if (!of_) {
                        if (nf.content) changes.push({ field: `profile:${id}`, label: `${nf.label}（新增）`, before: '', after: nf.content });
                    } else if (of_.content !== nf.content || of_.label !== nf.label) {
                        changes.push({ field: `profile:${id}`, label: nf.label, before: of_.content, after: nf.content });
                    }
                }
                for (const [id, of_] of oldFieldMap) {
                    if (!newFieldMap.has(id) && of_.content)
                        changes.push({ field: `profile:${id}`, label: `${of_.label}（刪除）`, before: of_.content, after: '' });
                }

                // tagIds
                const oldTagIds = new Set(orig.tagIds || []);
                const newTagIds = new Set(finalChar.tagIds || []);
                const getTagLabel = (tagId: string) => {
                    for (const cat of tagCategories) {
                        const tag = cat.tags.find(t => t.id === tagId);
                        if (tag) return `[${cat.name}] ${tag.label}`;
                    }
                    return tagId;
                };
                const addedTags = [...newTagIds].filter(id => !oldTagIds.has(id));
                const removedTags = [...oldTagIds].filter(id => !newTagIds.has(id));
                if (addedTags.length > 0 || removedTags.length > 0)
                    changes.push({ field: 'tags', label: 'TAG', before: removedTags.map(getTagLabel).join('、'), after: addedTags.map(getTagLabel).join('、') });

                // relationships (use current relationships state via snapshot comparison)
                const finalRels = relationships.filter(r => r.source === selectedCharacter.id || r.target === selectedCharacter.id);
                const origRelMap = new Map(snapshot.relationships.map(r => [r.id, r]));
                const finalRelMap = new Map(finalRels.map(r => [r.id, r]));
                const formatRel = (r: Relationship) => {
                    const otherId = r.source === selectedCharacter.id ? r.target : r.source;
                    const otherName = prev.find(c => c.id === otherId)?.name || '?';
                    const desc = (r.description || '').trim();
                    return desc ? `${otherName}：${r.label}\n  └ ${desc}` : `${otherName}：${r.label}`;
                };
                const addedRels = finalRels.filter(r => !origRelMap.has(r.id));
                const removedRels = snapshot.relationships.filter(r => !finalRelMap.has(r.id));
                const changedRels = finalRels.filter(r => {
                    const o = origRelMap.get(r.id);
                    return o && (o.label !== r.label || (o.description || '') !== (r.description || ''));
                });
                if (addedRels.length > 0 || removedRels.length > 0 || changedRels.length > 0) {
                    const before = [...removedRels.map(r => formatRel(r)), ...changedRels.map(r => formatRel(origRelMap.get(r.id)!))].filter(Boolean).join('\n');
                    const after = [...addedRels.map(formatRel), ...changedRels.map(formatRel)].filter(Boolean).join('\n');
                    changes.push({ field: 'relationships', label: '關係', before, after });
                }

                if (changes.length > 0) {
                    const now = Date.now();
                    const MERGE_WINDOW_MS = 10 * 60 * 1000; // 10 分鐘
                    const existingLog = finalChar.modLog || [];
                    const lastEntry = existingLog[existingLog.length - 1];
                    const canMerge = lastEntry
                        && lastEntry.by === currentUser.name
                        && (now - lastEntry.at) < MERGE_WINDOW_MS;

                    let newModLog: typeof existingLog;
                    if (canMerge && lastEntry.changes) {
                        const changeMap = new Map(lastEntry.changes.map(ch => [ch.field, { ...ch }]));
                        for (const ch of changes) {
                            const existing = changeMap.get(ch.field);
                            if (existing) {
                                existing.after = ch.after; // 保留最早 before，更新 after
                            } else {
                                changeMap.set(ch.field, { ...ch });
                            }
                        }
                        newModLog = [...existingLog.slice(0, -1), { ...lastEntry, at: now, changes: Array.from(changeMap.values()) }];
                    } else {
                        const logEntry = { at: now, by: currentUser.name, changes };
                        newModLog = [...existingLog, logEntry];
                    }

                    return prev.map(c => c.id === selectedCharacter.id
                        ? { ...c, modLog: newModLog }
                        : c
                    );
                }
                return prev;
            });
        }
        editorOpenSnapshotRef.current = null;
        setIsCharacterEditorOpen(false);
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

    const handleExportAll = () => {
        const now = new Date().toISOString().slice(0, 10);
        downloadJson({
            characters,
            relationships,
            characterImages,
            tagCategories,
            glossaryTerms,
            timelineData,
            deletedRelationshipIds: Array.from(deletedRelationshipIds),
        }, `cr-backup-${now}.json`);
    };

    const handleImportAll = (data: Partial<AppData> & { deletedRelationshipIds?: string[]; timelineData?: TimelineData }) => {
        let imported = 0;
        if (data.characters) { setCharacters(data.characters); imported++; }
        if (data.relationships) { setRelationships(data.relationships); imported++; }
        if (data.characterImages) { setCharacterImages(data.characterImages); imported++; }
        if (data.tagCategories) {
            setTagCategories(data.tagCategories.map((cat: TagCategory) => ({
                ...cat,
                selectionMode: cat.selectionMode || 'multiple',
            })));
            imported++;
        }
        if (data.glossaryTerms) { setGlossaryTerms(data.glossaryTerms); imported++; }
        if (data.timelineData) { setTimelineData(data.timelineData); imported++; }
        if (data.deletedRelationshipIds) {
            setDeletedRelationshipIds(new Set(data.deletedRelationshipIds));
        }

        if (imported > 0) {
            alert(`✅ 匯入成功！共還原 ${imported} 個資料區塊。`);
        } else {
            alert('匯入失敗：檔案格式不正確或不含可識別的資料。');
        }
    };

    const handleClearAllData = () => {
        setCharacters([]);
        setRelationships([]);
        setTagCategories([]);
        setCharacterImages([]);
        setGlossaryTerms([]);
    };

    const handleSaveGlossaryTerm = (term: GlossaryTerm) => {
        setGlossaryTerms(prev => {
            const idx = prev.findIndex(t => t.id === term.id);
            const next = idx >= 0 ? prev.map((t, i) => i === idx ? term : t) : [...prev, term];
            return next;
        });
    };

    const handleDeleteGlossaryTerm = (termId: string) => {
        setGlossaryTerms(prev => prev.filter(t => t.id !== termId));
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
            case 'timeline':
                return <TimelineView
                    timelineData={timelineData}
                    onUpdateTimeline={handleSaveTimeline}
                    characters={characters}
                    allTags={allTags}
                    onCharacterClick={handleCharacterClick}
                />;
            case 'glossary':
                return <GlossaryView
                    glossaryTerms={glossaryTerms}
                    onSaveTerm={handleSaveGlossaryTerm}
                    onDeleteTerm={handleDeleteGlossaryTerm}
                    characters={characters}
                    timelineEvents={timelineData.events || []}
                    onCharacterClick={handleCharacterClick}
                    currentUser={currentUser}
                />;
            case 'settings':
                return <SettingsView
                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                    onExportAll={handleExportAll}
                    onImportAll={handleImportAll}
                    onReset={handleClearAllData}
                    currentUser={currentUser}
                    onLogout={handleLogout}
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

            {/* Realtime sync toast */}
            {realtimeToast && (
                <div className="fixed bottom-14 right-3 z-50 flex items-center gap-2 rounded-md border border-blue-500/50 bg-blue-900/80 px-3 py-2 text-xs text-blue-200 backdrop-blur shadow-lg animate-fadeIn">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    {realtimeToast}
                </div>
            )}

            {/* Save Status HUD - 兩個格子 */}
            <div className="fixed bottom-3 right-3 z-50 flex gap-2">
                <div className="rounded-md border border-gray-700 bg-gray-950/80 px-3 py-2 text-xs text-gray-200 backdrop-blur min-w-[4rem] text-center">
                    {currentUser?.name || '—'}
                </div>
                <div className="rounded-md border border-gray-700 bg-gray-950/80 px-3 py-2 text-xs text-gray-200 backdrop-blur">
                    {isDataFromErrorRef.current && <div className="text-red-400 font-bold">⚠️ 資料載入失敗（顯示暫代資料），儲存已停用，請重新整理</div>}
                    {!isDataFromErrorRef.current && saveStatus === 'saving' && <div>儲存中…</div>}
                    {!isDataFromErrorRef.current && saveStatus === 'saved' && (
                        <div>已儲存{lastSavedAt ? `（${new Date(lastSavedAt).toLocaleTimeString()}）` : ''}</div>
                    )}
                    {!isDataFromErrorRef.current && saveStatus === 'readonly' && <div>雲端模式：唯讀</div>}
                    {!isDataFromErrorRef.current && saveStatus === 'error' && <div className="text-red-300">儲存失敗：{saveError || '未知錯誤'}</div>}
                    {!isDataFromErrorRef.current && saveStatus === 'idle' && <div className="text-gray-400">未變更</div>}
                </div>
            </div>

            {!currentUser && isLoginChecked && (
                <UserLoginModal onLogin={handleLogin} />
            )}

            {isCharacterEditorOpen && selectedCharacter && (
                <CharacterEditorModal
                    isOpen={isCharacterEditorOpen}
                    onClose={handleEditorClose}
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
                    currentUser={currentUser}
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