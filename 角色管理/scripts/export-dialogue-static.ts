/**
 * 把母專案 character/ 的台詞與稱呼表寫成 GitHub Pages 能直接讀的靜態 JSON。
 * 建構機沒有那份角色資料時，沿用已經提交的靜態檔，不讓部署失敗。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHARACTERS_DIR, listAddressBooks } from '../addressBookStore';
import { listDialogueCorpusIndex, loadDialogueCorpus } from '../dialogueCorpus';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(scriptDir, '../public');
const corpusDir = path.join(publicDir, 'dialogue-corpus');
const booksFile = path.join(publicDir, 'address-books.json');
const indexFile = path.join(corpusDir, 'index.json');

function staticAlreadyExported(): boolean {
  return fs.existsSync(indexFile) && fs.existsSync(booksFile);
}

if (!fs.existsSync(CHARACTERS_DIR)) {
  if (staticAlreadyExported()) {
    console.log(`角色資料夾不在這台機器上，沿用已提交的靜態台詞：${CHARACTERS_DIR}`);
    process.exit(0);
  }
  console.error(`找不到角色資料夾，也沒有可沿用的靜態台詞：${CHARACTERS_DIR}`);
  process.exit(1);
}

fs.mkdirSync(corpusDir, { recursive: true });
for (const name of fs.readdirSync(corpusDir)) {
  if (name.endsWith('.json')) fs.unlinkSync(path.join(corpusDir, name));
}

const index = listDialogueCorpusIndex().map(row => {
  const file = `${row.folder}.json`;
  const corpus = loadDialogueCorpus(row.folder);
  if (!corpus) {
    throw new Error(`索引有角色但讀不到台詞：${row.folder}`);
  }
  fs.writeFileSync(path.join(corpusDir, file), JSON.stringify({ corpus }), 'utf-8');
  return { ...row, file };
});

fs.writeFileSync(indexFile, JSON.stringify({ characters: index }), 'utf-8');

const books = listAddressBooks();
fs.writeFileSync(booksFile, JSON.stringify({ books }), 'utf-8');

const corpusBytes = fs.readdirSync(corpusDir).reduce((sum, name) => {
  return sum + fs.statSync(path.join(corpusDir, name)).size;
}, 0);
console.log(
  `已寫出台詞 ${index.length} 人、稱呼表 ${books.length} 份，約 ${(corpusBytes / 1024 / 1024).toFixed(1)} MB`,
);
