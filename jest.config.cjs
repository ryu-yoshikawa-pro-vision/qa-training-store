module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/component/native/**/*.test.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@app/(.*)$": "<rootDir>/app/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.native.ts"],
  clearMocks: true,
  restoreMocks: true,
  // React Nativeの非同期screen testはworker並列時に5秒のwaitForを取りこぼすため、安定性を優先する。
  maxWorkers: 1,
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
};
