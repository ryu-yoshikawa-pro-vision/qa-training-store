import {
  parseJsonWithSchema,
  resourceProbeCapabilitySchema,
  resourceBoundaryProbeSchema,
  type ResourceBoundaryProbe,
  type ResourceProbeCapability,
} from "./contracts";
import { compareCodeUnits } from "./contracts";

type ResourceKind = ResourceBoundaryProbe["results"][number]["resource_kind"];
export type DiscoveredResource = {
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
  if (/(?:^|\/)(?:[^/]+\.webmanifest|manifest(?:\.json)?)$/.test(pathname)) return "manifest";
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
  evidenceRefPrefix: string;
}): ResourceBoundaryProbe {
  const probeCapabilities: readonly ResourceProbeCapability[] = [
    "direct_navigation",
    "direct_read",
    "response_body",
    "arbitrary_fetch",
  ];
  const resources = [...input.resources].sort((left, right) =>
    compareCodeUnits(left.resource_url, right.resource_url),
  );
  const results = resources.flatMap((resource, resourceIndex) =>
    probeCapabilities.map((probeCapability, capabilityIndex) => ({
      ...resource,
      probe_capability: probeCapability,
      expected: "denied" as const,
      observed: "not_executed" as const,
      evidence_ref: `${input.evidenceRefPrefix}resource-boundary-${String(resourceIndex * probeCapabilities.length + capabilityIndex + 1).padStart(3, "0")}.json`,
    })),
  );
  return parseJsonWithSchema(
    {
      schema_version: 1,
      run_id: input.runId,
      artifact_sha256: input.artifactSha256,
      expected_resource_urls: resources.map((resource) => resource.resource_url),
      expected_probe_capabilities: [...probeCapabilities],
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
  expectedResources: readonly DiscoveredResource[];
  expectedProbeCapabilities?: readonly ResourceProbeCapability[];
  observations: readonly ResourceBoundaryProbe["results"][number][];
}): ResourceBoundaryProbe {
  const expectedProbeCapabilities = input.expectedProbeCapabilities ?? [
    ...resourceProbeCapabilitySchema.options,
  ];
  const expectedResources = [...input.expectedResources].sort((left, right) =>
    compareCodeUnits(left.resource_url, right.resource_url),
  );
  const passed =
    input.observations.length === expectedResources.length * expectedProbeCapabilities.length &&
    input.observations.every((result) => result.observed === "denied");
  return parseJsonWithSchema(
    {
      schema_version: 1,
      run_id: input.runId,
      artifact_sha256: input.artifactSha256,
      expected_resource_urls: expectedResources.map((resource) => resource.resource_url),
      expected_probe_capabilities: [...expectedProbeCapabilities],
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
