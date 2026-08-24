# PR #58レビュー指摘修正計画

## 1. Goal

PR #58のbrace-expansion R2 dependency remediationは変更せず、Issue #54、PR本文、前Run Artifact、最新CI evidenceの矛盾を解消し、同一headの失敗jobを1回だけ再実行したうえでmerge可否を判断する。

## 2. Current understanding

- 現在のbranchは`fix/dependabot-brace-expansion-r2-metadata-evaluation`、HEADは`7a20fdeb786339086023383e27affc15bca40e5b`。
- R2実装は`minimatch@3.1.5>brace-expansion -> 1.1.18`と`minimatch@10.2.5>brace-expansion -> 5.0.9`で、`package.json` / `pnpm-lock.yaml`は今回変更しない。
- PR #58の既存Mobile App CI run `32734755542`では、Native StaticとAndroid Automation Buildがfailure、`native-ci / verify`もfailure、Android Runtime / Maestro jobはsuccessだがAutomation APK依存flowは未実行である。
- Issue #54本文はpeer metadata差分を一律禁止しており、実際のmetadata-only許容条件と矛盾している。
- 前Run `20260824-202628-JST`の履歴はappend-onlyで保持し、最新事実を訂正追記する。`evaluation.json` / `run.json`は最終評価に同期する。

## 3. Assumptions

- `origin/main`およびPR #58の指定headをcanonicalな比較基準とする。
- review対応のbranch変更はRun Artifact、必要なdurable plan、Issue/PR metadataに限定する。
- Android Automation Buildの同一head rerunは、GitHub Actionsのfailed jobsに対して1回だけ実施する。
- rerun後のCI状態は、最後のArtifact commitが発生させる新headを含め、Run Artifactへ書き戻さずGitHub metadataを正本とする。

## 4. Non-goals

- `package.json` / `pnpm-lock.yaml`のR2再設計または再解決。
- global override、minimatch/Expo/Gradle dependency更新、source/test/workflow変更。
- `pnpm audit --fix`、`pnpm update --latest`、nanoid/image-size/uuid対応。
- PR #58のmerge。

## 5. Impacted areas / allowed files

- `.codex/runs/20260824-202628-JST/REPORT.md`
- `.codex/runs/20260824-202628-JST/evaluation.json`
- `.codex/runs/20260824-202628-JST/run.json`
- 必要に応じて同Runの`PLAN.md` / `TASKS.md`への訂正追記
- 今回Runの標準Artifact
- `docs/plans/2026-08-25_070808_pr58-review-repair.md`
- GitHub Issue #54 / PR #58の本文・コメント
- rerun後に独立failureを切り出すIssue（同一headで再現した場合のみ）

`package.json`、`pnpm-lock.yaml`、application source、test、workflowはallowed scope外とする。

## 6. Repair triage

- `must_fix`: Issue #54 DoD、Run ArtifactのCI事実、`native-ci / verify`のgate説明、Maestro実flowの実行有無、CI evidence ownership。
- `should_fix`: PR本文のCI状態、evaluation/run manifestの最新head・failure分類。
- `defer`: Expo patch update、Gradle Foojay plugin resolution、R2外の依存remediation。必要時は別Issueへ切り出す。
- `reject`: dependency remediationの再設計、CIを通すだけのskip/continue-on-error、無関係な依存更新。

## 7. Validation plan

1. `git status`、branch、HEAD、PR/Issue/Alertを再確認し、R2 diffとNode/pnpmを固定する。
2. `pnpm install --frozen-lockfile --ignore-scripts`、`pnpm why/list brace-expansion`、`pnpm audit`、format、verify、diff check、必要ならlockfile no-opを実行する。
3. Issue #54本文、前Run Artifact、PR本文を事実に合わせて更新し、Artifact sanitizer/schema/linkageを実行する。
4. dependency変更なしをdiffで確認し、対象ファイルだけcommit/pushする。
5. push後の新headのCIを確認し、同一headの失敗jobは1回だけrerunする。Maestroはjob conclusionと実flow実行を分けて確認する。
6. 最終CIをIssue/PR metadataへ記録し、`READY TO MERGE`または`NOT READY TO MERGE`で停止する。

## 8. Definition of Done

- R2 dependency差分が完全に不変。
- Issue #54 DoDがmetadata-only許容条件と一致。
- Run Artifactに最新の既存headCI事実と、以後のCI evidence ownership終端ルールが明記される。
- PR本文とIssue commentが`Android Runtime / Maestro job success`と`実Maestro flow PASS`を混同しない。
- 同一headのfailed jobsを1回rerunし、結果をGitHub metadataへ記録。
- 独立failureは必要時に別Issueへ切り出し、PR #58へ混ぜない。
- PRはmergeせず、nanoidへ進まない。

## 9. Risks / stop conditions

- Rerunで新しいfailureが出た場合は、brace-expansionとの因果関係を調査し、scope外の修正は別Issueへ分離する。
- 同じfailureが同一工程で再現した場合、追加rerunや無目的なCI待機をしない。
- allowed scope超過、dependency変更、unsafe action、CI原因不明のままの修正が必要になった場合は`stop_needs_human`として停止する。

## 10. Open questions / follow-up

- rerun後にFoojay resolutionが一時障害として消えるか。
- rerun後もExpo Doctor mismatchが残るか。
- PR #58 merge後のAlert #2/#3/#4 Fixed確認は今回実施しない。

## Thinking Log

- 2026-08-25 07:10 JST: review findingsをmust_fix/should_fix/defer/rejectへ分類。R2依存実装は全てallowed scope外として固定した。
- 2026-08-25 07:10 JST: 既存run `32734755542` のjobログでFooJay plugin resolution failure、Expo Doctor mismatch、Maestro実flow未実行条件、集約verifyのgate要件を確認した。
