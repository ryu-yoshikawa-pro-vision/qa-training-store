# ADR 0006: Codex Run ArtifactのローカルPath Sanitization

- Status: Accepted
- Date: 2026-08-06

## Context

CodexのRun Artifactには、PowerShell／CLI／ADB／Maestroの実行結果として、個人PCのユーザー名やWorkspace、SDK、Tempの絶対Pathが混入し得る。後から手作業で置換するとJSON構造、JSONL境界、UTF-8 encoding、失敗時のArtifactを壊すリスクがある。また、過去Runを一括変更すると履歴の監査性を損なう。

## Decision

Path登録と置換Variant生成を一つの共有PowerShell実装へ集約し、二段階の防御を採用する。

1. `codex-task.ps1` のLog／Report／Manifest／Evaluation書込み前に再帰的なValue Sanitizationを行う。
2. Run終了時の`finally`でCLIのWrite＋Checkを実行し、成功・失敗の双方で最終検査する。
3. CIではFixture Testと、差分に含まれる`.codex/runs/**`のCheck-onlyを実行する。
4. 過去Runは自動Writeせず、Check-onlyで残存件数を記録する。

ContextはRepository、Android SDK、Java、pnpm virtual store、Maestro、Temp、User Homeを扱い、Windows separator／case、JSON escaped backslash、file URI、末尾separatorを正規化したVariantを生成する。対象拡張子は`.md`、`.json`、`.jsonl`、`.txt`に限定し、Residualが残ればfail-closedとする。

## Alternatives considered

- 生成後の正規表現置換だけ: 構造化Value、JSON escaped表記、Windows／WSL混在Pathの取りこぼしがある。
- 過去Runの一括Write: 履歴を変更し、意図しない差分を作るため採用しない。
- Secret Redactionとの統合: 責務と検査基準が異なるため別機能として管理する。

## Consequences

- 新規Run Artifactは生成時点で共有可能なPath表現に近づき、失敗時も最終ゲートで検査できる。
- Write時に対象テキストを読み書きするため、Run Artifact生成のI/Oは増える。
- 過去Runに残る既存Pathは自動では消えない。必要な履歴移行は別途、明示承認を得て計画する。
