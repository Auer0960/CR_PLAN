import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';

// ── Supabase 設定 ─────────────────────────────────
const SUPABASE_URL = 'https://haptiezxyvrxhrcoputp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── 讀所有角色設定檔，建立 dirName → intro 對照表 ─────────────
const charBase = 'C:/Users/Auer0960/Desktop/\u5c08\u5340/CR\u5c08\u6848/\u6587\u4ef6/CursorAI_CR\u5c08\u7528/CR\u6bcd\u5c08\u6848\u5287\u60c5\u8cc7\u6599/character';

const nameToIntro = new Map();

let dirs;
try {
  dirs = readdirSync(charBase);
  console.log(`\u{1F4C1} \u8b80\u5230 ${dirs.length} \u500b\u89d2\u8272\u8cc7\u6599\u593e`);
} catch (e) {
  console.error('\u274c \u7121\u6cd5\u8b80\u53d6\u89d2\u8272\u8cc7\u6599\u593e\uff1a', e.message);
  process.exit(1);
}

for (const dirName of dirs) {
  const fp = path.join(charBase, dirName, dirName + '\u4eba\u7269\u8a2d\u5b9a.md');
  if (!existsSync(fp)) continue;

  const lines = readFileSync(fp, 'utf8').split('\n');
  const introLine = lines.find(l => l.includes('\u4e00\u8a9e\u4ecb\u7d39'));
  if (!introLine) continue;

  const m = introLine.match(/\u4e00\u8a9e\u4ecb\u7d39[\uff1a:]\s*(.+)/);
  if (!m) continue;

  const intro = m[1].trim();
  nameToIntro.set(dirName, intro);
  nameToIntro.set(dirName.replace(/[\s\u2027\uff0e\u30fb]/g, ''), intro);
}
console.log(`\u{1F4CB} \u627e\u5230 ${Math.ceil(nameToIntro.size / 2)} \u7b46\u4e00\u8a9e\u4ecb\u7d39`);

// ── 從 Supabase 取 app_data ────────────────────────
console.log('\n\u2b07\ufe0f  \u5f9e Supabase \u8b80\u53d6 app_data...');
const { data: row, error: fetchErr } = await supabase
  .from('app_data')
  .select('data')
  .eq('key', 'main')
  .single();

if (fetchErr) {
  console.error('\u274c \u8b80\u53d6\u5931\u6557\uff1a', fetchErr.message);
  process.exit(1);
}

const appData = row.data;
const characters = appData.characters;

if (!Array.isArray(characters)) {
  console.error('\u274c characters \u4e0d\u662f\u9663\u5217\uff0c\u683c\u5f0f\u7570\u5e38');
  process.exit(1);
}
console.log(`\u2705 \u8b80\u53d6\u6210\u529f\uff0c\u5171 ${characters.length} \u500b\u89d2\u8272\n`);

// ── 比對並填入 introduction ────────────────────────────────
let matched = 0;
const unmatched = [];

for (const char of characters) {
  const charName = (char.name || '').trim();
  const charNameNoSpace = charName.replace(/[\s\u2027\uff0e\u30fb]/g, '');

  // 1. 完整比對（含去分隔符號版本）
  let intro = nameToIntro.get(charName) || nameToIntro.get(charNameNoSpace);

  // 2. 前綴比對（資料夾名稱是 charName 的前綴）
  if (!intro) {
    for (const [key, val] of nameToIntro) {
      const keyNoSpace = key.replace(/[\s\u2027\uff0e\u30fb]/g, '');
      if (keyNoSpace.length >= 2 && charNameNoSpace.startsWith(keyNoSpace)) {
        intro = val;
        break;
      }
    }
  }

  if (intro) {
    char.introduction = intro;
    matched++;
    console.log(`  \u2713 ${char.name.padEnd(14)} \u2192 ${intro}`);
  } else {
    if (!char.introduction) {
      unmatched.push(char.name);
    } else {
      console.log(`  \u2b1c ${char.name.padEnd(14)} \u4fdd\u7559\u65e2\u6709\u4ecb\u7d39`);
    }
  }
}

console.log(`\n\u2705 \u6210\u529f\u586b\u5165 ${matched} \u7b46`);
if (unmatched.length) {
  console.log(`\u26a0\ufe0f  \u672a\u5339\u914d\uff08${unmatched.length}\uff09\uff1a`, unmatched.join('\u3001'));
}

// ── 寫回 Supabase ─────────────────────────────────
console.log('\n\u2b06\ufe0f  \u5beb\u56de Supabase...');
const { error: saveErr } = await supabase
  .from('app_data')
  .upsert({ key: 'main', data: appData, updated_at: new Date().toISOString() });

if (saveErr) {
  console.error('\u274c \u5beb\u5165\u5931\u6557\uff1a', saveErr.message);
  process.exit(1);
}
console.log('\u{1F680} Supabase \u66f4\u65b0\u6210\u529f\uff01');
