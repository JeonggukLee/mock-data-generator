export type DataSize = {
  precision?: number;
  scale?: number;
};

export type Column = {
  name: string;
  dataType: string;
  size: DataSize;
  notNull: boolean;
  unique: boolean;
  primaryKey: boolean;
};

export type Table = {
  name: string;
  columns: Column[];
};
