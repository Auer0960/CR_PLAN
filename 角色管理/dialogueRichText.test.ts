import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emojiFilename, parseRichSegments } from './dialogueRichText';

test('index 對應檔名 +1', () => {
  assert.equal(emojiFilename(0), 'emoji_01.png');
  assert.equal(emojiFilename(31), 'emoji_32.png');
  assert.equal(emojiFilename(65), 'emoji_66.png');
});

test('解析 sprite', () => {
  assert.deepEqual(parseRichSegments('我可是成年人！！<sprite="Emoji" index=65>'), [
    { type: 'text', text: '我可是成年人！！' },
    { type: 'emoji', index: 65 },
  ]);
});

test('允許多個與空白', () => {
  assert.deepEqual(parseRichSegments('嘿<sprite="Emoji" index=38><sprite="Emoji" index=41>'), [
    { type: 'text', text: '嘿' },
    { type: 'emoji', index: 38 },
    { type: 'emoji', index: 41 },
  ]);
  assert.deepEqual(parseRichSegments('<sprite = "Emoji" index = 3>'), [
    { type: 'emoji', index: 3 },
  ]);
});

test('紅心 color 標籤', () => {
  assert.deepEqual(parseRichSegments('最愛你了<color=red>♥♥</color>'), [
    { type: 'text', text: '最愛你了' },
    { type: 'heart', text: '♥♥' },
  ]);
});
