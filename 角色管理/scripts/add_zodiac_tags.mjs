/**
 * 在 Supabase app_data 的「星座」TagCategory 裡補上 12 個星座 Tag，
 * 並把 selectionMode 設為 'single'（每個角色只能選一個星座）。
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://haptiezxyvrxhrcoputp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ZODIAC_LABELS = [
  '牡羊座', '金牛座', '雙子座', '巨蟹座',
  '獅子座', '處女座', '天秤座', '天蠍座',
  '射手座', '摩羯座', '水瓶座', '雙魚座',
];

// ── 讀取 app_data ──────────────────────────────────
const { data: row, error } = await supabase
  .from('app_data')
  .select('data')
  .eq('key', 'main')
  .single();

if (error) { console.error('讀取失敗:', error.message); process.exit(1); }

const appData = row.data;
const tagCategories = appData.tagCategories || [];

// ── 找「星座」類別 ─────────────────────────────────
let zodiacCat = tagCategories.find(c => c.name === '星座');
if (!zodiacCat) {
  console.log('⚠️  找不到「星座」類別，自動建立...');
  zodiacCat = { id: randomUUID(), name: '星座', color: '#818cf8', tags: [], selectionMode: 'single' };
  tagCategories.push(zodiacCat);
}

// 強制 selectionMode = 'single'
zodiacCat.selectionMode = 'single';

// ── 補上缺少的星座 Tag ────────────────────────────
const existingLabels = new Set((zodiacCat.tags || []).map(t => t.label));
let added = 0;
for (const label of ZODIAC_LABELS) {
  if (!existingLabels.has(label)) {
    zodiacCat.tags = zodiacCat.tags || [];
    zodiacCat.tags.push({ id: randomUUID(), label });
    console.log(`  ＋ 新增：${label}`);
    added++;
  } else {
    console.log(`  ✓ 已存在：${label}`);
  }
}

// ── 寫回 Supabase ─────────────────────────────────
const { error: saveErr } = await supabase
  .from('app_data')
  .upsert({ key: 'main', data: appData, updated_at: new Date().toISOString() });

if (saveErr) { console.error('寫入失敗:', saveErr.message); process.exit(1); }

console.log(`\n✅ 完成！共新增 ${added} 個星座 Tag，selectionMode 設為 single`);
