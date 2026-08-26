# Plan

## Objective

- PR #65の`5864ee5...`以降に、Issue #60で残っていたshell token正規化とcontext transitionのsource/test実装を追加し、既存branch上で検証・追加commit・push・PR更新まで完了する。

## Scope

- In:
  - `git`／`git.exe` executable候補の代表的なquote removalと限定的なunquoted backslash escape。
  - Git subcommand、option、protected branch/ref/refspec tokenのsecurity-sensitiveな実質値比較。
  - `git switch -`／`git checkout -`のcompound branch transition検出。
  - PowerShellの`Push-Location`／`Pop-Location`を既存cwd transition familyへ追加。
  - 対応するcontract regression、既存plan、Run Artifact、PR本文の更新。
- Out:
  - 完全なBash／PowerShell／shell AST、完全なGit CLI parser、alias expansion、wrapper、arbitrary executable path、command substitution、Git plumbing全網羅、branch／worktree／PR state manager、`.git/refs/**`直接書換え。

## Assumptions

- 現在のlinked worktreeはPR #65の指定head branchを指し、remote head `5864ee5a1116f5cb7540b3c77140f8b29aa24cd5`から通常の追加commitを作成できる。
- `normalizeShellContinuations`と`tokenizeGitArguments`を拡張し、既存のquote、space-containing path、Windows path挙動を維持する。
- security-sensitive tokenを安全に一意化できないmutationは既存のG10 fail-close境界へ接続する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。対象3系統、変更ファイル、branch、PR、検証、禁止操作が指定済み。
- 仮定してよい細部: quote removalとbackslash escapeの対象はGit executable、alphabetic subcommand、option、branch/ref/refspecの限定されたtokenとする。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 現remote sourceはliteralな`git`／`git.exe`と既存option tokenを中心に検出しており、escaped executable、subcommand、protected refの回帰assertが不足している。
- H2: branch transition matcherは`switch`／`checkout`の通常branch tokenだけを扱い、`-`とPowerShell location commandletの不足がcompound guardの差分になる。

## Research Plan

- Round 1 Query: remote headのsource/testを確認し、未実装symbolと既存parser/evaluator/test helperを特定する。
- Round 2 Query: focused/full contract、静的self-review、GitHub上の最新source／PR metadata／new-head CIで実装事実を確認する。
- Exit Criteria:
  - H1/H2をsourceとtestの差分で支持または反証できる。
  - 新source/test差分、新規commit、remote head、GitHub source/test、PR metadata、CI結果を確認できる。

## Approach

1. 初期branch、remote、PR、working treeを確認し、既存planを本セクションと`docs/plans/2026-08-25_190400_codex_git_branch_protection.md`へ保存する。
2. 既存normalize → tokenize → invocation parse → operation evaluationの流れへ最小差分でsecurity-sensitive token正規化を追加する。
3. `switch -`／`checkout -`と`Push-Location`／`Pop-Location`を既存compound transition familyへ接続する。
4. 必須deny／allow回帰を明示assertとして追加し、focusedから全品質ゲートへ進む。
5. code-review／repair-loopの観点でdiffとテストを再確認し、Run Artifactをsanitizerへ通した後、通常追加commit、明示refspec push、PR本文更新、new-head CI確認を行う。

## Definition of Done

- source codeとcontract testに今回3系統の実差分がある。
- quoted／escaped executable、subcommand、protected refが既存policyの同じdenyへ到達する。
- `switch -`／`checkout -`単体はALLOW、後続mutationとのcompound commandはG10 DENYになる。
- `Push-Location`／`Pop-Location`後のmutationはDENY、read-onlyは必要以上にDENYしない。
- focused／contracts／format／markdown lint／lint／typecheck／verify／diff check／sanitizerがPASSし、Windows launcher contractがPASSする。
- `5864ee5...`とは異なる追加commitを作成し、`origin/fix/codex-git-branch-protection`へ明示refspecでpushする。
- local HEAD、remote branch HEAD、PR latest headが新SHAで一致し、PR #65がOPEN・非Draft・base `main`である。PRはmergeしない。

## Risks / Unknowns

- 全backslash削除はWindows pathを壊すため、正規化をsecurity-sensitive tokenへ限定し、曖昧なmutationはfail-closeする。
- executable tokenのquote連結を広げすぎると対象外のshell expansionへ拡張するため、代表形式だけを既存tokenizerで扱う。
- transition検出を単体operationのdenyへ広げるとsafe switch/locationを壊すため、後続context-sensitive mutationとの組み合わせに限定する。
- CIはnew headで再確認し、前回headの結果を流用しない。

## Rollback

- 今回の追加commit単位でrevert可能とし、rebase、amend、force push、reset、clean、branch削除、mainへの反映は行わない。

## Follow-up scope: PowerShell `popd`

- 既存のcwd-changing shell operation familyへPowerShell alias `popd`を追加し、`popd`後のcontext-sensitive Git mutationはG10、read-only Git commandは既存どおりALLOWとする。
- 変更は既存matcherとcompound transition contract testの配列へ限定し、shell parser、Git parser、その他のalias探索は追加しない。
- focused contract、全contracts、format、markdown lint、lint、typecheck、verify、diff checkを実行し、Run Artifactをsanitizerで確認する。
