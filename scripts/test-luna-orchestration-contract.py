#!/usr/bin/env python3
"""Contract tests for runtime invocation completeness and artifact aggregation."""

from __future__ import annotations

import importlib.util
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

    def test_duplicate_role_with_one_observation_is_not_pass(self):
        expected = expected_records(2)
        result = COLLECTOR.evaluate_runtime_agent_compliance(expected, observed_records(expected, 1))
        self.assertNotEqual(result["status"], "pass")
        self.assertEqual(len(result["missing"]), 1)

    def test_empty_expected_is_not_pass(self):
        result = COLLECTOR.evaluate_runtime_agent_compliance([], [])
        self.assertNotEqual(result["status"], "pass")
        self.assertTrue(result["violations"])


class ArtifactContractTests(unittest.TestCase):
    def test_baseline_delta_preserves_accepted_subagent_changes(self):
        result = COLLECTOR.aggregate_changed_files(
            ["pre-existing.ts", "shared.ts"],
            ["shared.ts", "parent.ts"],
            ["accepted-child.ts"],
        )
        self.assertEqual(result, ["accepted-child.ts", "parent.ts"])

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
