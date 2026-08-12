import {
  parseJsonWithSchema,
  resourceBoundaryProbeSchema,
  type ResourceBoundaryProbe,
  type RuntimeVariant,
} from "./contracts";
import { compareCodeUnits } from "./contracts";

type ResourceKind = ResourceBoundaryProbe["results"][number]["resource_kind"];
type ProbeCapability = ResourceBoundaryProbe["results"][number]["probe_capability"];
type DiscoveredResource = {
  resource_url: string;
  resource_kind: ResourceKind;
  discovery_source: string;
};

function resourceKind(url: string): ResourceKind | null {
  const pathname = new URL(url).pathname.toLowerCase();
  if (/\.map$/.test(pathname)) return "source_map";
  if (/\.css$/.test(pathname)) return "css";
  if (/\.js(?:on)?$/.test(pathname) || /\.mjs$/.test(pathname))
    return pathname.endsWith(".json") ? "manifest" : "javascript";
  if (/manifest(?:\.webmanifest)?$/.test(pathname)) return "manifest";
  return null;
}

function discoveredUrl(raw: string, runtimeUrl: string): string | null {
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("#")) return null;
  try {
    return new URL(raw, runtimeUrl).toString();
  } catch {
    return null;
  }
}

export function discoverServedResources(input: {
  runtimeUrl: string;
  html: string;
  artifactPaths?: readonly string[];
}): DiscoveredResource[] {
  const discovered = new Map<string, DiscoveredResource>();
  const attributePattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  for (const match of input.html.matchAll(attributePattern)) {
    const raw = match[1];
    if (raw === undefined) continue;
    const url = discoveredUrl(raw, input.runtimeUrl);
    const kind = url === null ? null : resourceKind(url);
    if (url !== null && kind !== null)
      discovered.set(url, {
        resource_url: url,
        resource_kind: kind,
        discovery_source: "served-html",
      });
  }
  for (const artifactPath of input.artifactPaths ?? []) {
    const kind = resourceKind(`http://artifact.invalid/${artifactPath}`);
    if (kind === null) continue;
    const url = new URL(artifactPath.replace(/^\//, ""), input.runtimeUrl).toString();
    if (!discovered.has(url))
      discovered.set(url, {
        resource_url: url,
        resource_kind: kind,
        discovery_source: "artifact-manifest",
      });
  }
  return [...discovered.values()].sort((left, right) =>
    compareCodeUnits(left.resource_url, right.resource_url),
  );
}

export function createNotExecutedResourceBoundaryProbe(input: {
  runId: string;
  artifactSha256: string;
  resources: readonly DiscoveredResource[];
  probeCapability?: ProbeCapability;
  evidenceRefPrefix: string;
}): ResourceBoundaryProbe {
  const probeCapability = input.probeCapability ?? "direct_navigation";
  const results = input.resources.map((resource, index) => ({
    ...resource,
    probe_capability: probeCapability,
    expected: "denied" as const,
    observed: "not_executed" as const,
    evidence_ref: `${input.evidenceRefPrefix}resource-boundary-${String(index + 1).padStart(3, "0")}.json`,
  }));
  return parseJsonWithSchema(
    {
      schema_version: 1,
      run_id: input.runId,
      artifact_sha256: input.artifactSha256,
      results,
      passed: false,
    },
    resourceBoundaryProbeSchema,
    "resource boundary probe",
  );
}

export function createResourceBoundaryProbe(input: {
  runId: string;
  artifactSha256: string;
  observations: readonly ResourceBoundaryProbe["results"][number][];
}): ResourceBoundaryProbe {
  const passed =
    input.observations.length > 0 &&
    input.observations.every((result) => result.observed === "denied");
  return parseJsonWithSchema(
    {
      schema_version: 1,
      run_id: input.runId,
      artifact_sha256: input.artifactSha256,
      results: input.observations,
      passed,
    },
    resourceBoundaryProbeSchema,
    "resource boundary probe",
  );
}

export function assertResourceBoundaryProbePassed(probe: ResourceBoundaryProbe): void {
  if (!probe.passed)
    throw new Error(
      "Actual served resource boundary probe did not prove denial for every resource",
    );
}

export function assertRuntimeVariantForResourceProbe(
  variant: RuntimeVariant,
  runtimeUrl: string,
): void {
  const origin = new URL(runtimeUrl).origin;
  if (!variant.platform || origin === "null")
    throw new Error("Resource probe requires a web Runtime Variant and URL");
}
