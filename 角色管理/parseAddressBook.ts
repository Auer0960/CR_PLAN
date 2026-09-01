export type AddressTargetKind = 'character' | 'npc' | 'generic';

export interface AddressEntry {
  target: string;
  targetKind: AddressTargetKind;
  nameAddress: string[];
  pronoun: string[];
  context: string;
  quotes: string[];
}

export interface AddressIdentityTerm {
  kind: 'canonical' | 'narration' | 'self';
  label: string;
  terms: string[];
  context: string;
  quotes: string[];
}

export interface AddressBook {
  schemaVersion: number;
  character: string;
  characterCode?: string;
  canonicalName?: string;
  narrationName?: string;
  identity: AddressIdentityTerm[];
  outgoing: AddressEntry[];
  incoming: AddressEntry[];
}

export function inferTargetKind(target: string): AddressTargetKind {
  if (target.startsWith('無特定')) return 'generic';
  if (target === '自稱') return 'npc';
  return 'character';
}

function splitMdRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\' && inner[i + 1] === '|') {
      current += '|';
      i += 1;
      continue;
    }
    if (inner[i] === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += inner[i];
  }
  cells.push(current.trim());
  return cells;
}

function splitTerms(cell: string): string[] {
  const text = cell.replace(/<br\s*\/?>/gi, '').trim();
  if (!text || text === '—' || text === '-' || text === '（不指名）') return [];
  return text.split(/[／/、]/).map(part => part.trim()).filter(Boolean);
}

function parseQuotes(cell: string): string[] {
  return cell
    .split(/<br\s*\/?>/i)
    .map(part => part.trim().replace(/^「/, '').replace(/」$/, '').trim())
    .filter(Boolean);
}

