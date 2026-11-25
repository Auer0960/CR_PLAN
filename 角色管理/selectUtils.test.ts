import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildVisibleOptions, filterSelectOptions, hasExactOption, shouldShowCreate } from './selectUtils';

// value 是 id、label 是名稱（圖片庫角色篩選的情況）
const options = [
  { value: 'all', label: '所有角色' },
  { value: 'id-theodore', label: '西奧多' },
  { value: 'id-belle', label: '貝兒', matchHint: (q: string) => ('乳牛貝兒'.includes(q) ? '造型：乳牛貝兒' : null) },
  { value: 'Taipei', label: 'Taipei City' },
];

const labels = (list: Array<{ label: string }>) => list.map(o => o.label);

test('value 為 id、label 為名稱：輸入名稱不會出現「新增」（allowCreate true / false 都一樣）', () => {
  for (const allowCreate of [true, false]) {
    const list = buildVisibleOptions(options, '西奧多', allowCreate);
    assert.deepEqual(labels(list), ['西奧多'], `allowCreate=${allowCreate}`);
    assert.ok(!list.some(o => 'isCreate' in o && o.isCreate));
  }
  assert.equal(hasExactOption(options, '西奧多'), true);
});

test('輸入全新字串：只有 allowCreate true 才出現「新增」，且排在最前面', () => {
  const created = buildVisibleOptions(options, '全新地點', true);
  assert.equal(created.length, 1);
  assert.deepEqual(created[0], { value: '全新地點', label: '新增：全新地點', isCreate: true });

  const picked = buildVisibleOptions(options, '全新地點', false);
  assert.deepEqual(picked, []);
});

test('部分符合但不是完整名稱：allowCreate true 仍可新增，現有符合項目排在其後', () => {
  const list = buildVisibleOptions(options, '西奧', true);
  assert.deepEqual(labels(list), ['新增：西奧', '西奧多']);
  assert.deepEqual(labels(buildVisibleOptions(options, '西奧', false)), ['西奧多']);
});

test('allowCreate 預設為 true', () => {
  assert.equal(buildVisibleOptions(options, '全新')[0].label, '新增：全新');
});

test('allowCreate false 永遠不會出現「新增」', () => {
  for (const q of ['', '   ', '西奧多', '西奧', '全新字串', '乳牛', 'zzz']) {
    const list = buildVisibleOptions(options, q, false);
    assert.ok(!list.some(o => 'isCreate' in o && o.isCreate), q);
    assert.equal(shouldShowCreate(options, q, false), false, q);
  }
});

test('忽略大小寫與前後空白（value 與 label 皆是）', () => {
  assert.equal(hasExactOption(options, '  taipei  '), true); // value
  assert.equal(hasExactOption(options, 'TAIPEI CITY'), true); // label
  assert.equal(shouldShowCreate(options, ' taipei city ', true), false);
  assert.equal(shouldShowCreate(options, ' 西奧多 ', true), false);
  assert.deepEqual(labels(buildVisibleOptions(options, '  TAIPEI  ', true)), ['Taipei City']);
});

test('空輸入：回傳全部選項，不顯示「新增」', () => {
  assert.deepEqual(labels(buildVisibleOptions(options, '', true)), labels(options));
  assert.deepEqual(labels(buildVisibleOptions(options, '   ', true)), labels(options));
  assert.equal(shouldShowCreate(options, '', true), false);
  assert.equal(hasExactOption(options, ''), false);
});

test('matchHint 命中的選項仍保留（label 沒命中也留下）', () => {
  assert.deepEqual(labels(filterSelectOptions(options, '乳牛')), ['貝兒']);
  assert.deepEqual(labels(buildVisibleOptions(options, '乳牛', false)), ['貝兒']);
  // allowCreate true：輸入不等於任何選項 → 新增在前，matchHint 命中的選項仍在清單裡
  assert.deepEqual(labels(buildVisibleOptions(options, '乳牛', true)), ['新增：乳牛', '貝兒']);
});

test('沒有選項或沒有符合項目：allowCreate false 回傳空陣列（呼叫端 Enter 不應改變值）', () => {
  assert.deepEqual(buildVisibleOptions([], '任何字', false), []);
  assert.deepEqual(buildVisibleOptions(options, '不存在', false), []);
  assert.equal(buildVisibleOptions([], '任何字', true).length, 1);
});
