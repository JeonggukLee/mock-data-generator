export function parseValueList(input: string): string[] {
  const tokens: string[] = [];
  let buf = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '\\') {
      const next = input[i + 1];
      if (next === undefined) {
        buf += '\\';
      } else {
        buf += next;
        i++;
      }
      continue;
    }
    if (ch === ',') {
      tokens.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  tokens.push(buf);
  return tokens.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function serializeValueList(values: ReadonlyArray<string | number | boolean | null>): string {
  return values
    .map((v) => {
      if (v === null) return '';
      return String(v).replace(/\\/g, '\\\\').replace(/,/g, '\\,');
    })
    .join(', ');
}
