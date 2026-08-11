export function optionValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (value === undefined || value === "" || value.startsWith("--"))
    throw new Error(`Missing argument value: ${name}`);
  return value;
}

export function requiredOptionValue(args: readonly string[], name: string): string {
  const value = optionValue(args, name);
  if (value === undefined) throw new Error(`Missing argument: ${name}`);
  return value;
}
