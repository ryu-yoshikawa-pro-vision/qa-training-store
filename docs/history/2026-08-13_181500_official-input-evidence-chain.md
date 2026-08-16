# Official Input／Evidence Chain再レビュー修正履歴

2026-08-13 JST、PR #23の再レビューで判明したOfficial trust-chainの欠落を、既存Architecture内の最小修正で補完した。

- `input/**`全体をCanonical Artifact Manifestでfreezeし、Runner Inputのidentity fieldsとHost receiptの`learner_safe_input_artifact_sha256`へbindした。
- `trusted/preparation/isolated-run-root/`をManifestでfreezeし、frozen inputからのspecification／Runbook／Challenge byte identityを検証した。
- Prepared TargetをBenchmark Manifestのrevision／source HEAD／patch hash、Runner Inputのallowed originsへexact bindした。
- Host／Resource／Bootstrap／Runtime Controlのtrusted evidence_refをcurrent runのregular fileへ解決する共通resolverを追加した。missing、cross-run、traversal、symlinkはfail-closeする。
- 完全なsynthetic contract fixtureで実Evidence、別Evaluator session、`evaluateBlackBox()`のOfficial valid pathを確認し、入力／target／evidence mutationをinvalidとするテストを追加した。

現HostにはTrusted Capability Receiptがないため、Repository deterministic contractsは実装・検証済みだが、Official execution／scoreはBLOCKED／NOT EXECUTEDである。Git mutationとworktree外変更は行っていない。
