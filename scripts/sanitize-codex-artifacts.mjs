#!/usr/bin/env node
import { main } from "./lib/codex-artifact-sanitizer.mjs";

process.exitCode = main();
