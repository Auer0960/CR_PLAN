import { compactName } from './addressNames';

export type DialogueLineKind = 'blank' | 'heading' | 'meta' | 'option' | 'speech' | 'raw';

export interface ParsedDialogueLine {
  kind: DialogueLineKind;
  raw: string;
  speaker?: string;
  quote?: string;
  optionLabel?: string;
  optionTitle?: string;
  level?: number;
}

export type DialogueBlock =
  | { type: 'line'; line: ParsedDialogueLine }
  | { type: 'optionGroup'; branches: { label: string; title: string; lines: ParsedDialogueLine[] }[] };

const SPEECH_RE = /^(.+?)\s*[「"](.*)[」"]\s*$/;
const OPTION_RE = /^【選項\s*([^】]+)】\s*(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const META_RE = /^-\s+(.+)$/;

export function parseDialogueLine(raw: string): ParsedDialogueLine {
  const line = raw.replace(/\r$/, '');
  if (!line.trim()) return { kind: 'blank', raw: line };

  const heading = line.match(HEADING_RE);
  if (heading) {
    return { kind: 'heading', raw: line, level: heading[1].length, quote: heading[2].trim() };
  }

  const option = line.match(OPTION_RE);
  if (option) {
    return {
      kind: 'option',
      raw: line,
      optionLabel: option[1].trim(),
      optionTitle: option[2].trim(),
    };
  }

  const meta = line.match(META_RE);
  if (meta) {
    return { kind: 'meta', raw: line, quote: meta[1].trim() };
  }

  const speech = line.match(SPEECH_RE);
  if (speech) {
    return {
      kind: 'speech',
      raw: line,
      speaker: speech[1].trim(),
      quote: speech[2],
    };
  }

  return { kind: 'raw', raw: line };
}

export function parseDialogueScript(content: string): ParsedDialogueLine[] {
  return content.split(/\r?\n/).map(parseDialogueLine);
}

/** 把連續的選項 A/B（含其後台詞）收成一組，方便視覺區隔。 */
export function groupDialogueBlocks(lines: ParsedDialogueLine[]): DialogueBlock[] {
  const blocks: DialogueBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.kind !== 'option') {
      blocks.push({ type: 'line', line });
      i += 1;
      continue;
    }

    const branches: { label: string; title: string; lines: ParsedDialogueLine[] }[] = [];
    while (i < lines.length && lines[i].kind === 'option') {
      const optionLine = lines[i];
      const branch = {
        label: optionLine.optionLabel || '?',
        title: optionLine.optionTitle || '',
        lines: [] as ParsedDialogueLine[],
      };
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (next.kind === 'option' || next.kind === 'blank' || next.kind === 'heading' || next.kind === 'meta') break;
        branch.lines.push(next);
        i += 1;
      }
      branches.push(branch);
    }
    blocks.push({ type: 'optionGroup', branches });
    if (i < lines.length && lines[i].kind === 'blank') {
      blocks.push({ type: 'line', line: lines[i] });
      i += 1;
    }
  }
  return blocks;
}

const SPEAKER_PALETTE = [
  'text-rose-300',
  'text-sky-300',
  'text-emerald-300',
  'text-amber-300',
  'text-violet-300',
  'text-cyan-300',
  'text-fuchsia-300',
  'text-lime-300',
  'text-orange-300',
  'text-teal-300',
];

function hashName(name: string): number {
  let h = 0;
  for (const ch of compactName(name)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function speakerColorClass(speaker: string, focusName?: string): string {
  const key = compactName(speaker);
  if (!key) return 'text-gray-300';
  if (key === '系統') return 'text-gray-400';
  if (key === '西奧多' || key === '玩家') return 'text-sky-300';
  if (focusName && compactName(focusName) === key) return 'text-rose-300';
  return SPEAKER_PALETTE[hashName(key) % SPEAKER_PALETTE.length];
}

export function isFocusSpeaker(speaker: string | undefined, focusName?: string): boolean {
  if (!speaker || !focusName) return false;
  return compactName(speaker) === compactName(focusName);
}
