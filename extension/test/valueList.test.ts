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

describe('Issue reproduction: controlled-input ラウンドトリップで \\, が入力できない', () => {
  // parseValueList / serializeValueList は単体では正しい。
  // 問題は React の controlled <input> が onChange 毎に serialize(parse(text)) を走らせていたこと:
  //   1. ユーザが `\` を 1 文字入力 → parse → ['\\'] → serialize → '\\\\' (=表示は \\) と書き戻される
  //   2. 続けて `,` を入力 → 入力欄は `\\,` → parse → ['\\'] → 続く `,` は区切りとして消費される
  //   3. 結果としてユーザは `\,` エスケープ列を画面に作れず、コンマ値も作れない
  //
  // 修正: ValueListEditor が raw text を local state に保持し、parse は親への onChange 計算のみに使う。
  //       serialize は初期表示の 1 回だけ。

  // 修正前の挙動を模倣
  const simulateOld = (typing: string) => {
    let display = '';
    let values: string[] = [];
    for (const ch of typing) {
      const newInput = display + ch;
      values = parseValueList(newInput);
      display = serializeValueList(values); // ← 往復書き戻し (バグ原因)
    }
    return { display, values };
  };

  // 修正後の挙動を模倣 (text を local state に保持)
  const simulateNew = (typing: string) => {
    let text = '';
    let values: string[] = [];
    for (const ch of typing) {
      text = text + ch;
      values = parseValueList(text); // text は書き戻さない
    }
    return { text, values };
  };

  it('修正前: \\, とタイプしてもリテラルコンマ値を作れない (バグ再現)', () => {
    const r = simulateOld('\\,');
    expect(r.values).not.toEqual([',']);
    expect(r.values).toEqual(['\\']);
    expect(r.display).toBe('\\\\');
  });

  it('修正後: \\, とタイプするとリテラル "," が単一値として得られる', () => {
    const r = simulateNew('\\,');
    expect(r.text).toBe('\\,');
    expect(r.values).toEqual([',']);
  });

  it('修正後: コンマを含む複数値もエスケープを保ちつつ正しく解釈される', () => {
    const r = simulateNew('hello\\, world, foo');
    expect(r.text).toBe('hello\\, world, foo');
    expect(r.values).toEqual(['hello, world', 'foo']);
  });

  it('修正後: 単独 \\ のままでも text に保持されエスケープを継続入力できる', () => {
    const r = simulateNew('\\');
    expect(r.text).toBe('\\');
    expect(r.values).toEqual(['\\']); // 未閉のエスケープは parser がリテラル \ として扱う
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
