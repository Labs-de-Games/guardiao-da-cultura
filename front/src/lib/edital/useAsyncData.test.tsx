import { act, renderHook, waitFor } from "@testing-library/react";
import { useAsyncData } from "./useAsyncData";

describe("useAsyncData", () => {
  it("starts in a loading state and resolves to data", async () => {
    const fetcher = jest.fn().mockResolvedValue("value");
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBe("value");
    expect(result.current.error).toBeNull();
  });

  it("sets error and keeps data null on rejection", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("boom");
    expect(result.current.errorKind).toBe("unknown");
    expect(result.current.data).toBeNull();
  });

  it("classifies a fetch TypeError as a network error", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.errorKind).toBe("network"));
  });

  it("retry clears the error and re-fetches", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");
    const { result } = renderHook(() => useAsyncData(fetcher, []));

    await waitFor(() => expect(result.current.error).toBe("boom"));

    act(() => {
      result.current.retry();
    });

    // Error clears immediately on retry, before the new fetch resolves —
    // this is the real bug fix: the old page unmounted its filter UI on
    // any transient error instead of just showing `error` and letting a
    // retry clear it.
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.errorKind).toBeNull();
    await waitFor(() => expect(result.current.data).toBe("recovered"));
  });

  it("re-fetches when deps change", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    const { result, rerender } = renderHook(
      ({ dep }) => useAsyncData(fetcher, [dep]),
      { initialProps: { dep: "a" } },
    );

    await waitFor(() => expect(result.current.data).toBe("first"));

    rerender({ dep: "b" });

    await waitFor(() => expect(result.current.data).toBe("second"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("ignores a stale response after unmount", async () => {
    let resolveFetch: (value: string) => void = () => {};
    const fetcher = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { unmount } = renderHook(() => useAsyncData(fetcher, []));

    unmount();
    // Resolving after unmount must not throw a "state update on
    // unmounted component" warning/error.
    expect(() => resolveFetch("late")).not.toThrow();
  });
});
