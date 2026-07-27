import type { TestApi } from "./test-api.web";

declare global {
  interface Window {
    __TEST_API__?: TestApi;
  }
}

export {};
