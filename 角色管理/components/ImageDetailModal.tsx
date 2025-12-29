import React, { useState, useMemo, useEffect } from 'react';
import type { Character, CharacterImage, TagCategory, TagWithColor, Tag } from '../types';
import { CloseIcon, TagsIcon, TrashIcon } from './Icons';
import TagSelectorModal from './TagSelectorModal';

interface ImageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: CharacterImage | null;
  character: Character | null;
  tagCategories: TagCategory[];
  allTags: TagWithColor[];
  onUpdateImage: (updater: React.SetStateAction<CharacterImage[]>) => void;
  onDeleteImage: (imageId: string) => void;
  onAddTagToCategory: (label: string, categoryName: string) => Tag | null;
}

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ isOpen, onClose, image, character, tagCategories, allTags, onUpdateImage, onDeleteImage, onAddTagToCategory }) => {
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen && image) {
      setLocalNotes(image.notes || '');
      setConfirmingDelete(false); // Reset on open
    }
  }, [isOpen, image]);

  useEffect(() => {
    if (!isOpen || !image || localNotes === (image.notes || '')) {
      return;
    }

    const handler = setTimeout(() => {
      onUpdateImage(prev =>
        prev.map(img =>
          img.id === image.id ? { ...img, notes: localNotes } : img
        )
      );
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [localNotes, image, onUpdateImage, isOpen]);

  const imageTags = useMemo(() => {
    if (!image) return [];
    return allTags.filter(tag => image.tagIds.includes(tag.id));
  }, [allTags, image]);

  const handleSaveTags = (newTagIds: string[]) => {
    if (!image) return;
    const imageToUpdateId = image.id;
    onUpdateImage(prev => 
      prev.map(img => 
        img.id === imageToUpdateId ? { ...img, tagIds: newTagIds } : img
      )
    );
    setIsTagSelectorOpen(false);
  };
  
  const handleDelete = () => {
    if (!image) return;
    if (confirmingDelete) {
        onDeleteImage(image.id);
    } else {
        setConfirmingDelete(true);
        setTimeout(() => setConfirmingDelete(false), 3000); // Reset after 3 seconds
    }
  };

  if (!isOpen || !image || !character) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-20 bg-black/30 rounded-full p-1">
            <CloseIcon className="w-6 h-6" />
          </button>
          
          <div className="w-full md:w-2/3 flex-shrink-0 bg-black flex items-center justify-center">
            <img src={image.imageDataUrl} alt={`Image of ${character.name}`} className="max-w-full max-h-[90vh] object-contain" />
          </div>

          <div className="w-full md:w-1/3 p-6 flex flex-col overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2 text-indigo-400">{character.name}</h2>
            <p className="text-sm text-gray-400 mb-6">圖片詳細資料</p>

            <div className="mb-6">
              <label htmlFor="imageNotes" className="block text-lg font-semibold mb-2">筆記</label>
              <textarea
                id="imageNotes"
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                rows={5}
                placeholder="可在此新增關於此圖片的筆記..."
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            
            <div className="flex-grow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Tags</h3>
                <button onClick={() => setIsTagSelectorOpen(true)} className="text-indigo-400 hover:underline text-sm font-medium flex items-center gap-1">
                  <TagsIcon className="w-4 h-4" /> 編輯
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {imageTags.length > 0 ? imageTags.map(tag => (
                  <span key={tag.id} className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: tag.color, color: '#fff' }}>
                    {tag.label}
                  </span>
                )) : <p className="text-sm text-gray-500">尚未新增 Tag</p>}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700">
                <button 
                    onClick={handleDelete} 
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-left transition-colors duration-200 ${
                        confirmingDelete
                            ? 'bg-red-600 text-white'
                            : 'text-red-400 hover:bg-red-900/50'
                    }`}
                >
                    {confirmingDelete ? '確定刪除？' : <><TrashIcon className="w-5 h-5"/> 刪除圖片</>}
                </button>
            </div>
          </div>
        </div>
      </div>

      <TagSelectorModal 
        isOpen={isTagSelectorOpen}
        onClose={() => setIsTagSelectorOpen(false)}
        tagCategories={tagCategories}
        selectedTagIds={image?.tagIds || []}
        onSave={handleSaveTags}
        enableAiSuggestions={true}
        image={image}
        onAddTagToCategory={onAddTagToCategory}
      />
    </>
  );
};

export default ImageDetailModal;