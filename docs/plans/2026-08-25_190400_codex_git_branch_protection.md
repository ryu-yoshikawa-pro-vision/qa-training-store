# Issue #60 実装計画: Codex Git branch protection の PreToolUse 強化

## 1. 目的

既存の `.codex/hooks/pre_tool_use_policy.mjs` を最小差分で拡張し、1つのshell commandに含まれる各Git invocationを、そのinvocation自身が操作するrepository contextで独立評価する。`git -C <path> <subcommand> ...` の形式でも通常のGit invocationと同じG1〜G10／N1〜N4の安全判定を適用し、protected/default branchのmutationとrepository選択による既存安全ガードの迂回を防ぐ。

## 2. 背景

Issue #60では、`git switch -c ... origin/main` は拒否された一方、`git -C . switch -c ... origin/main` は通過する事象が確認された。Git global optionをsubcommandとして誤認する既存のoperation検出が、同じGit operationの判定差を生んでいる。さらに、command全体で最初のcontext-required invocationだけを使う構造、複数`-C`の非累積解決、`--git-dir`／`--work-tree`をcontext選択へ反映しない構造、duplicate IDをMapで集約するregression testが安全性と検証完全性を損なう。

## 3. 現状実装

- Git operation検出は `getGitInvocations()` と `getOperationTail()` のfirst-match結果を各policyから参照しているため、同一command内の後続invocationや同一subcommandの後続ケースを独立評価できていない。
- `parseGitInvocation()` はsubcommand前のglobal optionを一部読み飛ばすが、`-C`を1値だけ保持し、複数`-C`の累積path semanticsを表現していない。
- `--git-dir`／`--work-tree`はsubcommand検出のために読み飛ばされるだけで、実際のrepository context選択またはcontext-sensitive mutationのfail-closeへ接続されていない。
- context未指定時の `getGitCommandContext(cwd)` は、対象invocationのeffective cwdを基準にbranch、upstream、remote、`origin/HEAD`を取得する必要がある。
- `evaluateCommand(command, suppliedContext, cwd)` は、Git invocationごとにcontextを決定して既存G1〜G10 evaluatorへ渡し、1件でもDENYならcommand全体をDENYした後、元commandへN1〜N4を適用する構造へ改める。
- Windows launcherはNode Hookへのstdin／stdout／stderr／exit codeのtransportだけを担当しており、今回の主変更対象ではない。
- Contract testはHookのpolicy matrix、明示context、Windows launcherのroot／nested cwd契約を既に持つ。

## 4. 原因

`getOperationTail()`／`needsGitContext()` がcommand全体のfirst-matchに依存し、`git -C <path>`の実subcommandとinvocation固有contextを安全評価単位として扱っていないためである。結果として、危険operationのdeny判定、後続invocationの検出、protected branch判定を迂回できる。加えて、repositoryを選択するglobal optionを単なるsubcommand前optionとして読み飛ばすと、cwd側のfeature contextを使ってprotected repositoryへのmutationをALLOWできる。

## 5. 変更対象

### 変更するファイル

- `.codex/hooks/pre_tool_use_policy.mjs`
  - Git invocationのglobal optionとsubcommandを共通解析する。
  - `-C` のeffective repository pathをcontext取得へ渡す。
  - 既存operation評価関数へ正規化済みtailを供給する。
- `tests/contracts/codex-hook-contract.test.ts`
  - `git -C` variantのmatrix同値性を追加する。
  - protected branch／feature branchのeffective repository fixtureを追加する。
  - quoted path、shell chaining、指定されたdeny／allow回帰を確認する。
- `docs/reference/codex-safety-harness.md`
  - Git global optionを挟んでも同一operationのpolicyを迂回できない実装契約を短く追記する。
- `docs/PROJECT_CONTEXT.md`、`docs/history/`
  - living documentの実装理解と変更履歴を同期する。

### 原則変更しないファイル

- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/config.toml`
- `package.json`
- `pnpm-lock.yaml`
- `.codex/rules/**`
- `scripts/codex-safe.*`、`scripts/codex-task.*`
- `AGENTS.md`、`docs/reference/git-branch-safety.md`

## 6. 実装方法

1. 既存の`;`、`&&`、`||`、改行によるshell boundaryを維持し、boundary内の各`git` invocationを小さなtoken解析で列挙する。引用符付きtokenを扱うが、完全なGit CLI parserやshell parserは実装しない。
2. invocationごとにsubcommand、operation tail、`-C`列、repository-changing optionの有無、解析不能状態を保持する。正式な`-C <path>`だけを扱い、`-Cpath`の独自attached形式は追加しない。
3. 複数`-C`は出現順に、空pathならcwdを維持し、非空pathなら直前のeffective cwdを基準に`path.resolve()`して累積する。各invocationのeffective cwdはprocess cwdから独立に開始する。
4. repository選択を変える`--git-dir`／`--git-dir=<path>`／`--work-tree`／`--work-tree=<path>`は、subcommand前の単なるglobal optionと区別して記録する。完全なsemanticsを再実装せず、commit、merge、cherry-pick、revert、pull、am、pushなどのcontext-sensitive mutationではG10相当でfail-closeする。recoveryまたは既存の常時DENY判定は既存semanticsを優先し、read-only操作をblanket denyしない。
5. `evaluateCommand()`はGit invocationをcommand単位の単一contextで評価せず、invocationごとにcontextを決定して既存G1〜G10 evaluatorへ渡す。1件でもDENYならそのdecisionを返し、その後に元commandへN1〜N4等のnon-Git policyを適用する。明示`suppliedContext`は既存契約どおり各invocationのcontextとして優先する。
6. unsupportedまたは解析不能なrepository選択構文をcontext-sensitive mutationとして安全に特定できない場合は、曖昧なcontextでALLOWせずfail-closeする。新しいGit wrapper、branch manager、worktree managerは作らない。
7. `main`／`master`／`origin/HEAD`由来のdefault branch、force push、reset、clean、branch delete、protected branch mutation、recovery operation、feature branchの通常操作の既存semanticsは変更しない。
8. テストでは危険Git commandを実行せず、Hookまたは`evaluateCommand()`の判定だけを検証する。temporary Git fixtureのbranch symbolic-refとread-only context取得だけを使う。

## 7. テスト方法

- 既存 `POLICY_MATRIX` からGit commandを選び、`git`直後へ`-C .`を挿入したvariantの判定が通常形式と一致することをdata-drivenに確認する。caseとevaluationは配列indexで1対1に比較し、duplicate IDをMap keyにしてcaseを上書きしない。
- `git -C .` のprotected branch上commit／merge／cherry-pick、state-changing rebase、protected push、force push、reset、clean、branch deleteをDENYで確認する。
- `status`、`log`、`diff`、`fetch`、`branch --show-current`、`switch main`、feature branch上の通常commit／pushをALLOWで確認する。
- `repo A`から別の`repo B`へ`git -C ...`するfixtureで、BがmainならDENY、Bがfeature branchならALLOWとなることを確認する。
- 1 command内の複数Git invocationをそれぞれ独立contextで評価し、先行feature repositoryの後続main repository mutationをDENYする。また、feature/featureの複数commitはALLOWする。
- 同一subcommandの後続危険操作（safe push後のforce push、safe reset後の`reset --hard`）を見逃さないことを確認する。
- 複数`-C`を出現順に累積解決し、最終対象repositoryがmainならDENY、featureならALLOWする。空白を含むquoted pathもこのfixtureで確認する。
- `--git-dir`／`--git-dir=<path>`と`--work-tree`／`--work-tree=<path>`を含むcommit／pushをDENYし、read-only operationを不必要にDENYしないことを確認する。
- `echo ok; git -C . reset --hard HEAD`等のshell chainingをDENYで確認する。
- Windows launcher契約は既存contract testを実行し、launcher本体は変更しない。

## 8. 変更しないもの / 対象外

- PR branch mismatchのstate manager、expected branchの永続管理、branch/worktree manager、独自Git wrapper。
- sandbox、approval、permission model、Codex wrapper、GitHub Ruleset／branch protectionの変更。
- `#63`の未merge変更、依存関係、framework、lockfile、既存のWindows transport実装。
- 実際の`git reset --hard`、`git clean -fd`、`git branch -D`、force push、protected branchへのpush、protected branch上のcommit。

## 9. リスク

- invocation列挙や評価の誤りが後続Git operationの見逃しにつながるため、複数invocation、同一subcommand、commandごとのcontext fixtureを固定する。
- 複数`-C`のpath解決を誤ると別repositoryのbranch contextを誤判定するため、出現順のA/B fixtureで最終effective repositoryを検証する。
- `--git-dir`／`--work-tree`を完全実装するとGit CLI parserへ拡張し過ぎるため、repository-changing optionを検出してcontext-sensitive mutationをfail-closeする最小実装に限定する。
- token解析が既存のshell chainingや引用符付き引数を壊す可能性があるため、既存boundaryを保ち、quoted pathとchainingをcontract testで固定する。

## 10. rollback plan

実装commitをrevert可能なcommitとして作成し、必要な場合は実装commitだけをrevertする。Run Artifactの完了記録はdocs-onlyの後続commitへ分離する。作業中は`main`の履歴変更、force push、reset、clean、branch削除を行わない。

## 11. 完了条件

- 1 command内の全Git invocationが独立列挙・独立contextで評価され、1件でもDENYならcommand全体がDENYになる。
- 同一subcommandの後続危険操作が見逃されず、safe push後のforce pushとsafe reset後の`reset --hard`がDENYになる。
- 複数`-C`が出現順に累積解決され、最終対象repositoryのprotected/default branch contextで判定される。
- `--git-dir`／`--work-tree`を使うcontext-sensitive mutationがfail-closeし、read-only operationをblanket denyしない。
- `git -C <path>` の有無で同一operationのDENY／ALLOW結果が一致する。
- `POLICY_MATRIX`のduplicate IDを含む全variantがcase単位で個別検証される。
- Issue #60のDENY／ALLOW、quoted path、shell chaining、Windows launcher契約がcontract testで確認できる。
- 指定されたfocused contract、全contracts、format、lint、typecheck、統一verifyを実行し、結果を記録する。
- 差分をself-reviewし、unrelated change、依存追加、#63変更混入がないことを確認する。
- 指定branchでcommit、明示refspec push、base `main`のOPEN日本語PR作成、PR作成後のbranch／diff／metadata最終確認を完了する。PRはmergeしない。

## 12. Open questions

- なし。Issue本文と既存repository contractで目的、scope、完了判定、検証方法が確定している。

## 13. 追加修正で確定する安全境界

### Git executableとinvocation単位

- Bash系の`git`とWindows／PowerShellの`git.exe`を同じGit executableとして扱う。arbitrary absolute pathのGit executableは対象外とする。
- 既存の`;`、`&&`、`||`、改行のshell boundary内にある全Git invocationを列挙する。GitContextはcommand単位ではなくGit invocation単位で評価し、同じsubcommandが複数ある場合も各invocationを独立評価する。
- 各invocationはsubcommand、shell quote除去済み`argumentTokens`、`changeDirectories`、`repositoryChanging`、`runtimeConfigChanging`、inline environment override、`parseError`を保持し、subcommand以降をraw stringだけで判定しない。
- `git push "--force" origin feature`、`git commit "--amend" -m test`、`git clean "-fd"`、`git branch "-D" old`、`git push origin "HEAD:main"`は、quoteなしの同じtokenと同じG1〜G10判定にする。

### Git global optionとrepository context

- 正式な`-C <path>`だけを扱い、複数`-C`は出現順にeffective cwdを更新する。各invocationは元のprocess cwdから開始し、後続の相対`-C`は直前のeffective cwdを基準に解決する。空pathはcwdを変更しない。
- `--git-dir`／`--work-tree`はrepository選択を変えるoptionとして、`-c`／`--config`／`--config-env`等の単なるsubcommand前optionと区別する。
- `--git-dir`／`--work-tree`の完全なsemanticsを再実装せず、context-sensitive mutationではG10相当でfail-closeする。read-only operationまでblanket denyしない。
- unsupportedなrepository-changing syntaxや、context／mutation targetを安全に決定できないsyntaxを曖昧なcontextでALLOWしない。

### argument tokenとruntime semantics

- G1〜G10の危険option、push destination、fetch refspec、update-ref target、worktree branchはargument token単位で評価する。single quote／double quote／空白を含むpathの既存契約を維持し、完全なshell／Git parserは作らない。
- `-c`、`--config`、`--config-env`のseparator／`=`形式をruntimeConfigChangingとして検出する。`alias.*`のinline alias、`remote.origin.push`、`push.default`、`--config-env`による注入を含むcontext-sensitive mutationはfail-closeする。safe read-only operationは維持する。
- inline `GIT_DIR`、`GIT_WORK_TREE`、`GIT_CONFIG_COUNT`、`GIT_CONFIG_KEY_*`、`GIT_CONFIG_VALUE_*`等を限定的に検出し、repository／push／mutation semanticsへ影響するmutationはfail-closeする。PowerShellの完全なstate trackingは実装しない。

### push policy

- destinationを静的に一意判定できる明示的な単一refspecだけをALLOW候補にする。`origin feature/safe`、`origin HEAD:feature/safe`、`-u origin HEAD:feature/safe`、`--set-upstream origin HEAD:feature/safe`を維持する。
- protected destination、force／force-with-lease、delete／mirror、`--all`／`--branches`、matching `:`, wildcard、複数refspec、remoteだけのimplicit push、URL／filesystem pathだけを指定したpush、runtime configでdestinationが変わるpushはDENYまたはfail-closeする。
- 最初のposition argumentをremote名でない場合にrefspecと誤認しない。remote名、URL、filesystem pathのいずれであってもrepository positionとして扱い、refspecがない場合は安全判定不能としてDENYする。

### protected local ref mutation

- `git fetch origin`と`git fetch origin feature/safe`はALLOWするが、`main:main`、`main:refs/heads/main`、`+main:refs/heads/main`、protected headsを含み得るwildcard destinationはDENYする。remote-tracking refはlocal protected branchと混同しない。
- `git update-ref`の`refs/heads/main`、`refs/heads/master`、`origin/HEAD`由来default branch、protected `HEAD`の更新・削除をDENYする。targetを安全に解析できないsyntaxはfail-closeし、feature refは必要以上に禁止しない。
- `git worktree add -B <protected>`とtargetを安全に特定できないforce相当のprotected branch resetをDENYする。`git worktree list`とfeature branchの通常`worktree add`はALLOWする。

### 実装順、テスト、非目標

1. `parseGitInvocation()`をargument token、runtime option、repository option、environment情報を返す共通解析へ拡張する。
2. `evaluateCommand()`で全invocationを出現順に独立評価し、1件でもDENYならcommand全体をDENYした後、元commandへN1〜N4を適用する。
3. push、fetch、update-ref、worktreeのmutation targetを既存G1〜G10相当のdecisionへ接続する。
4. POLICY_MATRIXはduplicate IDをMap keyにせず、配列indexで全caseを1対1比較する。通常形式、`git -C` variant、代表的な`git.exe` variantを個別検証する。
5. 危険Git commandは実行せず、Hook／`evaluateCommand()`へ文字列を渡して判定だけを確認する。Windows launcherはtransportのまま変更しない。
6. 完全なshell parser、完全なGit CLI parser、alias expansion engine、Git config resolver、PowerShell AST、`command git`／`env git`、`bash -lc`／`sh -c`、command substitution、arbitrary executable path、`.git/refs/**`直接書換え、wrapper、branch／worktree manager、expected PR branch state managerは対象外とする。必要なら別Issue候補として記録するが、今回実装・Issue作成は行わない。

## 14. 最終hardening batchの安全境界

### shell execution state

- PreToolUse Hookはshell command実行前に評価するため、同一commandの前半でbranch、cwd、repository、environmentを変更すると、後半Git invocationの実行contextとHook評価contextが一致しない可能性がある。
- `git switch`、branch switching formの`git checkout`、`cd`、`chdir`、`pushd`、`Set-Location`、`sl`、およびGit repository／environmentを変更する前半operationの後にcontext-sensitive Git mutationが続くcompound commandは、branch／cwd／environmentをsimulationせずfail-closeする。
- `git switch main`、`git checkout main`、cwd変更単独、cwd変更後のread-only Git commandは、既存契約を維持して必要以上にDENYしない。
- `git config`のstate-changing formはpersistentに後続Git semanticsを変更できるためDENYし、read-only modeだけをALLOWする。

### invocation、token、shell normalization

- Git executableはBash系の`git`とWindows／PowerShellの`git.exe`を同一invocationとして扱う。arbitrary absolute path、`command git`、`env git`、wrapper経由は対象外とする。
- Git invocationはshell boundary（`;`、`&&`、`||`、改行）内で列挙し、各invocationをsubcommand、quote除去済みargument token、effective repository context、mutation targetの単位で独立評価する。1件でもDENYならcommand全体をDENYする。
- subcommand後をraw stringで判定せず、single／double quoteを除去したtokenをG1〜G10とmutation target解析へ渡す。既存のquoted path／space-containing path契約を維持する。
- Bash系の`\\` + `\\n`／`\\r\\n` line continuationをGit invocation抽出前に安全にnormalizeし、single quote内の内容は変更しない。unquoted option token内の限定的なbackslash escape（`-f\\d`、`-\\D`、`--\\amend`）はGit argvと同じtokenへ正規化する。Windows pathのbackslashを一律削除せず、曖昧なmutationはparse errorとしてfail-closeする。

### mutation target resolution

- `update-ref -m <reason> <ref> ...`では`-m`の値を消費してからref targetを取得する。`--stdin`、未知option、missing value、target不明はfail-closeする。
- `fetch`／`pull`のrefspec解析は共有helperで行い、`--refmap=<refspec>`、`--refmap <refspec>`、`--stdin`を検出したらlocal ref targetを静的に判定できないためfail-closeする。protected local branch destination、force refspec、wildcard destinationはDENYする。通常の`fetch origin`とfeature-onlyの安全な形式は維持する。
- `pull <repository> <refspec...>`にもfetch-side protected local ref guardを適用し、feature contextからの`main:refs/heads/main`、`+main:refs/heads/main`、protected wildcardをDENYする。protected current branch上の通常pullは既存G10を維持する。
- `branch -d`／`--delete`、`branch -m`／`--move`のprotected source／destination、source省略時のprotected current branchをDENYする。feature branchのdelete／renameは、targetを安全に判定でき、既存force ruleに該当しない場合はALLOWする。`-D`、`-M`、`-C`等の既存G9は維持する。
- pushはexplicit safe destinationだけをALLOWし、implicit／bulk／matching／wildcard／複数refspec／URL-only／path-onlyをfail-closeする既存契約を維持する。
- operation単体で危険性が確定するG1〜G9等のdenyはbranch context未解決でも先に返す。通常の`fetch origin`やlocal branch destinationを持たないsafe fetchはbranch contextに依存せずALLOWし、それ以外のcontext-sensitive mutationはbranch context未解決時にG10でfail-closeする。
- context未解決によるG10は即時returnせず保留し、後続invocationを独立評価する。後続に具体的なdenyがあればそのdecisionを返し、全invocationに具体的denyがない場合だけ保留したG10を返す。

### implementation、tests、rollback

1. 既存parser／evaluatorを小さく拡張し、compound context transition guard、共有fetch/pull解析、update-ref option消費、state-changing config判定、protected branch delete／rename判定を追加する。
2. regression testでbranch transition、cwd transition、persistent environment、update-ref、fetch／pull、config、line continuation、backslash escape、branch delete／rename、既存ALLOW／DENYをHook判定だけで固定する。危険Git mutationは実行しない。
3. focused contract、全contracts、format、markdown lint、lint、typecheck、verify、diff check、Run Artifact sanitizer、Windows launcher contractを実行する。実行していない結果をPASSと記録しない。
4. self-reviewでrepository／branch／mutation targetの静的評価境界、safe feature operationの過剰DENY、parser肥大化、unrelated変更、依存追加、Windows launcher変更を確認する。
5. rollbackは今回の追加commit単位のrevertを使用し、rebase、amend、force push、reset、clean、branch削除、mainへの反映は行わない。

今回の対象外は、完全なshell／Git parser、Bash／PowerShell AST、Git alias expansion、full Git config resolver、特殊Git plumbingの網羅、`command git`／`env git`、wrapper／arbitrary executable path、command substitution、`.git/refs/**`直接書換え、branch／worktree manager、PR expected branch state managerである。

## 15. 最終source差分で追加するshell token境界

### Git executable、subcommand、protected ref

- Git safety判定に使用するGit executable、Git subcommand、Git option、branch／ref／refspec tokenは、Hookのraw文字列ではなく、通常のshell実行時にGitへ渡る実質的なtoken値を基準にする。
- Git executable候補は、既存のshell boundary内で`git`または`git.exe`になる代表的なdouble quote、single quote、unquoted backslash escapeを限定的に認識する。`$GIT`、command substitution、`command git`、`env git`、shell function、alias、arbitrary absolute executable pathは対象外とする。
- subcommandとsecurity-sensitive argumentは既存tokenizerのquote removalと限定的なunquoted backslash escape後の値で比較する。`git co\\mmit`、`git pu\\sh`、`git reb\\ase`、`git cl\\ean`、`m\\ain`を通常tokenと同じpolicyへ接続する。
- 全backslashを一律削除しない。Windows path等のfilesystem tokenは既存挙動を維持し、安全に一意化できないmutation tokenはfail-closeする。

### branch transition

- `git switch -`と`git checkout -`は直前branchへの移動であり、branch-changing invocationとして扱う。
- `switch -`／`checkout -`単体はbranch movementとしてALLOWを維持するが、同一shell command内で後続にcontext-sensitive Git mutationがある場合は、branch stateをsimulationせずcommand全体をG10でfail-closeする。
- `git checkout -- <path>`はbranch transitionに含めず、既存のcheckout mutation判定を維持する。

### PowerShell location transition

- `Push-Location`と`Pop-Location`を、`cd`、`chdir`、`pushd`、`Set-Location`、`sl`と同じcwd-changing shell operation familyとして扱う。
- location変更後にcontext-sensitive Git mutationが続くcompound commandは、戻り先や実行時repositoryをsimulationせずG10でfail-closeする。
- location変更後のread-only Git commandとlocation変更単独は、既存のALLOW semanticsを維持する。

### 実装と検証

1. 既存のnormalize → tokenize → Git invocation parse → operation evaluationの流れを拡張し、専用のshell parser、Git parser、AST、state machineを追加しない。
2. `isBranchChangingInvocation()`へ単独`-`を追加し、cwd-changing operationのmatcherへ`Push-Location`／`Pop-Location`を追加する。
3. contract testへexecutable、escaped subcommand、escaped protected ref、`switch -`／`checkout -` compound、Push／Pop-Locationのdeny／allowを実際のassertとして追加する。
4. focused contract、全contracts、format、markdown lint、lint、typecheck、verify、diff check、Run Artifact sanitizer、Windows launcher contractを実行し、test件数は実測値を記録する。

今回のsource差分でも、完全なshell／Git parser、Bash／PowerShell AST、特殊Git plumbing網羅、wrapper、arbitrary executable path、command substitution、`.git/refs/**`直接書換え、branch／worktree manager、PR expected branch state managerは対象外とする。
