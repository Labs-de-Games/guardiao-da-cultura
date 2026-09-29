import { act, render } from "@testing-library/react";
import { OfflineNotice } from "./OfflineNotice";

const mockShowToast = jest.fn();

jest.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe("OfflineNotice", () => {
  beforeEach(() => mockShowToast.mockClear());

  it("warns when the connection drops and confirms when it returns", () => {
    render(<OfflineNotice />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.stringContaining("Sem conexão"),
      "warning",
    );

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(mockShowToast).toHaveBeenLastCalledWith(
      "Conexão restabelecida.",
      "success",
    );
  });

  it("stops listening after unmount", () => {
    const { unmount } = render(<OfflineNotice />);
    unmount();

    window.dispatchEvent(new Event("offline"));
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
