import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { isSkillName, type SkillName } from "./skill-trigger-evals.js";

export const OTEL_CONTROL_METRIC_NAME = "codex.thread.started" as const;
export const OTEL_SKILL_METRIC_NAME = "codex.skill.injected" as const;
export const OTEL_COLLECTION_QUIET_MS = 1_000 as const;
export const OTEL_COLLECTION_HARD_CAP_MS = 5_000 as const;

export type OtelCollectionState =
  | "collecting"
  | "completed"
  | "collection_timeout"
  | "bind_failed"
  | "request_failed";

export type OtelUnobservableReason =
  | "collector_error"
  | "http_error"
  | "parse_error"
  | "control_missing"
  | "control_invalid"
  | "skill_metric_invalid"
  | "unknown_skill"
  | "multiple_skills"
  | "collection_timeout";

export interface OtelSkillPoint {
  readonly skill: string;
  readonly status: string;
  readonly value: number;
  readonly invoke_type?: string;
  readonly plugin_id?: string;
}

export interface OtelPayloadSummary {
  readonly control_metric_seen: boolean;
  readonly control_valid_point_count: number;
  readonly skill_metric_seen: boolean;
  readonly skill_points: readonly OtelSkillPoint[];
  readonly malformed_relevant_metric: boolean;
  readonly malformed_control_metric: boolean;
  readonly malformed_skill_metric: boolean;
  readonly malformed_payload: boolean;
}

export interface OtelObservation {
  readonly source: "otel";
  readonly collection_state: OtelCollectionState;
  readonly reliable: boolean;
  readonly initial_skill: SkillName | null;
  readonly observed_skills: readonly SkillName[] | null;
  readonly unobservable_reason: OtelUnobservableReason | null;
  readonly request_count: number;
  readonly post_close_request_count: number;
  readonly response_error_count: number;
  readonly parse_error_count: number;
  readonly control_metric_seen: boolean;
  readonly control_valid_point_count: number;
  readonly skill_metric_seen: boolean;
  readonly skill_point_count: number;
  readonly first_request_at: number | null;
  readonly last_request_at: number | null;
  readonly close_at: number | null;
  readonly collection_completed_at: number | null;
  readonly collection_elapsed_ms: number | null;
  readonly diagnostic: Readonly<{
    metric_names: readonly string[];
    invoke_types: readonly string[];
    plugin_ids: readonly string[];
    skill_values: readonly string[];
    status_values: readonly string[];
  }>;
}

interface JsonObject {
  readonly [key: string]: unknown;
}

interface ParsedPayload {
  readonly metricNames: readonly string[];
  readonly controlPoints: readonly unknown[];
  readonly skillPoints: readonly OtelSkillPoint[];
  readonly skillMetricSeen: boolean;
  readonly malformedControlMetric: boolean;
  readonly malformedSkillMetric: boolean;
  readonly malformedPayload: boolean;
}

interface MetricParseState {
  readonly controlPoints: unknown[];
  readonly skillPoints: OtelSkillPoint[];
  skillMetricSeen: boolean;
  malformedControlMetric: boolean;
  malformedSkillMetric: boolean;
}

