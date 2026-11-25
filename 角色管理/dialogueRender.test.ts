import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  groupDialogueBlocks,
  parseDialogueLine,
  parseDialogueScript,
  speakerColorClass,
} from './dialogueRender';

test('解析台詞、選項、標題', () => {
  assert.equal(parseDialogueLine('高城 嵐花 「你！」').kind, 'speech');
  assert.equal(parseDialogueLine('高城 嵐花 「你！」').speaker, '高城 嵐花');
  assert.equal(parseDialogueLine('【選項 A】調戲一下').kind, 'option');
  assert.equal(parseDialogueLine('【選項 A】調戲一下').optionLabel, 'A');
  assert.equal(parseDialogueLine('【選項 A】調戲一下').optionTitle, '調戲一下');
  assert.equal(parseDialogueLine('## 夜露死苦！').kind, 'heading');
  assert.equal(parseDialogueLine('- 角色代碼：cr037').kind, 'meta');
});

test('選項 A/B 收成一組', () => {
  const lines = parseDialogueScript(`【選項 A】調戲一下
西奧多 「妳沒試過，妳怎麼知道？」
【選項 B】否定
西奧多 「我不需要你的認同，還是妳自己想試試？」

高城 嵐花 「你！」`);
  const blocks = groupDialogueBlocks(lines);
  assert.equal(blocks[0].type, 'optionGroup');
  if (blocks[0].type === 'optionGroup') {
    assert.equal(blocks[0].branches.length, 2);
    assert.equal(blocks[0].branches[0].label, 'A');
    assert.equal(blocks[0].branches[0].lines[0].speaker, '西奧多');
    assert.equal(blocks[0].branches[1].label, 'B');
  }
  assert.equal(blocks[1].type, 'line');
  assert.equal(blocks[2].type, 'line');
  if (blocks[2].type === 'line') assert.equal(blocks[2].line.speaker, '高城 嵐花');
});

test('焦點角色與西奧多顏色固定', () => {
  assert.equal(speakerColorClass('高城 嵐花', '高城 嵐花'), 'text-rose-300');
  assert.equal(speakerColorClass('高城嵐花', '高城 嵐花'), 'text-rose-300');
  assert.equal(speakerColorClass('西奧多', '高城 嵐花'), 'text-sky-300');
  assert.equal(speakerColorClass('系統', '高城 嵐花'), 'text-gray-400');
});
