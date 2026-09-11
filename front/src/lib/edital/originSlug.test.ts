import { isValidOriginSlug } from "./originSlug";

describe("isValidOriginSlug", () => {
  it("accepts a plain lowercase slug", () => {
    expect(isValidOriginSlug("escola-teste")).toBe(true);
  });

  it("accepts digits and hyphens", () => {
    expect(isValidOriginSlug("escola-42-rio")).toBe(true);
  });

  it("rejects uppercase", () => {
    expect(isValidOriginSlug("Escola-Teste")).toBe(false);
  });

  it("rejects spaces", () => {
    expect(isValidOriginSlug("escola teste")).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidOriginSlug("")).toBe(false);
  });

  it("rejects a value over 64 characters", () => {
    expect(isValidOriginSlug("a".repeat(65))).toBe(false);
  });

  it("rejects SQL-injection-shaped input", () => {
    expect(isValidOriginSlug("' OR 1=1 --")).toBe(false);
  });
});