interface OTelValue {
  readonly stringValue?: unknown;
  readonly boolValue?: unknown;
  readonly intValue?: unknown;
  readonly doubleValue?: unknown;
  readonly asInt?: unknown;
  readonly asDouble?: unknown;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pointValue(point: JsonObject): number | null {
  const direct = [point.asInt, point.asDouble].filter((value) => value !== undefined);
  if (direct.length !== 1) {
    return null;
  }
  return numericValue(direct[0]);
}

function hasOwn(value: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasValidSum(metric: JsonObject): boolean {
  const dataTypes = ["gauge", "sum", "histogram", "exponentialHistogram", "summary"].filter((key) =>
    hasOwn(metric, key),
  );
  return (
    dataTypes.length === 1 &&
    dataTypes[0] === "sum" &&
    isObject(metric.sum) &&
    Array.isArray(metric.sum.dataPoints)
  );
}

function attributeValue(value: unknown): string | boolean | number | null {
  if (!isObject(value)) {
    return null;
  }
  const typed = value as OTelValue;
  const entries = [
    ["stringValue", typed.stringValue],
    ["boolValue", typed.boolValue],
    ["intValue", typed.intValue],
    ["doubleValue", typed.doubleValue],
  ].filter(([, candidate]) => candidate !== undefined);
  if (entries.length !== 1) {
    return null;
  }
  const [kind, candidate] = entries[0] ?? [];
  if (kind === "stringValue") {
    return typeof candidate === "string" ? candidate : null;
  }
  if (kind === "boolValue") {
    return typeof candidate === "boolean" ? candidate : null;
  }
  return numericValue(candidate);
}

function attributesOf(
  point: JsonObject,
): Readonly<Record<string, string | boolean | number>> | null {
  if (!Array.isArray(point.attributes)) {
    return null;
  }
  const attributes: Record<string, string | boolean | number> = {};
  for (const entry of point.attributes) {
    if (!isObject(entry) || typeof entry.key !== "string") {
      return null;
    }
    const value = attributeValue(entry.value);
    if (value === null || Object.hasOwn(attributes, entry.key)) {
      return null;
    }
    attributes[entry.key] = value;
  }
  return attributes;
}

function parseMetric(
  metric: unknown,
  metricNames: string[],
  state: {
    readonly controlPoints: unknown[];
    readonly skillPoints: OtelSkillPoint[];
    skillMetricSeen: boolean;
    malformedControlMetric: boolean;
    malformedSkillMetric: boolean;
  },
): boolean {
  if (!isObject(metric) || typeof metric.name !== "string") {
    return false;
  }
  metricNames.push(metric.name);
  if (metric.name !== OTEL_CONTROL_METRIC_NAME && metric.name !== OTEL_SKILL_METRIC_NAME) {
    return true;
  }
  if (metric.name === OTEL_SKILL_METRIC_NAME) {
    state.skillMetricSeen = true;
  }
  const isControlMetric = metric.name === OTEL_CONTROL_METRIC_NAME;
  if (!hasValidSum(metric)) {
    if (isControlMetric) {
      state.malformedControlMetric = true;
    } else {
      state.malformedSkillMetric = true;
    }
    return true;
  }
  const sum = metric.sum;
  if (!isObject(sum) || !Array.isArray(sum.dataPoints)) {
    return true;
  }
  for (const rawPoint of sum.dataPoints) {
    if (!isObject(rawPoint)) {
      if (isControlMetric) {
        state.malformedControlMetric = true;
      } else {
        state.malformedSkillMetric = true;
      }
      continue;
    }
    const value = pointValue(rawPoint);
    if (value === null) {
      if (isControlMetric) {
        state.malformedControlMetric = true;
      } else {
        state.malformedSkillMetric = true;
      }
      continue;
    }
    if (isControlMetric) {
      state.controlPoints.push(value);
      continue;
    }
    const attributes = attributesOf(rawPoint);
    if (attributes === null) {
      state.malformedSkillMetric = true;
      continue;
    }
    const skill = attributes.skill;
    const status = attributes.status;
    if (typeof skill !== "string" || typeof status !== "string") {
      state.malformedSkillMetric = true;
      continue;
    }
    state.skillPoints.push({
      skill,
      status,
      value,
      ...(typeof attributes.invoke_type === "string"
        ? { invoke_type: attributes.invoke_type }
        : {}),
      ...(typeof attributes.plugin_id === "string" ? { plugin_id: attributes.plugin_id } : {}),
    });
  }
  return true;
}

function parsePayload(payload: unknown): ParsedPayload {
  if (!isObject(payload) || !Array.isArray(payload.resourceMetrics)) {
    return {
      metricNames: [],
      controlPoints: [],
      skillPoints: [],
      skillMetricSeen: false,
      malformedControlMetric: false,
      malformedSkillMetric: false,
      malformedPayload: true,
    };
  }
  const metricNames: string[] = [];
  const controlPoints: unknown[] = [];
  const skillPoints: OtelSkillPoint[] = [];
  const state: MetricParseState = {
    controlPoints,
    skillPoints,
    skillMetricSeen: false,
    malformedControlMetric: false,
    malformedSkillMetric: false,
  };
  let malformedPayload = false;
  for (const resourceMetric of payload.resourceMetrics) {
    if (!isObject(resourceMetric) || !Array.isArray(resourceMetric.scopeMetrics)) {
      malformedPayload = true;
      continue;
    }
    for (const scopeMetric of resourceMetric.scopeMetrics) {
      if (!isObject(scopeMetric) || !Array.isArray(scopeMetric.metrics)) {
        malformedPayload = true;
        continue;
      }
      for (const metric of scopeMetric.metrics) {
        if (!parseMetric(metric, metricNames, state)) {
          malformedPayload = true;
        }
      }
    }
  }
  return {
    metricNames,
    controlPoints,
    skillPoints,
    skillMetricSeen: state.skillMetricSeen,
    malformedControlMetric: state.malformedControlMetric,
    malformedSkillMetric: state.malformedSkillMetric,
    malformedPayload,
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function summarizeOtelPayloads(payloads: readonly unknown[]): OtelPayloadSummary {
  const metricNames: string[] = [];
  const controlPoints: unknown[] = [];
  const skillPoints: OtelSkillPoint[] = [];
  let skillMetricSeen = false;
  let malformedControlMetric = false;
  let malformedSkillMetric = false;
  let malformedPayload = false;
  for (const payload of payloads) {
    const parsed = parsePayload(payload);
    metricNames.push(...parsed.metricNames);
    controlPoints.push(...parsed.controlPoints);
    skillPoints.push(...parsed.skillPoints);
    skillMetricSeen ||= parsed.skillMetricSeen;
    malformedControlMetric ||= parsed.malformedControlMetric;
    malformedSkillMetric ||= parsed.malformedSkillMetric;
    malformedPayload ||= parsed.malformedPayload;
  }
  return {
    control_metric_seen: metricNames.includes(OTEL_CONTROL_METRIC_NAME),
    control_valid_point_count: controlPoints.filter((value) => {
      const numeric = numericValue(value);
      return numeric !== null && numeric > 0;
    }).length,
    skill_metric_seen: skillMetricSeen,
    skill_points: skillPoints,
    malformed_relevant_metric: malformedControlMetric || malformedSkillMetric,
    malformed_control_metric: malformedControlMetric,
    malformed_skill_metric: malformedSkillMetric,
    malformed_payload: malformedPayload,
  };
}

interface ObservationMetadata {
  readonly collection_state?: OtelCollectionState;
  readonly request_count?: number;
  readonly post_close_request_count?: number;
  readonly response_error_count?: number;
  readonly parse_error_count?: number;
  readonly first_request_at?: number | null;
  readonly last_request_at?: number | null;
  readonly close_at?: number | null;
  readonly collection_completed_at?: number | null;
}

export function classifyOtelObservation(
  payloads: readonly unknown[],
  metadata: ObservationMetadata = {},
): OtelObservation {
  const summary = summarizeOtelPayloads(payloads);
  const controlValid = summary.control_valid_point_count > 0;
  const metadataState = metadata.collection_state ?? "completed";
  const requestCount = metadata.request_count ?? payloads.length;
  const postCloseRequestCount = metadata.post_close_request_count ?? 0;
  const responseErrorCount = metadata.response_error_count ?? 0;
  const parseErrorCount = metadata.parse_error_count ?? 0;
  const firstRequestAt = metadata.first_request_at ?? null;
  const lastRequestAt = metadata.last_request_at ?? null;
  const invokeTypes = uniqueSorted(
    summary.skill_points.flatMap((point) => (point.invoke_type ? [point.invoke_type] : [])),
  );
  const pluginIds = uniqueSorted(
    summary.skill_points.flatMap((point) => (point.plugin_id ? [point.plugin_id] : [])),
  );
  const skillValues = uniqueSorted(summary.skill_points.map((point) => point.skill));
  const statusValues = uniqueSorted(summary.skill_points.map((point) => point.status));
  const diagnostic = {
    metric_names: uniqueSorted(payloads.flatMap((payload) => parsePayload(payload).metricNames)),
    invoke_types: invokeTypes,
    plugin_ids: pluginIds,
    skill_values: skillValues,
    status_values: statusValues,
  } as const;
  const base = {
    source: "otel" as const,
    collection_state: metadataState,
    request_count: requestCount,
    post_close_request_count: postCloseRequestCount,
    response_error_count: responseErrorCount,
    parse_error_count: parseErrorCount,
    control_metric_seen: summary.control_metric_seen,
    control_valid_point_count: summary.control_valid_point_count,
    skill_metric_seen: summary.skill_metric_seen,
    skill_point_count: summary.skill_points.length,
    first_request_at: firstRequestAt,
    last_request_at: lastRequestAt,
    close_at: metadata.close_at ?? null,
    collection_completed_at: metadata.collection_completed_at ?? null,
    collection_elapsed_ms:
      metadata.close_at !== undefined &&
      metadata.close_at !== null &&
      metadata.collection_completed_at !== undefined &&
      metadata.collection_completed_at !== null
        ? Math.max(0, metadata.collection_completed_at - metadata.close_at)
        : null,
    diagnostic,
  };
  if (metadataState === "collection_timeout") {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "collection_timeout",
    };
  }
  if (metadataState === "bind_failed" || metadataState === "request_failed") {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "collector_error",
    };
  }
  if (responseErrorCount > 0) {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "http_error",
    };
  }
  if (parseErrorCount > 0 || summary.malformed_payload) {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "parse_error",
    };
  }
  if (!summary.control_metric_seen) {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "control_missing",
    };
  }
  if (summary.malformed_control_metric || !controlValid) {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "control_invalid",
    };
  }
  if (!summary.skill_metric_seen) {
    return {
      ...base,
      reliable: true,
      initial_skill: null,
      observed_skills: [],
      unobservable_reason: null,
    };
  }
  if (summary.malformed_skill_metric) {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "skill_metric_invalid",
    };
  }
  if (summary.skill_points.length === 0) {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "skill_metric_invalid",
    };
  }
  const invalidSkillPoint = summary.skill_points.find(
    (point) =>
      point.status !== "ok" ||
      !isSkillName(point.skill) ||
      !Number.isFinite(point.value) ||
      point.value <= 0,
  );
  if (invalidSkillPoint) {
    const reason = isSkillName(invalidSkillPoint.skill) ? "skill_metric_invalid" : "unknown_skill";
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: reason,
    };
  }
  const skills = [...new Set(summary.skill_points.map((point) => point.skill))] as SkillName[];
  if (skills.length !== 1) {
    return {
      ...base,
      reliable: false,
      initial_skill: null,
      observed_skills: null,
      unobservable_reason: "multiple_skills",
    };
  }
  const skill = skills[0];
  return {
    ...base,
    reliable: true,
    initial_skill: skill ?? null,
    observed_skills: skill ? [skill] : null,
    unobservable_reason: skill ? null : "skill_metric_invalid",
  };
}

