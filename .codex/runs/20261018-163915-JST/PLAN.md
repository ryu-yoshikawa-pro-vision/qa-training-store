# Plan（計画）

## Objective（目的）

- PR #198の一体実装Planを既存headブランチへ実装し、検証・commit・通常push・PR本文更新・最新HEAD CI確認まで完了する。

## Scope（対象範囲）

- In: 指定3 Plan、関連spec解析コード、契約テスト、108変更Markdown、QA_AGENT.md、PR本文とRun Artifact。
- Out: 製品の期待動作・業務ルール・BR/AC・学習目標・評価・修了条件の変更、新規依存、テスト緩和、別branch/PR、force push、merge。

## Assumptions（仮定）

- PR #198はOpenで、head `docs/refine-spec-curriculum-ja` / SHA `4dc4e5c47798a46370caed47f3b2b7a2302b2616`。base SHAは`971d25103d8b83ccf7c74e1802d44835b27abe25`。
- 作業開始時のtracked worktreeはclean。PR198に対応する既存Runは見つからず、strict Runを新規初期化した。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: 仕様・範囲の判断が必要になった場合のみ。
- 仮定してよい細部: Planの局所実装詳細と既存規約に従う。
- 未回答の重要質問: なし。

## Hypotheses（仮説）

- H1: 日本語見出しを許可表記として追加し、英語互換性と厳密な不正入力拒否を保てる。
- H2: Web CIの失敗は既知Markdown構造違反と日本語文書を未認識の解析経路に起因する。

## Research Plan（調査計画）

- Round 1 Query: PR head/base、既存diff、対象コード・契約テスト・GitHub Actionsの失敗を確認する。
- Round 2 Query: 修正後に意味差分、リンク、必須検証と最新HEAD CIを確認する。
- Exit Criteria:
  - Planの修正・意味照合・必須検証・GitHub反映がすべて確認される。
  - 未解決論点があればPR本文と最終報告へ明記する。

## Approach（進め方）

- Baseline確認 → spec parserと契約テスト → 文書・教材修正 → 108文書の意味照合 → 必須検証 → commit/push/PR本文 → 最終HEAD CI。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`。

## Definition of Done（完了条件）

- 3 Planの全項目を満たし、必須コマンド・契約負例・Markdown lint・ビルドに成功する。
- 最終HEADを既存PR branchへpushし、PR本文と最新HEADのWeb/Mobile CIを確認する。

## Risks / Unknowns（リスク・未知点）

- 日本語見出しの許可範囲拡大が既存英語・負例を崩す恐れがあるため、日英正例と不正入力負例を維持する。
- 108文書の意味変更を自動検証のみで見落とさないよう、base差分をファイル単位で照合する。
- 現HEADでWeb CIが失敗している。Git fetchは`.git/FETCH_HEAD`権限拒否。GitHub PR snapshotはローカルrefと一致する。

## Thinking Log（判断記録）

- 作業前にGitHubのPR metadataと変更ファイル一覧でhead/base/対象を照合した。
- 現HEADのWeb CIはStyle Quality/Markdown lint、build-production、build-automationで失敗、Mobile App CIは成功。
- 依存導入は既存node_modules削除確認のno-TTYで初回中断したため、`confirmModulesPurge=false`でfrozen-lockfile導入を再実行中。
