import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  ensureAddressBook,
  listAddressBooks,
  loadAddressBook,
  upsertAddressEntry,
  upsertIdentityTerm,
} from './addressBookStore';

const server = new McpServer({
  name: 'cr-address',
  version: '1.0.0',
});

const text = (payload: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
});

server.registerTool(
  'list_address_books',
  {
    description: '列出已有稱呼表的角色。',
  },
  async () => {
    const books = listAddressBooks().map(book => ({
      character: book.character,
      characterCode: book.characterCode,
      folder: book.folder,
      outgoing: book.outgoing.length,
      incoming: book.incoming.length,
    }));
    return text({ books });
  },
);

server.registerTool(
  'get_address_book',
  {
    description: '讀取一名角色的完整稱呼表。可用角色名、資料夾名或 cr 代碼。',
    inputSchema: {
      character: z.string().describe('角色名、資料夾名或 cr 代碼，例如 艾黛爾、cr041'),
    },
  },
  async ({ character }) => {
    const loaded = loadAddressBook(character);
    if (!loaded) return text({ error: `找不到角色資料夾：${character}` });
    return text({ folder: loaded.match.folder, path: loaded.match.mdPath, book: loaded.book });
  },
);

server.registerTool(
  'ensure_address_book',
  {
    description: '若該角色還沒有稱呼表，建立空白稱呼表.md。',
    inputSchema: {
      character: z.string().describe('角色名、資料夾名或 cr 代碼'),
    },
  },
  async ({ character }) => text(ensureAddressBook(character)),
);

server.registerTool(
  'upsert_address_entry',
  {
    description: '新增或覆蓋一筆稱呼。direction=outgoing 是角色怎麼叫對象；incoming 是對象怎麼叫角色。',
    inputSchema: {
      character: z.string().describe('說話者／這份稱呼表的主人'),
      direction: z.enum(['outgoing', 'incoming']).describe('outgoing：他怎麼叫別人；incoming：別人怎麼叫他'),
      target: z.string().describe('對象角色名，例如 蘿拉'),
      nameAddress: z.array(z.string()).optional().describe('名字稱呼，例如 ["蘿拉小姐","蘿拉"]'),
      pronoun: z.array(z.string()).optional().describe('指稱，例如 ["妳"]'),
      context: z.string().optional().describe('場合／語氣'),
      quotes: z.array(z.string()).optional().describe('台詞摘錄，不要加外層「」'),
    },
  },
  async ({ character, direction, target, nameAddress, pronoun, context, quotes }) => {
    const result = upsertAddressEntry(character, direction, {
      target,
      nameAddress: nameAddress || [],
      pronoun: pronoun || [],
      context: context || '',
      quotes: quotes || [],
    });
    return text({ ok: true, path: result.path, entry: result.book[direction].find(item => item.target === target) });
  },
);

server.registerTool(
  'upsert_identity_term',
  {
    description: '新增或覆蓋名稱與自稱：標準名、旁白、自稱詞。',
    inputSchema: {
      character: z.string(),
      kind: z.enum(['canonical', 'narration', 'self']).describe('canonical=標準名，narration=旁白，self=自稱'),
      terms: z.array(z.string()).describe('用詞，例如 ["我"] 或 ["艾黛爾"]'),
      context: z.string().optional(),
      quotes: z.array(z.string()).optional(),
      label: z.string().optional().describe('顯示名，預設 標準名／旁白／自稱'),
    },
  },
  async ({ character, kind, terms, context, quotes, label }) => {
    const defaultLabel = kind === 'canonical' ? '標準名' : kind === 'narration' ? '旁白' : '自稱';
    const result = upsertIdentityTerm(character, {
      kind,
      label: label || defaultLabel,
      terms,
      context: context || '',
      quotes: quotes || [],
    });
    return text({ ok: true, path: result.path, identity: result.book.identity });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
