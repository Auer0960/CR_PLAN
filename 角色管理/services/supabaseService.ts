import { supabase } from '../supabase';
import type { AppData, TimelineData, AppUser } from '../types';
import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────
// App Data (角色 / 關係 / TAG / 圖庫)
// ─────────────────────────────────────────────

export async function loadAppData(): Promise<AppData | null> {
  const { data, error } = await supabase
    .from('app_data')
    .select('data')
    .eq('key', 'main')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // 沒有資料（正常情況）
    throw error;
  }
  return data?.data as AppData ?? null;
}

export async function saveAppData(appData: AppData): Promise<void> {
  const { error } = await supabase
    .from('app_data')
    .upsert({ key: 'main', data: appData, updated_at: new Date().toISOString() });

  if (error) throw error;
}

// ─────────────────────────────────────────────
// Timeline Data
// ─────────────────────────────────────────────

export async function loadTimelineData(): Promise<TimelineData | null> {
  const { data, error } = await supabase
    .from('timeline_data')
    .select('data')
    .eq('key', 'main')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data?.data as TimelineData ?? null;
}

export async function saveTimelineData(timelineData: TimelineData): Promise<void> {
  const { error } = await supabase
    .from('timeline_data')
    .upsert({ key: 'main', data: timelineData, updated_at: new Date().toISOString() });

  if (error) throw error;
}

// ─────────────────────────────────────────────
// Image Upload (壓縮 → Storage → 回傳 URL)
// ─────────────────────────────────────────────

/** 讀取圖片的原始寬高 */
function getImageNaturalSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * 將 File 物件壓縮後上傳到 Supabase Storage。
 * 同時產生縮圖。回傳 { imageUrl, thumbnailUrl }。
 * 壓縮尺寸為原始圖片的 50%（最小不低於 800px）。
 */
export async function uploadCharacterImage(
  file: File,
  characterId: string
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const uid = uuidv4();
  const baseName = `${characterId}_${uid}`;

  // 讀取原始尺寸，計算 50%（最小保留 800px，避免小圖被放大判斷錯誤）
  const { width, height } = await getImageNaturalSize(file);
  const longestSide = Math.max(width, height);
  const targetSize = longestSide > 0 ? Math.max(Math.round(longestSide * 0.5), 800) : 1600;

  // 1. 壓縮原圖（原始 50%，不限制 MB，WebP 保留透明背景）
  const compressed = await imageCompression(file, {
    maxSizeMB: 5,
    maxWidthOrHeight: targetSize,
    useWebWorker: true,
    fileType: 'image/webp',
  });

  // 2. 壓縮縮圖 (max 300px, max 60KB)
  const thumbnail = await imageCompression(file, {
    maxSizeMB: 0.06,
    maxWidthOrHeight: 300,
    useWebWorker: true,
    fileType: 'image/webp',
  });

  // 3. 上傳原圖
  const { error: imgError } = await supabase.storage
    .from('character-images')
    .upload(`${baseName}.webp`, compressed, { upsert: true, contentType: 'image/webp' });

  if (imgError) throw imgError;

  // 4. 上傳縮圖
  const { error: thumbError } = await supabase.storage
    .from('character-images')
    .upload(`thumbnails/${baseName}.webp`, thumbnail, { upsert: true, contentType: 'image/webp' });

  if (thumbError) throw thumbError;

  // 5. 取得公開 URL
  const { data: imgUrlData } = supabase.storage
    .from('character-images')
    .getPublicUrl(`${baseName}.webp`);

  const { data: thumbUrlData } = supabase.storage
    .from('character-images')
    .getPublicUrl(`thumbnails/${baseName}.webp`);

  return {
    imageUrl: imgUrlData.publicUrl,
    thumbnailUrl: thumbUrlData.publicUrl,
  };
}

/**
 * 將 base64 Data URI 轉換後上傳（用於頭像裁切）。
 * 回傳 Storage 公開 URL。
 */
export async function uploadAvatarFromBase64(
  base64DataUrl: string,
  characterId: string
): Promise<string> {
  const uid = uuidv4();
  const path = `avatars/${characterId}_${uid}.webp`;

  // base64 → Blob
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();

  // 壓縮頭像 (max 400px, max 80KB, WebP 保留透明背景)
  const avatarFile = new File([blob], 'avatar.webp', { type: 'image/webp' });
  const compressed = await imageCompression(avatarFile, {
    maxSizeMB: 0.08,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: 'image/webp',
  });

  const { error } = await supabase.storage
    .from('character-images')
    .upload(path, compressed, { upsert: true, contentType: 'image/webp' });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('character-images')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// ─────────────────────────────────────────────
// Storage Image Listing（直接掃描 Storage bucket）
// ─────────────────────────────────────────────

export interface StorageImageItem {
  id: string;           // 唯一識別（檔名）
  storagePath: string;  // bucket 內路徑
  imageUrl: string;     // 公開 URL
  thumbnailUrl: string; // 縮圖公開 URL（可能不存在）
  charIdPrefix: string; // 從檔名提取的角色 ID 前綴（用來反查）
}

/** 掃描 character-images bucket 根目錄的所有圖片檔（排除資料夾） */
export async function listStorageImages(): Promise<StorageImageItem[]> {
  const { data, error } = await supabase.storage
    .from('character-images')
    .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

  if (error || !data) return [];

  // 只取真實檔案（有 id），排除子資料夾（thumbnails/, avatars/）
  const files = data.filter(f => f.id && f.name && !f.name.endsWith('/'));

  return files.map(file => {
    const { data: urlData } = supabase.storage
      .from('character-images')
      .getPublicUrl(file.name);

    const { data: thumbData } = supabase.storage
      .from('character-images')
      .getPublicUrl(`thumbnails/${file.name}`);

    // 從檔名提取角色 ID 前綴（格式: charId_uuid.ext）
    const charIdPrefix = file.name.split('_')[0] || '';

    return {
      id: file.name,
      storagePath: file.name,
      imageUrl: urlData.publicUrl,
      thumbnailUrl: thumbData.publicUrl,
      charIdPrefix,
    };
  });
}

// ─────────────────────────────────────────────
// Users (使用者代碼登入)
// ─────────────────────────────────────────────

export async function getUserByName(name: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('code, name')
    .eq('name', name.trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as AppUser;
}

export async function getUserByCode(code: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('code, name')
    .eq('code', code.trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as AppUser;
}

export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('code, name')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as AppUser[];
}

export async function addUser(code: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .insert({ code: code.trim(), name: name.trim() });

  if (error) throw error;
}

export async function deleteUser(code: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('code', code);

  if (error) throw error;
}

export async function updateUser(oldCode: string, newCode: string, newName: string): Promise<void> {
  if (oldCode === newCode.trim()) {
    // Only name changed — simple update
    const { error } = await supabase
      .from('users')
      .update({ name: newName.trim() })
      .eq('code', oldCode);
    if (error) throw error;
  } else {
    // Code changed — delete old and insert new to avoid PK conflicts
    const { error: insErr } = await supabase
      .from('users')
      .insert({ code: newCode.trim(), name: newName.trim() });
    if (insErr) throw insErr;
    const { error: delErr } = await supabase
      .from('users')
      .delete()
      .eq('code', oldCode);
    if (delErr) throw delErr;
  }
}
