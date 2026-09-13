import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RULES_PATH = path.resolve(
  scriptDirectory,
  "..",
  ".codex",
  "text-quality-rules.json",
);

const RULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const NORMALIZATIONS = new Set(["none", "trim", "lowercase", "lowercase-trim"]);
const REGEXP_FLAG_PATTERN = /^[dgimsuvy]*$/;

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function readBoolean(value, fallback, label) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function normalizeRule(rawRule, index) {
  assertObject(rawRule, `rules[${index}]`);

  const ruleId = rawRule.rule_id;
  if (typeof ruleId !== "string" || !RULE_ID_PATTERN.test(ruleId)) {
    throw new Error(`rules[${index}].rule_id must be a stable identifier`);
  }

  const pattern = rawRule.pattern;
  if (typeof pattern !== "string" || pattern.length === 0) {
    throw new Error(`rules[${index}].pattern must be a non-empty string`);
  }

  const matchType = rawRule.match_type ?? rawRule.type ?? "literal";
  if (matchType !== "literal" && matchType !== "regex") {
    throw new Error(`rules[${index}].match_type must be literal or regex`);
  }

  const message = rawRule.message;
  if (typeof message !== "string" || message.length === 0) {
    throw new Error(`rules[${index}].message must be a non-empty string`);
  }

  const normalization = rawRule.normalization ?? "none";
  if (typeof normalization !== "string" || !NORMALIZATIONS.has(normalization)) {
    throw new Error(
      `rules[${index}].normalization must be one of ${[...NORMALIZATIONS].join(", ")}`,
    );
  }

  const caseSensitive = readBoolean(rawRule.case_sensitive, true, `rules[${index}].case_sensitive`);
  const flags = rawRule.flags ?? "";
  if (typeof flags !== "string" || !REGEXP_FLAG_PATTERN.test(flags)) {
    throw new Error(`rules[${index}].flags must contain only JavaScript regular expression flags`);
  }
  if (matchType === "literal" && flags.length > 0) {
    throw new Error(`rules[${index}].flags is only valid for regex rules`);
  }

  let matcher;
  if (matchType === "regex") {
    const regexFlags = [...new Set(`${flags}${caseSensitive ? "" : "i"}g`)].join("");
    try {
      matcher = new RegExp(pattern, regexFlags);
    } catch (error) {
      throw new Error(
        `rules[${index}].pattern is not a valid regular expression: ${error.message}`,
      );
    }
  }

  const ignore = rawRule.ignore ?? {};
  assertObject(ignore, `rules[${index}].ignore`);

  return {
    rule_id: ruleId,
    pattern,
    match_type: matchType,
    message,
    ...(rawRule.replacement === undefined ? {} : { replacement: rawRule.replacement }),
    normalization,
    case_sensitive: caseSensitive,
    matcher,
    ignore: {
      fenced_code: readBoolean(ignore.fenced_code, false, `rules[${index}].ignore.fenced_code`),
      inline_code: readBoolean(ignore.inline_code, false, `rules[${index}].ignore.inline_code`),
      urls: readBoolean(ignore.urls, false, `rules[${index}].ignore.urls`),
      identifiers: readBoolean(ignore.identifiers, false, `rules[${index}].ignore.identifiers`),
    },
  };
}

export function loadRules(rulesPath = DEFAULT_RULES_PATH) {
  const absolutePath = path.resolve(rulesPath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read text quality rules: ${error.message}`);
  }

  assertObject(parsed, "text quality rules");
  if (parsed.version !== 1) {
    throw new Error("text quality rules version must be 1");
  }
  if (!Array.isArray(parsed.rules)) {
    throw new Error("text quality rules must contain a rules array");
  }

  const ruleIds = new Set();
  const rules = parsed.rules.map((rule, index) => {
    const normalized = normalizeRule(rule, index);
    if (ruleIds.has(normalized.rule_id)) {
      throw new Error(`duplicate text quality rule_id: ${normalized.rule_id}`);
    }
    ruleIds.add(normalized.rule_id);
    if (normalized.replacement !== undefined && typeof normalized.replacement !== "string") {
      throw new Error(`rules[${index}].replacement must be a string when provided`);
    }
    return normalized;
  });

  return {
    version: 1,
    status: parsed.status ?? (rules.length === 0 ? "not-configured" : "configured"),
    rules,
  };
}

function addRange(ranges, start, end) {
  if (end > start) {
    ranges.push([start, end]);
  }
}

function collectIgnoredRanges(text, ignore) {
  const ranges = [];

  if (ignore.fenced_code) {
    let fenceStart = null;
    let lineStart = 0;
    while (lineStart < text.length) {
      const newline = text.indexOf("\n", lineStart);
      const lineEnd = newline === -1 ? text.length : newline + 1;
      const line = text.slice(lineStart, lineEnd);
      if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) {
        if (fenceStart === null) {
          fenceStart = lineStart;
        } else {
          addRange(ranges, fenceStart, lineEnd);
          fenceStart = null;
        }
      }
      lineStart = lineEnd;
    }
    if (fenceStart !== null) {
      addRange(ranges, fenceStart, text.length);
    }
  }

  if (ignore.inline_code) {
    for (const match of text.matchAll(/`[^`\n]*`/g)) {
      addRange(ranges, match.index, match.index + match[0].length);
    }
  }

  if (ignore.urls) {
    for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>()\[\]]+/gi)) {
      addRange(ranges, match.index, match.index + match[0].length);
    }
  }

  if (ignore.identifiers) {
    for (const match of text.matchAll(/(?<![\p{L}\p{N}])[$A-Za-z_][\w$./:-]*/gu)) {
      addRange(ranges, match.index, match.index + match[0].length);
    }
  }

  return ranges.sort((left, right) => left[0] - right[0]);
}

