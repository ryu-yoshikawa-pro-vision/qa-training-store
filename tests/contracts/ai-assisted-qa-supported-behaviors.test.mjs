import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COVERAGE_PATH,
  validateCoverage,
} from "../../scripts/training/validate-supported-behaviors.mjs";

const root = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(root, COVERAGE_PATH), "utf8"));
const mutated = (edit) => {
  const next = structuredClone(data);
  edit(next);
  return next;
};

describe("サポート機能の仕様と実装の追跡", () => {
  it("separates supported behaviors from BR/AC and cross-cutting requirements", () => {
    const result = validateCoverage({ root });
    expect(result).toMatchObject({
      screens: 38,
      screen_actions: 73,
      screen_action_segments: 172,
      non_default_states: 20,
      unreviewed_state_conditions: 20,
      br_ac: 46,
      use_case_methods: 76,
      supported_total: 188,
      classified: 188,
      basically_analyzed: 12,
      requires_review: 176,
      classified_rate: 100,
      basic_analysis_rate: 6.38,
      complete: false,
    });
    expect(data.requirements).toHaveLength(79);
    for (const id of [
      "UC-AUTH-LOGOUT",
      "UC-ADMIN-DUPLICATE-PRODUCT",
      "UC-ADMIN-DELETE-DRAFT",
      "UC-REVIEW-DELETE",
      "UC-CART-ACCEPT-PRICES",
      "UC-ACCOUNT-DELETE-ADDRESS",
      "UC-ADMIN-REORDER-CATEGORIES",
      "UC-ADMIN-BULK-CHANGE-PRODUCT-STATUS",
      "UC-ADMIN-BULK-REVIEW-VISIBILITY",
    ]) {
      expect(data.behaviors.some((entry) => entry.id === id)).toBe(true);
    }
  });

  it("detects changed implementation and Seed evidence", () => {
    const badCode = mutated((next) => {
      next.behaviors[0].implementation_evidence.signature = "not the actual source line";
    });
    expect(() => validateCoverage({ root, data: badCode })).toThrow(/changed implementation/);

    const badSeed = mutated((next) => {
      next.behaviors[0].seed_evidence.transform.signature = "unknown transformation";
    });
    expect(() => validateCoverage({ root, data: badSeed })).toThrow(/changed seed transform/);
  });

  it("rejects a state condition linked to a different screen", () => {
    const changed = mutated((next) => {
      next.behaviors.find((item) => item.kind === "state").covered_by = "UC-AUTH-LOGOUT";
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(/unlinked state condition/);
  });
  it("does not certify semantic analysis merely because required fields are nonempty", () => {
    const changed = mutated((next) => {
      next.behaviors[0].analysis_status = "analyzed";
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /analysis lacks verified evidence/,
    );
  });

  it("rejects a missing split action even when its source line has remaining actions", () => {
    const changed = mutated((next) => {
      next.behaviors.splice(
        next.behaviors.findIndex((item) => item.kind === "action"),
        1,
      );
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(/unclassified action subcases/);
  });

  it("rejects missing business rules, non-default states and Use Case method mappings", () => {
    const rule = mutated((next) => {
      next.requirements = next.requirements.filter((item) => item.id !== "BR-CART-001");
    });
    expect(() => validateCoverage({ root, data: rule })).toThrow(/BR\/AC missing/);

    const state = mutated((next) => {
      next.behaviors = next.behaviors.filter((item) => item.kind !== "state");
    });
    expect(() => validateCoverage({ root, data: state })).toThrow(/non-default UI states missing/);

    const method = mutated((next) => {
      next.use_case_methods = next.use_case_methods.filter(
        (entry) => entry.id !== "CustomerReviewUseCases.delete",
      );
    });
    expect(() => validateCoverage({ root, data: method })).toThrow(
      /public Use Case methods missing/,
    );
  });

  it("rejects duplicate behavior semantics even if its identifier is different", () => {
    const changed = mutated((next) => {
      const clone = structuredClone(next.behaviors[0]);
      clone.id = "OTHER-ID";
      next.behaviors.push(clone);
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /duplicate equivalent behavior/,
    );
  });

  it("does not accept a missing review evidence for an analyzed record", () => {
    const changed = mutated((next) => {
      next.behaviors[0].analysis_status = "analyzed";
      next.behaviors[0].reviewed_against = ["specification"];
    });
    expect(() => validateCoverage({ root, data: changed })).toThrow(
      /analysis lacks verified evidence/,
    );
  });

  it("rejects invalid requirement references and platform-role mappings", () => {
    const unknown = mutated((next) => {
      next.behaviors.find((item) => item.id === "UC-REVIEW-DELETE").requirement_refs = [
        "UNKNOWN-REQUIREMENT",
      ];
    });
    expect(() => validateCoverage({ root, data: unknown })).toThrow(
      /unknown requirement reference/,
    );
    const role = mutated((next) => {
      const item = next.behaviors.find(
        (behavior) => behavior.id === "SCREEN-STOREFRONT-HOME-A01-01",
      );
      item.platform_roles = null;
      item.role = "platform_rolesを参照";
    });
    expect(() => validateCoverage({ root, data: role })).toThrow(/missing platform-specific role/);
  });
});
