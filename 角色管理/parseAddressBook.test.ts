import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseAddressMarkdown,
  serializeAddressMarkdown,
} from './parseAddressBook';

const sample = `# 杉本 有菜 稱呼表

- 角色代碼：cr053

## 名稱與自稱

| 項目 | 用詞 | 場合／語氣 | 台詞 |
|---|---|---|---|
| 標準名 | 杉本 有菜 | 設定、對照用的正式名 | |
| 旁白 | 杉本 有菜 | 敘述、場景描寫使用 | |
| 自稱 | 我 | 一般第一人稱 | 「我會負起責任」 |

## 她怎麼叫別人

| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |
|---|---|---|---|---|
| 西奧多 | — | 您／你 | 約會場合 | 「我……想跟你撒撒嬌」 |

## 別人怎麼叫她

| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |
|---|---|---|---|---|
| — | — | — | 現有他角台詞尚未呼喚此名 | |

## SNS／通訊

說明：聊天室我方是玩家視角。

### 她在 SNS 怎麼叫別人

| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |
|---|---|---|---|---|
| 西奧多／玩家 | ［玩家名］先生 | — | 通訊直呼玩家名（系統變數，不是西奧多） | 「［玩家名］先生，晚安～」 |
| 西奧多／玩家 | 主人 | — | 通訊／女僕造型場合（女僕造型通訊） | 「主人♥ 猜猜有菜現在在哪！」 |
`;

test('parses SNS rows and marks 女僕造型', () => {
  const book = parseAddressMarkdown(sample, 'cr053_杉本有菜');
  assert.equal(book.outgoing.length, 1);
  assert.equal(book.sns.length, 2);
  assert.deepEqual(book.sns[0].nameAddress, ['［玩家名］先生']);
  assert.equal(book.sns[0].variant, undefined);
  assert.deepEqual(book.sns[1].nameAddress, ['主人']);
  assert.equal(book.sns[1].variant, '女僕造型');
});

test('does not treat 含造型通訊 as a costume variant', () => {
  const book = parseAddressMarkdown(`# 貝兒 稱呼表

## 她怎麼叫別人

| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |
|---|---|---|---|---|

## SNS／通訊

| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |
|---|---|---|---|---|
| 西奧多／玩家 | 顧問先生 | 你 | 通訊固定稱呼（含造型通訊） | 「顧問先生！這個週末你有空嗎？」 |
`, 'cr040_貝兒');
  assert.equal(book.sns[0].variant, undefined);
});

test('parses male headings 他怎麼叫別人 / 別人怎麼叫他', () => {
  const book = parseAddressMarkdown(`# 西奧多 稱呼表

## 他怎麼叫別人

| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |
|---|---|---|---|---|
| 艾黛爾 | 艾黛爾 | 妳 | 當面直呼 | 「艾黛爾！快帶其他人逃跑！！」 |

## 別人怎麼叫他

| 對象 | 名字稱呼 | 指稱 | 場合／語氣 | 台詞 |
|---|---|---|---|---|
| 亞莉娜 | 西奧多 | 你 | 當面或呼喚 | 「……西奧多！！」 |
| 白石愛 | 顧問先生 | — | 加先生；當面或呼喚 | 「顧問先生，快來享用甜點吧♥」 |
`, 'cr042_西奧多');
  assert.equal(book.outgoing.length, 1);
  assert.equal(book.incoming.length, 2);
  assert.deepEqual(book.outgoing[0].nameAddress, ['艾黛爾']);
  assert.deepEqual(book.incoming[0].nameAddress, ['西奧多']);
  assert.deepEqual(book.incoming[1].nameAddress, ['顧問先生']);
});

test('serialize keeps SNS and 女僕造型', () => {
  const book = parseAddressMarkdown(sample, 'cr053_杉本有菜');
  const again = parseAddressMarkdown(serializeAddressMarkdown(book), 'cr053_杉本有菜');
  assert.equal(again.sns.length, 2);
  assert.equal(again.sns[1].variant, '女僕造型');
  assert.deepEqual(again.sns[1].nameAddress, ['主人']);
});
