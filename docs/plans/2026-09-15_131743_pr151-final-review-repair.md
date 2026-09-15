# PR #151最終レビュー修正計画

## 目的

PR #151の最終レビュー指摘を、PR #146の未merge実装を混入させずに修正する。人間向け文章の意味・文体は`docs/WRITING_STANDARDS.md`へ整合させ、決定論的な文字品質gateとは責務を分離する。

## 対象

- `docs/WRITING_STANDARDS.md`
- 今回の監査で一般表現の英語混在または固定section名の扱いに問題が確認できた`.agents/skills/**/*.md`
- `docs/curriculum/test-automation/04_learning-effort-reference.md`
- active Run Artifact

## 対象外

- PR #146のmerge、branch取り込み、cherry-pick、dependency、`.textlintrc.json`、`.codex/text-quality-rules.json`、text quality Hook、`lint:text`実装
- source code、E2E、test、workflow、schema、identifier、path、URL、command、固定文字列の意味変更
- validator / contractの弱体化

## 修正方針

1. `Common Core`は`共通課程`、`Common route`は`共通経路`として使い分ける。
2. `WRITING_STANDARDS.md`からPR番号に依存する表現を除き、恒久的な規約として記述する。
3. 一般説明だけを自然な日本語へ直し、`API`、`CI`、`PR`、`workflow`、`runtime`、`lint`、`typecheck`、各製品名、identifier、契約文字列は維持する。
4. `code-review`、`feature-plan`、同型の`repair-loop` / `harness-improvement`参照の固定section名は、互換一覧ではなく実際の見出しへ必要な形式で残す。
5. `04_learning-effort-reference.md`はmain #152の数値・Lesson・合計を維持し、同一概念の不要な英語併記だけを整理する。

## 検証

- `git diff --check`
- `format:check`、`lint:markdown`、`validate:skills`、`eval:skills:trigger:validate`
- `validate:spec`、`validate:spec-visuals:final`、`validate:curriculum`
- `build:spec`、`build:docs`、`security:check`
- 関連Skill trigger / semantic eval、関連contract / repository contract
- `bash scripts/verify`、`scripts/verify.ps1`
- Run Artifact Sanitizer Write / Check
- push後の最新PR headに対するWeb CI / Mobile App CI

## 完了条件

PR #151がopen・未mergeのまま、同一branchのlocal / remote / PR headが一致し、最新Web CIとMobile App CIがsuccessとなり、PR本文が最終検証結果へ更新されていること。PR #146の実装は追加しない。
