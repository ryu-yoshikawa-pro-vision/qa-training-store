#!/usr/bin/env python3
"""Contract tests for subagent runtime compliance and artifact aggregation."""

from __future__ import annotations

import importlib.util
import re
import shutil
import tempfile
from types import SimpleNamespace
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CURRENT_MODEL = "gpt-5.6-luna"
CURRENT_EFFORT = "max"
FUTURE_MODEL = "future-subagent-model"
FUTURE_EFFORT = "hypothetical-supported-value"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:  # pragma: no cover
        raise SystemExit(f"unable to load {name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


COLLECTOR = load_module("collect_run_artifacts", ROOT / "scripts" / "collect-run-artifacts.py")
VALIDATOR = load_module("validate_subagent_orchestration", ROOT / "scripts" / "validate-subagent-orchestration.py")
RECORDER = load_module("record_expected_invocation", ROOT / "scripts" / "record-expected-invocation.py")


def expected_records(count=3, model=CURRENT_MODEL, effort=CURRENT_EFFORT):
    names = ["code_researcher", "implementation_researcher", "test_investigator"]
    return [
        {
            "invocation_id": f"invocation-{index}",
            "expected_agent_name": name,
            "expected_role": "investigator",
            "expected_model": model,
            "expected_reasoning_effort": effort,
            "runtime_agent_id": f"agent-{index}",
            "dispatch_timestamp": f"2026-08-12T00:00:0{index}Z",
        }
        for index, name in enumerate(names[:count], start=1)
    ]


def observed_records(expected, model=None, effort=None, count=None):
    records = [
        {
            "agent_type": record["expected_agent_name"],
            "agent_id": record["runtime_agent_id"],
            "model": model if model is not None else record["expected_model"],
            "event_id": f"event-{record['runtime_agent_id']}",
        }
        for record in expected
    ]
    if effort is not None:
        for record in records:
            record["reasoning_effort"] = effort
    return records if count is None else records[:count]


def duplicate_agent_expected_records(model=CURRENT_MODEL, effort=CURRENT_EFFORT):
    return [
        {
            "invocation_id": "invocation-A",
            "expected_agent_name": "code_researcher",
            "expected_role": "investigator",
            "runtime_agent_id": "agent-id-A",
            "expected_model": model,
            "expected_reasoning_effort": effort,
            "dispatch_timestamp": "2026-08-12T00:00:00Z",
        },
        {
            "invocation_id": "invocation-B",
            "expected_agent_name": "code_researcher",
            "expected_role": "investigator",
            "runtime_agent_id": "agent-id-B",
            "expected_model": model,
            "expected_reasoning_effort": effort,
            "dispatch_timestamp": "2026-08-12T00:00:01Z",
        },
    ]


def create_validator_fixture(root: Path, model: str, effort: str) -> None:
    shutil.copytree(ROOT / ".codex", root / ".codex")
    shutil.copytree(ROOT / "spec", root / "spec")
    (root / "scripts").mkdir(parents=True)
    for relative in ("codex-local-validation.mjs", "record-expected-invocation.py"):
        shutil.copy(ROOT / "scripts" / relative, root / "scripts" / relative)

    config_path = root / ".codex" / "config.toml"
    config_path.write_text(
        replace_toml_string_values(
            config_path.read_text(encoding="utf-8"),
            {"default_subagent_model": model, "default_subagent_reasoning_effort": effort},
        ),
        encoding="utf-8",
    )
    for path in (root / ".codex" / "agents").glob("*.toml"):
        agent = path.read_text(encoding="utf-8")
        agent = replace_toml_string_values(
            agent,
            {"model": model, "model_reasoning_effort": effort},
        )
        path.write_text(agent, encoding="utf-8")


def replace_toml_string_values(text: str, values: dict[str, str]) -> str:
    for key, value in values.items():
        text, replacements = re.subn(
            rf'(?m)^(\s*{re.escape(key)}\s*=\s*)"[^"]*"',
            rf'\1"{value}"',
            text,
            count=1,
        )
        if replacements != 1:
            raise AssertionError(f"fixture is missing TOML string key: {key}")
    return text


class RuntimeComplianceContractTests(unittest.TestCase):
    def test_expected_three_observed_three_passes(self):
        expected = expected_records()
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed_records(expected))
        self.assertEqual(result["status"], "pass")
        self.assertEqual(len(result["missing"]), 0)
        self.assertEqual(len(result["unexpected"]), 0)
        self.assertEqual(len(result["violations"]), 0)

    def test_future_model_runtime_match_passes(self):
        expected = expected_records(1, model=FUTURE_MODEL, effort=FUTURE_EFFORT)
        result = COLLECTOR.evaluate_runtime_agent_compliance(
            expected,
            observed_records(expected, model=FUTURE_MODEL),
        )
        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["expected"][0]["expected_model"], FUTURE_MODEL)

    def test_runtime_model_mismatch_fails_without_model_literal(self):
        expected = expected_records(1, model=FUTURE_MODEL)
        result = COLLECTOR.evaluate_runtime_agent_compliance(
            expected,
            observed_records(expected, model="different-model"),
        )
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(any(item["kind"] == "model_mismatch" for item in result["violations"]))

    def test_future_reasoning_effort_runtime_match_passes(self):
        expected = expected_records(1, model=FUTURE_MODEL, effort=FUTURE_EFFORT)
        result = COLLECTOR.evaluate_runtime_agent_compliance(
            expected,
            observed_records(expected, model=FUTURE_MODEL, effort=FUTURE_EFFORT),
        )
        self.assertEqual(result["status"], "pass")
        self.assertTrue(result["reasoning_effort"]["runtime_observed"])
        self.assertTrue(result["reasoning_effort"]["runtime_matches_configured"])

    def test_reasoning_effort_mismatch_fails(self):
        expected = expected_records(1, effort=FUTURE_EFFORT)
        result = COLLECTOR.evaluate_runtime_agent_compliance(
            expected,
            observed_records(expected, effort="different-effort"),
        )
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(any(item["kind"] == "reasoning_effort_mismatch" for item in result["violations"]))

    def test_unobserved_reasoning_effort_is_not_a_violation(self):
        expected = expected_records(1, effort=FUTURE_EFFORT)
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed_records(expected))
        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["reasoning_effort"]["configured"], FUTURE_EFFORT)
        self.assertTrue(result["reasoning_effort"]["configured_accepted"])
        self.assertFalse(result["reasoning_effort"]["runtime_observed"])
        self.assertIsNone(result["reasoning_effort"]["runtime_matches_configured"])

    def test_missing_observation_is_not_pass(self):
        expected = expected_records()
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed_records(expected, count=2))
        self.assertNotEqual(result["status"], "pass")
        self.assertEqual(len(result["missing"]), 1)

    def test_unexpected_generic_agent_is_not_pass(self):
        expected = expected_records()
        observed = observed_records(expected)
        observed.append({"agent_type": "generic", "agent_id": "generic-1", "model": CURRENT_MODEL})
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(result["unexpected"])

    def test_non_allowlisted_agent_is_not_pass(self):
        expected = expected_records(1)
        expected[0]["expected_agent_name"] = "generic"
        observed = observed_records(expected)
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")

    def test_same_agent_multiple_invocations_missing_second_is_not_pass(self):
        expected = duplicate_agent_expected_records()
        observed = [
            {
                "agent_type": "code_researcher",
                "agent_id": "agent-id-A",
                "model": CURRENT_MODEL,
                "event_id": "event-agent-id-A",
            }
        ]
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")
        self.assertEqual([item["invocation_id"] for item in result["missing"]], ["invocation-B"])

    def test_empty_expected_is_not_pass(self):
        result = COLLECTOR.evaluate_runtime_agent_compliance([], [])
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(result["violations"])

    def test_duplicate_observed_agent_id_is_not_pass(self):
        expected = expected_records(1)
        observed = observed_records(expected) + observed_records(expected)
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(any(item["kind"] == "duplicate_observed_invocation_identifier" for item in result["violations"]))


