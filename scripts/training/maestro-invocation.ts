export type MaestroInvocation = {
  command: string;
  args: string[];
  shell: boolean;
};

function quoteWindowsArgument(value: string): string {
  if (value !== "" && !/[\s"&|<>^]/.test(value)) return value;
  return `"${value.replace(/["^]/g, (character) => `^${character}`)}"`;
}

export function buildMaestroInvocation(
  platform: NodeJS.Platform,
  outputDirectory: string,
  junitPath: string,
  flowPath: string,
  targetSerial?: string,
): MaestroInvocation {
  const args = [
    ...(targetSerial ? ["--device", targetSerial] : []),
    "test",
    `--test-output-dir=${outputDirectory}`,
    "--format",
    "junit",
    "--output",
    junitPath,
    flowPath,
  ];
  if (platform !== "win32") return { command: "maestro", args, shell: false };

  const commandLine = ["maestro.bat", ...args].map(quoteWindowsArgument).join(" ");
  return {
    command: process.env.ComSpec ?? "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
    shell: false,
  };
}
