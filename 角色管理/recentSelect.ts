export const DIALOGUE_CHARACTER_RECENT_KEY = 'dialogue-query-recent-characters';

const MAX_RECENT = 12;

type RecentStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readRecent(storage: RecentStorage, key: string): string[] {
  try {
    const raw = storage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function pushRecent(storage: RecentStorage, key: string, value: string): string[] {
  const next = value.trim();
  if (!next) return readRecent(storage, key);
  const recent = [next, ...readRecent(storage, key).filter(item => item !== next)].slice(0, MAX_RECENT);
  storage.setItem(key, JSON.stringify(recent));
  return recent;
}

export function orderByRecent<T extends { value: string; label: string }>(options: T[], recent: string[]): T[] {
  if (recent.length === 0) return options;
  const rank = new Map(recent.map((name, index) => [name, index]));
  return [...options].sort((a, b) => {
    const aRank = rank.has(a.value) ? rank.get(a.value)! : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.value) ? rank.get(b.value)! : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.label.localeCompare(b.label, 'zh-Hant');
  });
}
