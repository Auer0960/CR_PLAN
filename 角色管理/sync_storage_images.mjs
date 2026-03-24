/**
 * sync_storage_images.mjs
 * 一次性腳本：掃描 Supabase Storage，補齊沒有 characterImages 記錄的圖片
 * 執行：node C:\Users\Auer0960\sync_storage_images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://haptiezxyvrxhrcoputp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('=== 掃描 Storage 圖片並補齊 characterImages 記錄 ===\n');

  // 1. 取得現有 app_data
  const { data: rows, error: loadErr } = await supabase
    .from('app_data')
    .select('data')
    .eq('key', 'main')
    .single();
  if (loadErr) throw loadErr;

  const appData = rows.data;
  const characters = appData.characters || [];
  const characterImages = appData.characterImages || [];

  console.log(`角色數: ${characters.length}，現有 characterImages: ${characterImages.length}`);

  // 2. 建立 characterId → character 的查詢 map
  const charMap = new Map(characters.map(c => [c.id, c]));

  // 3. 列出 Storage 根目錄的所有圖片（排除 thumbnails/ 和 avatars/）
  const { data: files, error: listErr } = await supabase.storage
    .from('character-images')
    .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
  if (listErr) throw listErr;

  const imageFiles = files.filter(f => f.id && f.name && !f.name.endsWith('/'));
  console.log(`Storage 主目錄圖片數: ${imageFiles.length}\n`);

  // 4. 建立現有 characterImages 的 URL set（用來判斷是否已有記錄）
  const existingUrls = new Set(characterImages.map(img => img.imageDataUrl));

  // 5. 逐一處理 Storage 圖片
  const newRecords = [];
  const unknownCharIds = new Set();

  for (const file of imageFiles) {
    const { data: urlData } = supabase.storage
      .from('character-images')
      .getPublicUrl(file.name);
    const { data: thumbData } = supabase.storage
      .from('character-images')
      .getPublicUrl(`thumbnails/${file.name}`);

    const imageUrl = urlData.publicUrl;
    const thumbUrl = thumbData.publicUrl;

    // 已有記錄就跳過
    if (existingUrls.has(imageUrl)) continue;

    // 從檔名提取 charId（格式：charId_uuid.webp 或 charId_anything.webp）
    const charId = file.name.split('_')[0] || '';
    const character = charMap.get(charId);

    if (!character) {
      unknownCharIds.add(charId);
      console.log(`  ⚠️  找不到角色 ID: ${charId}（檔案: ${file.name}）`);
      continue;
    }

    newRecords.push({
      id: randomUUID(),
      characterId: charId,
      imageDataUrl: imageUrl,
      thumbnailUrl: thumbUrl,
      tagIds: [],
      notes: '',
    });
    console.log(`  ✅ 補新記錄：${character.name} → ${file.name}`);
  }

  if (unknownCharIds.size > 0) {
    console.log(`\n找不到角色的 charId（${unknownCharIds.size} 個）：`);
    for (const id of unknownCharIds) {
      console.log(`  - ${id}`);
    }
  }

  if (newRecords.length === 0) {
    console.log('\n✅ 所有 Storage 圖片都已有 characterImages 記錄，無需補齊！');
    return;
  }

  console.log(`\n準備補齊 ${newRecords.length} 筆記錄，寫入 Supabase...`);

  // 6. 更新 app_data
  appData.characterImages = [...characterImages, ...newRecords];

  const { error: saveErr } = await supabase
    .from('app_data')
    .upsert({ key: 'main', data: appData, updated_at: new Date().toISOString() });

  if (saveErr) throw saveErr;

  console.log(`✅ 成功補齊 ${newRecords.length} 筆 characterImages 記錄！`);
  console.log(`   更新後總筆數：${appData.characterImages.length}`);
}

main().catch(err => {
  console.error('❌ 執行失敗:', err);
  process.exit(1);
});
