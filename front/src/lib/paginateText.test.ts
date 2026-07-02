import { paginateText } from "./paginateText";

describe("paginateText", () => {
  it('returns [""] for empty string', () => {
    expect(paginateText("")).toEqual([""]);
  });

  it("returns [text] for short text under limit", () => {
    expect(paginateText("Hello")).toEqual(["Hello"]);
  });

  it("returns single page for exactly 144 characters", () => {
    const text = "a".repeat(144);
    expect(paginateText(text)).toEqual([text]);
  });

  it("splits at word boundary when over limit", () => {
    const text = `${"a".repeat(140)} ${"b".repeat(5)}`;
    const pages = paginateText(text);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toBe("a".repeat(140));
    expect(pages[1]).toBe("b".repeat(5));
  });

  it("hard-breaks at character limit when no spaces", () => {
    const text = "a".repeat(145);
    const pages = paginateText(text);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toBe("a".repeat(144));
    expect(pages[1]).toBe("a");
  });

  it("splits when paragraph plus current overflows", () => {
    const short = "Line 1";
    const overflow = "a".repeat(143);
    const text = `${short}\n${overflow}`;
    const pages = paginateText(text);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toBe(short);
    expect(pages[1]).toBe(overflow);
  });

  it("splits when two paragraphs each overflow", () => {
    const para1 = "a".repeat(144);
    const para2 = "b".repeat(144);
    const text = `${para1}\n${para2}`;
    const pages = paginateText(text);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toBe(para1);
    expect(pages[1]).toBe(para2);
  });

  it("combines short paragraphs on one page", () => {
    const lines = ["Line 1", "Line 2", "Line 3"];
    const text = lines.join("\n");
    const pages = paginateText(text);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toBe(text);
  });

  it("handles only newlines", () => {
    const text = "\n\n\n";
    const pages = paginateText(text);
    expect(pages).toEqual([text]);
  });

  it("splits long paragraphs correctly", () => {
    const text = "a".repeat(300);
    const pages = paginateText(text);
    expect(pages).toHaveLength(3);
    expect(pages[0]).toBe("a".repeat(144));
    expect(pages[1]).toBe("a".repeat(144));
    expect(pages[2]).toBe("a".repeat(12));
  });

  it("handles mixed paragraphs with different sizes", () => {
    const short = "Hi";
    const medium = "a".repeat(100);
    const long = "b".repeat(200);
    const text = `${short}\n${medium}\n${long}`;
    const pages = paginateText(text);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages[0]).toContain(short);
    expect(pages[0]).toContain(medium);
  });

  it("breaks at sentence end within 144-char window", () => {
    const first = `${"First sentence here. ".repeat(7)}Different last.`;
    expect(first.length).toBeGreaterThan(144);
    const pages = paginateText(first);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages[0]).toMatch(/\.$/);
    expect(pages[0]).not.toContain("Different");
  });

  it("breaks at clause comma when no sentence end in window", () => {
    const clause = `${"a".repeat(50)}, ${"b".repeat(50)}, ${"c".repeat(50)}`;
    const pages = paginateText(clause);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain(",");
    expect(pages[1]).toContain("c");
  });

  it("prefers sentence end over clause break", () => {
    const text = `${"word, ".repeat(20)}end. ${"next ".repeat(20)}clause.`;
    const pages = paginateText(text);
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages[0]).toMatch(/\./);
    expect(pages[0]).not.toContain("next");
  });

  it("breaks at semicolon when no comma or sentence end", () => {
    const text = `${"a".repeat(50)}; ${"b".repeat(100)}`;
    const pages = paginateText(text);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain(";");
  });

  it("breaks at space when no punctuation", () => {
    const text = "word ".repeat(40);
    const pages = paginateText(text.trim());
    expect(pages).toHaveLength(2);
    expect(pages[0]).not.toMatch(/[.,;:!?]$/);
  });
});
