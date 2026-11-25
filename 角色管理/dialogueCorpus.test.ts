import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterSourceLines, stripCostumeCode, tagForRelativePath } from './dialogueTags';

test('根目錄台詞檔標成劇情台詞', () => {
  assert.equal(tagForRelativePath('克琳娜台詞.TXT'), '劇情台詞');
  assert.equal(tagForRelativePath('冬月 霞台詞.TXT'), '劇情台詞');
});

test('本體 SNS 標成 SNS', () => {
  assert.equal(tagForRelativePath('SNS訊息/SNS訊息對話內容.TXT'), 'SNS');
});

test('造型 SNS 標成造型：名稱', () => {
  assert.equal(stripCostumeCode('cr082_女僕杉本有菜'), '女僕杉本有菜');
  assert.equal(
    tagForRelativePath('造型/cr107_乳牛貝兒/SNS訊息/SNS訊息對話內容.TXT'),
    '造型：乳牛貝兒',
  );
});

test('約會劇情標成約會；造型下仍歸造型', () => {
  assert.equal(tagForRelativePath('SNS訊息/約會劇情'), '約會');
  assert.equal(tagForRelativePath('造型/cr107_乳牛貝兒/SNS訊息/約會劇情'), '造型：乳牛貝兒');
});

test('戰鬥路徑標成戰鬥', () => {
  assert.equal(tagForRelativePath('戰鬥台詞.TXT'), '戰鬥');
  assert.equal(tagForRelativePath('戰鬥/開場台詞.TXT'), '戰鬥');
});

test('娛樂會館台詞不歸劇情台詞', () => {
  assert.equal(tagForRelativePath('娛樂會館台詞.TXT'), '娛樂會館');
  assert.equal(tagForRelativePath('娛樂會館/水槍濕身館.TXT'), '娛樂會館');
});

test('設定檔不收', () => {
  assert.equal(tagForRelativePath('稱呼表.md'), null);
  assert.equal(tagForRelativePath('貝兒人物設定.md'), null);
  assert.equal(tagForRelativePath('貝兒登場章節.md'), null);
});

test('關鍵字只留含該字的行', () => {
  const text = '冬月 霞 「哈！」\n旁白 「街道」\n冬月 霞 「殺了你」';
  assert.equal(filterSourceLines(text, '殺'), '冬月 霞 「殺了你」');
});
