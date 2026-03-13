import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 讀取角色列表
const listPath = path.resolve(
  'C:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/world_settings/CR角色列表.txt'
);
const listRaw = readFileSync(listPath, 'utf8');

// 建立 name → code 對照表
const nameToCode = new Map();
for (const line of listRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const [code, ...nameParts] = trimmed.split('\t');
  const name = nameParts.join('\t').trim();
  if (code && name) {
    nameToCode.set(name, code);
    // 也加入去掉空格的版本，方便模糊比對
    nameToCode.set(name.replace(/\s/g, ''), code);
  }
}

console.log('角色列表載入：', nameToCode.size / 2, '筆（含去空格版本）');

// 讀取 user_data.json
const dataPath = path.resolve(__dirname, '../user_data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const characters = data.characters || {};

let matched = 0;
let unmatched = [];

for (const [id, char] of Object.entries(characters)) {
  const name = (char.name || '').trim();
  const nameNoSpace = name.replace(/\s/g, '');
  const code = nameToCode.get(name) || nameToCode.get(nameNoSpace);

  if (code) {
    char.characterCode = code;
    matched++;
  } else {
    unmatched.push(name);
  }
}

console.log(`\n✅ 成功填入：${matched} 筆`);
if (unmatched.length > 0) {
  console.log(`⚠️  未找到對應編號（${unmatched.length} 筆）：`);
  unmatched.forEach(n => console.log('  -', n));
}

// 寫回
writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log('\n✅ user_data.json 已更新');
