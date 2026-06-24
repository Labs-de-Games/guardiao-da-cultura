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
});
