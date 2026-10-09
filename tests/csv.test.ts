import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "@/lib/csv";

describe("CSV generation", () => {
  it("quotes cells and doubles embedded quotes", () => {
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("neutralises spreadsheet formula injection", () => {
    expect(escapeCsvCell("=SUM(A1:A2)")).toBe('"' + "'=SUM(A1:A2)" + '"');
    expect(escapeCsvCell("+1234")).toBe('"' + "'+1234" + '"');
    expect(escapeCsvCell("-42")).toBe('"' + "'-42" + '"');
    expect(escapeCsvCell("@cmd")).toBe('"' + "'@cmd" + '"');
  });

  it("renders empty cells for null and undefined", () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it("builds a full CSV document with header and CRLF rows", () => {
    const csv = toCsv(
      [{ name: "Ada", age: 18 }],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Age", value: (r) => r.age },
      ],
    );
    expect(csv).toBe('"Name","Age"\r\n"Ada","18"\r\n');
  });
});
