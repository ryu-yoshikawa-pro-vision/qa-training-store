# Tasks（タスク）

## Now（現在）

- [x] 1. Issue #117とPR1〜PR5の完了状態を確認する。
- [x] 2. 現行`main`のTrigger / Semantic / Deterministic Evalと対象Skill契約を確認する。
- [x] 3. PR6の初期stage方式、代表case、変更範囲、検証方法を確定する。
- [x] 4. canonical Planとplan-only Run Artifactを保存する。
- [x] 5. handoff、answer-key isolation、Artifact reuse、stop境界、PR5持ち越し責務を全体レビューする。
- [x] 6. handoffをCodex標準`exec resume <thread_id>`へ固定する。
- [x] 7. repair Iteration Model、Case A Finding prerequisite、Case B source-free QA / Runtime lifecycle、Case C/D fixture、Case E Doctor gateを確定する。
- [x] 8. PR #168をDraftで作成する。
- [x] 9. PR作成後に目的達成性、scope、実装時の迷い、過剰設計を再レビューする。
- [x] 10. Case A〜E、Target責務、Run Artifact、Codex config / Hook隔離、ambient Skillの必要修正を統合する。
- [x] 11. canonical Plan、plan-only Run Artifact、PR本文へ必要な修正を反映する。

## Discovered（発見事項）

- review / QA / harnessの停止境界はRepository全体read-onlyではなく、Product / fixture変更0件で評価する。case-local Run Artifactは既存契約に従って更新を許可する。
- Case BではHost側PlaywrightだけでなくAgent-facing Browser capabilityが必要。
- Case B source-free rootはcanonical 6 Skillを残し、routingを単一Skillへ強制しない。
- Case Cの既存`repair-loop`契約は`stop_unsafe` / `stop_needs_human`の優先順位を定めていないためPR6で新設しない。
- Case Dのno-progressは既存Evidenceを入力にし、無意味な編集を要求しない。
- NativeはDoctor-only評価で十分であり、Build / Install / MaestroをPR6都合で実行しない。
- Codex user config / rules / Hookはcanonical live runから除外する。
- CodexはRepository外Skill rootも探索し得るため、unknown / multiple Skillをfail-closeし、独自Skill isolationは追加しない。
- branchはlatest `main`から1 commit遅れている。取り込みは実装開始時に別途行う。

## Blocked（ブロック中）

- なし。実装開始時のCodex / Browser / Native capability smoke probeで共通前提が不成立なら契約どおり`blocked` / `not_executed`へ分類する。
