import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bookMatchesSpeaker,
  compactName,
  mergeSpeakerNames,
  namesReferToSameCharacter,
  preferCharacterLabels,
} from './addressNames';

test('空白差異視為同一人，並保留稱呼表的寫法', () => {
  assert.equal(compactName('高城 嵐花'), compactName('高城嵐花'));
  const merged = mergeSpeakerNames(['高城 嵐花', '冬月 霞'], ['高城嵐花', '冬月 霞', '艾拉']);
  assert.deepEqual(merged, ['冬月 霞', '艾拉', '高城 嵐花']);
});

test('列表全名與資料夾短名視為同一人', () => {
  assert.equal(namesReferToSameCharacter('芙瑞妲・米契爾斯', '芙瑞妲'), true);
  assert.equal(namesReferToSameCharacter('西蒙・卡迪久', '西蒙'), true);
  assert.equal(namesReferToSameCharacter('蘇妮塔・巴隆', '蘇妮塔'), true);
  assert.equal(namesReferToSameCharacter('維克多・理查德', '維克多'), true);
  assert.equal(namesReferToSameCharacter('藤原 紫宵', '藤原紫宵'), true);
  assert.equal(namesReferToSameCharacter('藤原 紫宵', '藤原 亞璃紗'), false);
  assert.equal(namesReferToSameCharacter('巴隆', '蘇妮塔・巴隆'), false);
});

test('選單保留列表全名，不把短名再列一次', () => {
  assert.deepEqual(
    preferCharacterLabels(['蘇妮塔・巴隆', '維克多・理查德'], ['蘇妮塔', '維克多', '艾拉']),
    ['艾拉', '維克多・理查德', '蘇妮塔・巴隆'],
  );
});

test('稱呼表短名對得上列表全名', () => {
  assert.equal(bookMatchesSpeaker({ character: '蘇妮塔', canonicalName: '蘇妮塔・巴隆' }, '蘇妮塔・巴隆'), true);
  assert.equal(bookMatchesSpeaker({ character: '維克多', canonicalName: '維克多' }, '維克多・理查德'), true);
  assert.equal(bookMatchesSpeaker({ character: '芙瑞妲', canonicalName: '芙瑞妲' }, '芙瑞妲・米契爾斯'), true);
});
