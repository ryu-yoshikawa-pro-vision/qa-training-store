# Official Black-box Scored E2E 契約修正履歴

2026-08-13、PR #23 の再レビューに基づき、Official v1 の artifact root を
`.artifacts/agentic-qa/<run_id>/{input,trusted,runner,evaluation}`へ統一した。
Runner Profile、Runtime Handoff、Initial State、Resource Probe、Evidence Mapping、
Frozen Runner、Protected Patch、Canonical JSONをfail-close契約として強化した。

Repository-side deterministic preparationはHostなしでも実装・検証できるが、Host Capability
receiptが不足する環境ではOfficial executionとscoreはBLOCKED／NOT EXECUTEDとする。
