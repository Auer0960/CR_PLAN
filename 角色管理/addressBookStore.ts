import fs from 'fs';
import path from 'path';
import {
  emptyAddressBook,
  inferTargetKind,
  parseAddressBookFile,
  serializeAddressMarkdown,
  type AddressBook,
  type AddressEntry,
  type AddressIdentityTerm,
} from './parseAddressBook';

const envPath = path.resolve(__dirname, '.env');
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
      __dirname,
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

export function findCharacterFolder(query: string): FolderMatch | null {
  const q = query.trim();
  if (!q) return null;
  const folders = listCharacterFolders();
  const exact = folders.find(item => item.folder === q || folderLabel(item.folder) === q);
  if (exact) return exact;
  const code = folders.find(item => item.folder.toLowerCase().startsWith(`${q.toLowerCase()}_`) || item.folder.toLowerCase() === q.toLowerCase());
  if (code) return code;
  const includes = folders.filter(item => item.folder.includes(q) || folderLabel(item.folder).includes(q));
  return includes.length === 1 ? includes[0] : includes[0] || null;
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
