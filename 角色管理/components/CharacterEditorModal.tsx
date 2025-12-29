import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Character, Relationship, TagCategory, CharacterImage, TagWithColor, Tag } from '../types';
import { CloseIcon, TrashIcon, UsersIcon, ImageIcon, TagsIcon, PlusIcon, EditIcon, ChevronDownIcon, SettingsIcon } from './Icons';
import TagSelectorModal from './TagSelectorModal';
import ImageCropperModal from './ImageCropperModal';

interface CharacterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}

type EditorTab = 'details' | 'relationships' | 'images';
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

      // Use 'image/jpeg' for better compression of photographic/complex images.
      // 0.9 provides a high quality setting.
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = (err) => {
      reject(new Error(`Image failed to load: ${err}`));
    };
    img.src = imageDataUrl;
  });
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
}) => {
  const [editedCharacter, setEditedCharacter] = useState<Character>(character);
  const [activeTab, setActiveTab] = useState<EditorTab>('details');
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingImageTagsFor, setEditingImageTagsFor] = useState<CharacterImage | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedChar = { ...editedCharacter, [name]: value };
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

  const handleAddRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    const targetChar = allCharacters.find(c => c.id === newRelTarget);

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
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const originalImageDataUrl = reader.result as string;
        if (!originalImageDataUrl) return;

        try {
          // Resize the image before storing it or showing the cropper
          // This prevents crashes with very large images
          const resizedImageDataUrl = await resizeImage(originalImageDataUrl, 1024); // Max size 1024px

          // Upload to local API
          const fileName = `${uuidv4()}.jpg`;
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterName: character.name,
              fileName: fileName,
              imageBase64: resizedImageDataUrl
            })
          });

          let imagePath = resizedImageDataUrl; // Fallback to base64 if upload fails (or for immediate preview if needed)

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.path) {
              imagePath = result.path;
            }
          } else {
            console.error("Failed to upload image to local storage, falling back to base64");
          }

          const newImage: CharacterImage = {
            id: uuidv4(),
            characterId: character.id,
            imageDataUrl: imagePath,
            tagIds: [],
            notes: '',
          };
          onUpdateCharacterImages(prev => [...prev, newImage]);

          setEditedCharacter(currentChar => {
            if (!currentChar.image) {
              // Also use the resized image for the cropper to maintain consistency
              setImageToCrop(resizedImageDataUrl);
            }
            return currentChar;
          });
        } catch (error) {
          console.error("Failed to process image:", error);
          alert(`處理圖片時發生錯誤: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      reader.readAsDataURL(file);
    }
    // Clear input to allow re-uploading the same file
    e.target.value = '';
  };


  const handleCropComplete = (croppedImageDataUrl: string) => {
    // This function's only job is to update the character's main avatar
    const updatedChar = { ...editedCharacter, image: croppedImageDataUrl };
    setEditedCharacter(updatedChar);
    onSave(updatedChar);
    setImageToCrop(null); // Close the cropper modal
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
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={onClose}>
        <div
          className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-48 bg-gray-900/50 p-4 flex flex-col border-r border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden relative group">
                <img
                  src={editedCharacter.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(editedCharacter.name)}`}
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
                <UsersIcon className="w-5 h-5" /> 詳細資料
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
            </nav>

            <div className="flex-grow"></div>
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
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
              <CloseIcon className="w-6 h-6" />
            </button>

            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">名稱</label>
                  <input type="text" id="name" name="name" value={editedCharacter.name} onChange={handleChange} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500" />
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
              <div className="space-y-8 animate-fadeIn">
                {!character.profile ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>此角色尚無詳細設定資料。</p>
                    <p className="text-sm mt-2">請確認 Markdown 檔案中包含相關章節。</p>
                  </div>
                ) : (
                  <>
                    {character.profile.appearance && (
                      <section>
                        <h3 className="text-lg font-semibold text-indigo-400 mb-3 flex items-center">
                          <span className="w-1 h-6 bg-indigo-500 rounded-full mr-3"></span>
                          外觀設定
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {character.profile.appearance}
                        </div>
                      </section>
                    )}

                    {character.profile.personality && (
                      <section>
                        <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center">
                          <span className="w-1 h-6 bg-emerald-500 rounded-full mr-3"></span>
                          性格特徵
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {character.profile.personality}
                        </div>
                      </section>
                    )}

                    {character.profile.background && (
                      <section>
                        <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center">
                          <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
                          背景故事
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {character.profile.background}
                        </div>
                      </section>
                    )}

                    {character.profile.specialty && (
                      <section>
                        <h3 className="text-lg font-semibold text-rose-400 mb-3 flex items-center">
                          <span className="w-1 h-6 bg-rose-500 rounded-full mr-3"></span>
                          專長與興趣
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {character.profile.specialty}
                        </div>
                      </section>
                    )}

                    {character.profile.quote && (
                      <section>
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                          <span className="w-1 h-6 bg-cyan-500 rounded-full mr-3"></span>
                          語氣示例
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 text-gray-300 leading-relaxed whitespace-pre-wrap italic border-l-4 border-l-cyan-500">
                          {character.profile.quote}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'relationships' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold">管理關係</h3>
                <form onSubmit={handleAddRelationship} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <h4 className="font-semibold mb-3">{editingRelId ? '編輯關係' : '新增關係'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 relative" ref={targetInputRef}>
                      <label htmlFor="newRelTarget" className="block text-sm font-medium text-gray-300 mb-1">目標角色</label>
                      <input
                        id="newRelTarget"
                        type="text"
                        value={searchTargetName}
                        onChange={(e) => {
                          setSearchTargetName(e.target.value);
                          setIsTargetDropdownOpen(true);
                        }}
                        onFocus={() => setIsTargetDropdownOpen(true)}
                        placeholder="搜尋角色..."
                        autoComplete="off"
                        className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                      />
                      {isTargetDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredTargetCharacters.map(c => (
                            <div key={c.id} onClick={() => {
                              setNewRelTarget(c.id);
                              setSearchTargetName(c.name);
                              setIsTargetDropdownOpen(false);
                            }}
                              className="px-4 py-2 hover:bg-indigo-600 cursor-pointer">
                              {c.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="newRelLabel" className="block text-sm font-medium text-gray-300 mb-1">關係標籤</label>
                      <input id="newRelLabel" type="text" value={newRelLabel} onChange={e => setNewRelLabel(e.target.value)} placeholder="例如：朋友" className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500" />
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
                  {currentCharacterImages.map(img => (
                    <div key={img.id} className="relative group aspect-square">
                      <img src={img.imageDataUrl} alt="Character" className="w-full h-full object-cover rounded-md" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center text-white">
                        <button onClick={() => handleSetAsAvatar(img.imageDataUrl)} className="text-xs bg-indigo-600 px-2 py-1 rounded mb-1 hover:bg-indigo-700">設為頭像</button>
                        <button onClick={() => setEditingImageTagsFor(img)} className="text-xs bg-gray-600 px-2 py-1 rounded mb-1 hover:bg-gray-500">編輯 Tag</button>
                        <button onClick={() => handleDeleteImage(img.id)} className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700">刪除</button>
                      </div>
                      {editedCharacter.image === img.imageDataUrl && <div className="absolute top-1 right-1 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">頭像</div>}
                    </div>
                  ))}
                </div>
                {currentCharacterImages.length === 0 && <p className="text-sm text-gray-500 text-center">此角色尚無圖片。</p>}
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
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};

export default CharacterEditorModal;