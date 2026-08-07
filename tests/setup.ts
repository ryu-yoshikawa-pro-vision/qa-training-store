import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";
import "fake-indexeddb/auto";

expect.extend(matchers);

class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = TestResizeObserver;
HTMLElement.prototype.scrollIntoView = () => {};
