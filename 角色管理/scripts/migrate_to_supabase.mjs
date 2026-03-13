/**
 * migrate_to_supabase.mjs
 *
 * 一次性遷移腳本：把現有的 cr_data.json + user_data.json 合併後
 * 上傳到 Supabase（app_data 表），圖片中的 base64 也會自動
 * 上傳到 Supabase Storage 並替換為 URL。
 *
 * 用法（在 角色管理/ 目錄下執行）：
 *   node scripts/migrate_to_supabase.mjs
 *
 * 必要環境變數（建議在 .env.local 設定，腳本會自動讀取）：
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── 讀取環境變數 ────────────────────────────────────────────────────
function loadEnv() {
  const envFile = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envFile)) throw new Error('.env.local not found');
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 讀取 JSON 檔案 ──────────────────────────────────────────────────
function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// ── base64 → Buffer ─────────────────────────────────────────────────
function base64ToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

// ── 上傳圖片到 Storage ──────────────────────────────────────────────
async function uploadImageToStorage(buffer, storagePath) {
  const { error } = await supabase.storage
    .from('character-images')
    .upload(storagePath, buffer, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;

  const { data } = supabase.storage
    .from('character-images')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

// ── 處理單張圖片（路徑 or base64）──────────────────────────────────
async function resolveImageUrl(imageValue, storagePath) {
  if (!imageValue) return imageValue;

  // 已經是 https URL，不需要處理
  if (imageValue.startsWith('http')) return imageValue;

  // 相對路徑（如 /character_images/xxx.jpg），嘗試從本地讀取
  if (imageValue.startsWith('/character_images/') || imageValue.startsWith('character_images/')) {
    const localPath = path.join(ROOT, 'public', imageValue.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      console.log(`  📁 上傳本地圖片: ${imageValue}`);
      const buffer = fs.readFileSync(localPath);
      return await uploadImageToStorage(buffer, storagePath);
    }
    console.warn(`  ⚠️  本地檔案不存在: ${localPath}`);
    return imageValue;
  }

  // base64 Data URI
  if (imageValue.startsWith('data:image')) {
    console.log(`  🔄 轉換 base64 → Storage: ${storagePath}`);
    const buffer = base64ToBuffer(imageValue);
    return await uploadImageToStorage(buffer, storagePath);
  }

  return imageValue;
}

// ── 主流程 ──────────────────────────────────────────────────────────
async function migrate() {
  console.log('🚀 開始遷移到 Supabase...\n');

  // 1. 讀取來源資料
  const crData = readJson(path.join(ROOT, 'public', 'cr_data.json'));
  const userData = readJson(path.join(ROOT, 'user_data.json'))
    || readJson(path.join(ROOT, 'public', 'user_data.json'));

  if (!crData) {
    console.error('❌ 找不到 public/cr_data.json');
    process.exit(1);
  }

  // 2. 合併 characters（user_data 覆蓋 cr_data）
  console.log('📂 合併角色資料...');
  const userChars = userData?.characters || {};
  const mergedCharacters = (crData.characters || []).map(char => {
    const override = userChars[char.id] || {};
    return {
      ...char,
      name: override.name || char.name,
      notes: override.notes || char.notes,
      image: override.image || char.image,
      avatarPosition: override.avatarPosition || char.avatarPosition,
      tagIds: override.tagIds || char.tagIds,
    };
  });

  // 補上 user_data 中的新角色（不在 cr_data 裡的）
  const crCharIds = new Set(crData.characters.map(c => c.id));
  for (const [id, data] of Object.entries(userChars)) {
    if (!crCharIds.has(id)) {
      mergedCharacters.push({
        id,
        name: data.name || '未知角色',
        notes: data.notes || '',
        tagIds: data.tagIds || [],
        image: data.image,
        avatarPosition: data.avatarPosition,
      });
    }
  }

  // 3. 處理角色頭像圖片（base64 → Storage）
  console.log('\n🖼  處理角色頭像...');
  for (const char of mergedCharacters) {
    if (char.image) {
      const storagePath = `avatars/${char.id}_${uuidv4()}.jpg`;
      char.image = await resolveImageUrl(char.image, storagePath);
    }
  }

  // 4. 合併 characterImages
  console.log('\n🗂  處理圖庫圖片...');
  const crImages = crData.characterImages || [];
  const userImages = userData?.characterImages || [];
  const imageMap = new Map();
  for (const img of [...crImages, ...userImages]) {
    imageMap.set(img.id, img);
  }
  const deletedImageIds = new Set(userData?.deletedImageIds || []);
  const mergedImages = Array.from(imageMap.values()).filter(img => !deletedImageIds.has(img.id));

  for (const img of mergedImages) {
    const storagePath = `${img.characterId}_${uuidv4()}.jpg`;
    img.imageDataUrl = await resolveImageUrl(img.imageDataUrl, storagePath);
    if (img.thumbnailUrl) {
      const thumbPath = `thumbnails/${img.characterId}_${uuidv4()}.jpg`;
      img.thumbnailUrl = await resolveImageUrl(img.thumbnailUrl, thumbPath);
    }
  }

  // 5. 合併 relationships
  const userRels = userData?.relationships || [];
  const crRels = crData.relationships || [];
  const deletedRelIds = new Set(userData?.deletedRelationshipIds || []);
  const relMap = new Map();
  for (const rel of [...crRels, ...userRels]) {
    if (!deletedRelIds.has(rel.id)) relMap.set(rel.id, rel);
  }
  const mergedRelationships = Array.from(relMap.values());

  // 6. 合併 tagCategories（user_data 優先）
  const mergedTagCategories = (userData?.tagCategories?.length > 0)
    ? userData.tagCategories
    : (crData.tagCategories || []);

  // 7. 組合最終 app_data
  const appData = {
    characters: mergedCharacters,
    relationships: mergedRelationships,
    tagCategories: mergedTagCategories,
    characterImages: mergedImages,
    deletedRelationshipIds: [],
    deletedImageIds: [],
  };

  console.log(`\n✅ 合併完成：${mergedCharacters.length} 個角色，${mergedRelationships.length} 個關係，${mergedImages.length} 張圖片`);

  // 8. 寫入 Supabase app_data
  console.log('\n💾 寫入 Supabase app_data...');
  const { error: appError } = await supabase
    .from('app_data')
    .upsert({ key: 'main', data: appData, updated_at: new Date().toISOString() });
  if (appError) throw appError;
  console.log('✅ app_data 寫入成功');

  // 9. 寫入 Supabase timeline_data
  const timelineData = readJson(path.join(ROOT, 'public', 'timeline_data.json'));
  if (timelineData) {
    console.log('\n💾 寫入 Supabase timeline_data...');
    const { error: tlError } = await supabase
      .from('timeline_data')
      .upsert({ key: 'main', data: timelineData, updated_at: new Date().toISOString() });
    if (tlError) throw tlError;
    console.log('✅ timeline_data 寫入成功');
  }

  console.log('\n🎉 遷移完成！所有資料已上傳到 Supabase。');
  console.log('   現在可以在 Supabase 儀表板的 Table Editor 確認資料。');
}

migrate().catch(err => {
  console.error('\n❌ 遷移失敗:', err);
  process.exit(1);
});
