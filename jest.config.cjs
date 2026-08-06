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
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
};
