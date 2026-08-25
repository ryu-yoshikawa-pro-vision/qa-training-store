# Plan

## Objective

PR #65の同一branchへIssue #60の最終hardeningを追加し、Hookがshell実行時のcontextと静的評価contextの不一致を安全側で拒否できる状態にする。

## Scope

- In:
  - compound command内のbranch／cwd／environment transition後のcontext-sensitive Git mutation拒否
  - quote/token、line continuation、限定的なunquoted backslash escapeの正規化
  - update-ref、fetch／pull、state-changing git config、protected branch delete／renameのtarget解析
  - focused／contract／quality gate／Windows launcher contract、plan／Run Artifact、PR #65本文の同期
- Out:
  - full shell／Git parser、AST、alias expansion、full config resolver、Git wrapper、branch/worktree manager、PR state manager、特殊plumbing網羅
  - `command git`、`env git`、wrapper、arbitrary executable path、command substitution、`.git/refs/**`直接書換え

## Assumptions

- 現在branch `fix/codex-git-branch-protection`とPR #65のheadは一致しており、新branch／新PRは作成しない。
- `git`／`git.exe`、既存shell boundary、既存G1〜G10／N1〜N4は正本として維持する。
- mutation targetを静的に一意解決できないsyntaxは、parserを拡張して推測せずG10相当でfail-closeする。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ユーザー指示でscope、禁止操作、DoDが確定している。
- 仮定してよい細部: 既存helperへ共有解析を追加し、Windows launcherは変更しない。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 前方のbranch／cwd／environment transitionと後続mutationの存在をinvocation順に検出すれば、状態simulationなしでfail-closeできる。
- H2: update-ref／fetch／pull／config／branchのoption値消費を小さなoperation-specific parserで共有すれば、完全なGit parserなしにtarget誤認を防げる。

## Research Plan

- Round 1 Query: 既存Hook、contract test、Issue #60 plan、run、ADR、repair/review workflowを確認する。
- Round 2 Query: 実装後にfocused test、全contracts、品質ゲート、diff、self-review、PR／CI状態を確認する。
- Exit Criteria:
  - compound transition、mutation target、shell normalizationの各仮説にregression evidenceがある。
  - safety boundaryと対象外がplan、docs、PR本文、Run Artifactで一致する。

## Approach

1. branch／PR／remote／Run／planとsafe change surfaceを確認する。
2. 既存planへ最終hardeningの設計契約を先に追記する。
3. Hookのtokenizer／invocation evaluatorへ最小差分でtransition guard、共有fetch/pull parser、config／branch target guard、shell normalizationを実装する。
4. Hook判定だけでregressionを追加し、危険Git commandは実行しない。
5. focusedから全quality gate、sanitizer、self-reviewを行う。
6. 通常追加commit、明示refspec push、PR #65本文／metadata／CI確認を行う。mergeは行わない。

## Definition of Done

- branch transition + mutation、cwd transition + mutation、persistent Git environment + mutationがfail-closeする。
- update-ref `-m`／`--stdin`、fetch `--refmap`／`--stdin`、pull protected refspec、state-changing config、protected branch delete／renameが安全側に判定される。
- line continuation／限定的escapeで危険flagを迂回できず、safe switch／checkout、feature commit／push、normal fetch、read-only configは維持される。
- focused、contracts、format、markdown lint、lint、typecheck、verify、diff check、sanitizer、Windows launcher contractが実行済みで結果が記録される。
- self-review finding 0件、unrelated／dependency／package／lockfile／Windows launcher変更なしで、追加commitを明示refspecでpushしPR #65がOPEN・非Draft・base/head一致する。

## Risks / Unknowns

- shell parserを完全実装せずboundary前提で検出するため、対象外syntaxは網羅せずmutationをfail-closeする。
- cwd／branch stateをsimulationしないため、transition後のmutationは保守的にDENYする。read-only operationは必要以上にDENYしない。
- docs-onlyの自己参照commit chainを避け、Run Artifactは最終結果を1回の通常追加commitへまとめる。

## Rollback

- 追加実装commit単位でrevert可能にする。rebase、amend、force push、reset、clean、branch delete、mainへのcommit／pushは行わない。
