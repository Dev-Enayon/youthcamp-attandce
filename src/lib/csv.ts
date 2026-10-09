/**
 * CSV generation with spreadsheet formula-injection protection.
 *
 * Cells beginning with =, +, -, @, tab or carriage return are treated as
 * dangerous by spreadsheet applications and are prefixed with a single quote.
 * All cells are quoted with `"` and embedded quotes are doubled.
 */
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  let str: string;
  if (value === null || value === undefined) {
    str = "";
  } else if (value instanceof Date) {
    str = value.toISOString();
  } else {
    str = String(value);
  }

  if (DANGEROUS_PREFIX.test(str)) {
    str = `'${str}`;
  }

  return `"${str.replace(/"/g, '""')}"`;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(",");
  const body = rows
    .map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(","))
    .join("\r\n");
  return `${header}\r\n${body}\r\n`;
}
