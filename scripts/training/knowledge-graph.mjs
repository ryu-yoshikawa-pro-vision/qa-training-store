#!/usr/bin/env node
// Curriculum knowledge-graph integrity and change-impact lookup.
// No package installation, remote access, Git writes, or curriculum edits.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, isAbsolute, sep } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const graphPath = resolve(root, "docs/curriculum/ai-assisted-qa/knowledge-graph.json");
const mapPath = resolve(root, "docs/plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md");
const permittedTypes = new Set([
  "phase",
  "module",
  "learning_objective",
  "knowledge",
  "test_target",
  "skill",
]);
const relations = {
  part_of: [
    ["module", "phase"],
    ["learning_objective", "module"],
  ],
  requires: [
    ["module", "module"],
    ["knowledge", "knowledge"],
  ],
  requires_knowledge: [["learning_objective", "knowledge"]],
  applies_to: [["learning_objective", "test_target"]],
  may_use_skill: [["module", "skill"]],
};

const fail = (message) => {
  throw new Error(message);
};
const load = () => JSON.parse(readFileSync(graphPath, "utf8"));
const unique = (values) => new Set(values).size === values.length;
const sameSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v));

function validate(graph) {
  if (graph.schema_version !== 1) fail("Unknown graph schema_version");
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges))
    fail("Graph must contain nodes and edges");
  const ids = graph.nodes.map((n) => n.id);
  if (ids.some((id) => typeof id !== "string" || !id) || !unique(ids))
    fail("Node IDs must be unique nonempty strings");
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const node of graph.nodes) {
    if (!permittedTypes.has(node.type) || !node.title) fail("Invalid node: " + node.id);
    if ((node.type === "test_target" || node.type === "skill") && !node.path)
      fail("Missing path: " + node.id);
    if (
      node.type === "skill" &&
      (node.repo !== "ryu-yoshikawa-pro-vision/qa-workflow-skills" ||
        !/^skills\/[^/]+\/SKILL\.md$/.test(node.path))
    )
      fail("Skill must refer to qa-workflow-skills/skills/: " + node.id);
    if (node.type === "test_target" && node.repo === "ryu-yoshikawa-pro-vision/qa-training-store") {
      const actual = resolve(root, node.path);
      const relativePath = relative(root, actual);
      if (
        relativePath === ".." ||
        relativePath.startsWith(".." + sep) ||
        isAbsolute(relativePath) ||
        !existsSync(actual)
      )
        fail("Missing/local path escapes repository: " + node.path);
    }
  }
  const seenEdges = new Set();
  for (const edge of graph.edges) {
    const from = byId.get(edge.from),
      to = byId.get(edge.to);
    if (!from || !to) fail("Dangling edge: " + edge.from + " -> " + edge.to);
    if (!relations[edge.relation]?.some(([a, b]) => a === from.type && b === to.type))
      fail("Invalid relation type: " + JSON.stringify(edge));
    const key = edge.from + "\u0000" + edge.relation + "\u0000" + edge.to;
    if (seenEdges.has(key)) fail("Duplicate relation: " + key);
    seenEdges.add(key);
  }
  const mapText = readFileSync(mapPath, "utf8");
  const mapIds = [...mapText.matchAll(/^\|\s*(M\d\d-\d\d)\s*\|/gm)].map((m) => m[1]);
  if (
    !unique(mapIds) ||
    !sameSet(
      new Set(mapIds),
      new Set(graph.nodes.filter((n) => n.type === "learning_objective").map((n) => n.id)),
    )
  )
    fail("Learning objective IDs differ from the curriculum learning-map");
  for (const node of graph.nodes.filter((n) => n.type === "learning_objective")) {
    const module = node.id.slice(0, 3);
    if (
      node.module !== module ||
      !graph.edges.some((e) => e.from === node.id && e.to === module && e.relation === "part_of")
    )
      fail("Objective does not belong to its module: " + node.id);
    if (!graph.edges.some((e) => e.from === node.id && e.relation === "requires_knowledge"))
      fail("Missing knowledge decomposition: " + node.id);
  }
  for (const node of graph.nodes.filter((n) => n.type === "knowledge")) {
    if (!graph.edges.some((e) => e.to === node.id && e.relation === "requires_knowledge"))
      fail("Unused knowledge node: " + node.id);
  }
  for (const node of graph.nodes.filter((n) => n.type === "module")) {
    const hasPhaseRelation = graph.edges.some(
      (e) => e.from === node.id && e.to === node.phase && e.relation === "part_of",
    );
    if (!hasPhaseRelation) fail("Missing phase: " + node.id);
  }
  const visiting = new Set(),
    done = new Set();
  const dfs = (id) => {
    if (visiting.has(id)) fail("Module prerequisite cycle: " + id);
    if (done.has(id)) return;
    visiting.add(id);
    for (const e of graph.edges.filter((e) => e.from === id && e.relation === "requires"))
      dfs(e.to);
    visiting.delete(id);
    done.add(id);
  };
  for (const n of graph.nodes.filter((n) => n.type === "module" || n.type === "knowledge"))
    dfs(n.id);
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    objectives: mapIds.length,
    knowledge: graph.nodes.filter((n) => n.type === "knowledge").length,
    tentative: graph.nodes.filter((n) => n.status?.includes("draft")).length,
  };
}
function impact(graph, query) {
  const matches = graph.nodes.filter(
    (n) => n.id === query || n.path === query || (n.repo && n.repo + ":" + n.path === query),
  );
  if (!matches.length) fail("No node matches: " + query);
  const affected = new Set(),
    objectives = new Set(),
    reasons = [];
  // Trace skills to modules, feature specs to objectives, and knowledge to its dependent objectives.
  for (const target of matches) {
    if (target.type === "learning_objective") {
      objectives.add(target.id);
      affected.add(target.module);
    } else if (target.type === "module") affected.add(target.id);
    const prerequisiteDependents = new Set([target.id]);
    if (target.type === "knowledge") {
      let changed = true;
      while (changed) {
        changed = false;
        for (const e of graph.edges.filter(
          (e) => e.relation === "requires" && !prerequisiteDependents.has(e.from),
        )) {
          if (prerequisiteDependents.has(e.to)) {
            prerequisiteDependents.add(e.from);
            changed = true;
          }
        }
      }
    }
    for (const edge of graph.edges.filter((e) => prerequisiteDependents.has(e.to))) {
      if (!["applies_to", "may_use_skill", "requires_knowledge"].includes(edge.relation)) continue;
      reasons.push({
        source: target.id,
        relation: edge.relation,
        from: edge.from,
        status: edge.status,
      });
      if (/^M\d\d-\d\d$/.test(edge.from)) {
        objectives.add(edge.from);
        affected.add(edge.from.slice(0, 3));
      } else if (/^M\d\d$/.test(edge.from)) affected.add(edge.from);
    }
  }
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return {
    matches: matches.map((n) => ({ id: n.id, title: n.title, status: n.status ?? null })),
    review_modules: [...affected].sort().map((id) => ({ id, title: byId.get(id)?.title })),
    direct_objectives: [...objectives].sort(),
    reasons,
    note: "Candidates for manual review only; no curriculum, test target, or Skill changes were made.",
  };
}
try {
  const args = process.argv.slice(2),
    graph = load(),
    counts = validate(graph);
  if (args[0] === "validate" && args.length === 1)
    console.log(JSON.stringify({ ok: true, ...counts }, null, 2));
  else if (args[0] === "impact" && args.length === 2)
    console.log(JSON.stringify({ ok: true, ...impact(graph, args[1]) }, null, 2));
  else fail("Usage: node scripts/training/knowledge-graph.mjs validate | impact <node-id|repo-path>");
} catch (error) {
  console.error("knowledge-graph: " + error.message);
  process.exitCode = 1;
}
