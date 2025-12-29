export interface CharacterProfile {
  appearance?: string;
  personality?: string;
  background?: string;
  specialty?: string;
  quote?: string;
}

export interface Character {
  id: string;
  name: string;
  notes: string;
  tagIds: string[];
  image?: string; // URL or base64 data URI for avatar
  avatarPosition?: { x: number; y: number };
  profile?: CharacterProfile;
}

export interface Relationship {
  id: string;
  source: string; // Character ID
  target: string; // Character ID
  label: string;
  description?: string;
  arrowStyle?: 'arrow' | 'none';
}

export interface Tag {
  id: string;
  label: string;
  category?: string;
}

export interface TagCategory {
  id: string;
  name: string;
  color: string;
  tags: Tag[];
  selectionMode?: 'single' | 'multiple';
}

export interface TagWithColor extends Tag {
  color: string;
}

export interface CharacterImage {
  id: string;
  characterId: string;
  imageDataUrl: string; // base64 data URI
  thumbnailUrl?: string; // Path to thumbnail image
  tagIds: string[];
  notes?: string;
}

// Data structure returned by AI services
export interface ParsedData {
  characters: { name: string }[];
  relationships: { source: string; target: string; label: string }[];
}

export interface AiTagSuggestion {
  existingTags: string[]; // labels of existing tags
  newTagSuggestions: string[]; // labels for new tags
}

export type AiProvider = 'gemini' | 'openai';

export type View = 'graph' | 'characters' | 'images' | 'search' | 'tags' | 'settings' | 'analytics';

export interface AppData {
  characters: Character[];
  relationships: Relationship[];
  tagCategories: TagCategory[];
  characterImages: CharacterImage[];
  deletedRelationshipIds?: string[];
  deletedImageIds?: string[];
}