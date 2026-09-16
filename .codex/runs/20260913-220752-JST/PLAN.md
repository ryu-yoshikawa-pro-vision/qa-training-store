# Plan

## Objective

PR #146の全体レビューで残った3件だけを、現在の実装と正本Planの契約に沿って修正する。

## Scope

### In

- session開始前にrename＋編集されたMarkdownでは、保存済みの開始時worktree baselineをcurrent pathの正本として優先する。
- Windowsの文章品質`Stop` launcherで、root解決、Node／Hook欠落、Hook非0終了の全失敗経路が同じfail-close block JSONを返すようにする。
- `Stop(stop_hook_active=true)`では、state本文が破損またはidentity不一致でも、安全に導出したstate pathをcleanupしてallowする。
- 上記契約を既存`tests/contracts/**`へ回帰テストとして追加する。
- production rule、#135依存、Repository-level比較script、Run Artifactを除く新規frameworkは変更しない。

### Out

- `SessionStart(source=compact)`、root `AGENTS.md`再注入、Issue #135 branchへの依存。
- production文章品質ruleの具体化。
- similarity rename、filename推定、edit distance、Markdown parser高度化、新しいHook／session／diff framework。
- Windows実Codex runtime canaryの新規調査。
- `scripts/check-text-quality-changes.mjs`の変更。

## Assumptions

- Issue #135はOPENであり、compact再注入は今回も実装しない。
- production `.codex/text-quality-rules.json`は`not-configured`／`rules: []`のまま維持する。
- 現在のPR headがレビュー対象headと一致している場合は、先に再現テストで残存問題を確認してから最小修正する。
- Windows実行はWindows CIで検証する。Linux上のskipをWindows PASSへ昇格しない。

## Hypotheses

- H1: `makePairs()`がcurrent pathの`source=worktree` entryを確認せずGit rename mappingを先に適用しているため、session開始前rename＋編集のbaselineが誤る。current path entryを最優先すれば、既存のclean rename、staged／unstaged move、exact SHA fallbackの契約を保てる。
- H2: Windows quality `Stop` commandの`$fallback`が未定義で、launcher側の失敗時stdoutが空になる。PowerShell sourceへ明示的なfallbackを定義し、process非0・Hook欠落・root解決不能の各経路で同一JSONを出力すれば契約を満たせる。
- H3: `cleanupAllowedStop()`が`readState()`成功をdeleteの前提にしているため、破損／identity不一致stateをcleanupできない。rootとsession IDから既存`makeStatePath()`で導出したpathだけを`deleteState()`へ渡せば、state本文を信頼せずcleanupできる。

## Research Plan

- Round 1: branch／remote／PR／Issue／#135／mainとの差分、現行source／config／tests、既存Run Artifactを確認し、3件の再現経路を確定する。
- Round 2: 最小patchと回帰testを追加し、focused contract、TOML構造、Windows degraded path、通常gate、CIを順に確認する。
- Exit Criteria:
  - H1〜H3それぞれについて、修正前の根拠、変更、回帰test、検証結果がある。
  - 既存baseline／Hook／Repository-level gate／production rule／#135契約の非変更を確認できる。
  - 最新PR headのWeb CI／Mobile App CIがsuccessで、PR本文へ結果を記録する。

## Approach

1. 初期状態と対象範囲をRun Artifactへ記録する。
2. source／configの最小修正と、既存contract testへの境界ケース追加を同一bounded iterationで行う。
3. focused → local quality gates → `verify` → diff／scope確認の順で検証し、失敗時は最初の異常だけを修正する。
4. Run Artifactをfinal commit前にsanitizeし、branch安全確認後にcommit／push、最新headの必須CI確認、PR本文更新を行う。

## Definition of Done

- 3件の契約と回帰testがPASSする。
- focused件数が増え、`pnpm run verify`と指定Hook opt-inがPASSする。
- Repository-level comparison script、production rules、#135依存が変更されていない。
- Windows CIの追加failure-path testがskipされず実行されPASSする。
- PR #146がOPEN、`Refs #134`維持、force push／merge／close／branch削除なし。

## Risks / Unknowns

- Windows launcherはCodex 0.147.0の`cmd.exe /C`ラップ制約を持つため、既存のEncoded PowerShell形式を維持し、sourceから再encodeする。
- rename＋編集のGit検出はstaged／unstagedで差があるため、開始時entryのpath優先を先に適用し、既存移動ケースを再実行する。
- state cleanupのfilesystem失敗は従来どおり診断に留め、任意pathを削除するfallbackは追加しない。

## Thinking Log

- 2026-09-13: 現在branch／upstream／PR headは`e5b4f639e46a714004f548b69943297532094a09`で一致し、PR／Issue #134／#135はOPEN。`origin/main`は`f88283a`で3 commit先行しているが、今回のbounded repairに不要なmergeは行わない。
- 2026-09-13: 現行`makePairs()`は`mappings.get(currentPath) ?? currentPath`でGit mappingを先に採用し、`cleanupAllowedStop()`は`readState()`後にのみdeleteする。Windows quality Stop sourceは`$fallback`未定義である。3件とも現在差分に起因するactionable `must_fix`として修正する。
