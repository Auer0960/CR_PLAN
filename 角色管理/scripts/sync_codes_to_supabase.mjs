/**
 * 從角色列表讀取 name→code 對應，
 * 抓 Supabase app_data，為每個角色補上 characterCode，
 * 再寫回 Supabase。
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Supabase 設定 ──────────────────────────────────
const SUPABASE_URL = 'https://haptiezxyvrxhrcoputp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 讀角色列表，建立 name → code 對照表 ──────────────
const listPath = path.resolve(
  'C:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/world_settings/CR角色列表.txt'
);
const listRaw = readFileSync(listPath, 'utf8');

const nameToCode = new Map();
for (const line of listRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const [code, ...nameParts] = trimmed.split('\t');
  const name = nameParts.join('').trim();
  if (code && name) {
    nameToCode.set(name, code);
    nameToCode.set(name.replace(/\s/g, ''), code);
  }
}
console.log(`📋 角色列表：${Math.ceil(nameToCode.size / 2)} 筆`);

// ── 抓 Supabase app_data ──────────────────────────
console.log('\n⬇️  從 Supabase 讀取 app_data...');
const { data: row, error: fetchErr } = await supabase
  .from('app_data')
  .select('data')
  .eq('key', 'main')
  .single();

if (fetchErr) {
  console.error('❌ 讀取失敗：', fetchErr.message);
  process.exit(1);
}

const appData = row.data;
const characters = appData.characters;

if (!Array.isArray(characters)) {
  console.error('❌ characters 不是陣列，格式異常');
  process.exit(1);
}

console.log(`✅ 讀取成功，共 ${characters.length} 個角色\n`);

// ── 補上 characterCode ────────────────────────────
// 也建立「角色列表名稱」陣列，用於前綴比對
const listEntries = Array.from(nameToCode.entries())
  .filter(([k]) => !k.replace(/\s/g, '').includes(k.replace(/\s/g, '').slice(0,-1))) // 去掉重複的no-space版本
  ;
// 重新建一個只有「原始名稱」的陣列（含空格版本）
const rawListNames = [];
for (const line of listRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const [code, ...nameParts] = trimmed.split('\t');
  const name = nameParts.join('').trim();
  if (code && name) rawListNames.push({ code, name });
}

let matched = 0;
const unmatched = [];

for (const char of characters) {
  const charName = (char.name || '').trim();
  const charNameNoSpace = charName.replace(/[\s‧．・]/g, '');

  // 1. 完整比對（含去分隔符號版本）
  let code = nameToCode.get(charName) || nameToCode.get(charNameNoSpace);

  // 2. 角色列表的名稱是 charName 的「前綴」（e.g. 芙瑞妲 → 芙瑞妲．米契爾斯）
  if (!code) {
    const found = rawListNames.find(({ name }) => {
      const n = name.replace(/\s/g, '');
      return charNameNoSpace.startsWith(n) && n.length >= 2;
    });
    if (found) code = found.code;
  }

  if (code) {
    char.characterCode = code;
    matched++;
    console.log(`  ✓ ${char.name.padEnd(14)} → ${code}`);
  } else if (!char.characterCode) {
    unmatched.push(char.name);
  }
}

console.log(`\n✅ 成功填入：${matched} 筆`);
if (unmatched.length > 0) {
  console.log(`⚠️  無對應編號（${unmatched.length} 筆）：${unmatched.join('、')}`);
}

// ── 寫回 Supabase ─────────────────────────────────
console.log('\n⬆️  寫回 Supabase...');
const { error: saveErr } = await supabase
  .from('app_data')
  .upsert({ key: 'main', data: appData, updated_at: new Date().toISOString() });

if (saveErr) {
  console.error('❌ 寫入失敗：', saveErr.message);
  process.exit(1);
}

console.log('✅ Supabase 更新成功！重新整理頁面即可看到編號。');
