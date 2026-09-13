import { afterEach, describe, expect, it } from "vitest";

import {
  OTEL_CONTROL_METRIC_NAME,
  OTEL_SKILL_METRIC_NAME,
  classifyOtelObservation,
  createOtelSkillObserver,
  summarizeOtelPayloads,
} from "../../scripts/evals/otel-skill-observer";
import {
  evaluateCase,
  loadTriggerDatasets,
  type ObservationSignals,
} from "../../scripts/evals/skill-trigger-evals";

function point(
  attributes: Readonly<Record<string, string>> = {},
  value: number | string = 1,
): Record<string, unknown> {
  return {
    attributes: Object.entries(attributes).map(([key, stringValue]) => ({
      key,
      value: { stringValue },
    })),
    asInt: value,
  };
}

function payload(
  controlPoints: readonly Record<string, unknown>[] = [point()],
  skillPoints: readonly Record<string, unknown>[] = [],
): Record<string, unknown> {
  const metrics: Record<string, unknown>[] = [
    {
      name: OTEL_CONTROL_METRIC_NAME,
      sum: { dataPoints: controlPoints },
    },
  ];
  if (skillPoints.length > 0) {
    metrics.push({
      name: OTEL_SKILL_METRIC_NAME,
      sum: { dataPoints: skillPoints },
    });
  }
  return {
    resourceMetrics: [{ scopeMetrics: [{ metrics }] }],
  };
}

function otelSignals(
  observation: ReturnType<typeof classifyOtelObservation>,
  overrides: Partial<ObservationSignals> = {},
): ObservationSignals {
  return {
    timed_out: false,
    spawn_failed: false,
    signaled: false,
    exit_code: 0,
    trusted_terminal: "turn.completed",
    observation_source: "otel",
    observation_reliable: observation.reliable,
    otel_observation: observation,
    initial_skill: observation.reliable ? observation.initial_skill : null,
    observed_skills: observation.reliable ? observation.observed_skills : null,
    ...overrides,
  };
}

