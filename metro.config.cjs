/* eslint-disable no-undef */
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const moduleTargets = {
    "/native-automation-bridge": [
      "native-automation-bridge.disabled",
      "native-automation-bridge.enabled",
    ],
    "/native-contract-harness-screen": [
      "native-contract-harness-screen.disabled",
      "native-contract-harness-screen.enabled",
    ],
  };
  const targetNames = Object.entries(moduleTargets).find(([suffix]) => moduleName.endsWith(suffix));
  if (targetNames !== undefined) {
    const targets = targetNames[1];
    const isNativePlatform = platform === "android" || platform === "ios";
    const target = path.join(
      __dirname,
      "src",
      "presentation",
      "native",
      targets[!isNativePlatform || process.env.EXPO_PUBLIC_BUILD_KIND === "production" ? 0 : 1],
    );
    return context.resolveRequest(context, target, platform);
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
