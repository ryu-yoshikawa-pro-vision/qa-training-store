# 作業記録

## 2026-11-08

- 開始HEAD：`0b06c4d1ef3f881a81d7037bae728bc45c548c8a`。
- 既存のM06/M07参考CIにはPlaywright実行結果があるが、`course:run`の正式receipt/snapshotが含まれないため個別検証5.4は未完了。
- 新しい開発側ジョブは、同SHAの学習者配布を隔離した一時ディレクトリに同期し、`course:load`から`course:run`、`verifyModuleRunEvidence`へ通す。M07の意図的失敗と修正前失敗は成功に偽装せず、失敗Runとして検証する。
- 完成参照specは一時領域だけに置き、CI Artifactは実行メタデータ・SHAと検証結果だけを保存する。
- 新HEADのCI未実行段階では5.4をPASSにしない。CI失敗時はjobログと固定HEADで原因を確認し、必要なコード修正後に再試験する。
