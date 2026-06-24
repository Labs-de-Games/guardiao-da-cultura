import { act, render } from "@testing-library/react";
import { PixelDissolveCanvas } from "./PixelDissolveCanvas";
import { PixelRevealCanvas } from "./PixelRevealCanvas";

type ImageHandler = ((event?: Event) => void) | null;

// Minimal Image mock that lets the test force a network/404-style failure.
class MockImage {
  static instances: MockImage[] = [];

  onload: ImageHandler = null;
  onerror: ImageHandler = null;
  crossOrigin: string | null = null;
  complete = false;
  naturalWidth = 0;
  private _src = "";

  constructor() {
    MockImage.instances.push(this);
  }

  set src(value: string) {
    this._src = value;
  }

  get src() {
    return this._src;
  }

  fail() {
    this.complete = true;
    this.naturalWidth = 0;
    this.onerror?.(new Event("error"));
  }
}

describe("pixel canvas image failures", () => {
  const originalImage = global.Image;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    MockImage.instances = [];
    global.Image = MockImage as unknown as typeof Image;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      imageSmoothingEnabled: false,
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    global.Image = originalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    jest.restoreAllMocks();
  });

  it("finishes PixelRevealCanvas when the image load fails", async () => {
    const onDone = jest.fn();

    // A failed load must end the animation instead of leaving the screen stuck.
    render(
      <PixelRevealCanvas
        src="/missing.png"
        width={32}
        height={32}
        onDone={onDone}
      />,
    );

    expect(MockImage.instances).toHaveLength(1);

    await act(async () => {
      MockImage.instances[0]?.fail();
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("finishes PixelDissolveCanvas when the image load fails", async () => {
    const onDone = jest.fn();

    // The reverse animation should fail open as well, so the intro can continue.
    render(
      <PixelDissolveCanvas
        src="/missing.png"
        width={32}
        height={32}
        onDone={onDone}
      />,
    );

    expect(MockImage.instances).toHaveLength(1);

    await act(async () => {
      MockImage.instances[0]?.fail();
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
