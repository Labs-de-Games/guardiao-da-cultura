import { renderHook } from "@testing-library/react";
import { useEditalFilters } from "./useEditalFilters";

const replaceMock = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => mockSearchParams,
}));

describe("useEditalFilters", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("defaults to 30d when the URL has no dateRange", () => {
    const { result } = renderHook(() => useEditalFilters());
    expect(result.current.dateRange).toEqual({ type: "30d" });
  });

  it("reads a simple dateRange from the URL", () => {
    mockSearchParams = new URLSearchParams({ dateRange: "7d" });
    const { result } = renderHook(() => useEditalFilters());
    expect(result.current.dateRange).toEqual({ type: "7d" });
  });

  it("reads a custom range with from/to from the URL", () => {
    mockSearchParams = new URLSearchParams({
      dateRange: "custom",
      from: "2026-01-01",
      to: "2026-02-01",
    });
    const { result } = renderHook(() => useEditalFilters());
    expect(result.current.dateRange).toEqual({
      type: "custom",
      start: "2026-01-01",
      end: "2026-02-01",
    });
  });

  it("accepts a custom range even when from/to are missing (user will fill them in)", () => {
    mockSearchParams = new URLSearchParams({ dateRange: "custom" });
    const { result } = renderHook(() => useEditalFilters());
    expect(result.current.dateRange).toEqual({
      type: "custom",
      start: "",
      end: "",
    });
  });

  it("falls back to 30d for an unknown dateRange value", () => {
    mockSearchParams = new URLSearchParams({ dateRange: "bogus" });
    const { result } = renderHook(() => useEditalFilters());
    expect(result.current.dateRange).toEqual({ type: "30d" });
  });

  it("setDateRange writes dateRange into the URL via router.replace", () => {
    const { result } = renderHook(() => useEditalFilters());
    result.current.setDateRange({ type: "today" });

    expect(replaceMock).toHaveBeenCalledWith("?dateRange=today", {
      scroll: false,
    });
  });

  it("setDateRange writes from/to for a custom range", () => {
    const { result } = renderHook(() => useEditalFilters());
    result.current.setDateRange({
      type: "custom",
      start: "2026-03-01",
      end: "2026-03-15",
    });

    const [url] = replaceMock.mock.calls[0];
    expect(url).toContain("dateRange=custom");
    expect(url).toContain("from=2026-03-01");
    expect(url).toContain("to=2026-03-15");
  });
});
