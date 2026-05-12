import { describe, expect, it } from 'vitest';
import { parseValueList, serializeValueList } from '../src/mock/valueList.js';

describe('Issue reproduction: 値リストにコンマを入力できない', () => {
  it('\\, でエスケープされたコンマは値の一部として扱われる', () => {
    expect(parseValueList('hello\\, world, foo, bar\\, baz')).toEqual([
      'hello, world',
      'foo',
      'bar, baz',
    ]);
  });

  it('単一の値が "," のみの場合: \\, を入力すると ["",] ではなく [","]', () => {
    expect(parseValueList('\\,')).toEqual([',']);
  });

  it('serialize → parse のラウンドトリップでコンマ含む値が保持される', () => {
    const values = ['hello, world', 'foo', 'a,b,c'];
    expect(parseValueList(serializeValueList(values))).toEqual(values);
  });

  it('serializeValueList: 値内のコンマを \\, に、バックスラッシュを \\\\ にエスケープ', () => {
    expect(serializeValueList(['a, b', 'c\\d'])).toBe('a\\, b, c\\\\d');
  });
});

describe('parseValueList - 既存挙動の維持', () => {
  it('単純なカンマ区切り', () => {
    expect(parseValueList('A, B, C')).toEqual(['A', 'B', 'C']);
  });

  it('前後の空白はトリム', () => {
    expect(parseValueList('  foo  ,  bar  ')).toEqual(['foo', 'bar']);
  });

  it('空トークンは除外', () => {
    expect(parseValueList('a,,b')).toEqual(['a', 'b']);
    expect(parseValueList(',a,')).toEqual(['a']);
  });

  it('空文字列は空配列', () => {
    expect(parseValueList('')).toEqual([]);
    expect(parseValueList('   ')).toEqual([]);
  });
});

describe('parseValueList - バックスラッシュエスケープの詳細', () => {
  it('\\\\ はリテラル \\ になる', () => {
    expect(parseValueList('a\\\\b')).toEqual(['a\\b']);
  });

  it('\\\\, は リテラル \\ の後に区切りコンマ', () => {
    expect(parseValueList('a\\\\, b')).toEqual(['a\\', 'b']);
  });

  it('末尾の単独 \\ はリテラル \\ として保持', () => {
    expect(parseValueList('foo\\')).toEqual(['foo\\']);
  });

  it('連続したエスケープ', () => {
    expect(parseValueList('\\,\\,')).toEqual([',,']);
  });
});
