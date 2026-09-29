import "server-only";

/** UTF-8 BOM — `EF BB BF` in bytes. Excel on pt-BR Windows needs this to
 * detect UTF-8 and render accents correctly instead of mojibake. */
const UTF8_BOM = "﻿";
const DELIMITER = ";";

export interface CsvColumn<T> {
  key: keyof T & string;
  header: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // Excel pt-BR reads the decimal comma as a decimal separator, not a
    // thousands separator — matches the locale the CSV is opened in.
    return Number.isInteger(value)
      ? String(value)
      : String(value).replace(".", ",");
  }
  const stringValue = String(value);
  const needsQuoting =
    stringValue.includes(DELIMITER) ||
    stringValue.includes('"') ||
    stringValue.includes("\n");
  if (!needsQuoting) return stringValue;
  return `"${stringValue.replace(/"/g, '""')}"`;
}

/**
 * Builds a CSV string for the edital report export: UTF-8 BOM prefix,
 * `;` delimiter (not `,` — decimal commas would otherwise collide with a
 * comma delimiter), decimal comma for non-integer numbers. See discovery
 * §5.7's testing strategy: "assert the literal EF BB BF prefix, `;`,
 * decimal comma."
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumn<T>[],
): string {
  const header = columns.map((c) => formatCell(c.header)).join(DELIMITER);
  const lines = rows.map((row) =>
    columns.map((c) => formatCell(row[c.key])).join(DELIMITER),
  );
  return [UTF8_BOM + header, ...lines].join("\r\n");
}
