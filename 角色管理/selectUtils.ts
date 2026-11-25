/**
 * SearchableSelect 的選項清單邏輯（純函式）。
 * 負責：依輸入過濾選項、判斷輸入是否等同既有選項、決定要不要顯示「新增」。
 */

export interface SelectOptionLike {
  value: string;
  label: string;
  /** 額外比對（例如角色造型）：傳入已小寫、去空白的查詢字串，命中回傳命中原因，沒命中回傳 null */
  matchHint?: (query: string) => string | null;
}

export interface VisibleOption {
  value: string;
  label: string;
  /** true = 「新增：xxx」這個虛擬選項（選了會把輸入字串當成新值） */
  isCreate?: boolean;
}

function norm(s: string | null | undefined): string {
  return String(s ?? '').trim().toLowerCase();
}

/** 依輸入過濾：label 包含輸入，或 matchHint 命中；輸入為空回傳全部 */
export function filterSelectOptions<T extends SelectOptionLike>(options: T[], query: string): T[] {
  const q = norm(query);
  if (!q) return options;
  return options.filter(opt => norm(opt.label).includes(q) || !!opt.matchHint?.(q));
}

/** 輸入是否完全等於某個既有選項（value 或 label 皆可，忽略大小寫與前後空白） */
export function hasExactOption(options: SelectOptionLike[], query: string): boolean {
  const q = norm(query);
  if (!q) return false;
  return options.some(opt => norm(opt.value) === q || norm(opt.label) === q);
}

/** 是否顯示「新增」：允許新增、有輸入、且輸入不等同任何既有選項 */
export function shouldShowCreate(options: SelectOptionLike[], query: string, allowCreate: boolean): boolean {
  if (!allowCreate) return false;
  const q = String(query ?? '').trim();
  return q.length > 0 && !hasExactOption(options, q);
}

/** 組出下拉實際顯示的選項：（需要時）最前面插入「新增」，其後是過濾後的既有選項 */
export function buildVisibleOptions<T extends SelectOptionLike>(
  options: T[],
  query: string,
  allowCreate = true,
): Array<T | VisibleOption> {
  const filtered = filterSelectOptions(options, query);
  if (!shouldShowCreate(options, query, allowCreate)) return filtered;
  const q = String(query).trim();
  const createOption: VisibleOption = { value: q, label: `新增：${q}`, isCreate: true };
  return [createOption, ...filtered];
}
