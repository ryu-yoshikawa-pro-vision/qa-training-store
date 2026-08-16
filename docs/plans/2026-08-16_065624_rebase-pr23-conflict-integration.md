# PR #23 rebase conflict semantic integration plan

## 1. Goal

- 最新 `main`（PR #24 Screen Catalog / Visual Specification と PR #25 Curriculum / Training Environment を含む）を正本として維持しながら、PR #23 Official Black-box Scored E2E の意味・機能・Trust Boundaryを失わず、現在の rebase conflict を解消する。
- Git index / history / branchを変更せず、working treeのconflict markerだけを編集で解消する。

## 2. Current understanding

- rebase は `600b5ca`（`origin/main`）上で進行中で、期待 branch は `feat/implement-official-black-box-scored-e2e`。
- 現在の unmerged file は `docs/PROJECT_CONTEXT.md` の1件だけである。
- main側の conflict blockには Curriculum、Screen Catalog / Visual Specification、PR #24 / #25 の最新履歴があり、PR #23側には Official Black-box Repository Contract の履歴がある。
- main側の ADR は `0013-screen-catalog-visual-reference.md` と `0014-curriculum-pr-required-dod-scope.md`。PR #23側の Official ADR は旧 `0013` であるため、最終名は `0015-official-black-box-scored-e2e-artifact-boundary.md` とする。
- rebaseの後続 commit（artifact contract repair、learner-safe input / trusted evidence）はまだ適用前であり、Git操作で先へ進めず、現時点の conflict解消と後続差分の整合性確認を分離する。

## 3. Assumptions

- ユーザーが解消済みファイルを後で `git add` し、`git rebase --continue` を実行する。
- Run Artifactは現セッション用に新規作成し、過去Runは削除・並べ替え・通常の書換えをしない。
- ADR旧名の参照除去は、履歴を壊さない範囲で現行canonical pathを正すための明示された移行として扱う。

## 4. Non-goals

- `git add`、`git commit`、`git push`、`git rebase --continue`、`git checkout`、`git reset`その他のGit state mutation。
- Ours / theirsの全面採用、repository-wide refactor / formatting、Custom Agent Runner、LLM wrapper、MCP Proxy / Gateway、独自Remote Sandbox。
- Host Receiptが無い状態でのOfficial E2E実行・採点、Synthetic FixtureのOfficial昇格。
- PR #24 / #25の既存Visual Specification、Training workflow、Native / CI契約の変更。

## 5. Impacted areas

- `docs/PROJECT_CONTEXT.md`: main側の最新履歴とPR #23 Official履歴を併存させる。
- `docs/adr/`: Official ADRを0015へ移行し、mainの0013 / 0014を保持する。
- `scripts/agentic-qa/**`、`tests/contracts/**`、`tests/runtime/**`、`QA_AGENT.md`、Agentic QA reference: current treeと後続PR commitのTrust Boundary・identity bindingをself-reviewする。
- `.codex/runs/**`:既存履歴を保持し、現Runへ判断・検証結果のみ追記する。

## 6. Files to inspect

- `docs/PROJECT_CONTEXT.md`
- `docs/adr/0013-screen-catalog-visual-reference.md`
- `docs/adr/0014-curriculum-pr-required-dod-scope.md`
- 旧Official ADR（旧0013のartifact boundary文書）
- `scripts/agentic-qa/{official-verification,contracts,runner-input,isolation,canonical-artifact-manifest,trusted-evidence,prepare-challenge,runner-output-import,protected-patch-validation,resource-boundary-probe}.ts`
- `tests/contracts/{official-artifact-chain,official-black-box-contracts}.test.ts` と preparation / repository contract tests
- `QA_AGENT.md`、`docs/reference/agentic-qa-workflow.md`、`docs/reference/run-artifacts.md`
- 最新 main / PR #23の関連Run Artifactと後続rebase commitの差分

## 7. Change strategy

1. conflict fileのmain側／PR側を行単位で確認し、main側ブロックを保持したままOfficial履歴ブロックを適切な履歴位置へ追加する。
2. Official ADRを0015へ内容移行し、mainの0013 / 0014を変更しない。旧Official ADR filenameの現行参照を全検索し、必要なものだけ0015へ更新する。
3. current treeと後続PR commitのAgentic QA contracts / tests / docsを比較し、exact set、symlink rejection、source-free、Host Receipt、Specification / Challenge / Runbook byte binding、fully-rebound negative test、positive chainが弱まっていないことを確認する。
4. conflict marker、ADR参照、format差分、指定validationを順に確認する。Git indexは未解決表示のままでも、working tree内容とmarker除去を完了条件として判定する。
5. Run ArtifactをsanitizerのWrite / Checkで検証し、Git mutationなしと、ユーザーが次に実行する操作を明記する。

## 8. Validation plan

- `git grep` と `rg` によるconflict marker確認（計画書自身にはmarker文字列を記載しない）。
- `git grep` で旧Official ADR filenameが0件であること、0013 Screen / 0014 Curriculum ADRの存在確認。
- `git diff --check`、Prettier / Markdown lint。
- 指定focused Vitest、`test:agentic-qa:preparation`、contract validator。
- `test:contracts`、`typecheck`、`lint`、`lint:markdown`、spec validation / build、security、format check、可能ならE2E / verify。
- rebase中のunmerged indexに依存するgateは実装failureと混同せず、BLOCKED / NOT RUNとして証跡化する。
- `scripts/sanitize-codex-artifacts.ps1 -Path .codex/runs/20260816-065624-JST -Write -Check`。

## 9. Risks

- 後続rebase commitが旧ADR pathを変更するため、rename相当のworking tree差分が次の適用に影響する可能性がある。後続commitのdiffを先に確認し、現在の操作はGit mutationなしで止める。
- 現時点では後続commit未適用のため、current treeだけのfocused test結果はPR #23最終状態の証明にならない。最終報告で適用前であることを明示する。
- `git diff --name-only --diff-filter=U` はユーザーstage前には残る。marker除去、完成内容、semantic reviewを主判定とする。

## 10. Open questions

- なし。ユーザー指定のmain優先、PR #23保持、Git mutation禁止、ADR番号移行、fail-close条件で判断可能。

## 11. Follow-up notes

- ユーザーがstage / rebase continue後に後続PR commitで新しいconflictを得た場合、その時点のunmerged fileだけを同じsemantic merge手順で再確認する。
- Host-trusted Receiptが無いOfficial executionは、現在の設計どおり `BLOCKED / NOT EXECUTED` のまま扱う。