export function createFailedOtelObservation(
  collectionState: "bind_failed" | "request_failed",
): OtelObservation {
  return classifyOtelObservation([], { collection_state: collectionState });
}

export interface OtelSkillObserver {
  readonly endpoint: string;
  readonly port: number;
  waitForCollection(processCloseAt: number): Promise<OtelObservation>;
  close(): Promise<void>;
}

interface ObserverState {
  readonly payloads: unknown[];
  request_count: number;
  processCloseAt: number | null;
  firstRequestAt: number | null;
  lastRequestAt: number | null;
  postCloseRequestCount: number;
  responseErrorCount: number;
  parseErrorCount: number;
  finished: boolean;
  collectionTimer: NodeJS.Timeout | null;
}

function consumeRequest(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function writeResponse(response: ServerResponse, statusCode: number): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(statusCode >= 200 && statusCode < 300 ? "{}" : '{"error":true}');
}

function closeServer(server: Server): Promise<boolean> {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve(true);
      return;
    }
    server.close((error) => resolve(error === undefined));
  });
}

export async function createOtelSkillObserver(): Promise<OtelSkillObserver> {
  const state: ObserverState = {
    payloads: [],
    request_count: 0,
    processCloseAt: null,
    firstRequestAt: null,
    lastRequestAt: null,
    postCloseRequestCount: 0,
    responseErrorCount: 0,
    parseErrorCount: 0,
    finished: false,
    collectionTimer: null,
  };
  const server = createServer((request, response) => {
    const receivedAt = performance.now();
    state.request_count += 1;
    state.firstRequestAt ??= receivedAt;
    state.lastRequestAt = receivedAt;
    if (state.processCloseAt !== null && receivedAt >= state.processCloseAt) {
      state.postCloseRequestCount += 1;
    }
    void consumeRequest(request)
      .then((rawBody) => {
        if (request.method !== "POST" || request.url !== "/v1/metrics") {
          state.responseErrorCount += 1;
          writeResponse(response, 404);
          rescheduleCollection?.();
          return;
        }
        let payload: unknown;
        try {
          payload = JSON.parse(rawBody) as unknown;
        } catch {
          state.parseErrorCount += 1;
          writeResponse(response, 400);
          rescheduleCollection?.();
          return;
        }
        state.payloads.push(payload);
        const parsed = parsePayload(payload);
        state.parseErrorCount += parsed.malformedPayload ? 1 : 0;
        writeResponse(response, 200);
        rescheduleCollection?.();
      })
      .catch(() => {
        state.responseErrorCount += 1;
        writeResponse(response, 500);
        rescheduleCollection?.();
      });
  });
  let port: number;
  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(0, "127.0.0.1");
    });
    const address = server.address();
    if (!address || typeof address === "string" || address.port <= 0) {
      throw new Error("OTel receiver did not expose an OS-assigned port");
    }
    port = address.port;
  } catch (error) {
    await closeServer(server);
    throw error;
  }
  let collectionPromise: Promise<OtelObservation> | null = null;
  let rescheduleCollection: (() => void) | null = null;
  let settleCollection:
    | ((collectionState: OtelCollectionState, completedAt: number) => void)
    | null = null;
  const close = async (): Promise<void> => {
    if (state.collectionTimer) {
      clearTimeout(state.collectionTimer);
      state.collectionTimer = null;
    }
    if (collectionPromise && !state.finished && settleCollection) {
      settleCollection("request_failed", performance.now());
      await collectionPromise;
      return;
    }
    state.finished = true;
    const closed = await closeServer(server);
    if (!closed) {
      throw new Error("OTel receiver close failed");
    }
  };
  const waitForCollection = (processCloseAt: number): Promise<OtelObservation> => {
    if (collectionPromise) {
      return collectionPromise;
    }
    if (state.finished) {
      return Promise.resolve(createFailedOtelObservation("request_failed"));
    }
    collectionPromise = new Promise<OtelObservation>((resolveObservation) => {
      state.processCloseAt = processCloseAt;
      const hardDeadline = processCloseAt + OTEL_COLLECTION_HARD_CAP_MS;
      const finish = (collectionState: OtelCollectionState, completedAt: number) => {
        if (state.finished) {
          return;
        }
        state.finished = true;
        if (state.collectionTimer) {
          clearTimeout(state.collectionTimer);
          state.collectionTimer = null;
        }
        void closeServer(server).then((closed) => {
          const observation = classifyOtelObservation(state.payloads, {
            collection_state: closed ? collectionState : "request_failed",
            request_count: state.request_count,
            post_close_request_count: state.postCloseRequestCount,
            response_error_count: state.responseErrorCount,
            parse_error_count: state.parseErrorCount,
            first_request_at: state.firstRequestAt,
            last_request_at: state.lastRequestAt,
            close_at: processCloseAt,
            collection_completed_at: completedAt,
          });
          resolveObservation(observation);
        });
      };
      settleCollection = finish;
      const schedule = () => {
        if (state.finished) {
          return;
        }
        const now = performance.now();
        const anchor = Math.max(processCloseAt, state.lastRequestAt ?? processCloseAt);
        const quietDeadline = anchor + OTEL_COLLECTION_QUIET_MS;
        if (now >= hardDeadline) {
          finish("collection_timeout", now);
          return;
        }
        if (now >= quietDeadline) {
          finish("completed", now);
          return;
        }
        state.collectionTimer = setTimeout(schedule, Math.min(quietDeadline, hardDeadline) - now);
      };
      rescheduleCollection = () => {
        if (state.finished) {
          return;
        }
        if (state.collectionTimer) {
          clearTimeout(state.collectionTimer);
          state.collectionTimer = null;
        }
        schedule();
      };
      schedule();
    });
    return collectionPromise;
  };
  return {
    endpoint: `http://127.0.0.1:${port}/v1/metrics`,
    port,
    waitForCollection,
    close,
  };
}
