# Plan

## Objective

- GitHub ActionsのトップレベルWorkflow表示名だけを、指定された3つの恒常的な名称へ変更する。

## Scope

- In:
  - `.github/workflows/ci.yml` の先頭 `name:` を `Web CI` へ変更
  - `.github/workflows/native-ci.yml` の先頭 `name:` を `Mobile App CI` へ変更
  - `.github/workflows/native-ios-ci.yml` の先頭 `name:` を `Mobile App iOS CI` へ変更
  - 指定された既存Contract Test、差分検査、Run Artifactの更新
- Out:
  - Workflowのjob／step／trigger／permissions／実行条件／内部識別子／ログ／テストコード
  - concurrency、required check、branch protection、ruleset、`Cross-Browser Smoke`
  - dependency、validator、actionlint、専用テストの追加
  - Gitの状態を変更する操作

## Assumptions

- 実装前検索結果が指定プランの期待値と一致している。
- 作業ツリーに既存のtracked差分はなく、現在のブランチ上で編集する。
- `.github/workflows/ci.yml` の `${{ github.workflow }}` によるconcurrency group名の変更は、プラン記載どおり許容する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: Run Artifactはリポジトリ運用上必須の記録として作成し、実装差分の判定は対象Workflow 3ファイルに対して行う。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 3つの先頭`name:`だけの変更で、指定Contract Testは成功する。
- H2: job／step／内部識別子／concurrency実装および`Cross-Browser Smoke`には差分が生じない。

## Research Plan

- Round 1 Query: 指定プラン、PROJECT_CONTEXT、AGENTS、最近のADR、直近Run、実装前Workflow名を確認する。
- Round 2 Query: 指定Contract Testと、変更後のgrep／diff／`git diff --check`で完了条件を確認する。
- Exit Criteria:
  - H1〜H2をテストと差分の根拠で判定できる。
  - 実装対象が3 Workflowファイルの先頭1行ずつだけである。
  - 未解決事項があればREPORTへ記録する。

## Approach

- 指定プランに従い、実装前状態を確認してから`apply_patch`で3行だけ置換する。既存Contract Testを実行し、指定された差分検査と不変条件確認を行う。
- 標準フロー: `PLAN -> TASKS -> 実装 -> 検証 -> REPORT`

## Definition of Done

- 3つのトップレベルWorkflow名が指定値になっている。
- 指定Contract Test 2ファイルが成功する。
- `git diff --check`が成功する。
- 実装差分が3ファイル・3行の置換だけで、`Cross-Browser Smoke`および内部設定に変更がない。
- Git mutationを実行していないことをREPORTへ記録する。
- Run ArtifactがSanitizerのWrite／Checkを通過する。

## Risks / Unknowns

- `github.workflow`参照によりci.ymlのconcurrency group先頭文字列は表示名に追随するが、実装を変更せず既知の許容影響として扱う。
- 指定Contract Testが環境要因で失敗した場合は、無関係な修正を追加せず、失敗内容と因果を記録する。

## Thinking Log

- 2026-08-23 14:49 JST: 指定プラン、必須コンテキスト、ADR-0019／0018、直近Runを確認した。直近Runは別タスクの完了済みで、今回の会話に引き継ぐactive runではないため新規Runを初期化した。
- 2026-08-23 14:49 JST: 実装前`git grep`は3件すべて期待値と一致し、tracked差分は空だった。対象と検証方法を変更しない。
- 2026-08-23 15:27 JST: ユーザーからpushまでの明示依頼を受けた。対象差分を再確認してcommit／pushする。PR作成・更新は今回の依頼に含めない。
