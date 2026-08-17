const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      ".artifacts/**",
      ".codex/**",
      ".agents/**",
      ".expo/**",
      ".corepack-cache/**",
      ".pnpm-store/**",
      "dist/**",
      "docs/**",
      "examples/**",
      "node_modules/**",
      "output/**",
      "playwright-report/**",
      "test-results/**",
      "scripts/*.ps1",
      "scripts/*.sh",
    ],
  },
  {
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/set-state-in-effect": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "業務時刻はClock Portを使用してください。",
        },
      ],
    },
  },
  {
    files: ["e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);
