import { compactName, namesReferToSameCharacter } from './addressNames';
import type { DialogueCharacterCorpus, DialogueCharacterIndex } from './dialogueCorpusTypes';
import type { AddressBook } from './types';

function publicAssetUrl(relativePath: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/${relativePath.replace(/^\//, '')}`;
}

function apiUrls(path: string): string[] {
  const prefix = window.location.pathname.startsWith('/CR_PLAN') ? '/CR_PLAN' : '';
  const withPrefix = `${prefix}${path}`;
  return withPrefix === path ? [path] : [withPrefix, path];
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (type.includes('text/html')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function matchDialogueIndex(
  index: DialogueCharacterIndex[],
  name: string,
): DialogueCharacterIndex | null {
  const hits = index.filter(item => namesReferToSameCharacter(item.character, name));
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) return null;
  const full = compactName(name);
  return hits.find(item => compactName(item.character) === full) || null;
}

export async function fetchDialogueIndex(): Promise<DialogueCharacterIndex[]> {
  for (const url of apiUrls('/api/dialogue-corpus')) {
    const data = await fetchJson(url);
    if (Array.isArray(data?.characters)) return data.characters as DialogueCharacterIndex[];
  }
  const data = await fetchJson(publicAssetUrl('dialogue-corpus/index.json'));
  if (Array.isArray(data?.characters)) return data.characters as DialogueCharacterIndex[];
  return [];
}

async function fetchStaticCorpus(character: string): Promise<DialogueCharacterCorpus | null> {
  const data = await fetchJson(publicAssetUrl('dialogue-corpus/index.json'));
  const rows = Array.isArray(data?.characters) ? (data.characters as DialogueCharacterIndex[]) : [];
  const hit = matchDialogueIndex(rows, character);
  if (!hit) return null;
  const corpusData = await fetchJson(
    publicAssetUrl(`dialogue-corpus/${encodeURIComponent(hit.folder)}.json`),
  );
  return (corpusData?.corpus as DialogueCharacterCorpus) || null;
}

export async function fetchDialogueCorpus(character: string): Promise<DialogueCharacterCorpus | null> {
  const encoded = encodeURIComponent(character);
  for (const url of apiUrls(`/api/dialogue-corpus?character=${encoded}`)) {
    const data = await fetchJson(url);
    if (data?.corpus) return data.corpus as DialogueCharacterCorpus;
  }
  return fetchStaticCorpus(character);
}

export async function fetchAddressBooks(): Promise<AddressBook[]> {
  for (const url of apiUrls('/api/address-books')) {
    const data = await fetchJson(url);
    if (Array.isArray(data?.books)) return data.books as AddressBook[];
  }
  const data = await fetchJson(publicAssetUrl('address-books.json'));
  if (Array.isArray(data?.books)) return data.books as AddressBook[];
  return [];
}
