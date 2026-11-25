import fs from 'fs';
import path from 'path';
import { compactName } from './addressNames';
import { findCharacterFolder, listCharacterFolders } from './addressBookStore';
import { tagForRelativePath } from './dialogueTags';
import type {
  DialogueCharacterCorpus,
  DialogueCharacterIndex,
  DialogueSource,
  DialogueSourceMeta,
} from './dialogueCorpusTypes';

export type {
  DialogueCharacterCorpus,
  DialogueCharacterIndex,
  DialogueSource,
  DialogueSourceMeta,
} from './dialogueCorpusTypes';
export { stripCostumeCode, tagForRelativePath, filterSourceLines } from './dialogueTags';

function folderLabel(folder: string): string {
  return folder.includes('_') ? folder.split('_').slice(1).join('_') : folder;
}

function normalizeRel(rel: string): string {
  return rel.split(path.sep).join('/');
}

function walkFiles(dirPath: string, baseDir: string, out: string[]): void {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, baseDir, out);
      continue;
    }
    if (!entry.isFile()) continue;
    out.push(path.relative(baseDir, full));
  }
}

export function collectSourcesForFolder(dirPath: string): DialogueSourceMeta[] {
  const rels: string[] = [];
  walkFiles(dirPath, dirPath, rels);
  const sources: DialogueSourceMeta[] = [];
  for (const rel of rels.sort((a, b) => a.localeCompare(b, 'zh-Hant'))) {
    const normalized = normalizeRel(rel);
    const tag = tagForRelativePath(normalized);
    if (!tag) continue;
    sources.push({
      id: normalized,
      tag,
      relativePath: normalized,
      fileName: path.basename(rel),
    });
  }
  return sources;
}

export function listDialogueCorpusIndex(): DialogueCharacterIndex[] {
  const rows: DialogueCharacterIndex[] = [];
  for (const item of listCharacterFolders()) {
    const sources = collectSourcesForFolder(item.dirPath);
    if (sources.length === 0) continue;
    rows.push({
      character: folderLabel(item.folder),
      characterCode: item.folder.match(/^cr\d+/i)?.[0],
      folder: item.folder,
      sources,
    });
  }
  return rows.sort((a, b) => a.character.localeCompare(b.character, 'zh-Hant'));
}

function resolveFolderByName(query: string) {
  const direct = findCharacterFolder(query);
  if (direct) return direct;
  const q = compactName(query);
  if (!q) return null;
  const folders = listCharacterFolders();
  return (
    folders.find(item => compactName(folderLabel(item.folder)) === q) ||
    folders.find(item => compactName(item.folder) === q) ||
    null
  );
}

export function loadDialogueCorpus(query: string): DialogueCharacterCorpus | null {
  const match = resolveFolderByName(query);
  if (!match) return null;
  const metas = collectSourcesForFolder(match.dirPath);
  const sources: DialogueSource[] = metas.map(meta => {
    const fullPath = path.join(match.dirPath, meta.relativePath);
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      content = '';
    }
    return { ...meta, content };
  });
  return {
    character: folderLabel(match.folder),
    characterCode: match.folder.match(/^cr\d+/i)?.[0],
    folder: match.folder,
    sources,
  };
}
