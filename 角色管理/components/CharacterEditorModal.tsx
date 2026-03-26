import React, { useState, useEffect, useMemo, useRef } from 'react';

function parseBirthday(birthday: string): { month: number; day: number } | null {
  if (!birthday) return null;
  let month = 0, day = 0;

  // MM/DD 或 MM-DD
  const slashMatch = birthday.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (slashMatch) { month = parseInt(slashMatch[1]); day = parseInt(slashMatch[2]); }

  // M月D日（含中文格式）
  if (!month) {
    const chMatch = birthday.match(/^(\d{1,2})月(\d{1,2})日?$/);
    if (chMatch) { month = parseInt(chMatch[1]); day = parseInt(chMatch[2]); }
  }

  // 純數字：MMDD（4位）或 MDD（3位）
  if (!month) {
    const digits = birthday.replace(/\D/g, '');
    if (digits.length === 4) { month = parseInt(digits.slice(0, 2)); day = parseInt(digits.slice(2)); }
    else if (digits.length === 3) { month = parseInt(digits.slice(0, 1)); day = parseInt(digits.slice(1)); }
  }

  if (!month || !day || month > 12 || day > 31) return null;
  return { month, day };
}

const ZODIAC_DATA: { name: string; symbol: string }[] = [
  { name: '摩羯座', symbol: '♑' }, { name: '水瓶座', symbol: '♒' },
  { name: '雙魚座', symbol: '♓' }, { name: '牡羊座', symbol: '♈' },
  { name: '金牛座', symbol: '♉' }, { name: '雙子座', symbol: '♊' },
  { name: '巨蟹座', symbol: '♋' }, { name: '獅子座', symbol: '♌' },
  { name: '處女座', symbol: '♍' }, { name: '天秤座', symbol: '♎' },
  { name: '天蠍座', symbol: '♏' }, { name: '射手座', symbol: '♐' },
];

function getZodiacName(birthday: string): string {
  const p = parseBirthday(birthday);
  if (!p) return '';
  const { month, day } = p;
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '雙魚座';
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '牡羊座';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '雙子座';
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '獅子座';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '處女座';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蠍座';
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
  return '';
}

function getZodiacDisplay(birthday: string): string {
  const name = getZodiacName(birthday);
  if (!name) return '';
  const found = ZODIAC_DATA.find(z => z.name === name);
  return found ? `${found.name} ${found.symbol}` : name;
}
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

function prepareMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  const isHeading = (s: string) => /^#{1,6}(\s|$)/.test(s.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] ?? '';
    const prevResult = result[result.length - 1] ?? '';
    const empty = line.trim() === '';
    const heading = isHeading(line);
    const nextHeading = isHeading(nextLine);
    const nextEmpty = nextLine.trim() === '';

    if (heading && prevResult.trim() !== '' && result.length > 0) {
      result.push('');
    }

    // 連續空白行：插入一個只有空格的行讓 Markdown 保留間距
    if (empty && prevResult.trim() === '' && result.length > 0) {
      result.push('&nbsp;');
      continue;
    }

    result.push(line);

    if (heading && !nextEmpty) {
      result.push('');
      continue;
    }

    if (!empty && !heading && !nextHeading && !line.endsWith('  ')) {
      result[result.length - 1] = line + '  ';
    }
  }

  return result.join('\n');
}
import type { Character, Relationship, TagCategory, CharacterImage, TagWithColor, Tag, ProfileField, ModLogChange, AppUser } from '../types';
import { computeLineDiff } from '../utils/diffLine';
import { CloseIcon, TrashIcon, UsersIcon, ImageIcon, TagsIcon, PlusIcon, EditIcon, ChevronDownIcon, SettingsIcon } from './Icons';
import TagSelectorModal from './TagSelectorModal';
import ImageCropperModal from './ImageCropperModal';
import { uploadCharacterImage, uploadAvatarFromBase64 } from '../services/supabaseService';

interface CharacterEditorModalProps {
  isOpen: boolean;
  onClose: (note?: string) => void;
  character: Character;
  onSave: (character: Character) => void;
  onDelete: (characterId: string) => void;
  tagCategories: TagCategory[];
  allCharacters: Character[];
  allRelationships: Relationship[];
  onUpdateRelationships: (updater: React.SetStateAction<Relationship[]>) => void;
  characterImages: CharacterImage[];
  onUpdateCharacterImages: (updater: React.SetStateAction<CharacterImage[]>) => void;
  onAddTagToCategory: (label: string, categoryName: string) => Tag | null;
  currentUser?: AppUser | null;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'readonly' | 'error';
  lastSavedAt?: number | null;
}

type EditorTab = 'details' | 'relationships' | 'profile' | 'images' | 'changelog';
type RelationshipDirection = 'to' | 'from' | 'both' | 'none';
type RelationshipItem = {
  id: string;
  otherCharacterName: string;
  label: string;
  description?: string;
  direction: 'outgoing' | 'incoming';
  arrowStyle: string;
  originalRel: Relationship;
};

type DisplayRelationship = {
  id: string;
  otherCharacterName: string;
  label: string;
  description?: string;
  direction: 'outgoing' | 'incoming' | 'bidirectional' | 'none';
  relIds: string[];
};

/**
 * Resizes an image from a data URL to a maximum size, maintaining aspect ratio.
 * @param imageDataUrl The base64 data URL of the image.
 * @param maxSize The maximum width or height of the resized image.
 * @returns A Promise that resolves with the data URL of the resized image (JPEG format).
 */