function maskRanges(text, ranges) {
  if (ranges.length === 0) {
    return text;
  }
  const output = text.split("");
  for (const [start, end] of ranges) {
    for (let index = start; index < end; index += 1) {
      if (output[index] !== "\n" && output[index] !== "\r") {
        output[index] = " ";
      }
    }
  }
  return output.join("");
}

function normalizeMatch(match, normalization) {
  switch (normalization) {
    case "trim":
      return match.trim();
    case "lowercase":
      return match.toLowerCase();
    case "lowercase-trim":
      return match.trim().toLowerCase();
    case "none":
      return match;
    default:
      throw new Error(`Unsupported normalization: ${normalization}`);
  }
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text[cursor] === "\n") {
      line += 1;
    }
  }
  return line;
}

function collectMatches(text, maskedText, rule) {
  const matches = [];
  if (rule.match_type === "literal") {
    const needle = rule.case_sensitive ? rule.pattern : rule.pattern.toLocaleLowerCase();
    const haystack = rule.case_sensitive ? maskedText : maskedText.toLocaleLowerCase();
    let fromIndex = 0;
    while (fromIndex <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, fromIndex);
      if (index === -1) {
        break;
      }
      matches.push({
        index,
        length: needle.length,
        text: text.slice(index, index + needle.length),
      });
      fromIndex = index + Math.max(needle.length, 1);
    }
    return matches;
  }

  rule.matcher.lastIndex = 0;
  for (const match of maskedText.matchAll(rule.matcher)) {
    const value = match[0];
    if (value.length === 0) {
      continue;
    }
    matches.push({
      index: match.index,
      length: value.length,
      text: text.slice(match.index, match.index + value.length),
    });
  }
  return matches;
}

function publicViolation(violation) {
  return {
    path: violation.path,
    line: violation.line,
    rule_id: violation.rule_id,
    message: violation.message,
    ...(violation.replacement === undefined ? {} : { replacement: violation.replacement }),
  };
}

export function scanText(text, { path: filePath = "<text>", rules = [] } = {}) {
  if (typeof text !== "string") {
    throw new Error("Markdown text must be a string");
  }
  if (!Array.isArray(rules)) {
    throw new Error("scanText rules must be an array");
  }

  const violations = [];
  for (const rule of rules) {
    const ignoredRanges = collectIgnoredRanges(text, rule.ignore);
    const maskedText = maskRanges(text, ignoredRanges);
    for (const match of collectMatches(text, maskedText, rule)) {
      const normalizedMatch = normalizeMatch(match.text, rule.normalization);
      violations.push({
        path: filePath,
        line: lineNumberAt(text, match.index),
        rule_id: rule.rule_id,
        message: rule.message,
        ...(rule.replacement === undefined ? {} : { replacement: rule.replacement }),
        fingerprint: `${rule.rule_id}:${sha256(normalizedMatch)}`,
      });
    }
  }

  return violations.sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);
    if (pathOrder !== 0) return pathOrder;
    if (left.line !== right.line) return left.line - right.line;
    return left.rule_id.localeCompare(right.rule_id);
  });
}

export function scanFile(filePath, rules) {
  return scanText(fs.readFileSync(filePath, "utf8"), { path: filePath, rules });
}

export { publicViolation };

function parseArguments(argv) {
  const options = {
    rulesPath: DEFAULT_RULES_PATH,
    json: false,
    stdin: false,
    text: null,
    files: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--rules") {
      options.rulesPath = argv[++index];
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--stdin") {
      options.stdin = true;
    } else if (argument === "--text") {
      options.text = argv[++index];
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      options.files.push(argument);
    }
  }
  if (options.rulesPath === undefined || options.rulesPath === "") {
    throw new Error("--rules requires a path");
  }
  if (options.stdin && options.text !== null) {
    throw new Error("--stdin and --text cannot be combined");
  }
  if (options.text !== null && options.files.length > 0) {
    throw new Error("--text cannot be combined with file paths");
  }
  if (options.stdin && options.files.length > 0) {
    throw new Error("--stdin cannot be combined with file paths");
  }
  return options;
}

function printUsage() {
  process.stderr.write(
    "Usage: node scripts/lint-text-quality.mjs [--rules path] [--json] <Markdown path>...\n" +
      "       node scripts/lint-text-quality.mjs [--rules path] [--json] --stdin\n" +
      "       node scripts/lint-text-quality.mjs [--rules path] [--json] --text <Markdown>\n",
  );
}

function runCli() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    if (options.help) {
      printUsage();
      return 0;
    }
    if (!options.stdin && options.text === null && options.files.length === 0) {
      throw new Error("a Markdown path, --stdin, or --text is required");
    }

    const { rules } = loadRules(options.rulesPath);
    const violations = [];
    if (options.stdin) {
      violations.push(...scanText(fs.readFileSync(0, "utf8"), { path: "<stdin>", rules }));
    } else if (options.text !== null) {
      violations.push(...scanText(options.text, { path: "<text>", rules }));
    } else {
      for (const filePath of options.files) {
        violations.push(...scanFile(filePath, rules));
      }
    }

    if (options.json) {
      process.stdout.write(`${JSON.stringify(violations.map(publicViolation))}\n`);
    } else {
      for (const violation of violations) {
        const replacement =
          violation.replacement === undefined
            ? ""
            : ` replacement=${JSON.stringify(violation.replacement)}`;
        process.stdout.write(
          `${violation.path}:${violation.line} [${violation.rule_id}] ${violation.message}${replacement}\n`,
        );
      }
    }
    return violations.length === 0 ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    if (options?.help !== true) {
      printUsage();
    }
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli();
}
