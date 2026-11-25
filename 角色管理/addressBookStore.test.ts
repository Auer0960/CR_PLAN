import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findCharacterFolder, listCharacterFolders } from './addressBookStore';

test('列表全名對到既有短名資料夾，不另編代碼', () => {
  if (listCharacterFolders().length === 0) return;
  assert.equal(findCharacterFolder('芙瑞妲・米契爾斯')?.folder, 'cr905_芙瑞妲');
  assert.equal(findCharacterFolder('西蒙・卡迪久')?.folder, 'cr904_西蒙');
  assert.equal(findCharacterFolder('藤原 紫宵')?.folder, 'cr052_藤原紫宵');
  assert.equal(findCharacterFolder('蘇妮塔・巴隆')?.folder, '蘇妮塔');
  assert.equal(findCharacterFolder('維克多・理查德')?.folder, '維克多');
  assert.equal(findCharacterFolder('維克多')?.folder, '維克多');
  assert.equal(findCharacterFolder('cr905')?.folder, 'cr905_芙瑞妲');
});