describe("OTel Skill observer contract", () => {
  let observer: Awaited<ReturnType<typeof createOtelSkillObserver>> | null = null;

  afterEach(async () => {
    await observer?.close();
    observer = null;
  });

  it("requires the independent thread.started control for trusted absence", () => {
    const reliableAbsence = classifyOtelObservation([payload()]);
    expect(reliableAbsence).toMatchObject({
      reliable: true,
      control_metric_seen: true,
      control_valid_point_count: 1,
      skill_metric_seen: false,
      initial_skill: null,
      observed_skills: [],
      unobservable_reason: null,
    });

    const noControl = classifyOtelObservation([
      { resourceMetrics: [{ scopeMetrics: [{ metrics: [] }] }] },
    ]);
    expect(noControl).toMatchObject({
      reliable: false,
      observed_skills: null,
      unobservable_reason: "control_missing",
    });
  });

  it("validates Skill identity, status, value, duplicates, and multiple Skills", () => {
    const skillPoint = (skill: string, status = "ok", value: number | string = 1) =>
      point({ skill, status, invoke_type: "explicit", plugin_id: "unattributed" }, value);

    expect(
      classifyOtelObservation([payload([point()], [skillPoint("feature-plan", "ok", 2)])]),
    ).toMatchObject({
      reliable: true,
      initial_skill: "feature-plan",
      observed_skills: ["feature-plan"],
      skill_point_count: 1,
    });
    expect(
      classifyOtelObservation([
        payload([point()], [skillPoint("feature-plan"), skillPoint("feature-plan")]),
      ]),
    ).toMatchObject({ reliable: true, observed_skills: ["feature-plan"] });
    expect(
      classifyOtelObservation([
        payload([point()], [skillPoint("feature-plan"), skillPoint("code-review")]),
      ]),
    ).toMatchObject({ reliable: false, unobservable_reason: "multiple_skills" });
    expect(
      classifyOtelObservation([payload([point()], [skillPoint("not-canonical")])]),
    ).toMatchObject({ reliable: false, unobservable_reason: "unknown_skill" });
    expect(
      classifyOtelObservation([payload([point()], [skillPoint("feature-plan", "error")])]),
    ).toMatchObject({ reliable: false, unobservable_reason: "skill_metric_invalid" });
    expect(
      classifyOtelObservation([payload([point()], [skillPoint("feature-plan", "ok", 0)])]),
    ).toMatchObject({ reliable: false, unobservable_reason: "skill_metric_invalid" });

    expect(classifyOtelObservation([payload([point()], [point()])])).toMatchObject({
      reliable: false,
      unobservable_reason: "skill_metric_invalid",
    });
    expect(
      classifyOtelObservation([
        {
          resourceMetrics: [
            {
              scopeMetrics: [
                {
                  metrics: [
                    {
                      name: OTEL_CONTROL_METRIC_NAME,
                      sum: { dataPoints: [point()] },
                    },
                    {
                      name: OTEL_SKILL_METRIC_NAME,
                      gauge: { dataPoints: [skillPoint("feature-plan")] },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    ).toMatchObject({ reliable: false, unobservable_reason: "skill_metric_invalid" });
    expect(
      classifyOtelObservation([
        {
          resourceMetrics: [
            {
              scopeMetrics: [
                {
                  metrics: [
                    {
                      name: OTEL_CONTROL_METRIC_NAME,
                      gauge: { dataPoints: [point()] },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    ).toMatchObject({ reliable: false, unobservable_reason: "control_invalid" });
  });

  it("stores only unique sorted parsed Skill and status values for diagnosis", () => {
    const skillPoint = (skill: string, status = "ok") =>
      point({ skill, status, invoke_type: "explicit", plugin_id: "unattributed" });

    const canonical = classifyOtelObservation([payload([point()], [skillPoint("feature-plan")])]);
    expect(canonical).toMatchObject({
      reliable: true,
      initial_skill: "feature-plan",
      observed_skills: ["feature-plan"],
      diagnostic: {
        skill_values: ["feature-plan"],
        status_values: ["ok"],
      },
    });

    const unknown = classifyOtelObservation([payload([point()], [skillPoint("not-canonical")])]);
    expect(unknown).toMatchObject({
      reliable: false,
      unobservable_reason: "unknown_skill",
      diagnostic: {
        skill_values: ["not-canonical"],
        status_values: ["ok"],
      },
    });

    const statusError = classifyOtelObservation([
      payload([point()], [skillPoint("feature-plan", "error")]),
    ]);
    expect(statusError).toMatchObject({
      reliable: false,
      unobservable_reason: "skill_metric_invalid",
      diagnostic: {
        skill_values: ["feature-plan"],
        status_values: ["error"],
      },
    });

    const duplicate = classifyOtelObservation([
      payload([point()], [skillPoint("feature-plan"), skillPoint("feature-plan")]),
    ]);
    expect(duplicate.diagnostic.skill_values).toEqual(["feature-plan"]);
    expect(duplicate.diagnostic.status_values).toEqual(["ok"]);

    const multipleValues = classifyOtelObservation([
      payload([point()], [skillPoint("code-review", "ok"), skillPoint("feature-plan", "error")]),
    ]);
    expect(multipleValues).toMatchObject({
      reliable: false,
      unobservable_reason: "skill_metric_invalid",
      diagnostic: {
        skill_values: ["code-review", "feature-plan"],
        status_values: ["error", "ok"],
      },
    });
  });

  it("treats invoke_type and plugin_id as diagnostics, not routing identity", () => {
    const first = classifyOtelObservation([
      payload(
        [point()],
        [point({ skill: "code-review", status: "ok", invoke_type: "explicit", plugin_id: "a" })],
      ),
    ]);
    const second = classifyOtelObservation([
      payload(
        [point()],
        [point({ skill: "code-review", status: "ok", invoke_type: "implicit", plugin_id: "b" })],
      ),
    ]);
    expect(first.initial_skill).toBe(second.initial_skill);
    expect(first.observed_skills).toEqual(second.observed_skills);
    expect(first.diagnostic.invoke_types).toEqual(["explicit"]);
    expect(second.diagnostic.invoke_types).toEqual(["implicit"]);
    expect(first.diagnostic.plugin_ids).toEqual(["a"]);
    expect(second.diagnostic.plugin_ids).toEqual(["b"]);
  });

  it("keeps OTel primary when Hook fields claim a reliable fallback", () => {
    const expectedCase = loadTriggerDatasets(process.cwd()).cases.find(
      (entry) => entry.id === "code-review-train-001",
    );
    if (!expectedCase) {
      throw new Error("expected code-review case is missing");
    }
    const failedOtel = classifyOtelObservation([
      { resourceMetrics: [{ scopeMetrics: [{ metrics: [] }] }] },
    ]);
    const result = evaluateCase(
      expectedCase,
      otelSignals(failedOtel, {
        hook_correlation_ok: true,
        hook_parse_ok: true,
        selector_reliable: true,
        initial_skill: "code-review",
        observed_skills: ["code-review"],
      }),
    );
    expect(result.outcome).toBe("unobservable");
    expect(result.unobservable_reason).toBe("skill_read_observation");
  });

  it("delegates OTel identity outcomes to scoreInitialRouting", () => {
    const dataset = loadTriggerDatasets(process.cwd());
    const codeReview = dataset.cases.find((entry) => entry.id === "code-review-train-001");
    const directImplementation = dataset.cases.find(
      (entry) => entry.id === "feature-plan-validation-002",
    );
    if (!codeReview || !directImplementation) {
      throw new Error("routing regression cases are missing");
    }
    const observation = (skill: string | null) =>
      classifyOtelObservation([
        payload([point()], skill === null ? [] : [point({ skill, status: "ok" }, 1)]),
      ]);
    expect(evaluateCase(codeReview, otelSignals(observation("code-review"))).outcome).toBe("pass");
    expect(evaluateCase(codeReview, otelSignals(observation("repair-loop"))).outcome).toBe(
      "sibling_misroute",
    );
    expect(evaluateCase(codeReview, otelSignals(observation("exploratory-qa"))).outcome).toBe(
      "unexpected_trigger",
    );
    expect(evaluateCase(codeReview, otelSignals(observation(null))).outcome).toBe("false_negative");
    expect(
      evaluateCase(directImplementation, otelSignals(observation("feature-plan"))).outcome,
    ).toBe("unexpected_trigger");
  });

  it("keeps trusted positive identity after timeout but never trusts timed-out absence", () => {
    const dataset = loadTriggerDatasets(process.cwd());
    const positiveCase = dataset.cases.find((entry) => entry.id === "code-review-train-001");
    const absenceCase = dataset.cases.find((entry) => entry.id === "code-review-train-002");
    if (!positiveCase || !absenceCase) {
      throw new Error("timeout routing cases are missing");
    }
    const positive = classifyOtelObservation([
      payload([point()], [point({ skill: "code-review", status: "ok" })]),
    ]);
    expect(
      evaluateCase(
        positiveCase,
        otelSignals(positive, {
          timed_out: true,
          exit_code: null,
          trusted_terminal: null,
        }),
      ),
    ).toMatchObject({ outcome: "pass", process_lifecycle: "timed_out" });

    const absence = classifyOtelObservation([payload()]);
    expect(
      evaluateCase(
        absenceCase,
        otelSignals(absence, {
          timed_out: true,
          exit_code: null,
          trusted_terminal: null,
        }),
      ),
    ).toMatchObject({
      outcome: "unobservable",
      unobservable_reason: "timeout",
      process_lifecycle: "timed_out",
      observed_skills: null,
    });
  });

  it("binds one receiver to an OS-assigned localhost port and closes after quiet time", async () => {
    observer = await createOtelSkillObserver();
    expect(observer.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/v1\/metrics$/u);
    expect(observer.port).toBeGreaterThan(0);
    const response = await fetch(observer.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    expect(response.status).toBe(200);
    await response.text();
    const observation = await observer.waitForCollection(performance.now());
    expect(observation).toMatchObject({
      collection_state: "completed",
      reliable: true,
      request_count: 1,
      post_close_request_count: 0,
      observed_skills: [],
    });
    observer = null;
  });

  it("resets quiet collection after a post-close request", async () => {
    observer = await createOtelSkillObserver();
    const closeAt = performance.now();
    const collection = observer.waitForCollection(closeAt);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const response = await fetch(observer.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    expect(response.status).toBe(200);
    await response.text();
    const observation = await collection;
    expect(observation).toMatchObject({
      collection_state: "completed",
      reliable: true,
      post_close_request_count: 1,
      observed_skills: [],
    });
    expect(observation.collection_elapsed_ms).toBeGreaterThanOrEqual(1_000);
    observer = null;
  });

  it("fails closed for hard-cap collection and malformed payloads", () => {
    expect(classifyOtelObservation([], { collection_state: "collection_timeout" })).toMatchObject({
      reliable: false,
      unobservable_reason: "collection_timeout",
    });
    expect(classifyOtelObservation([{ resourceMetrics: "malformed" }])).toMatchObject({
      reliable: false,
      unobservable_reason: "parse_error",
    });
    expect(classifyOtelObservation([payload()], { response_error_count: 1 })).toMatchObject({
      reliable: false,
      unobservable_reason: "http_error",
    });
    expect(classifyOtelObservation([payload()], { parse_error_count: 1 })).toMatchObject({
      reliable: false,
      unobservable_reason: "parse_error",
    });
    expect(summarizeOtelPayloads([payload()])).toMatchObject({
      control_metric_seen: true,
      control_valid_point_count: 1,
    });
  });

  it("completes a no-request quiet window without trusting absence", async () => {
    observer = await createOtelSkillObserver();
    const observation = await observer.waitForCollection(performance.now());
    expect(observation).toMatchObject({
      collection_state: "completed",
      reliable: false,
      request_count: 0,
      unobservable_reason: "control_missing",
    });
    observer = null;
  });
});
