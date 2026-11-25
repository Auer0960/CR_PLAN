/** 比對時拿掉空白，讓「高城 嵐花」與「高城嵐花」視為同一人。 */
export function compactName(name: string): string {
  return name.replace(/\s+/g, '');
}

/**
 * 比對用的名字鍵。
 * 全名「芙瑞妲・米契爾斯」會帶出資料夾用的短名「芙瑞妲」；
 * 不把「・」後面的姓氏單獨拿來對人，避免「巴隆」誤中「蘇妮塔・巴隆」。
 */
export function nameStems(name: string): string[] {
  const compact = compactName(name).trim();
  if (!compact) return [];
  const stems = [compact];
  const head = compact.split(/[・·•]/)[0];
  if (head && head !== compact) stems.push(head);
  return stems;
}

/** 列表全名、稱呼表短名、資料夾名，只要有一個鍵重疊就視為同一人。 */
export function namesReferToSameCharacter(a: string, b: string): boolean {
  const left = nameStems(a);
  if (left.length === 0) return false;
  const right = new Set(nameStems(b));
  return left.some(stem => right.has(stem));
}

export function bookMatchesSpeaker(
  book: { character: string; canonicalName?: string },
  name: string,
): boolean {
  if (!name.trim()) return false;
  if (namesReferToSameCharacter(book.character, name)) return true;
  if (book.canonicalName && namesReferToSameCharacter(book.canonicalName, name)) return true;
  return false;
}

/**
 * 角色列表上的寫法優先（芙瑞妲・米契爾斯），同一個角色不再另列資料夾短名。
 * primary 先收，aliases 只補還沒出現的人。
 */
export function preferCharacterLabels(primary: string[], aliases: string[]): string[] {
  const chosen: string[] = [];
  const taken = (name: string) => chosen.some(item => namesReferToSameCharacter(item, name));
  for (const name of [...primary, ...aliases]) {
    const trimmed = name.trim();
    if (!trimmed || taken(trimmed)) continue;
    chosen.push(trimmed);
  }
  return chosen.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

/**
 * 說話者選單：稱呼表優先。角色資料若只差空白，不再另列一筆。
 */
export function mergeSpeakerNames(bookNames: string[], characterNames: string[]): string[] {
  const names: string[] = [];
  const taken = new Set<string>();

  for (const name of bookNames) {
    const trimmed = name.trim();
    const key = compactName(trimmed);
    if (!trimmed || taken.has(key)) continue;
    names.push(trimmed);
    taken.add(key);
  }

  for (const name of characterNames) {
    const trimmed = name.trim();
    const key = compactName(trimmed);
    if (!trimmed || taken.has(key)) continue;
    names.push(trimmed);
    taken.add(key);
  }

  return names.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}
