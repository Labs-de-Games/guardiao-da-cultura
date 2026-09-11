import {
  downloadReportCsv,
  EditalApiError,
  getCampaigns,
  getFunnel,
  getReport,
  getSummary,
} from "./edital";

describe("lib/api/edital", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("getSummary sends dateRange as a query param and includes credentials", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ linked: true, data: {} }),
    });

    await getSummary({ type: "30d" });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/edital/summary?dateRange=30d");
    expect(init).toEqual({ credentials: "include" });
  });

  it("getFunnel includes from/to for a custom range", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ linked: true, data: [] }),
    });

    await getFunnel({ type: "custom", start: "2026-01-01", end: "2026-02-01" });

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("dateRange=custom");
    expect(url).toContain("from=2026-01-01");
    expect(url).toContain("to=2026-02-01");
  });

  it("throws EditalApiError with status 401 on an expired session", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(getReport({ type: "30d" })).rejects.toMatchObject({
      status: 401,
    });
    await expect(getReport({ type: "30d" })).rejects.toBeInstanceOf(
      EditalApiError,
    );
  });

  it("throws EditalApiError on a non-401 error status", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(getCampaigns({ type: "30d" })).rejects.toMatchObject({
      status: 500,
    });
  });

  it("getReport parses the JSON body on success", async () => {
    const body = { linked: true, data: { sessionDuration: {} } };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body,
    });

    const result = await getReport({ type: "today" });

    expect(result).toEqual(body);
  });

  describe("downloadReportCsv", () => {
    let createObjectURLMock: jest.Mock;
    let revokeObjectURLMock: jest.Mock;
    let clickSpy: jest.SpyInstance;

    beforeEach(() => {
      createObjectURLMock = jest.fn().mockReturnValue("blob:mock-url");
      revokeObjectURLMock = jest.fn();
      // jsdom doesn't implement these — define them directly rather than
      // spying on a property that doesn't exist on the object yet.
      URL.createObjectURL = createObjectURLMock;
      URL.revokeObjectURL = revokeObjectURLMock;
      clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      clickSpy.mockRestore();
    });

    it("downloads the CSV via blob + object URL + revoke", async () => {
      const mockBlob = new Blob(["a;b"], { type: "text/csv" });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      });

      await downloadReportCsv({ type: "30d" });

      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
    });

    it("throws EditalApiError when the CSV export fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(downloadReportCsv({ type: "30d" })).rejects.toBeInstanceOf(
        EditalApiError,
      );
    });
  });
});
