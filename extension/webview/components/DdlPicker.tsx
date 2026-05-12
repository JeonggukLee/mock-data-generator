import { useState } from 'react';

type Props = {
  value: string;
  onParse: (ddl: string) => void;
  parsing: boolean;
};

export function DdlPicker({ value, onParse, parsing }: Props) {
  const [text, setText] = useState(value);

  return (
    <div className="ddl-picker">
      <label htmlFor="ddl-input">DDL を貼り付けてください</label>
      <textarea
        id="ddl-input"
        className="ddl-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="CREATE TABLE ..."
        rows={10}
        spellCheck={false}
      />
      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={() => onParse(text)}
          disabled={parsing || text.trim().length === 0}
        >
          {parsing ? '解析中...' : 'DDL を解析'}
        </button>
      </div>
    </div>
  );
}
