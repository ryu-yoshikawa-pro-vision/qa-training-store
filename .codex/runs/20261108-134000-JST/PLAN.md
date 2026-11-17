# 計画

## 目的

PR #199の個別検証5.4（旧行174）で、M06/M07の`course:run`を実Chromiumで実行し、receipt・spec snapshot・JSON report・検証器を同じ固定SHAで確認する。

## 対象

- `tests/contracts/ai-assisted-qa-phase2-course-run-ci.mjs`に受入用実行経路を追加する。
- `.github/workflows/ci.yml`のPR #199専用ジョブに組み込み、`verify`で成功を必須とする。
- 製品SUT・正式製品仕様・既存製品テスト・固定外部Skill・PR #210・mainは変更しない。

## 実施・検証

1. 固定HEADと同じ配布を一時的な学習環境へ`course:sync`し、M06/M07を`course:load`する。
2. 開発側の完成参照specを一時領域へ複製し、固定M06 3件・追加Case 2件×2回、M07の意図的失敗・修正前失敗・修正後成功・保守変更前2件・後3件を`course:run`で別Runとして実行する。
3. `run-evidence.json`、`spec-snapshot.ts`、`playwright-result.json`の版とSHAを照合し、`verifyModuleRunEvidence`によるM06/M07の受入を確認する。
4. 公開Artifactには実行メタデータとSHAのみ保存し、完成参照spec・本人ファイル・正式採点資料を保存しない。
5. HEADのWeb/Mobile CIで結果を確定するまで個別検証5.4を完了にしない。

## 制約

開発側で既知の完成参照specを用いた技術受入であり、受講者本人の実技・独立した評価・実モデル校正を証明しない。
