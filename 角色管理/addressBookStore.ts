import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nameStems } from './addressNames';
import {
  emptyAddressBook,
  inferTargetKind,
  parseAddressBookFile,
  serializeAddressMarkdown,
  type AddressBook,
  type AddressEntry,
  type AddressIdentityTerm,
} from './parseAddressBook';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(moduleDir, '.env');
let envConfig: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envConfig[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

export const CHARACTERS_DIR = path.isAbsolute(envConfig.CHARACTERS_DIR || '')
  ? envConfig.CHARACTERS_DIR
  : path.resolve(
      moduleDir,
      envConfig.CHARACTERS_DIR ||
        'c:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/character',
    );

export interface FolderMatch {
  folder: string;
  dirPath: string;
  mdPath: string;
}

function folderLabel(folder: string): string {
  return folder.includes('_') ? folder.split('_').slice(1).join('_') : folder;
}

export function listCharacterFolders(): FolderMatch[] {
  if (!fs.existsSync(CHARACTERS_DIR)) return [];
  return fs
    .readdirSync(CHARACTERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      folder: entry.name,
      dirPath: path.join(CHARACTERS_DIR, entry.name),
      mdPath: path.join(CHARACTERS_DIR, entry.name, '稱呼表.md'),
    }));
}

function folderStems(folder: string): Set<string> {
  const label = folderLabel(folder);
  return new Set([...nameStems(folder), ...nameStems(label)]);
}

/**
 * 列表全名、短名、資料夾名、角色代碼都可對到同一個資料夾。
 * 芙瑞妲・米契爾斯 → cr905_芙瑞妲；蘇妮塔・巴隆 → 蘇妮塔（沒有代碼就不加 cr 前綴）。
 * 對到多個資料夾時不猜。
 */
export function findCharacterFolder(query: string): FolderMatch | null {
  const q = query.trim();
  if (!q) return null;
  const folders = listCharacterFolders();
  const stems = nameStems(q);
  const stemmed = folders.filter(item => stems.some(stem => folderStems(item.folder).has(stem)));
  if (stemmed.length === 1) return stemmed[0];

  const qLower = q.toLowerCase();
  const byCode = folders.filter(item => {
    const folder = item.folder.toLowerCase();
    return folder === qLower || folder.startsWith(`${qLower}_`);
  });
  if (byCode.length === 1) return byCode[0];

  const includes = folders.filter(item => item.folder.includes(q) || folderLabel(item.folder).includes(q));
  if (includes.length === 1) return includes[0];
  return null;
}

function bookPath(match: FolderMatch): string {
  const jsonPath = path.join(match.dirPath, '稱呼表.json');
  if (fs.existsSync(match.mdPath)) return match.mdPath;
  if (fs.existsSync(jsonPath)) return jsonPath;
  return match.mdPath;
}

export function loadAddressBook(query: string): { match: FolderMatch; book: AddressBook } | null {
  const match = findCharacterFolder(query);
  if (!match) return null;
  const filePath = bookPath(match);
  if (!fs.existsSync(filePath)) {
    const character = folderLabel(match.folder);
    const characterCode = match.folder.match(/^cr\d+/i)?.[0];
    return { match, book: emptyAddressBook(character, characterCode) };
  }
  const book = parseAddressBookFile(fs.readFileSync(filePath, 'utf-8'), filePath, match.folder);
  return { match, book };
}

export function saveAddressBook(match: FolderMatch, book: AddressBook): string {
  const markdown = serializeAddressMarkdown(book);
  fs.writeFileSync(match.mdPath, markdown, 'utf-8');
  return match.mdPath;
}

export function listAddressBooks(): Array<AddressBook & { folder: string }> {
  return listCharacterFolders()
    .filter(item => fs.existsSync(item.mdPath) || fs.existsSync(path.join(item.dirPath, '稱呼表.json')))
    .map(item => {
      const filePath = bookPath(item);
      const book = parseAddressBookFile(fs.readFileSync(filePath, 'utf-8'), filePath, item.folder);
      return { ...book, folder: item.folder };
    })
    .sort((a, b) => a.character.localeCompare(b.character, 'zh-Hant'));
}

export function upsertAddressEntry(
  query: string,
  direction: 'outgoing' | 'incoming',
  entry: Omit<AddressEntry, 'targetKind'> & { targetKind?: AddressEntry['targetKind'] },
): { path: string; book: AddressBook } {
  const loaded = loadAddressBook(query);
  if (!loaded) throw new Error(`找不到角色資料夾：${query}`);
  const nextEntry: AddressEntry = {
    ...entry,
    targetKind: entry.targetKind || inferTargetKind(entry.target),
    nameAddress: entry.nameAddress || [],
    pronoun: entry.pronoun || [],
    quotes: entry.quotes || [],
  };
  const list = loaded.book[direction].filter(item => item.target !== nextEntry.target);
  list.push(nextEntry);
  const book = { ...loaded.book, [direction]: list };
  const savedPath = saveAddressBook(loaded.match, book);
  return { path: savedPath, book };
}

export function upsertIdentityTerm(
  query: string,
  term: AddressIdentityTerm,
): { path: string; book: AddressBook } {
  const loaded = loadAddressBook(query);
  if (!loaded) throw new Error(`找不到角色資料夾：${query}`);
  const identity = loaded.book.identity.filter(item => {
    if (term.kind === 'self') {
      return !(item.kind === 'self' && item.terms.join('／') === term.terms.join('／'));
    }
    return item.kind !== term.kind;
  });
  identity.push(term);
  const canonicalName = identity.find(item => item.kind === 'canonical')?.terms[0] || loaded.book.canonicalName;
  const narrationName = identity.find(item => item.kind === 'narration')?.terms[0] || loaded.book.narrationName;
  const book = { ...loaded.book, identity, canonicalName, narrationName };
  const savedPath = saveAddressBook(loaded.match, book);
  return { path: savedPath, book };
}

export function ensureAddressBook(query: string): { path: string; book: AddressBook; created: boolean } {
  const match = findCharacterFolder(query);
  if (!match) throw new Error(`找不到角色資料夾：${query}`);
  const existed = fs.existsSync(match.mdPath);
  const loaded = loadAddressBook(query);
  if (!loaded) throw new Error(`找不到角色資料夾：${query}`);
  const savedPath = saveAddressBook(match, loaded.book);
  return { path: savedPath, book: loaded.book, created: !existed };
}
