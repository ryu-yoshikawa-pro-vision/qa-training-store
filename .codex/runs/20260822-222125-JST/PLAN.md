# PR #45 G1 CLI接続修正 Plan

## Objective

- Workflowからpnpm経由で共有Hermes validatorへ渡すargvの余分な`--`を除去し、Actual Automation／Production APK由来のGuardをRemote Native CIで再確認する。

## Scope

- In:
  - `.github/workflows/native-ci.yml`のProduction Bundle Guard呼び出しの最小修正。
  - `tests/contracts/native-ci-workflow.test.ts`のCLI境界Contract強化。
  - Remote CI結果に基づく`docs/PROJECT_CONTEXT.md`のliving state更新と履歴追加。
  - Focused／repository quality gates／Standalone validator／Remote Native CIの確認。
- Out:
  - `scripts/validate-native-production-bundle.ts`の`--`特別処理やHermes inspection設計変更。
  - Expo／React Native dependency更新、Product behavior、G2〜G9、Generic framework、retry／timeout／failure masking。

## Assumptions

- PR #45の既存設計（`hermesc -dump-bytecode`、共通validator、APK artifact extraction、Guard後Runtime）は正しいため維持する。
- `Unknown argument: --`はRemote logで再現済みで、workflowの`pnpm run`呼び出しが直接原因である。
- Remote Native CIは修正commitをbranchへ通常pushした後のPR workflowで確認する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Contract assertionの文言は実Workflowのshell行に合わせる。
- 未回答の重要質問: なし。

## Hypotheses

- H1: `pnpm run validate:native-production-bundle "${validator_args[@]}"`へ変更すれば、validatorは既存の明示path引数を受理し、Guard入口のfailureが解消する。
- H2: Workflowのexact commandと誤った`--`付きcommandをContractで同時に固定すれば、同じ接続ミスを再導入できない。
- H3: GuardがPASSした場合、Actual APK由来のdecoded marker結果を経てProduction Runtime／Maestroへ進み、既存のExpo Doctor failureは独立して切り分けられる。

## Research Plan

- Round 1 Query: PR #45のcheck／Native CI失敗ログ、現在のworkflow／Contract／PROJECT_CONTEXTを確認する。
- Round 2 Query: 最小差分を適用し、Focused test、Standalone validator、品質gate、Remote Native CIのjob／step logを確認する。
- Exit Criteria:
  - H1/H2がlocal evidenceとRemote logで支持される。
  - Actual APK inspection、Guard、Runtime、aggregateの結果をPASS／FAIL／未実行で分離記録する。
  - 残差があればExpo Doctor等の独立failureとして根拠と次アクションを記録する。

## Approach

1. review／validation findingを`must_fix`（CLI接続と回帰Contract）と`defer`（既存Expo Doctor）に分類する。
2. allowed filesを宣言してworkflowとContractだけを修正する。
3. local validationをFocused → Standalone／swapped control → quality gatesの順で実行する。
4. branchへ通常pushし、PR #45のNative CIを確認する。上流Buildが失敗した場合は後続jobをPASS扱いにしない。
5. Remote evidenceに合わせてliving documentationとRun Artifactを更新し、sanitizerを実行する。

## Definition of Done

- Workflowのvalidator呼び出しに余分な`--`がなく、Contractが正しい形と誤った形を固定する。
- 既存validatorのPositive／Negative／swapped controlとFocused ContractがPASSする。
- Actual APK由来GuardのRemote結果、Runtime／Maestro、`native-ci / verify`を実測結果として報告する（未実行をPASS扱いしない）。
- G1以外の変更を含めず、Expo Doctor等の既存failureをG1の結果と混同しない。
- `PROJECT_CONTEXT.md`のG1状態とraw scanの説明が実Evidenceに一致する。

## Risks / Unknowns

- Expo Doctorのpatch version mismatchがNative Staticを失敗させる可能性がある。G1変更との因果関係をlog／baselineで分離する。
- Remote Build／Maestroが環境依存で失敗した場合、同一条件の盲目的再試行はせず、最初の異常と未実行後続を記録する。
- Run Artifactに絶対pathが残る可能性があるため、完了前にSanitizer Write／Checkを実行する。

## Thinking Log

- 2026-08-22: PR #45のNative CI run `32573446886`で、両Android Buildは成功した一方、Guardが`pnpm ... --`をliteral argvとして受け取り`Unknown argument: --`で失敗した。Native Staticは既存Expo Doctor mismatchで別途失敗し、RuntimeはGuard failureによりskippedだった。
- 2026-08-22: 修正はworkflow一行とContract assertionに限定し、validator本体のCLI仕様は拡張しない。
