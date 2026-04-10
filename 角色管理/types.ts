export interface CharacterProfile {
  appearance?: string;
  personality?: string;
  background?: string;
  specialty?: string;
  quote?: string;
}

export interface ProfileField {
  id: string;
  label: string;
  content: string;
}

export interface ModLogChange {
  field: string;   // field key
  label: string;   // 顯示名稱
  before: string;  // 修改前
  after: string;   // 修改後
}

export interface ModLogEntry {
  at: number;   // unix timestamp
  by: string;   // 使用者名稱
  note?: string;  // 修改備註
  changes?: ModLogChange[];
}

export interface AppUser {
  code: string;
  name: string;
}

export interface Character {
  id: string;
  name: string;
  characterCode?: string; // 角色編號，如 cr031，全局唯一
  birthday?: string;      // 生日，格式 MM/DD，如 04/15
  age?: string;           // 實際年齡，如 25歲
  title?: string;         // 稱號
  height?: string;        // 身高，如 175cm
  weight?: string;        // 體重，如 65kg
  bust?: string;          // 胸圍，如 88cm
  introduction?: string;  // 一語介紹（單行短句）
  notes: string;
  tagIds: string[];
  image?: string; // URL or base64 data URI for avatar
  avatarPosition?: { x: number; y: number };
  showcaseImageId?: string; // 右側展示立繪的 CharacterImage ID
  profile?: CharacterProfile;
  profileFields?: ProfileField[];
  modLog?: ModLogEntry[];
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

export interface GlossaryDraft {
  name: string;
  category: string;
  fields: ProfileField[];
  aliases: string[];
  relatedCharacterIds: string[];
  relatedEventIds: string[];
  savedAt: number;
}

export interface GlossaryTerm {
  id: string;
  name: string;
  category: string;
  fields?: ProfileField[];
  aliases?: string[];
  relatedCharacterIds: string[];
  relatedEventIds: string[];
  modLog?: ModLogEntry[];
  createdAt: number;
  updatedAt: number;
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

export type View = 'graph' | 'characters' | 'images' | 'search' | 'tags' | 'settings' | 'analytics' | 'timeline' | 'glossary' | 'activityLog';

export interface AppData {
  characters: Character[];
  relationships: Relationship[];
  tagCategories: TagCategory[];
  characterImages: CharacterImage[];
  glossaryTerms?: GlossaryTerm[];
  deletedRelationshipIds?: string[];
  deletedImageIds?: string[];
}

// Timeline Types
export interface TimelineEvent {
  id: string;
  title: string;                    // 事件標題
  startYear: number;                // 開始年份（相對遊戲開始年）
  endYear?: number;                 // 結束年份（可選，若持續則為空）
  isContinuous: boolean;            // 是否持續中
  size: 'large' | 'medium' | 'small'; // 事件大小（視覺呈現用）

  // 特殊欄位
  isMainStory?: boolean;            // 是否為主線故事事件（視覺上以菱形/方形突出）
  
  // 事件關聯
  parentEventIds: string[];         // 上位事件ID陣列（因果關係：因為先有A才有B）
  relatedEventIds: string[];        // 關聯事件ID陣列（標記有關連的事件）
  
  // 參與者
  characterIds: string[];           // 參與的角色ID
  npcNames: string[];               // 手動填入的NPC名稱
  
  // 標籤系統
  tagIds: string[];                 // 事件標籤ID陣列（類似角色TAG）
  
  // 表裡資訊（三欄位）
  publicInfo: string;               // （表）事件資訊 - 一般認知的內容
  deepInfo: string;                 // （裡）深層設定 - 陰謀、真相、隱藏設定
  notes: string;                    // （裡）額外補充 - 備註、創作筆記
  
  // 地點
  location: string;                 // 地點名稱
  
  // 元資料
  createdAt: number;
  updatedAt: number;
}

export interface TimelineTag {
  id: string;
  label: string;                    // 標籤名稱（如：戰爭、政治、愛情）
  color: string;                    // 標籤顏色（如：#ef4444）
}

export interface TimelineLocation {
  id: string;
  label: string;                    // 地點名稱（顯示/事件儲存仍用 label）
  parentId?: string;                // 上層地點（用於樹狀層級）
  description?: string;             // 詳細說明
  createdAt: number;
  updatedAt: number;
}

export interface TimelineData {
  gameStartYear: number;            // 遊戲開始年曆（預設200）
  events: TimelineEvent[];
  locations: string[];              // 已使用過的地點清單（自動收集）
  locationNodes?: TimelineLocation[]; // 地點管理（層級/說明）
  tags: TimelineTag[];              // 事件標籤清單
}