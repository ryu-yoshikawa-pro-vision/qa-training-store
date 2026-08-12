#!/usr/bin/env python3
"""Contract tests for runtime invocation completeness and artifact aggregation."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COLLECTOR_PATH = ROOT / "scripts" / "collect-run-artifacts.py"
SPEC = importlib.util.spec_from_file_location("collect_run_artifacts", COLLECTOR_PATH)
if SPEC is None or SPEC.loader is None:  # pragma: no cover
    raise SystemExit("unable to load collector contract")
COLLECTOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COLLECTOR)


def expected_records(count=3):
    names = ["code_researcher", "implementation_researcher", "test_investigator"]
    return [
        {
            "subagent_run_id": f"invocation-{index}",
            "agent_name": name,
            "role": "investigator",
            "runtime_agent_id": f"agent-{index}",
            "model": "gpt-5.6-luna",
        }
        for index, name in enumerate(names[:count], start=1)
    ]


def observed_records(expected, count=None):
    records = [
        {
            "agent_type": record["agent_name"],
            "agent_id": record["runtime_agent_id"],
            "model": "gpt-5.6-luna",
            "event_id": f"event-{record['runtime_agent_id']}",
        }
        for record in expected
    ]
    return records if count is None else records[:count]


def duplicate_agent_expected_records():
    return [
        {
            "invocation_id": "invocation-A",
            "expected_agent_name": "code_researcher",
            "expected_role": "investigator",
            "runtime_agent_id": "agent-id-A",
            "expected_model": "gpt-5.6-luna",
            "dispatch_timestamp": "2026-08-11T12:00:00Z",
        },
        {
            "invocation_id": "invocation-B",
            "expected_agent_name": "code_researcher",
            "expected_role": "investigator",
            "runtime_agent_id": "agent-id-B",
            "expected_model": "gpt-5.6-luna",
            "dispatch_timestamp": "2026-08-11T12:00:01Z",
        },
    ]


class RuntimeComplianceContractTests(unittest.TestCase):
    def test_expected_three_observed_three_passes(self):
        expected = expected_records()
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed_records(expected))
        self.assertEqual(result["status"], "pass")
        self.assertEqual(len(result["missing"]), 0)
        self.assertEqual(len(result["unexpected"]), 0)
        self.assertEqual(len(result["violations"]), 0)

    def test_missing_observation_is_not_pass(self):
        expected = expected_records()
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed_records(expected, 2))
        self.assertNotEqual(result["status"], "pass")
        self.assertEqual(len(result["missing"]), 1)

    def test_unexpected_generic_agent_is_not_pass(self):
        expected = expected_records()
        observed = observed_records(expected)
        observed.append({"agent_type": "generic", "agent_id": "generic-1", "model": "gpt-5.6-luna"})
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(result["unexpected"])

    def test_model_mismatch_is_not_pass(self):
        expected = expected_records()
        observed = observed_records(expected)
        observed[0]["model"] = "gpt-5.5"
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")

    def test_non_allowlisted_agent_is_not_pass(self):
        expected = expected_records()
        expected[0]["agent_name"] = "generic"
        observed = observed_records(expected)
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")

    def test_same_agent_multiple_invocations_missing_second_is_not_pass(self):
        expected = duplicate_agent_expected_records()
        observed = [
            {
                "agent_type": "code_researcher",
                "agent_id": "agent-id-A",
                "model": "gpt-5.6-luna",
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

    def test_reasoning_effort_is_static_when_runtime_field_is_absent(self):
        expected = expected_records(1)
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed_records(expected))
        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["reasoning_effort"]["configured"], "max")
        self.assertTrue(result["reasoning_effort"]["configured_accepted"])
        self.assertFalse(result["reasoning_effort"]["runtime_observed"])
        self.assertIsNone(result["reasoning_effort"]["runtime_matches_configured"])

    def test_reasoning_effort_mismatch_is_not_pass(self):
        expected = expected_records(1)
        observed = observed_records(expected)
        observed[0]["reasoning_effort"] = "high"
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed)
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(any(item["kind"] == "reasoning_effort_mismatch" for item in result["violations"]))


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
                        '{"event":"dispatch","invocation_id":"inv-A","expected_agent_name":"code_researcher","expected_model":"gpt-5.6-luna","expected_role":"investigator","dispatch_timestamp":"2026-08-11T12:00:00Z"}',
                        '{"event":"link","invocation_id":"inv-A","runtime_agent_id":"agent-A","linked_timestamp":"2026-08-11T12:00:01Z"}',
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

    def test_baseline_delta_preserves_accepted_subagent_changes(self):
        result = COLLECTOR.aggregate_changed_files(
            ["pre-existing.ts", "shared.ts"],
            ["shared.ts", "parent.ts"],
            ["accepted-child.ts"],
        )
        self.assertEqual(result, ["accepted-child.ts", "parent.ts"])

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
            baseline = {
                "expected_files": {"dirty.ts": COLLECTOR.fingerprint_file(root, "dirty.ts")}
            }
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
        print("LUNA_ORCHESTRATION_CONTRACT_TEST_PASS")
        raise SystemExit(0)
    print("LUNA_ORCHESTRATION_CONTRACT_TEST_FAIL")
    raise SystemExit(1)