class ValidatorMigrationContractTests(unittest.TestCase):
    def test_future_model_and_effort_fixture_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            create_validator_fixture(root, FUTURE_MODEL, FUTURE_EFFORT)
            errors, model, effort = VALIDATOR.validate_repository(root)
            self.assertEqual(errors, [])
            self.assertEqual(model, FUTURE_MODEL)
            self.assertEqual(effort, FUTURE_EFFORT)

    def test_model_drift_fixture_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            create_validator_fixture(root, FUTURE_MODEL, FUTURE_EFFORT)
            path = root / ".codex" / "agents" / "code_researcher.toml"
            path.write_text(
                path.read_text(encoding="utf-8").replace(
                    f'model = "{FUTURE_MODEL}"',
                    'model = "drifted-model"',
                ),
                encoding="utf-8",
            )
            errors, _, _ = VALIDATOR.validate_repository(root)
            self.assertTrue(any("model must match" in error for error in errors))

    def test_reasoning_effort_drift_fixture_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            create_validator_fixture(root, FUTURE_MODEL, FUTURE_EFFORT)
            path = root / ".codex" / "agents" / "test_investigator.toml"
            path.write_text(
                path.read_text(encoding="utf-8").replace(
                    f'model_reasoning_effort = "{FUTURE_EFFORT}"',
                    'model_reasoning_effort = "drifted-effort"',
                ),
                encoding="utf-8",
            )
            errors, _, _ = VALIDATOR.validate_repository(root)
            self.assertTrue(any("reasoning_effort must match" in error for error in errors))


