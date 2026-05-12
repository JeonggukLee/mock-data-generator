import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DdlParseError, parse } from '../src/ddl/parser.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(HERE, '..', '..', 'test', 'ddl');

const loadFixture = (name: string): string =>
  readFileSync(join(FIXTURE_DIR, name), 'utf-8');

describe('parse', () => {
  it('parses multi-line DDL with block comments and PK clause', () => {
    const table = parse(loadFixture('sample_multi_line.sql'));

    expect(table.name).toBe('account_doc_header');
    expect(table.columns.length).toBe(27);

    const documentDate = table.columns.find((c) => c.name === 'document_date');
    expect(documentDate?.dataType).toBe('date');
    expect(documentDate?.notNull).toBe(true);

    const fudosanGrpCd = table.columns.find((c) => c.name === 'fudosan_grp_cd');
    expect(fudosanGrpCd?.primaryKey).toBe(true);
    expect(fudosanGrpCd?.notNull).toBe(true);

    const accountDocNo = table.columns.find((c) => c.name === 'account_doc_no');
    expect(accountDocNo?.primaryKey).toBe(true);

    const id = table.columns.find((c) => c.name === 'id');
    expect(id?.primaryKey).toBe(false);
  });

  it('parses single-line DDL with NOT NULL UNIQUE inline', () => {
    const table = parse(loadFixture('sample_single_line.sql'));

    expect(table.name).toBe('bank_m');

    const name = table.columns.find((c) => c.name === 'name');
    expect(name?.notNull).toBe(true);
    expect(name?.unique).toBe(false);

    const externalId = table.columns.find((c) => c.name === 'external_id');
    expect(externalId?.notNull).toBe(true);
    expect(externalId?.unique).toBe(true);

    const kshaCd = table.columns.find((c) => c.name === 'ksha_cd');
    expect(kshaCd?.primaryKey).toBe(true);
    expect(kshaCd?.notNull).toBe(true);
  });

  it('converts camelCase table name to snake_case', () => {
    const table = parse(loadFixture('sample_camel_case.sql'));
    expect(table.name).toBe('bank_m');
  });

  it('converts UpperCamelCase table name to snake_case', () => {
    const table = parse(loadFixture('sample_upper_camel_case.sql'));
    expect(table.name).toBe('bank_m');
  });

  it('extracts precision and scale', () => {
    const table = parse(loadFixture('sample_single_line.sql'));

    const id = table.columns.find((c) => c.name === 'id');
    expect(id?.dataType).toBe('varchar');
    expect(id?.size.precision).toBe(18);
    expect(id?.size.scale).toBeUndefined();

    const kozaSbkbn = table.columns.find((c) => c.name === 'koza_sbkbn');
    expect(kozaSbkbn?.dataType).toBe('numeric');
    expect(kozaSbkbn?.size.precision).toBe(1);
    expect(kozaSbkbn?.size.scale).toBe(0);
  });

  it('preserves "timestamp without time zone" in dataType', () => {
    const table = parse(loadFixture('sample_multi_line.sql'));
    const createdDate = table.columns.find((c) => c.name === 'created_date');
    expect(createdDate?.dataType).toBe('timestamp without time zone');
    expect(createdDate?.notNull).toBe(false);
  });

  it('does not produce columns for PRIMARY KEY clauses', () => {
    const table = parse(loadFixture('sample_multi_line.sql'));
    expect(table.columns.find((c) => c.name.toLowerCase() === 'primary')).toBeUndefined();
  });

  it('throws when no CREATE TABLE present', () => {
    expect(() => parse('SELECT 1;')).toThrow(DdlParseError);
  });

  it('throws when table has no columns', () => {
    expect(() => parse('CREATE TABLE empty ();')).toThrow(DdlParseError);
  });
});
