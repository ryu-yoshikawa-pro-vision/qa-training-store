# Plan（計画）

## 目的

- Issue #130の保存Planへ最終レビュー2件を反映し、実装者が推測せずにhelper境界とReusable Workflowの移動契約を実装できる状態へする。

## Current確認

- 今回修正時の`main`: `01cd8ab15078d479e821d373445af1e16a469519`。
- 前回基準`8d73289350d45e28b4186c47caa32ad8d4809657`からの1 commitはIssue #163のSecurity fallback 3ファイルだけを変更し、Native CI関連fileは不変。

## 修正内容

- 5本のshell helperについて、必須 / optional環境変数、`GITHUB_ENV`出力、生成fileを明示する。
- `CAPTURE_CASE_SELECTION`と`NATIVE_ANDROID_JOB_STATUS`はworkflow stepの`env:`から明示的に渡す。
- Runtime Evidence helperは前段失敗時に`ADB` / APK path等が欠落してもEvidence生成を継続する。
- Android build Reusable Workflowへ移すActionについて、固定SHAだけでなく`persist-credentials`、Gradle cache、Node cache、Java 17、Artifact missing-file / overwrite / retention設定を維持する。

## 対象外

- Native CI実装
- Product code変更
- PR作成、merge、Issue close
- version / Action更新
- 新しいhelper interface framework
