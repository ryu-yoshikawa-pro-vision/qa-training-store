import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function listFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

const routeFiles = listFiles(path.join(root, "app")).filter((file) => file.endsWith(".native.tsx"));
const nativeModules = [
  ...routeFiles,
  path.join(root, "src/presentation/root-layout.native.tsx"),
  ...listFiles(path.join(root, "src/presentation/native")),
  path.join(root, "src/presentation/native-route.native.tsx"),
  path.join(root, "src/bootstrap/native-runtime.ts"),
  ...listFiles(path.join(root, "src/infrastructure/database/sqlite")),
  path.join(root, "src/infrastructure/clock/native-clock.ts"),
  path.join(root, "src/infrastructure/id-generator/native-id-generator.ts"),
  path.join(root, "src/infrastructure/security/password-hasher.native.ts"),
  path.join(root, "src/infrastructure/session/native-stores.ts"),
  path.join(root, "src/test-controls/native-test-control.native.ts"),
  path.join(root, "src/test-controls/native-test-control-protocol.ts"),
  path.join(root, "src/test-controls/native-signals.ts"),
  path.join(root, "src/seeds/scenarios.ts"),
  path.join(root, "src/seeds/default-dataset.ts"),
];

const forbidden = [
  /from ["'][^"']*\.web(?:\.tsx?|["'])/i,
  /from ["'][^"']*\.web\.[^"']*["']/i,
  /(?:^|[^A-Za-z])(dexie|react-aria-components)(?:[^A-Za-z]|$)/i,
  /\b(?:document|window|localStorage|sessionStorage)\b/,
  /import\s+["'][^"']+\.css["']/i,
];
const violations: string[] = [];

for (const file of nativeModules) {
  if (!fs.existsSync(file) || !/\.(?:ts|tsx)$/.test(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) violations.push(`${path.relative(root, file)} matches ${pattern}`);
  }
}

for (const file of routeFiles.filter((candidate) =>
  candidate.includes(`${path.sep}admin${path.sep}`),
)) {
  const source = fs.readFileSync(file, "utf8");
  if (
    /presentation[\\/]pages|presentation[\\/]browser|application[\\/]create-application-services/.test(
      source,
    )
  ) {
    violations.push(`${path.relative(root, file)} loads a Web/Admin module`);
  }
}

if (violations.length > 0) {
  console.error("Native Route Dependency Check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(`Native Route Dependency Check passed (${routeFiles.length} native routes).`);
}
