# Tasks

## Now

- [x] 1. PR #45のreview／Native CI failureと既存設計を確認し、repair scopeを固定する。
- [x] 2. PLANとrepair iteration（must_fix／defer／allowed files）を確定する。
- [x] 3. Workflowの余分な`--`を除去し、CLI接続Contractを強化する。
- [x] 4. Focused／Standalone／swapped control／quality gatesを実行し、必要な最小修正がないことを確認する。
- [x] 5. 修正HeadをPR #45へ通常pushし、Remote Native CIのActual APK Guard／Runtime／aggregateを確認する。
- [x] 6. Remote結果でPROJECT_CONTEXT／履歴／Run Artifactを更新し、Sanitizerと完了判定を行う。

## Discovered

- [x] D1. 既存Expo Doctor patch version mismatchはG1 scope外の独立failureとして記録し、今回のPRへdependency updateを追加しない。

## Blocked

- なし（Remote CIの結果に応じて未実行後続が発生した場合はここへ移す）。
