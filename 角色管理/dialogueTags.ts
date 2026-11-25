const SKIP_NAMES = new Set([
  '稱呼表.md',
  '稱呼表.json',
  '人物設定.md',
  '登場章節.md',
]);

/** 造型資料夾名稱去掉 cr082_ 這類代碼前綴。 */
export function stripCostumeCode(folderName: string): string {
  return folderName.replace(/^cr\d+_/i, '').trim() || folderName;
}

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, '/');
}

function isSkippedFile(fileName: string): boolean {
  if (SKIP_NAMES.has(fileName)) return true;
  if (fileName.endsWith('人物設定.md') || fileName.endsWith('登場章節.md')) return true;
  return false;
}

function isTextFile(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return !fileName.includes('.'); // 無副檔名，例如「約會劇情」
  const ext = fileName.slice(dot).toLowerCase();
  return ext === '.txt' || ext === '.md';
}

/**
 * 依相對路徑決定來源 Tag。
 * relativePath 使用正斜線，相對於角色根目錄。
 */
export function tagForRelativePath(relativePath: string): string | null {
  const rel = normalizeRel(relativePath);
  const parts = rel.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] || '';
  const joined = rel;

  if (!fileName || isSkippedFile(fileName)) return null;
  if (!isTextFile(fileName)) return null;

  if (joined.includes('戰鬥') || fileName.includes('戰鬥')) {
    return '戰鬥';
  }

  if (joined.includes('娛樂會館') || fileName.includes('娛樂會館')) {
    return '娛樂會館';
  }

  const costumeIdx = parts.indexOf('造型');
  if (costumeIdx >= 0 && parts.length > costumeIdx + 1) {
    const costumeFolder = parts[costumeIdx + 1];
    return `造型：${stripCostumeCode(costumeFolder)}`;
  }

  if (fileName === '約會劇情' || parts.includes('約會劇情') || fileName.includes('約會劇情')) {
    return '約會';
  }

  if (parts.includes('SNS訊息') || fileName.includes('SNS訊息對話內容')) {
    return 'SNS';
  }

  if (/(台詞)\.txt$/i.test(fileName) && parts.length === 1) {
    return '劇情台詞';
  }

  return null;
}

export function filterSourceLines(content: string, keyword: string): string {
  const q = keyword.trim().toLowerCase();
  if (!q) return content;
  return content
    .split(/\r?\n/)
    .filter(line => line.toLowerCase().includes(q))
    .join('\n');
}
