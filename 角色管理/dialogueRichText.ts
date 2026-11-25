/** 對齊 SNS 小工具 emoji/render.py：index N → emoji_(N+1).png */

export type RichSegment =
  | { type: 'text'; text: string }
  | { type: 'emoji'; index: number }
  | { type: 'heart'; text: string };

const SPRITE_RE = /<sprite\s*=\s*"Emoji"\s+index\s*=\s*(\d+)\s*>/gi;
const COLOR_HEART_RE = /<color\s*=\s*red\s*>((?:♥|❤)+)<\/color>/gi;

export function emojiFilename(index: number): string {
  return `emoji_${String(index + 1).padStart(2, '0')}.png`;
}

export function emojiPublicUrl(index: number): string {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  return `${base}emoji/${emojiFilename(index)}`.replace(/\/+/g, '/');
}

function pushTextWithHearts(segments: RichSegment[], text: string): void {
  if (!text) return;
  let pos = 0;
  COLOR_HEART_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(COLOR_HEART_RE.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    if (m.index > pos) segments.push({ type: 'text', text: text.slice(pos, m.index) });
    segments.push({ type: 'heart', text: m[1] });
    pos = m.index + m[0].length;
  }
  if (pos < text.length) segments.push({ type: 'text', text: text.slice(pos) });
}

export function parseRichSegments(text: string): RichSegment[] {
  if (!text) return [];
  const segments: RichSegment[] = [];
  let pos = 0;
  SPRITE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(SPRITE_RE.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    if (m.index > pos) pushTextWithHearts(segments, text.slice(pos, m.index));
    segments.push({ type: 'emoji', index: Number(m[1]) });
    pos = m.index + m[0].length;
  }
  if (pos < text.length) pushTextWithHearts(segments, text.slice(pos));
  return segments.length > 0 ? segments : [{ type: 'text', text }];
}