class RecorderContractTests(unittest.TestCase):
    def test_dispatch_expectation_reads_model_and_effort_from_parent_config(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config_path = root / "config.toml"
            config_path.write_text(
                '[agents]\ndefault_subagent_model = "future-subagent-model"\n'
                'default_subagent_reasoning_effort = "hypothetical-supported-value"\n',
                encoding="utf-8",
            )
            ledger_path = root / "expected-invocations.jsonl"
            event = RECORDER.dispatch(
                SimpleNamespace(
                    agent_name="code_researcher",
                    role="investigator",
                    config_path=str(config_path),
                    run_id="20260812-095333-JST",
                    ledger_path=str(ledger_path),
                )
            )
            self.assertEqual(event["expected_model"], FUTURE_MODEL)
            self.assertEqual(event["expected_reasoning_effort"], FUTURE_EFFORT)
            self.assertIn('"expected_reasoning_effort":"hypothetical-supported-value"', ledger_path.read_text())


class ArtifactContractTests(unittest.TestCase):
    def test_porcelain_rename_keeps_new_and_old_paths(self):
        raw = b"R  new-name.ts\0old-name.ts\0?? untracked.ts\0"
        self.assertEqual(
            COLLECTOR.parse_porcelain_paths(raw),
            ["new-name.ts", "old-name.ts", "untracked.ts"],
        )

    def test_porcelain_copy_keeps_new_path(self):
        raw = b"C  copied.ts\0source.ts\0"
        self.assertEqual(COLLECTOR.parse_porcelain_paths(raw), ["copied.ts"])

    def test_porcelain_fixture_covers_clean_new_delete_rename_and_copy(self):
        raw = (
            b" M modified.ts\0"
            b"A  added.ts\0"
            b"D  deleted.ts\0"
            b"R  renamed-new.ts\0renamed-old.ts\0"
            b"C  copied.ts\0copy-source.ts\0"
            b"?? untracked.ts\0"
        )
        self.assertEqual(
            COLLECTOR.parse_porcelain_paths(raw),
            [
                "modified.ts",
                "added.ts",
                "deleted.ts",
                "renamed-new.ts",
                "renamed-old.ts",
                "copied.ts",
                "untracked.ts",
            ],
        )

    def test_status_unavailable_preserves_known_and_accepted_files(self):
        self.assertEqual(
            COLLECTOR.preserve_known_changed_files(["known.ts"], ["accepted.ts"]),
            ["accepted.ts", "known.ts"],
        )

    def test_expected_ledger_dispatch_and_link_are_independent_from_subagent_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "expected-invocations.jsonl"
            path.write_text(
                "\n".join(
                    [
                        '{"event":"dispatch","invocation_id":"inv-A","expected_agent_name":"code_researcher","expected_model":"future-subagent-model","expected_reasoning_effort":"hypothetical-supported-value","expected_role":"investigator","dispatch_timestamp":"2026-08-12T00:00:00Z"}',
                        '{"event":"link","invocation_id":"inv-A","runtime_agent_id":"agent-A","linked_timestamp":"2026-08-12T00:00:01Z"}',
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            records, warnings, present = COLLECTOR.load_expected_invocation_ledger(Path(directory), Path(directory))
            self.assertTrue(present)
            self.assertEqual(warnings, [])
            self.assertEqual(records[0]["invocation_id"], "inv-A")
            self.assertEqual(records[0]["runtime_agent_id"], "agent-A")
            self.assertEqual(records[0]["expected_model"], FUTURE_MODEL)
            self.assertEqual(records[0]["expected_reasoning_effort"], FUTURE_EFFORT)

    def test_baseline_delta_preserves_accepted_subagent_changes(self):
        result = COLLECTOR.aggregate_changed_files(
            ["pre-existing.ts", "shared.ts"],
            ["shared.ts", "parent.ts"],
            ["accepted-child.ts"],
        )
        self.assertEqual(result, ["accepted-child.ts", "parent.ts"])

    def test_aggregate_changed_files_ignores_non_string_normalization_results(self):
        self.assertEqual(
            COLLECTOR.aggregate_changed_files([None, "baseline.ts"], [None, "changed.ts"], [None]),
            ["changed.ts"],
        )

    def test_only_accepted_subagent_changes_are_aggregated(self):
        self.assertEqual(
            COLLECTOR.accepted_subagent_changes("accepted", ["accepted.ts"]),
            ["accepted.ts"],
        )
        self.assertEqual(
            COLLECTOR.accepted_subagent_changes("partially_accepted", ["partial.ts"]),
            ["partial.ts"],
        )
        self.assertEqual(COLLECTOR.accepted_subagent_changes("rejected", ["rejected.ts"]), [])

    def test_dirty_baseline_fingerprint_covers_unchanged_and_additional_change(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "dirty.ts"
            path.write_text("before\n", encoding="utf-8")
            baseline = {"expected_files": {"dirty.ts": COLLECTOR.fingerprint_file(root, "dirty.ts")}}
            self.assertEqual(COLLECTOR.expected_file_delta(root, baseline), [])

            path.write_text("after\n", encoding="utf-8")
            self.assertEqual(COLLECTOR.expected_file_delta(root, baseline), ["dirty.ts"])

    def test_clean_baseline_new_and_deleted_expected_files_are_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            missing_baseline = {
                "expected_files": {
                    "new.ts": {"exists": False, "hash": None, "size": None},
                    "deleted.ts": {"exists": True, "hash": "old", "size": 3},
                }
            }
            (root / "new.ts").write_text("new", encoding="utf-8")
            self.assertEqual(COLLECTOR.expected_file_delta(root, missing_baseline), ["new.ts", "deleted.ts"])

    def test_final_pass_has_no_failure_categories(self):
        self.assertEqual(
            COLLECTOR.validate_failure_taxonomy_relation(
                {"result": "pass", "primary_failure_category": None, "failure_categories": []}
            ),
            [],
        )
        self.assertTrue(
            COLLECTOR.validate_failure_taxonomy_relation(
                {"result": "pass", "primary_failure_category": None, "failure_categories": ["review_gap"]}
            )
        )
        self.assertTrue(
            COLLECTOR.validate_failure_taxonomy_relation(
                {"result": "partial", "primary_failure_category": "review_gap", "failure_categories": []}
            )
        )


if __name__ == "__main__":
    result = unittest.main(verbosity=0, exit=False).result
    if result.wasSuccessful():
        print("SUBAGENT_ORCHESTRATION_CONTRACT_TEST_PASS")
        raise SystemExit(0)
    print("SUBAGENT_ORCHESTRATION_CONTRACT_TEST_FAIL")
    raise SystemExit(1)
