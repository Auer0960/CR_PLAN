import assert from 'node:assert/strict';
import { test } from 'node:test';
import { orderByRecent, pushRecent, readRecent } from './recentSelect';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

test('最近搜尋排在前面，其餘維持名稱排序', () => {
  const options = [
    { value: '克蘿伊', label: '克蘿伊' },
    { value: '夏洛特', label: '夏洛特' },
    { value: '杉本 有菜', label: '杉本 有菜' },
  ];
  const ordered = orderByRecent(options, ['夏洛特', '克蘿伊']);
  assert.deepEqual(ordered.map(item => item.value), ['夏洛特', '克蘿伊', '杉本 有菜']);
});

test('推入最近搜尋會去重並把最新的放第一', () => {
  const storage = memoryStorage();
  pushRecent(storage, 'k', '克蘿伊');
  pushRecent(storage, 'k', '夏洛特');
  pushRecent(storage, 'k', '夏洛特');
  assert.deepEqual(readRecent(storage, 'k'), ['夏洛特', '克蘿伊']);
});
