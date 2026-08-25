# Issue #57 uuid remediation 実装計画

## Goal

前Runの調査結果に基づき、Expo 57 / React Native / Metro / xcodeのversionを変えず、`xcode@3.0.1`のdependency edgeだけを`uuid@11.1.1`へ解決するparent-scoped pnpm overrideを実装し、検証・commit・push・PR作成まで完了する。

## Current understanding

- 現在のpathは`expo@57.0.15 -> @expo/config-plugins@57.0.8 -> xcode@3.0.1 -> uuid@7.0.3`。
- `xcode@3.0.1`はCommonJSで`uuid.v4()`のみを使う。
- 前Runの隔離検証では`xcode@3.0.1>uuid: 11.1.1`がpnpm 9.10.0で解決され、CJS smokeとlockfile差分5/5が成功した。
- Expo 57系およびxcode安定版のparent upgradeだけではalertを解消しない。

## Assumptions

- ユーザーの今回の明示依頼により、今回の実装Runでは`git add`、commit、push、PR作成が許可されている。
- PRのbaseはrepository defaultの`main`、Issue #57への参照は`Refs #57`とする。
- 新規branch作成は実行環境のpolicyで拒否されたため、既存の`investigate/issue-57-uuid-remediation`を実装branchとして再利用する。
- 前Runのdurable reportとRun Artifactは今回のPRへ含め、実装判断の根拠として保存する。

## Non-goals

- global override、uuid direct dependency、Expo/RN/Metro major upgrade
- xcode version変更、source/test/workflow変更、Issue #55/#56等の無関係な変更
- Dependabot Alertのdismiss、ファイル削除、履歴破壊操作

## Change surface

- `package.json`: `pnpm.overrides`へ`xcode@3.0.1>uuid: 11.1.1`を追加
- `pnpm-lock.yaml`: pnpm 9.10.0でmanifestから生成
- `.codex/runs/20260825-120337-JST/*`: 実装Run Artifact
- `docs/plans/2026-08-25_120331_uuid_vulnerability_remediation_implementation.md`: 保存計画
- 前Runの`docs/reports/...uuid_vulnerability_remediation_investigation.md`とRun Artifactは削除・改変せず含める

## Validation plan

1. 同一branchのbaseline、差分、Node/pnpm、直近Runを確認する。
2. `package.json`へscoped overrideを追加し、`pnpm install --lockfile-only`でlockfileを生成する。
3. `pnpm install --frozen-lockfile --ignore-scripts`、`pnpm why/list`、xcode CJS / uuid.v4 smokeを実行する。
4. `pnpm run verify`を実行する。失敗時は最初の異常を分類し、現在の変更に起因する安全な最小修正のみ行う。
5. Windowsで実行できないiOS/macOS validationはNot Runとして記録し、PR本文へ明記する。必要ならAndroidは環境preflight後に判断する。
6. self-reviewでunrelated diffがないことを確認し、Run Artifact sanitization Write/Checkを実行する。
7. commit後にbranchをpushし、`gh pr create`でPRを作成し、PR URLとCI初期状態を確認する。

## Risks / rollback

- xcodeの`uuid: ^7.0.3`宣言range外をoverrideするため、CJS smokeおよびnative CIが必須。
- lockfileがcandidate検証時と異なるunexpected changeを含む場合はcommitせず、原因を調査する。
- verifyやPR CIが失敗した場合は、最初の異常をRun Artifactへ記録し、PR作成後なら追加修正を同PRへ限定する。
- rollbackはoverride entryと生成されたlockfile差分を戻すこととし、Git履歴破壊操作は行わない。

## Open questions

- なし。iOS validationの実行環境だけがNot Run候補である。

## Objective

- （今回の指示を達成する）

## Scope

- In:
- Out:

## Assumptions

- （不明点があれば明示）

## Questions / Ambiguity

- 必ず質問する不透明点:
- 仮定してよい細部:
- 未回答の重要質問:

## Hypotheses

- H1:
- H2:

## Research Plan

- Round 1 Query:
- Round 2 Query:
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- どう進めるか（高レベル手順）
- 標準フロー: `PLAN -> Web検索(不足知識) -> TASKS -> 実行 -> REPORT`

## Definition of Done

- 満たしたら完了とする条件

## Risks / Unknowns

- リスクと対策

## Thinking Log

- 思考や判断の理由はここに逐次追記する（作業中に更新）。
- 不明点の整理、選択肢比較、決定理由を簡潔に記録する。
