# 作業記録

## 2026-11-08

- 開始HEAD：`0b06c4d1ef3f881a81d7037bae728bc45c548c8a`。
- 既存のM06/M07参考CIにはPlaywright実行結果があるが、`course:run`の正式receipt/snapshotが含まれないため個別検証5.4は未完了。
- 新しい開発側ジョブは、同SHAの学習者配布を隔離した一時ディレクトリに同期し、`course:load`から`course:run`、`verifyModuleRunEvidence`へ通す。M07の意図的失敗と修正前失敗は成功に偽装せず、失敗Runとして検証する。
- 完成参照specは一時領域だけに置き、CI Artifactは実行メタデータ・SHAと検証結果だけを保存する。
- 新HEADのCI未実行段階では5.4をPASSにしない。CI失敗時はjobログと固定HEADで原因を確認し、必要なコード修正後に再試験する。

## 2026-11-08 実Run検証結果

- 対象HEAD `0fd2d8c8e16067d3fa9831feeedd89ed7ef22bff`、[Web CI #42447943699](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42447943699)の`M06/M07 actual course:run evidence (#199)`ジョブがSUCCESS。
- [Artifact #13604004761](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/42447943699/artifacts/13604004761)を展開。保存物は`summary.json`だけで、完成参照spec・本人ファイルを含まない。
- M06はmain・initial・repeatの3 Run、評価器4チェックPASS。M07は診断失敗main・修正前失敗before・修正後after・保守変更前before・変更後afterの5 Run、評価器7チェックPASS。計8 Run、全11チェックPASS。各Runの`source_sha`はHEADと一致し、receipt・spec snapshot・report SHAを実行コードと評価器が検証。
- 個別検証5.4を`[x]`へ変更し、個別進捗は19/39。参照specを使った開発側実証であり、受講者本人の実技・実モデル校正は未受入。
- Web CI全体は新規スクリプトのPrettier・`Buffer`のESLintエラーにより失敗。`Buffer` importを追加する修正を準備。Prettierの正規差分は診断ジョブで取得して修正する。CI成功を現在は主張しない。
