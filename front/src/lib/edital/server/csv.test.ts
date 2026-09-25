/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("prefixes the output with the literal UTF-8 BOM bytes EF BB BF", () => {
    const csv = toCsv(
      [{ name: "Escola A", count: 1 }],
      [
        { key: "name", header: "Nome" },
        { key: "count", header: "Total" },
      ],
    );

    const bytes = Buffer.from(csv, "utf-8");
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it("uses ; as the delimiter", () => {
    const csv = toCsv(
      [{ a: "1", b: "2" }],
      [
        { key: "a", header: "A" },
        { key: "b", header: "B" },
      ],
    );

    expect(csv).toContain("A;B");
    expect(csv).toContain("1;2");
  });

  it("formats non-integer numbers with a decimal comma", () => {
    const csv = toCsv([{ rate: 0.25 }], [{ key: "rate", header: "Taxa" }]);

    expect(csv).toContain("0,25");
    expect(csv).not.toContain("0.25");
  });

  it("leaves integers unchanged (no trailing comma)", () => {
    const csv = toCsv([{ count: 42 }], [{ key: "count", header: "Total" }]);

    expect(csv).toContain("42");
    expect(csv).not.toContain("42,");
  });

  it("quotes a value containing the delimiter", () => {
    const csv = toCsv(
      [{ name: "Escola A; Filial 2" }],
      [{ key: "name", header: "Nome" }],
    );

    expect(csv).toContain('"Escola A; Filial 2"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const csv = toCsv(
      [{ name: 'Escola "A"' }],
      [{ key: "name", header: "Nome" }],
    );

    expect(csv).toContain('"Escola ""A"""');
  });

  it("renders null/undefined as an empty cell", () => {
    const csv = toCsv(
      [{ name: null, count: undefined }],
      [
        { key: "name", header: "Nome" },
        { key: "count", header: "Total" },
      ],
    );

    const dataLine = csv.split("\r\n")[1];
    expect(dataLine).toBe(";");
  });

  it("preserves accented characters intact (byte-round-trips through UTF-8)", () => {
    const csv = toCsv(
      [{ name: "Guardião da Cultura" }],
      [{ key: "name", header: "Nome" }],
    );

    const bytes = Buffer.from(csv, "utf-8");
    const decoded = bytes.toString("utf-8").replace(/^﻿/, "");
    expect(decoded).toContain("Guardião da Cultura");
  });
});