function extractSection(markdown: string, heading: string): string {
  const start = markdown.search(new RegExp(`^##\\s*${heading}\\s*$`, 'm'));
  if (start < 0) return '';
  const afterHeading = markdown.slice(start).replace(/^[^\n]*\n/, '');
  const next = afterHeading.search(/^##\s+/m);
  return next < 0 ? afterHeading : afterHeading.slice(0, next);
}

function tableLines(section: string): string[][] {
  const lines = section.split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .filter(line => !/^\s*\|?\s*:?-{2,}/.test(line))
    .map(line => splitMdRow(line));
}

function parseTable(section: string): AddressEntry[] {
  const lines = section.split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  if (lines.length < 2) return [];

  const header = splitMdRow(lines[0]);
  const indexOf = (label: string) => header.findIndex(cell => cell.replace(/\s/g, '') === label.replace(/\s/g, ''));
  const targetIdx = indexOf('對象');
  const nameIdx = indexOf('名字稱呼');
  const pronounIdx = indexOf('指稱');
  const contextIdx = indexOf('場合／語氣') >= 0 ? indexOf('場合／語氣') : indexOf('場合/語氣');
  const quotesIdx = indexOf('台詞');

  return tableLines(section)
    .filter(cells => cells[targetIdx])
    .map(cells => ({
      target: cells[targetIdx] || '',
      targetKind: inferTargetKind(cells[targetIdx] || ''),
      nameAddress: splitTerms(cells[nameIdx] || ''),
      pronoun: splitTerms(cells[pronounIdx] || ''),
      context: (cells[contextIdx] || '').replace(/<br\s*\/?>/gi, ' ').trim(),
      quotes: parseQuotes(cells[quotesIdx] || ''),
    }));
}

function identityKind(label: string): AddressIdentityTerm['kind'] {
  if (label.includes('標準') || label.includes('正文')) return 'canonical';
  if (label.includes('旁白')) return 'narration';
  return 'self';
}

function parseIdentityTable(section: string): AddressIdentityTerm[] {
  const lines = section.split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  if (lines.length < 2) return [];

  const header = splitMdRow(lines[0]);
  const indexOf = (label: string) => header.findIndex(cell => cell.replace(/\s/g, '') === label.replace(/\s/g, ''));
  const labelIdx = indexOf('項目');
  const termsIdx = indexOf('用詞') >= 0 ? indexOf('用詞') : indexOf('名字稱呼');
  const contextIdx = indexOf('場合／語氣') >= 0 ? indexOf('場合／語氣') : indexOf('場合/語氣');
  const quotesIdx = indexOf('台詞');

  return tableLines(section)
    .filter(cells => cells[labelIdx] && (cells[termsIdx] || '').trim())
    .map(cells => ({
      kind: identityKind(cells[labelIdx] || ''),
      label: cells[labelIdx] || '自稱',
      terms: splitTerms(cells[termsIdx] || ''),
      context: (cells[contextIdx] || '').replace(/<br\s*\/?>/gi, ' ').trim(),
      quotes: parseQuotes(cells[quotesIdx] || ''),
    }));
}

function readMeta(markdown: string, label: string): string | undefined {
  const match = markdown.match(new RegExp(`-\\s*${label}[：:]\\s*(.+)`));
  return match?.[1]?.trim().replace(/^`/, '').replace(/`$/, '') || undefined;
}

function fallbackIdentity(
  canonicalName: string,
  narrationName: string,
  incomingSelf: AddressEntry[],
): AddressIdentityTerm[] {
  const terms: AddressIdentityTerm[] = [
    { kind: 'canonical', label: '標準名', terms: canonicalName ? [canonicalName] : [], context: '設定、對照用的正式名', quotes: [] },
    { kind: 'narration', label: '旁白', terms: narrationName ? [narrationName] : [], context: '敘述、場景描寫使用', quotes: [] },
  ];
  incomingSelf.forEach(entry => {
    terms.push({
      kind: 'self',
      label: '自稱',
      terms: [...entry.nameAddress, ...entry.pronoun].filter(Boolean),
      context: entry.context,
      quotes: entry.quotes,
    });
  });
  return terms.filter(term => term.terms.length > 0);
}

export function parseAddressMarkdown(markdown: string, folderName: string): AddressBook {
  const titleMatch = markdown.match(/^#\s+(.+?)\s*$/m);
  const titleName = titleMatch?.[1].replace(/\s*稱呼表\s*$/, '').trim();
  const folderNamePart = folderName.includes('_') ? folderName.split('_').slice(1).join('_') : folderName;
  const character = titleName || folderNamePart;
  const characterCode = readMeta(markdown, '角色代碼') || (folderName.match(/^cr\d+/i)?.[0]);

  let outgoing = parseTable(extractSection(markdown, '她怎麼叫別人'));
  let incoming = parseTable(extractSection(markdown, '別人怎麼叫她'));
  const incomingSelf = incoming.filter(entry => entry.target === '自稱');
  incoming = incoming.filter(entry => entry.target !== '自稱');

  let identity = parseIdentityTable(extractSection(markdown, '名稱與自稱'));
  const canonicalFromIdentity = identity.find(term => term.kind === 'canonical')?.terms[0];
  const narrationFromIdentity = identity.find(term => term.kind === 'narration')?.terms[0];
  const canonicalName = canonicalFromIdentity || readMeta(markdown, '正文名') || character;
  const narrationName = narrationFromIdentity || readMeta(markdown, '旁白名') || canonicalName;

  if (identity.length === 0) {
    identity = fallbackIdentity(canonicalName, narrationName, incomingSelf);
  }

  return {
    schemaVersion: 1,
    character,
    characterCode,
    canonicalName,
    narrationName,
    identity,
    outgoing,
    incoming,
  };
}

export function parseAddressBookFile(content: string, filePath: string, folderName: string): AddressBook {
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    const incoming: AddressEntry[] = parsed.incoming || [];
    const incomingSelf = incoming.filter(entry => entry.target === '自稱');
    return {
      schemaVersion: parsed.schemaVersion ?? 1,
      character: parsed.character,
      characterCode: parsed.characterCode,
      canonicalName: parsed.canonicalName,
      narrationName: parsed.narrationName,
      identity: parsed.identity || fallbackIdentity(parsed.canonicalName || parsed.character, parsed.narrationName || parsed.character, incomingSelf),
      outgoing: parsed.outgoing || [],
      incoming: incoming.filter(entry => entry.target !== '自稱'),
    };
  }
  return parseAddressMarkdown(content, folderName);
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function termsCell(values: string[]): string {
  return values.length > 0 ? escapeCell(values.join('／')) : '—';
}

function quotesCell(quotes: string[]): string {
  return quotes.map(quote => `「${escapeCell(quote)}」`).join('<br>');
}

function identityRow(term: AddressIdentityTerm): string {
  return `| ${escapeCell(term.label)} | ${termsCell(term.terms)} | ${escapeCell(term.context)} | ${quotesCell(term.quotes)} |`;
}

function addressRow(entry: AddressEntry): string {
  return `| ${escapeCell(entry.target)} | ${termsCell(entry.nameAddress)} | ${termsCell(entry.pronoun)} | ${escapeCell(entry.context)} | ${quotesCell(entry.quotes)} |`;
}

export function emptyAddressBook(character: string, characterCode?: string): AddressBook {
  return {
    schemaVersion: 1,
    character,
    characterCode,
    canonicalName: character,
    narrationName: character,
    identity: [
      { kind: 'canonical', label: '標準名', terms: [character], context: '設定、對照用的正式名', quotes: [] },
      { kind: 'narration', label: '旁白', terms: [character], context: '敘述、場景描寫使用', quotes: [] },
    ],
    outgoing: [],
    incoming: [],
  };
}

export function serializeAddressMarkdown(book: AddressBook): string {
  const identity = book.identity.length > 0
    ? book.identity
    : emptyAddressBook(book.character, book.characterCode).identity;

  const lines = [
    `# ${book.character} 稱呼表`,
    '',
    ...(book.characterCode ? [`- 角色代碼：${book.characterCode}`, ''] : []),
    '## 名稱與自稱',
    '',
    '| 項目 | 用詞 | 場合／語氣 | 台詞 |',
    '|---|---|---|---|',
    ...identity.map(identityRow),
    '',
    '## 她怎麼叫別人',
    '',
    '| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |',
    '|---|---|---|---|---|',
    ...book.outgoing.map(addressRow),
    '',
    '## 別人怎麼叫她',
    '',
    '| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |',
    '|---|---|---|---|---|',
    ...book.incoming.map(addressRow),
    '',
  ];

  return lines.join('\n');
}
