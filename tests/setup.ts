import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = TestResizeObserver;
HTMLElement.prototype.scrollIntoView = () => {};