const resizeImage = (imageDataUrl: string, maxSize: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;

      if (width === 0 || height === 0) {
        reject(new Error("Image has zero dimensions."));
        return;
      }

      let newWidth = width;
      let newHeight = height;

      if (width > height) {
        if (width > maxSize) {
          newHeight = Math.round(height * (maxSize / width));
          newWidth = maxSize;
        }
      } else {
        if (height > maxSize) {
          newWidth = Math.round(width * (maxSize / height));
          newHeight = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context."));
        return;
      }
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // WebP supports transparency (PNG alpha) and has better compression than JPEG.
      resolve(canvas.toDataURL('image/webp', 0.92));
    };
    img.onerror = (err) => {
      reject(new Error(`Image failed to load: ${err}`));
    };
    img.src = imageDataUrl;
  });
};

// Helper to resolve image paths with base URL (Vite base is not always '/')
const resolveImagePath = (imagePath: string | undefined): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${imagePath}`.replace(/\/+/g, '/');
};


const CharacterEditorModal: React.FC<CharacterEditorModalProps> = ({
  isOpen,
  onClose,
  character,
  onSave,
  onDelete,
  tagCategories,
  allCharacters,
  allRelationships,
  onUpdateRelationships,
  characterImages,
  onUpdateCharacterImages,
  onAddTagToCategory,
  currentUser,
  saveStatus,
  lastSavedAt,
}) => {
  const [editedCharacter, setEditedCharacter] = useState<Character>(character);
  const [activeTab, setActiveTab] = useState<EditorTab>('details');
  const [expandedLogIndices, setExpandedLogIndices] = useState<Set<number>>(new Set());
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  const isAdmin = currentUser?.code === '01069';

  // Close 時先確保最新的 editedCharacter 有存進去，再呼叫 onClose
  const handleClose = () => {
    onSave(editedCharacter);
    onClose();
  };

  // Save a note edit for a specific log entry (display index = reversed)
  const handleSaveNoteForEntry = (displayIndex: number) => {
    const modLog = [...(editedCharacter.modLog || [])];
    const realIndex = modLog.length - 1 - displayIndex;
    modLog[realIndex] = { ...modLog[realIndex], note: editingNoteText.trim() || undefined };
    const updated = { ...editedCharacter, modLog };
    setEditedCharacter(updated);
    onSave(updated);
    setEditingNoteIndex(null);
    setEditingNoteText('');
  };

  // Admin: delete a specific log entry
  const handleDeleteLogEntry = (displayIndex: number) => {
    const modLog = [...(editedCharacter.modLog || [])];
    const realIndex = modLog.length - 1 - displayIndex;
    modLog.splice(realIndex, 1);
    const updated = { ...editedCharacter, modLog };
    setEditedCharacter(updated);
    onSave(updated);
  };
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingImageTagsFor, setEditingImageTagsFor] = useState<CharacterImage | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [profileEditMode, setProfileEditMode] = useState(false);

  // Derived profile fields — migrates old fixed-key profile to dynamic array on first access
  const profileFields = useMemo<ProfileField[]>(() => {
    if (editedCharacter.profileFields && editedCharacter.profileFields.length > 0) {
      return editedCharacter.profileFields;
    }
    const old = editedCharacter.profile || {};
    return [
      { id: 'appearance', label: '外觀設定', content: old.appearance || '' },
      { id: 'personality', label: '性格特徵', content: old.personality || '' },
      { id: 'background', label: '背景故事', content: old.background || '' },
      { id: 'specialty', label: '專長與興趣', content: old.specialty || '' },
      { id: 'quote', label: '語氣示例', content: old.quote || '' },
    ];
  }, [editedCharacter]);

  const saveProfileFields = (fields: ProfileField[]) => {
    const next = { ...editedCharacter, profileFields: fields };
    setEditedCharacter(next);
    onSave(next);
  };

  const updateProfileField = (idx: number, patch: Partial<ProfileField>) => {
    const next = profileFields.map((f, i) => i === idx ? { ...f, ...patch } : f);
    saveProfileFields(next);
  };

  const addProfileField = () => {
    const next = [...profileFields, { id: uuidv4(), label: '新欄位', content: '' }];
    saveProfileFields(next);
  };

  const deleteProfileField = (idx: number) => {
    const next = profileFields.filter((_, i) => i !== idx);
    saveProfileFields(next);
  };

  const moveProfileField = (idx: number, dir: -1 | 1) => {
    const next = [...profileFields];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    saveProfileFields(next);
  };

  // Relationship form state
  const [newRelTarget, setNewRelTarget] = useState('');
  const [newRelLabel, setNewRelLabel] = useState('');
  const [newRelDescription, setNewRelDescription] = useState('');
  const [newRelDirection, setNewRelDirection] = useState<RelationshipDirection>('to');
  const [searchTargetName, setSearchTargetName] = useState('');
  const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
  const [editingRelId, setEditingRelId] = useState<string | null>(null);
  const [expandedRelIds, setExpandedRelIds] = useState<Set<string>>(new Set());
  const [idsToEdit, setIdsToEdit] = useState<string[]>([]);
  const [relTab, setRelTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const targetInputRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setEditedCharacter(character);
    setConfirmingDelete(false); // Reset confirmation on character change or modal open
    // Reset form state when character changes
    setNewRelTarget('');
    setNewRelLabel('');
    setNewRelDescription('');
    setNewRelDirection('to');
    setSearchTargetName('');
    setEditingRelId(null);
    setExpandedRelIds(new Set());
    setIdsToEdit([]);
    setRelTab('outgoing');
  }, [character, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (targetInputRef.current && !targetInputRef.current.contains(event.target as Node)) {
        setIsTargetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const allTags = useMemo((): TagWithColor[] => tagCategories.flatMap(category =>
    category.tags.map(tag => ({ ...tag, color: category.color }))
  ), [tagCategories]);

  const characterTags = useMemo(() => allTags.filter(tag => editedCharacter.tagIds.includes(tag.id)), [allTags, editedCharacter.tagIds]);
  const currentCharacterImages = useMemo(() => characterImages.filter(img => img.characterId === character.id), [characterImages, character.id]);

  const codeError = useMemo(() => {
    const code = (editedCharacter.characterCode || '').trim().toLowerCase();
    if (!code) return null;
    const duplicate = allCharacters.find(
      c => c.id !== editedCharacter.id && (c.characterCode || '').toLowerCase() === code
    );
    return duplicate ? `編號已被「${duplicate.name}」使用` : null;
  }, [editedCharacter.characterCode, editedCharacter.id, allCharacters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let updatedChar = { ...editedCharacter, [name]: value };

    // 生日變更時自動套用星座 TAG
    if (name === 'birthday') {
      const zodiacCat = tagCategories.find(c => c.name === '星座');
      if (zodiacCat) {
        const zodiacTagIds = new Set(zodiacCat.tags.map(t => t.id));
        // 移除舊星座 TAG
        let newTagIds = updatedChar.tagIds.filter(id => !zodiacTagIds.has(id));
        // 加入新星座 TAG
        const zodiacName = getZodiacName(value);
        if (zodiacName) {
          const match = zodiacCat.tags.find(t => t.label === zodiacName);
          if (match) newTagIds = [...newTagIds, match.id];
        }
        updatedChar = { ...updatedChar, tagIds: newTagIds };
      }
    }

    setEditedCharacter(updatedChar);
    onSave(updatedChar); // Auto-save on change
  };

  const handleSaveCharacterTags = (newTagIds: string[]) => {
    const updatedChar = { ...editedCharacter, tagIds: newTagIds };
    setEditedCharacter(updatedChar);
    onSave(updatedChar);
  };

  const handleDelete = () => {
    if (confirmingDelete) {
      onDelete(character.id);
    } else {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 3000); // Reset after 3 seconds
    }
  };

  // --- Relationship Logic ---
  const { outgoingList, incomingList } = useMemo(() => {
    const outgoing: RelationshipItem[] = [];
    const incoming: RelationshipItem[] = [];

    allRelationships.forEach(rel => {
      if (rel.source === character.id) {
        const otherChar = allCharacters.find(c => c.id === rel.target);
        if (otherChar) {
          outgoing.push({
            id: rel.id,
            otherCharacterName: otherChar.name,
            label: rel.label,
            description: rel.description,
            direction: 'outgoing',
            arrowStyle: rel.arrowStyle,
            originalRel: rel
          });
        }
      } else if (rel.target === character.id) {
        const otherChar = allCharacters.find(c => c.id === rel.source);
        if (otherChar) {
          incoming.push({
            id: rel.id,
            otherCharacterName: otherChar.name,
            label: rel.label,
            description: rel.description,
            direction: 'incoming',
            arrowStyle: rel.arrowStyle,
            originalRel: rel
          });
        }
      }
    });

    return { outgoingList: outgoing, incomingList: incoming };
  }, [allRelationships, character.id, allCharacters]);

  const [relFormError, setRelFormError] = useState('');

  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    const targetChar = allCharacters.find(c => c.id === newRelTarget);

    if (!newRelTarget || !targetChar) {
      setRelFormError('請從下拉選單選擇目標角色');
      return;
    }
    if (!newRelLabel.trim()) {
      setRelFormError('請填寫關係標籤');
      return;
    }
    setRelFormError('');

    if (targetChar && newRelLabel) {
      onUpdateRelationships(prev => {
        const arrowStyle = (newRelDirection === 'to' || newRelDirection === 'from' || newRelDirection === 'both') ? 'arrow' : 'none';

        const newRels: Relationship[] = [];
        const relOutgoing: Relationship = {
          id: uuidv4(),
          source: character.id,
          target: targetChar.id,
          label: newRelLabel,
          description: newRelDescription,
          arrowStyle: arrowStyle,
        };
        const relIncoming: Relationship = {
          id: uuidv4(),
          source: targetChar.id,
          target: character.id,
          label: newRelLabel,
          description: newRelDescription,
          arrowStyle: arrowStyle,
        };

        if (newRelDirection === 'to') {
          newRels.push(relOutgoing);
        } else if (newRelDirection === 'from') {
          newRels.push(relIncoming);
        } else if (newRelDirection === 'both' || newRelDirection === 'none') {
          newRels.push(relOutgoing, relIncoming);
        }

        if (editingRelId) {
          // If editing, we remove the specific relationship that was being edited.
          // If it was part of a "both" creation previously, we only edit the one we clicked on?
          // Or do we replace the single relationship with the new configuration?
          // The user might change direction from "to" to "both".
          // If we change to "both", we add two relationships.
          // We should remove the `idsToEdit` (which should contain the ID of the relationship being edited).
          return [...prev.filter(r => !idsToEdit.includes(r.id)), ...newRels];
        }

        return [...prev, ...newRels];
      });

      setNewRelTarget('');
      setNewRelLabel('');
      setNewRelDescription('');
      setSearchTargetName('');
      setNewRelDirection('to');
      setEditingRelId(null);
      setIdsToEdit([]);
    }
  };

  const handleEditRelationship = (item: RelationshipItem) => {
    setNewRelTarget(allCharacters.find(c => c.name === item.otherCharacterName)?.id || '');
    setSearchTargetName(item.otherCharacterName);
    setNewRelLabel(item.label);
    setNewRelDescription(item.description || '');

    // Set direction based on the list we are in
    if (item.direction === 'outgoing') {
      setNewRelDirection('to');
    } else {
      setNewRelDirection('from');
    }

    setEditingRelId(item.id);
    setIdsToEdit([item.id]);

    // Scroll to form
    targetInputRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewRelTarget('');
    setNewRelLabel('');
    setNewRelDescription('');
    setSearchTargetName('');
    setNewRelDirection('to');
    setEditingRelId(null);
    setIdsToEdit([]);
  };

  const toggleDescription = (id: string) => {
    setExpandedRelIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleDeleteRelationship = (idToDelete: string) => {
    if (window.confirm('確定要刪除這條關係嗎？')) {
      onUpdateRelationships(prev => prev.filter(r => r.id !== idToDelete));
    }
  };

  const filteredTargetCharacters = useMemo(() => {
    const potentialTargets = allCharacters.filter(c => c.id !== character.id);
    if (!searchTargetName) {
      return potentialTargets;
    }
    return potentialTargets.filter(c =>
      c.name.toLowerCase().includes(searchTargetName.toLowerCase())
    );
  }, [allCharacters, character.id, searchTargetName]);

  // --- Image Logic ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    // Clear input to allow re-uploading the same file
    e.target.value = '';

    try {
      // 上傳至 Supabase Storage（自動壓縮成 800px / 150KB）
      const { imageUrl, thumbnailUrl } = await uploadCharacterImage(file, character.id);

      const newImage: CharacterImage = {
        id: uuidv4(),
        characterId: character.id,
        imageDataUrl: imageUrl,
        thumbnailUrl: thumbnailUrl,
        tagIds: [],
        notes: '',
      };
      onUpdateCharacterImages(prev => [...prev, newImage]);

      // 如果角色尚無頭像，開啟裁切器（使用原始 File 轉 DataURL 供裁切預覽）
      setEditedCharacter(currentChar => {
        if (!currentChar.image) {
          const reader = new FileReader();
          reader.onload = () => setImageToCrop(reader.result as string);
          reader.readAsDataURL(file);
        }
        return currentChar;
      });
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert(`上傳圖片時發生錯誤: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCropComplete = async (croppedImageDataUrl: string) => {
    setImageToCrop(null); // 關閉裁切器
    try {
      // 將裁切後的 base64 上傳到 Supabase Storage
      const avatarUrl = await uploadAvatarFromBase64(croppedImageDataUrl, character.id);
      const updatedChar = { ...editedCharacter, image: avatarUrl };
      setEditedCharacter(updatedChar);
      onSave(updatedChar);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      // 上傳失敗時 fallback：直接存 base64（不推薦，但保留穩定性）
      const updatedChar = { ...editedCharacter, image: croppedImageDataUrl };
      setEditedCharacter(updatedChar);
      onSave(updatedChar);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    // If the deleted image is the current avatar, we may need to clear it or set a new one.
    // We use the updater function to ensure we're comparing against the latest character state.
    setEditedCharacter(currentChar => {
      let updatedChar = currentChar;
      const imageToDelete = characterImages.find(img => img.id === imageId); // Find from prop for comparison

      if (imageToDelete && imageToDelete.imageDataUrl === currentChar.image) {
        const otherImages = characterImages.filter(img => img.characterId === character.id && img.id !== imageId);
        const newAvatar = otherImages.length > 0 ? otherImages[0].imageDataUrl : undefined;
        updatedChar = { ...currentChar, image: newAvatar };
        onSave(updatedChar);
      }
      return updatedChar;
    });

    // Use updater function to safely remove the image from the global state.
    onUpdateCharacterImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSetAsAvatar = (imageDataUrl: string) => {
    // Open the cropper with the selected gallery image
    setImageToCrop(imageDataUrl);
  }

  const handleSaveImageTags = (newTagIds: string[]) => {
    if (!editingImageTagsFor) return;
    const imageToUpdateId = editingImageTagsFor.id;

    onUpdateCharacterImages(prev =>
      prev.map(img =>
        img.id === imageToUpdateId
          ? { ...img, tagIds: newTagIds }
          : img
      )
    );
    setEditingImageTagsFor(null);
  };


  if (!isOpen) return null;

  const currentList = relTab === 'outgoing' ? outgoingList : incomingList;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={handleClose}>
        <div
          className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-48 bg-gray-900/50 p-4 flex flex-col border-r border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden relative group">
                <img
                  src={resolveImagePath(editedCharacter.image) || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(editedCharacter.name)}`}
                  alt={editedCharacter.name}
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{
                    objectPosition: editedCharacter.avatarPosition ? `${editedCharacter.avatarPosition.x}% ${editedCharacter.avatarPosition.y}%` : 'center'
                  }}
                />
                <button
                  onClick={() => {
                    // Cycle focus: Center -> Top -> Bottom -> Left -> Right
                    const current = editedCharacter.avatarPosition;
                    let next = { x: 50, y: 50 };
                    if (!current || (current.x === 50 && current.y === 50)) next = { x: 50, y: 0 }; // Top
                    else if (current.x === 50 && current.y === 0) next = { x: 50, y: 100 }; // Bottom
                    else if (current.x === 50 && current.y === 100) next = { x: 0, y: 0 }; // Top Left
                    else if (current.x === 0 && current.y === 0) next = { x: 100, y: 0 }; // Top Right
                    else if (current.x === 100 && current.y === 0) next = { x: 50, y: 50 }; // Back to Center

                    const updated = { ...editedCharacter, avatarPosition: next };
                    setEditedCharacter(updated);
                    onSave(updated);
                  }}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-bold transition-opacity"
                  title="點擊調整焦點 (中->上->下...)"
                >
                  調整
                </button>
              </div>
              <h2 className="text-xl font-bold text-indigo-400 break-words">{editedCharacter.name}</h2>
            </div>

            <nav className="space-y-2">
              <button onClick={() => setActiveTab('details')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${activeTab === 'details' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                <UsersIcon className="w-5 h-5" /> 一般資料
              </button>
              <button onClick={() => setActiveTab('relationships')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${activeTab === 'relationships' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                <UsersIcon className="w-5 h-5" /> 關係
              </button>
              <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${activeTab === 'profile' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                <SettingsIcon className="w-5 h-5" /> 設定
              </button>
              <button onClick={() => setActiveTab('images')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${activeTab === 'images' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                <ImageIcon className="w-5 h-5" /> 圖片
              </button>
              <button onClick={() => setActiveTab('changelog')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${activeTab === 'changelog' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}>
                <EditIcon className="w-5 h-5" />
                修改紀錄
                {editedCharacter.modLog && editedCharacter.modLog.length > 0 && (
                  <span className="ml-auto text-xs bg-indigo-800 rounded-full px-1.5 py-0.5">{editedCharacter.modLog.length}</span>
                )}
              </button>
            </nav>

            <div className="flex-grow"></div>

            {/* 儲存狀態 */}
            <div className="mb-2 px-1 flex items-center gap-1.5 text-xs">
              {saveStatus === 'saving' && (
                <><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
                <span className="text-yellow-300">儲存中…</span></>
              )}
              {saveStatus === 'saved' && (
                <><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                <span className="text-green-400">已儲存{lastSavedAt ? `  ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}</span></>
              )}
              {saveStatus === 'error' && (
                <><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="text-red-400">儲存失敗</span></>
              )}
              {(saveStatus === 'idle' || !saveStatus) && (
                <span className="text-gray-600">自動儲存</span>
              )}
            </div>

            <button
              onClick={handleDelete}
              className={`w-full flex items-center justify-center gap-3 px-3 py-2 rounded-md text-left transition-colors duration-200 ${confirmingDelete
                ? 'bg-red-600 text-white'
                : 'text-red-400 hover:bg-red-900/50'
                }`}
            >
              {confirmingDelete ? '確定刪除？' : <><TrashIcon className="w-5 h-5" /> 刪除角色</>}
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
              <CloseIcon className="w-6 h-6" />
            </button>

            {activeTab === 'details' && (
              <div className="space-y-5">
                {/* Row 1: 名稱 + 角色編號 */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">名稱</label>
                    <input type="text" id="name" name="name" value={editedCharacter.name} onChange={handleChange} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="w-36 flex-shrink-0">
                    <label htmlFor="characterCode" className="block text-sm font-medium text-gray-300 mb-1">角色編號</label>
                    <input
                      type="text"
                      id="characterCode"
                      name="characterCode"
                      value={editedCharacter.characterCode || ''}
                      onChange={handleChange}
                      placeholder="cr031"
                      className={`w-full p-2 bg-gray-900 border rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm ${
                        codeError ? 'border-red-500 focus:ring-red-500' : 'border-gray-600'
                      }`}
                    />
                    {codeError && <p className="text-xs text-red-400 mt-1 leading-tight">{codeError}</p>}
                  </div>
                </div>

                {/* Row 2: 生日 + 星座（自動）+ 稱號 */}
                <div className="flex gap-3 flex-wrap">
                  <div className="w-28 flex-shrink-0">
                    <label htmlFor="birthday" className="block text-sm font-medium text-gray-300 mb-1">生日</label>
                    <input
                      type="text"
                      id="birthday"
                      name="birthday"
                      value={editedCharacter.birthday || ''}
                      onChange={handleChange}
                      placeholder="04/15 或 0415"
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-gray-700"
                    />
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <label className="block text-sm font-medium text-gray-300 mb-1">星座</label>
                    {getZodiacDisplay(editedCharacter.birthday || '') ? (
                      <div className="w-full p-2 text-sm text-indigo-300 font-medium min-h-[38px] flex items-center gap-1">
                        {getZodiacDisplay(editedCharacter.birthday || '')}
                      </div>
                    ) : (
                      <div className="w-full p-2 text-xs text-gray-600 min-h-[38px] flex items-center">
                        由生日自動計算
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">稱號</label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={editedCharacter.title || ''}
                      onChange={handleChange}
                      placeholder="黑夜女王"
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-gray-700"
                    />
                  </div>
                </div>

                {/* Row 3: 實際年齡 + 身高 + 體重 + 胸圍 */}
                <div className="flex gap-3 flex-wrap">
                  <div className="w-24 flex-shrink-0">
                    <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-1">實際年齡</label>
                    <input
                      type="text"
                      id="age"
                      name="age"
                      value={editedCharacter.age || ''}
                      onChange={handleChange}
                      placeholder="25歲"
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-gray-700"
                    />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <label htmlFor="height" className="block text-sm font-medium text-gray-300 mb-1">身高</label>
                    <input
                      type="text"
                      id="height"
                      name="height"
                      value={editedCharacter.height || ''}
                      onChange={handleChange}
                      placeholder="175cm"
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-gray-700"
                    />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-300 mb-1">體重</label>
                    <input
                      type="text"
                      id="weight"
                      name="weight"
                      value={editedCharacter.weight || ''}
                      onChange={handleChange}
                      placeholder="55kg"
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-gray-700"
                    />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <label htmlFor="bust" className="block text-sm font-medium text-gray-300 mb-1">胸圍</label>
                    <input
                      type="text"
                      id="bust"
                      name="bust"
                      value={editedCharacter.bust || ''}
                      onChange={handleChange}
                      placeholder="88cm"
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-gray-700"
                    />
                  </div>
                </div>

                {/* Row 4: 人物介紹 */}
                <div>
                  <label htmlFor="introduction" className="block text-sm font-medium text-gray-300 mb-1">人物介紹</label>
                  <input
                    type="text"
                    id="introduction"
                    name="introduction"
                    value={editedCharacter.introduction || ''}
                    onChange={handleChange}
                    placeholder="操縱黑暗波動，對閨蜜忠誠的賭場兔女郎"
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-gray-700"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">筆記</label>
                  <textarea id="notes" name="notes" value={editedCharacter.notes} onChange={handleChange} rows={8} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-300 mb-1">Tags</h3>
                    <button onClick={() => setIsTagSelectorOpen(true)} className="text-indigo-400 hover:underline text-sm font-medium flex items-center gap-1">
                      <TagsIcon className="w-4 h-4" /> 編輯
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {characterTags.length > 0 ? characterTags.map(tag => (
                      <span key={tag.id} className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: tag.color, color: '#fff' }}>
                        {tag.label}
                      </span>
                    )) : <p className="text-sm text-gray-500">尚未新增 Tag</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="animate-fadeIn">
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-semibold text-gray-200">角色設定</h3>
                  {profileEditMode ? (
                    <button
                      onClick={() => setProfileEditMode(false)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
                    >
                      ✓ 完成
                    </button>
                  ) : (
                    <button
                      onClick={() => setProfileEditMode(true)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium text-gray-200 flex items-center gap-1.5"
                    >
                      ✏️ 編輯
                    </button>
                  )}
                </div>

                {profileEditMode ? (
                  /* ── EDIT MODE ── */
                  <div className="space-y-5">
                    {profileFields.map((field, idx) => (
                      <div key={field.id} className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                        {/* Field label row */}
                        <div className="flex items-center gap-2 mb-3">
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateProfileField(idx, { label: e.target.value })}
                            className="flex-1 px-2 py-1 bg-gray-700 text-white border border-gray-600 rounded text-sm font-semibold focus:border-indigo-500 outline-none"
                          />
                          <button
                            onClick={() => moveProfileField(idx, -1)}
                            disabled={idx === 0}
                            title="上移"
                            className="px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                          >▲</button>
                          <button
                            onClick={() => moveProfileField(idx, 1)}
                            disabled={idx === profileFields.length - 1}
                            title="下移"
                            className="px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                          >▼</button>
                          <button
                            onClick={() => deleteProfileField(idx)}
                            title="刪除欄位"
                            className="px-2 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-900/30 text-xs"
                          >✕</button>
                        </div>
                        {/* Textarea */}
                        <textarea
                          value={field.content}
                          onChange={(e) => updateProfileField(idx, { content: e.target.value })}
                          placeholder={`${field.label}內容（支援 Markdown）`}
                          className="w-full px-3 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-mono resize-y min-h-[180px]"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addProfileField}
                      className="w-full py-2 rounded-lg border-2 border-dashed border-gray-600 hover:border-indigo-500 text-gray-400 hover:text-indigo-400 text-sm transition-colors"
                    >
                      ＋ 新增欄位
                    </button>
                  </div>
                ) : (
                  /* ── VIEW MODE ── */
                  <div className="divide-y divide-gray-700/60">
                    {profileFields.map((field) => (
                      <div key={field.id} className="py-5 first:pt-0">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">{field.label}</h4>
                        {field.content ? (
                          <div className="text-gray-200 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_em]:italic [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-3 [&_li]:mb-1 [&_p:empty]:mt-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{prepareMarkdown(field.content)}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">（尚未填寫）</p>
                        )}
                      </div>
                    ))}
                    {profileFields.length === 0 && (
                      <p className="text-gray-500 text-sm py-4 text-center">尚無欄位，點「✏️ 編輯」新增</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'relationships' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold">管理關係</h3>
                <form onSubmit={handleAddRelationship} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <h4 className="font-semibold mb-3">{editingRelId ? '編輯關係' : '新增關係'}</h4>
                  {relFormError && (
                    <div className="mb-3 px-3 py-2 bg-red-900/50 border border-red-600 rounded-md text-red-300 text-sm">
                      ⚠ {relFormError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 relative" ref={targetInputRef}>
                      <label htmlFor="newRelTarget" className="block text-sm font-medium text-gray-300 mb-1">目標角色</label>
                      <input
                        id="newRelTarget"
                        type="text"
                        value={searchTargetName}
                        onChange={(e) => {
                          setSearchTargetName(e.target.value);
                          setNewRelTarget(''); // 重新輸入時清除已選 ID
                          setIsTargetDropdownOpen(true);
                          setRelFormError('');
                        }}
                        onFocus={() => setIsTargetDropdownOpen(true)}
                        onBlur={() => {
                          // 延遲關閉，讓點擊下拉項目的事件先觸發
                          setTimeout(() => {
                            setIsTargetDropdownOpen(false);
                            // 若輸入了名字但沒從下拉選取，清除輸入
                            if (searchTargetName && !newRelTarget) {
                              setSearchTargetName('');
                            }
                          }, 150);
                        }}
                        placeholder="搜尋角色名稱後從清單選取..."
                        autoComplete="off"
                        className={`w-full p-2 bg-gray-900 border rounded-md focus:ring-2 focus:ring-indigo-500 ${
                          relFormError && relFormError.includes('目標') ? 'border-red-500' : 'border-gray-600'
                        }`}
                      />
                      {newRelTarget && (
                        <span className="absolute right-2 top-9 text-green-400 text-sm">✓</span>
                      )}
                      {isTargetDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredTargetCharacters.length > 0 ? filteredTargetCharacters.map(c => (
                            <div key={c.id} onMouseDown={(e) => e.preventDefault()} onClick={() => {
                              setNewRelTarget(c.id);
                              setSearchTargetName(c.name);
                              setIsTargetDropdownOpen(false);
                              setRelFormError('');
                            }}
                              className="px-4 py-2 hover:bg-indigo-600 cursor-pointer">
                              {c.name}
                            </div>
                          )) : (
                            <div className="px-4 py-2 text-gray-500 text-sm">找不到符合的角色</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="newRelLabel" className="block text-sm font-medium text-gray-300 mb-1">關係標籤</label>
                      <input id="newRelLabel" type="text" value={newRelLabel} onChange={e => { setNewRelLabel(e.target.value); setRelFormError(''); }} placeholder="例如：朋友" className={`w-full p-2 bg-gray-900 border rounded-md focus:ring-2 focus:ring-indigo-500 ${relFormError && relFormError.includes('標籤') ? 'border-red-500' : 'border-gray-600'}`} />
                    </div>
                    <div>
                      <label htmlFor="newRelDirection" className="block text-sm font-medium text-gray-300 mb-1">方向</label>
                      <select id="newRelDirection" value={newRelDirection} onChange={e => setNewRelDirection(e.target.value as RelationshipDirection)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500">
                        <option value="to">{`${character.name} → 目標`}</option>
                        <option value="from">{`${character.name} ← 目標`}</option>
                        <option value="both">{`${character.name} ↔ 目標`}</option>
                        <option value="none">{`${character.name} – 目標`}</option>
                      </select>
                    </div>
                    {/* Description Input - New Row */}
                    <div className="md:col-span-4">
                      <label htmlFor="newRelDescription" className="block text-sm font-medium text-gray-300 mb-1">描述 (選填)</label>
                      <textarea
                        id="newRelDescription"
                        value={newRelDescription}
                        onChange={e => setNewRelDescription(e.target.value)}
                        placeholder="詳細的關係描述..."
                        rows={2}
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button type="submit" className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors">
                      {editingRelId ? '更新關係' : '新增關係'}
                    </button>
                    {editingRelId && (
                      <button type="button" onClick={handleCancelEdit} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold transition-colors">
                        取消
                      </button>
                    )}
                  </div>
                </form>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">現有關係</h4>
                    <div className="flex bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setRelTab('outgoing')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${relTab === 'outgoing' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                      >
                        我對他人 (→)
                      </button>
                      <button
                        onClick={() => setRelTab('incoming')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${relTab === 'incoming' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                      >
                        他人對我 (←)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {currentList.map(rel => (
                      <div key={rel.id} className={`rounded-md overflow-hidden transition-all duration-200 border ${expandedRelIds.has(rel.id) ? 'bg-gray-700 border-indigo-500/50 shadow-md' : 'bg-gray-700/50 border-transparent hover:bg-gray-700'}`}>
                        <div className="flex items-center justify-between p-3">
                          <div
                            className="flex items-center gap-2 flex-wrap cursor-pointer flex-grow select-none"
                            onClick={() => toggleDescription(rel.id)}
                          >
                            <span className="font-semibold text-white">{character.name}</span>
                            {rel.direction === 'outgoing' && <span className="text-indigo-400 font-bold">→</span>}
                            {rel.direction === 'incoming' && <span className="text-indigo-400 font-bold">←</span>}
                            <span className="font-semibold text-white">{rel.otherCharacterName}</span>
                            <span className="text-gray-400 text-sm">({rel.label})</span>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditRelationship(rel); }}
                              className="text-gray-400 hover:text-indigo-400 p-1.5 rounded-md hover:bg-gray-600 transition-colors"
                              title="編輯"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteRelationship(rel.id); }}
                              className="text-gray-400 hover:text-red-400 p-1.5 rounded-md hover:bg-gray-600 transition-colors"
                              title="刪除"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleDescription(rel.id); }}
                              className={`text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-gray-600 transition-all duration-200 ${expandedRelIds.has(rel.id) ? 'rotate-180 text-indigo-400' : ''}`}
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {expandedRelIds.has(rel.id) && (
                          <div className="px-4 py-3 text-sm text-gray-300 bg-gray-900/30 border-t border-gray-600/50 shadow-inner">
                            <div className="flex gap-2">
                              <span className="text-indigo-400 flex-shrink-0 mt-0.5">↳</span>
                              <span className="leading-relaxed">{rel.description || <span className="text-gray-500 italic">無詳細描述</span>}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {currentList.length === 0 && <p className="text-sm text-gray-500 text-center py-4">此分類尚無關係資料</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold">管理圖片</h3>
                <div className="mb-6">
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg bg-gray-700/50 hover:bg-gray-700/80 transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-indigo-600/20', 'border-indigo-500');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-indigo-600/20', 'border-indigo-500');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-indigo-600/20', 'border-indigo-500');
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        const fakeEvent = {
                          target: { files: files, value: '' }
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleImageUpload(fakeEvent);
                      }
                    }}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PlusIcon className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">點擊上傳</span> 或拖曳檔案至此</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF</p>
                    </div>
                  </label>
                  <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentCharacterImages.map(img => {
                    const thumbSrc = resolveImagePath(img.thumbnailUrl);
                    const mainSrc  = resolveImagePath(img.imageDataUrl);
                    return (
                    <div key={img.id} className="relative group aspect-square">
                      <img
                        src={thumbSrc || mainSrc}
                        alt="Character"
                        className="w-full h-full object-cover rounded-md bg-gray-700"
                        onError={(e) => {
                          const el = e.currentTarget;
                          // 縮圖失敗 → 換原圖
                          if (el.src !== mainSrc && mainSrc) {
                            el.src = mainSrc;
                          } else {
                            // 原圖也失敗 → 顯示佔位符（隱藏 img，由父元素背景代替）
                            el.style.display = 'none';
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center text-white">
                        <button onClick={() => handleSetAsAvatar(img.imageDataUrl)} className="text-xs bg-indigo-600 px-2 py-1 rounded mb-1 hover:bg-indigo-700">設為頭像</button>
                        <button onClick={() => setEditingImageTagsFor(img)} className="text-xs bg-gray-600 px-2 py-1 rounded mb-1 hover:bg-gray-500">編輯 Tag</button>
                        <button onClick={() => handleDeleteImage(img.id)} className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700">刪除</button>
                      </div>
                      {editedCharacter.image === img.imageDataUrl && <div className="absolute top-1 right-1 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">頭像</div>}
                    </div>
                    );
                  })}
                </div>
                {currentCharacterImages.length === 0 && <p className="text-sm text-gray-500 text-center">此角色尚無圖片。</p>}
              </div>
            )}

            {activeTab === 'changelog' && (
              <div className="animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-200 mb-5">修改紀錄</h3>
                {!editedCharacter.modLog || editedCharacter.modLog.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">尚無修改紀錄</p>
                    <p className="text-xs mt-1">登入後儲存角色資料即開始記錄</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...editedCharacter.modLog].reverse().map((entry, i) => {
                      const isExpanded = expandedLogIndices.has(i);
                      const toggle = () => setExpandedLogIndices(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      });
                      const isEditingThisNote = editingNoteIndex === i;
                      return (
                        <div key={i} className="rounded-lg border border-gray-700 overflow-hidden">
                          {/* 紀錄 header — 整列點擊可展開/收合 */}
                          <div className="px-4 py-2.5 bg-gray-800/80">
                            <div
                              onClick={toggle}
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/60 -mx-2 px-2 py-1 rounded transition-colors select-none"
                            >
                              <span className="text-gray-500 text-sm">{isExpanded ? '▾' : '▸'}</span>
                              <span className="font-semibold text-indigo-400 text-sm">{entry.by}</span>
                              <span className="text-gray-600">·</span>
                              <span className="text-gray-400 text-xs">{new Date(entry.at).toLocaleString()}</span>
                              {entry.changes && entry.changes.length > 0 && (
                                <span className="text-xs text-gray-500">{entry.changes.length} 項變更</span>
                              )}
                              <div className="ml-auto flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                {/* 新增/編輯備註按鈕 */}
                                {!isEditingThisNote && (
                                  <button
                                    onClick={() => { setEditingNoteIndex(i); setEditingNoteText(entry.note || ''); }}
                                    className="text-xs text-gray-500 hover:text-yellow-400 px-1.5 py-0.5 rounded hover:bg-yellow-900/20 transition-colors"
                                    title={entry.note ? '編輯備註' : '新增備註'}
                                  >
                                    {entry.note ? '✏️ 備註' : '+ 備註'}
                                  </button>
                                )}
                                {/* 管理者刪除按鈕 */}
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm('確定刪除此筆修改紀錄？')) handleDeleteLogEntry(i);
                                    }}
                                    className="text-xs text-gray-600 hover:text-red-400 px-1 py-0.5 rounded hover:bg-red-900/20 transition-colors"
                                    title="刪除此筆紀錄"
                                  >
                                    🗑
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* 備註顯示 or 編輯區 */}
                            {isEditingThisNote ? (
                              <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
                                <textarea
                                  autoFocus
                                  value={editingNoteText}
                                  onChange={e => setEditingNoteText(e.target.value)}
                                  placeholder="輸入備註說明（Shift+Enter 換行）..."
                                  rows={3}
                                  className="flex-1 px-2 py-1 rounded bg-gray-900 border border-yellow-700/50 text-xs text-white resize-none focus:border-yellow-500 outline-none"
                                />
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => handleSaveNoteForEntry(i)}
                                    className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded"
                                  >
                                    儲存
                                  </button>
                                  <button
                                    onClick={() => { setEditingNoteIndex(null); setEditingNoteText(''); }}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : entry.note ? (
                              <div className="mt-1.5 text-xs text-yellow-300/80 bg-yellow-900/20 border border-yellow-800/30 rounded px-2 py-1 whitespace-pre-wrap">
                                💬 {entry.note}
                              </div>
                            ) : null}
                          </div>
                          {/* Changes — 展開才顯示 */}
                          {isExpanded && (
                            entry.changes && entry.changes.length > 0 ? (
                              <div className="divide-y divide-gray-800/60 border-t border-gray-700">
                                {entry.changes.map((change: ModLogChange, j: number) => {
                                  const diffLines = computeLineDiff(change.before ?? '', change.after ?? '');
                                  return (
                                    <div key={j} className="px-4 py-3 bg-gray-900/40">
                                      <div className="text-xs font-mono text-gray-500 mb-2 flex items-center gap-1">
                                        <span className="text-yellow-600">@@</span>
                                        <span>{change.label}</span>
                                      </div>
                                      {diffLines.length === 0 ? (
                                        <div className="text-xs text-gray-600 italic">（無變更）</div>
                                      ) : (
                                        <div className="font-mono text-xs max-h-40 overflow-y-auto space-y-0.5">
                                          {diffLines.map((dl, li) => (
                                            <div
                                              key={li}
                                              className={`flex gap-1 px-2 py-0.5 rounded ${
                                                dl.type === 'removed'
                                                  ? 'bg-red-950/40 text-red-300'
                                                  : 'bg-green-950/40 text-green-300'
                                              }`}
                                            >
                                              <span className="opacity-70 select-none flex-shrink-0">
                                                {dl.type === 'removed' ? '−' : '＋'}
                                              </span>
                                              <span className="break-all">{dl.text || ' '}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="px-4 py-3 text-xs text-gray-600 bg-gray-900/40 border-t border-gray-700">（無詳細變更資訊）</div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <TagSelectorModal
        isOpen={isTagSelectorOpen}
        onClose={() => setIsTagSelectorOpen(false)}
        tagCategories={tagCategories}
        selectedTagIds={editedCharacter.tagIds}
        onSave={handleSaveCharacterTags}
        enableAiSuggestions={false}
      />
      <TagSelectorModal
        isOpen={!!editingImageTagsFor}
        onClose={() => setEditingImageTagsFor(null)}
        tagCategories={tagCategories}
        selectedTagIds={editingImageTagsFor?.tagIds || []}
        onSave={handleSaveImageTags}
        enableAiSuggestions={true}
        image={editingImageTagsFor}
        onAddTagToCategory={onAddTagToCategory}
      />
      <ImageCropperModal
        isOpen={!!imageToCrop}
        onClose={() => setImageToCrop(null)}
        imageSrc={imageToCrop ? resolveImagePath(imageToCrop) : null}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};

export default CharacterEditorModal;