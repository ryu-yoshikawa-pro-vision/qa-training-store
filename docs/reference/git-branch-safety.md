# Gitブランチの安全性

## 目的

Gitの変更操作（mutation）が許可されている作業であっても、Codexが作業対象のブランチから外れた状態でコミットやプッシュを実行しないための運用ルールを定める。特に、PRブランチでの作業中にローカルブランチのアップストリーム（upstream）が誤ってorigin/mainに設定されている場合や、意図せずmainブランチへ切り替えてしまった（switchした）場合に、コミット履歴を失わずに安全に復旧できるようにすることを目的とする。

この文書は、特定のPR番号やコミットSHA、依存関係の修正内容には依存しない。リポジトリでの通常のGit作業全般、およびブランチの不一致（branch mismatch）が発生した際の影響範囲を限定した復旧（bounded recovery）に適用する。

## Hookによる操作rootの固定

PreToolUse HookはHookプロセスのcheckout rootを基準に操作対象を判定し、payloadの`cwd`には依存しない。context-sensitiveなGit mutationは、Hook所有checkoutのcanonical rootへの明示的な移動の直後にbare `git`（Windows互換経路ではbare `git.exe`）を実行する形式だけを許可候補とする。Gitの状態変更1回ごとにroot anchor付きの独立したcommandとして実行し、前後に別commandを連結しない。

- POSIX: `cd -- "<absolute-checkout-root>" && git <subcommand> ...`
- PowerShell: `Set-Location -LiteralPath "<absolute-checkout-root>" -ErrorAction Stop; git <subcommand> ...`
- 状態変更に対するG10はHook所有checkoutのcanonical root anchorを要求する。root不一致、相対path・変数展開を使うanchor、移動の間に別commandを挟む形式に加え、context-sensitive mutationで`git -C`（複数指定を含む）、`--git-dir`、`--work-tree`、repository、ref、index、object、repository discoveryまたはruntime configに影響し得る`GIT_*`環境変数、および分類できない`GIT_*`環境変数を使う形式を拒否する。共通のauthor／committer identity・date変数などは`GIT_` prefixだけを理由に拒否しないが、`GIT_TRACE`、`GIT_TRACE2`、`GIT_TRACE_<category>`を含むtrace変数はpathを値に取ってファイルへ書き込めるためcontext-sensitive mutationでは拒否する。`GIT_OPTIONAL_LOCKS`、`GIT_PAGER`、`GIT_PAGER_IN_USE`、`GIT_TERMINAL_PROMPT`は引き続きこの判定の対象外。`GIT_CURL_VERBOSE`は安全な継承環境例外ではなく、context-sensitive mutationで設定されている場合（継承環境を含む）はG10で拒否する。`GIT_EDITOR`と`GIT_SEQUENCE_EDITOR`はmutation中にchild programを選択できるため拒否する。`-C`先をmutationの保護branch contextとしては解決しない。read-only操作はroot anchorを要求せず、`git -C`を含むread-only invocationも通常の判定対象となる。`<absolute-checkout-root>`は実際のcanonical absolute pathへ置き換える。
- G10はcommand textから直接識別できるGit invocationと、その判定に必要なroot／branch／ref／push contextを限定的に評価する。対応するwrapperやshell clause内でGit invocationを直接識別した場合、その検出はG1〜G10の拒否判定に使えるが、wrapper内のcontext-sensitive mutationを許可しない。単純な括弧groupの先頭に直接見える`git` invocationがcontext-sensitive mutationなら、G10で拒否する。許可候補となるmutationは、上記のcanonical root anchor直後にあるbare `git`（Windows互換経路ではbare `git.exe`）に限る。G10は完全なshell interpreterや任意scriptのparserではなく、任意のshell/script内部やchild processのGit操作を網羅的に検査しない。
- repository／branch／ref contextに依存するGit mutationでは、executable tokenをbare `git`（PATH-selected `git`）またはWindows互換経路でのbare `git.exe`（PATH-selected `git.exe`）とする。path-qualified Git mutationはG10で拒否し、path-qualified read-only Git invocationは許可する。これはHookのcontext lookupと実行commandのGit lookupをcanonical bare executable／execpolicy prefix contractに揃える形式要件であり、PATH内容の固定・検証やGit executableの真正性を保証しない。
- `bash scripts/verify`、`bash scripts/new-run.sh`、`bash scripts/collect-run-artifacts.sh`などの標準script entrypointは、script内部がopaqueであることだけを理由にG10で拒否しない。起動commandが許可されても、内包Git操作をG10が個別に評価したことを意味しない。script path／digest allowlist、PATH全体の固定・検証、専用launcher、汎用shell parserは採用しない。Hook等で拒否されたGit mutationをAPIや別経路で実行する許可にもならない。
- OpenCodeの`guarded_git`は、共通`evaluateCommand()`によるcontext判定と実行の両方で同じPATH-selected `git`を使い、Plugin checkout rootをcwdに固定してargv arrayで実行する。これはGitのlookupを揃える契約であり、PATH全体の完全性や実行ファイルの真正性を検証・固定するものではない。詳細は[OpenCode V2の安全性チェック](opencode-v2-safety.md)を参照する。
- read-only操作はroot固定を要求しない。保護branchから非保護branchへの通常の`switch`／`checkout`は既存契約を維持する。
- branch/ref-sensitive mutationでは、current branchとHEADに加え、remote contextの取得結果を区別する。成功した`git remote`一覧の結果が0件なら、`main`／`master`のfallback保護とcurrent branchに基づいてローカルcontextを解決する。一覧取得自体に失敗した場合はcontext未解決としてG10で拒否する。remoteが設定されている場合、ローカルbranch/ref-sensitive mutationでは**すべてのconfigured remote**について`refs/remotes/<remote>/HEAD`が有効なcommitを指すことを確認する。1つでも未解決またはdanglingなら部分的な解決で済ませずG10で拒否する。pushでは`main`／`master`のfallback保護と、選択した宛先remote自身のdefault HEADだけを確認する。他remoteのdefault HEADが未解決でも、それだけを理由にpushを拒否しない。宛先remote自身のdefault HEADが未解決またはdanglingならG10で拒否する。これらはローカルtracking refに基づく判定で、サーバー側のdefault branch、branch protection設定や最新remote状態を証明しない。直接識別した`branch <name>`、`switch -c`／`--create`／`--orphan`、`checkout -b`／`--branch`／`--orphan`、`worktree add -b`／`--branch`による保護local branch作成もG10で拒否する。保護local refを対象にする`update-ref`とdynamic `update-ref` targetも拒否し、shell上の値は展開して判定しない。
- `git branch`、`git branch -v`／`-vv`、`git branch --show-current`、明示的な`git branch --list`による一覧表示はread-onlyで、root anchorを要求しない。`-v`／`-vv`だけを根拠にread-onlyと判定せず、同じ呼び出しにbranch作成その他のmutation targetがあれば変更操作として扱う。オプション値をbranch targetと混同せず、`--`以降をオプションとして解釈しない。branch作成・rename・deleteの保護判定は上記のG10規則に従う。
- `git worktree list`はread-only操作として許可する。`git worktree add`は既存のG10 root-anchor／branch-target判定に従い、それらの条件を満たす非保護branchへのaddは許可する一方、保護local branchの作成など禁止対象を拒否する。直接識別できる`git worktree remove`／`rm`と実際にworktree recordを削除する`git worktree prune`はG9で拒否する。`git worktree prune --dry-run`と`git worktree prune -n`はread-only操作として許可する。`--expire`の値や`--`以降のoperandをdry-run flagと誤認しない。
- 直接識別できる通常pushは、構成済みremoteへの単一で明示的な非保護refだけが候補となる。protected refへのpushとdynamic refspec（例: `HEAD:$target`、`$REFSPEC`）はG10で拒否する。`--follow-tags`、`push.followTags`、再帰submodule push、mirror設定等の追加更新があり得る場合や、安全な判定に必要なGit設定を読めない場合も拒否する。

この共通policyはCodexのBash PreToolUse HookとOpenCode V2 Pluginから利用されるが、任意の外部プロセスやすべてのMCP操作を保護するものではない。G10、Codex sandbox、execpolicy、実効approval設定、OS/ACL権限、Git metadataのlock、OpenCode tool permissions、GitHub側の認可は別々の境界であり、一つの判定結果から他の実効状態は分からない。Hookが許可しても他の制御を上書きしない。実行経路別の検証範囲はRun Artifactと報告に記録する。

## 拒否・失敗の分類と経路境界

Gitの状態変更が拒否または失敗したら、同じ変更を別経路で再実行せず、まず最初のエラーを次のように分類する。エラー表示やread-onlyの状態確認は行ってよい。

| 分類 | 代表例 | 対応 |
| --- | --- | --- |
| 共通HookのG1〜G9 | hard reset、rebase、amend、clean、force/delete push、危険なbranch/tag操作 | 拒否を維持し、代替transportを使わない。必要ならユーザーhandoff。 |
| G10 | 直接識別されたmutationでroot anchorやbranch/remote/destination/config contextを安全に特定できない | mutationを拒否する。read-onlyでroot・branch・configured remote・statusと各remoteのdefault refを調査し、条件が解決しないまま同じ変更を再試行しない。 |
| execpolicy | 実行前のpolicy deny/prompt | G10とは別の拒否。許可された実行経路・承認がない限り停止する。 |
| Codex sandbox | `.git`などの保護metadataへの書込み、許可workspace外へのアクセス | Hook判定とは独立。sandbox設定や他APIを迂回路として使わない。 |
| Git metadata | ref、index、config、worktree管理情報の更新拒否 | 拒否元がHook / sandbox / OSのどれかを特定する。`.git`を直接編集せず、同じ更新を別経路へ移さない。 |
| OS/ACL権限 | read-only file、owner/ACL、ディスク・filesystem権限 | 権限昇格やACL変更で回避しない。ユーザーまたは管理者へhandoffする。 |
| Git lock | `.git/index.lock`等の排他lock | Git writerの稼働状況を確認し、lockを削除・上書きしない。安全確認は下記参照。 |
| 認証・ネットワーク | credential拒否、DNS/TLS/接続失敗 | credentialを表示・転送せず、接続または認証の担当者へhandoffする。別API/transportへ切り替えない。 |
| non-fast-forward | remote refがlocalより進んでいる | pushを止め、通常Git CLIのroot-anchored fetchでremote-tracking ref / `FETCH_HEAD`を更新して状態を確認する。履歴の統合判断はユーザーへ戻す。 |

branch/ref-sensitive mutationの安全性判断に必要なcurrent branch、HEAD、またはdefault branch contextが解決できない場合は、G10でfail-closedする。default branchが不明なときは推測せず、次のread-only情報を確認して復旧判断の証拠にする。

- `git remote` の結果と、各configured remoteについての`git symbolic-ref --quiet refs/remotes/<remote>/HEAD`の結果（未設定・解決不能も記録する）。pushを評価する場合は、対象remote自身の結果を確認する。
- `git branch --show-current` と `git branch -vv` の結果。
- `git status --short` の結果。

必要なcontextが引き続き不明ならmutationを停止し、取得した証拠と未解決点を報告する。このfail-closedはread-only操作を一律拒否するものではなく、Hook所有checkoutのcanonical rootをanchorし、明示refspecや保護local refの更新を伴わない通常の `git fetch origin` は引き続き利用できる。

Hookまたはsandbox等で拒否されたGit mutationと同等の結果を、REST/GraphQL、GitHub MCP、`gh api`、Git database/API、Git library、`.git`の直接編集、別script、別agentで実現してはならない。GitHubのread-only APIによるPR/branch/commit状態の参照は許可される。ユーザーが明示的に許可したPR/Issue本文、label、reviewer等の管理操作もGit commit/object/refを変更しないmetadata操作として区別し、通常の認可条件に従って実行できる。このmetadata操作の許可をGit ref/commit更新の許可へ拡張しない。

## 保護ブランチ・デフォルトブランチの方針

- main、master、およびリポジトリのデフォルトブランチに対して、Codexが直接コミットやプッシュを行わない。
- ユーザーから「コミットして」「プッシュして」という指示があった場合でも、それだけでデフォルトブランチへの直接反映を許可されたとは解釈しない。
- デフォルトブランチへ直接反映する必要がある場合は、ユーザーに対象ブランチを明示してもらった上で、作業目的、影響範囲、および現在のリモート状態を確認する。
- 作業対象としてPR、Issue、featureブランチ、fixブランチが存在する場合は、PRのheadRefNameまたはユーザーが指定したブランチを作業対象とする。
- ブランチの安全性確認（branch safety check）を行わずに、リモートのmainへのプッシュ、リモート履歴の書き換え（history rewrite）、および強制プッシュ（force push）は行わない。

## PR作業開始時の確認

Gitの変更操作を伴うタスクでは、ファイルの変更・コミット・プッシュを行う前に以下を確認する。

    git status --short
    git branch --show-current
    git branch -vv
    git log -15 --oneline --decorate --graph
    git remote -v

状態を変更するfetchは別commandとして、checkout rootをanchorして実行する。

    cd -- "<absolute-checkout-root>" && git fetch origin

PR対応ではGitHubの状態を取得する。

    gh pr view <PR_NUMBER> \
      --repo <OWNER>/<REPOSITORY> \
      --json number,state,isDraft,headRefName,headRefOid,baseRefName,url

以下の条件をすべて満たさない限り、変更操作を開始しない。

- PRが対象リポジトリおよび対象のベースブランチ（base）に存在する。
- headRefNameが、ユーザーの指定または作業計画で定めたブランチと一致している。
- `git branch --show-current` の出力が headRefName と一致している。
- `git branch -vv` で表示されるアップストリームが、意図したリモートブランチを指している。少なくとも、PR作業用ブランチのアップストリームとして origin/main が設定されたままになっていないこと。
- ワーキングツリー（working tree）内の既存の変更内容が把握されており、今回の変更と混同されていない。

必要に応じて、ローカル設定のみでアップストリームを変更する。

    cd -- "<absolute-checkout-root>" && git branch --set-upstream-to=origin/feat/example feat/example

この設定変更によってリモートの履歴が変更されることはない。以降のプッシュも明示的なrefspecを用いて行い、アップストリームの表示だけに依存しないようにする。

## コミット前チェック

`git commit` の直前に、確認済みの期待されるブランチと現在のブランチが一致していることを再確認する。

    git status --short
    git branch --show-current
    git branch -vv
    git diff --check
    git diff --cached --stat

- 現在のブランチ（current branch）が期待されるブランチと異なる場合はコミットしない。
- 辻褄を合わせるためにmainブランチへ自動で切り替える（switchする）ような対応は行わない。
- 期待されるブランチが不明な場合はコミットを中断し、PRの headRefName、ユーザーの指定、作業計画（run plan）を確認する。
- ステージング対象は個別に明示し、`git add .` は使用しない。
- コミット前に、mainブランチ固有の変更、タスクと無関係な依存関係（unrelated dependency）、ソースコード、テスト、ワークフロー、および意図しないファイルの削除がステージングされていないことを確認する。

## 標準のstage / commit例

現在のbranchが意図した非保護branchであることと、add前の対象ファイルを確認する。pathは個別に明示し、`main` / `master` / default branchにはcommitしない。add後にstaged diffを確認してからcommitし、addとcommitはそれぞれ別のcommandとして実行する。pathやcommit messageにcredentials・secretを含めない。以下はREADMEの通常CLI例に合わせた形式である。

POSIX:

    cd -- "<absolute-checkout-root>" && git add -- "README.md"

    cd -- "<absolute-checkout-root>" && git commit -m "docs: READMEの説明を更新"

PowerShell:

    Set-Location -LiteralPath "<absolute-checkout-root>" -ErrorAction Stop; git add -- "README.md"

    Set-Location -LiteralPath "<absolute-checkout-root>" -ErrorAction Stop; git commit -m "docs: READMEの説明を更新"

`<absolute-checkout-root>`はHookが所有するcheckoutのcanonical absolute pathに置き換える。`README.md`は実際に承認された個別path、commit messageは変更内容に置き換える。

## プッシュ前チェック

`git push` の直前に最新の状態を確認する。fetchはroot anchor付きの独立commandとして実行する。

    cd -- "<absolute-checkout-root>" && git fetch origin
    git status --short
    git branch --show-current
    git branch -vv
    gh pr view <PR_NUMBER> \
      --repo <OWNER>/<REPOSITORY> \
      --json headRefName,headRefOid,state

PR作業では、以下の条件がすべて必須である。

- 現在のブランチ == PRの headRefName
- プッシュ対象がPRブランチであること
- PRがオープン（OPEN）状態であり、マージ済みや別のベースブランチへの変更ではないこと
- リモートのmainに、今回の誤ったブランチでのコミットが含まれていないこと
- ワーキングツリーが、意図したコミット後の状態になっていること

プッシュはブランチ名を省略した形式（bare形式）ではなく、対象ブランチをrefspecで明示して実行する。

    cd -- "<absolute-checkout-root>" && git push origin HEAD:refs/heads/feat/example

`<absolute-checkout-root>`は実際のHook所有rootに置き換え、`feat/example`は確認済みの非保護branch名に置き換える。pushには単一の明示refspecを必ず含める。upstream省略形やremoteだけのpushは使わない。ノンファストフォワード（non-fast-forward）になった場合も強制pushは行わず、anchor付きfetchで履歴とremote更新を確認する。

## アップストリームの確認

`git branch -vv` で表示されるアップストリームは、プッシュ先が意図通りかを確認するための重要な情報である。PRブランチが `[origin/main: ahead N]` と表示されている場合は、安全な状態ではない。以下のコマンドを実行し、意図したPRのリモートブランチへ修正する。

    cd -- "<absolute-checkout-root>" && git branch --set-upstream-to=origin/feat/example feat/example
    git branch -vv

アップストリームを修正した後も、`cd -- "<absolute-checkout-root>" && git push origin HEAD:refs/heads/feat/example`のようにroot anchorと単一refspecを明示してプッシュする。

## ブランチ不一致時の停止条件

期待されるブランチと現在のブランチが異なる状態で、変更またはコミットが存在する場合は、以下の順序を厳守する。

1. コミット、プッシュ、reset、rebase、ブランチの削除、force操作を直ちに停止する。
2. ワーキングツリーを変更せず、現在のHEAD、status、ブランチ名、リモート情報を記録する。
3. 現在のHEADを指すレスキューブランチ（rescue branch）を作成し、対象のコミットを参照可能な状態にして保護する。
4. anchor付きfetchを実行した後、GitHub read-only APIまたは`git rev-parse origin/main`でリモートのmainの状態を確認する。
5. 誤ったコミットがリモートのmainに含まれてしまっていないかを確認する。含まれている場合は自動修復を試みず、履歴を書き換えないままユーザーへ報告する。
6. 正しいPRのリモートブランチとレスキューブランチの祖先関係（ancestry）を確認する。
7. ファストフォワード（fast-forward）が可能であれば「Case 1」へ、そうでなければ対象コミットのみを古い順に移す「Case 2」へ進む。

リモートのmainに誤ったコミットが含まれている場合は、この文書で扱う自動復旧の対象外である。リモートのmainに対してforce push、revert、ブランチ削除などを自動で実行せず、コミットSHA、影響範囲、確認したリモートの状態を報告し、ユーザーの判断を待つ。

## 誤ったブランチでコミットした場合の復旧手順

Case 1 / Case 2は、未commit差分とuntracked fileを先に保全し、切替先のworking treeが安全に切替可能な場合だけ適用する。未保全の変更があればcheckoutを切り替えず、「checkout / worktree移行」手順へ進む。

### レスキューブランチ（rescue branch）の作成手順

現在のHEADを最優先で保護する。ブランチ名は作業内容が識別できる一時的な名称にする。

    cd -- "<absolute-checkout-root>" && git branch rescue/task-recovery HEAD
    git log -7 --oneline --decorate rescue/task-recovery

以下が確認できるまで、reset、rebase、ブランチ削除、force pushは一切行わない。

- レスキューブランチが正常に作成されていること。
- 誤ったブランチで作成された対象コミットが、レスキューブランチから参照できること。
- コミットの親コミット（parent）、コミットメッセージ、変更ファイルの内容を確認できること。

### Case 1: 正しいブランチでのファストフォワード継続

正しいPRブランチがレスキューブランチの祖先（ancestor）である場合、履歴は以下の構造になる。

    expected PR branch -> accidental commits -> rescue HEAD

正しいブランチへ移動し、`--ff-only` オプションのみを用いて統合する。

    cd -- "<absolute-checkout-root>" && git switch feat/example
    git status --short
    git branch --show-current

branch切替後にstatusとbranchを確認する。以下のmerge例は、実効runtimeに利用可能なapproval routeがあり、mergeへの個別承認が確認できた場合だけ使う。project configは `approval_policy = "on-request"` だが、CLI optionやmanaged policy等で実効設定が異なる場合があるため確認する。`on-request`は承認要求経路であり、`.git`書込みを許可する証明ではない。実効policyが `never` なら通常の承認要求は出ず、sandbox / OS等が拒否する場合は状態を保全してhandoffする。

    cd -- "<absolute-checkout-root>" && git merge --ff-only rescue/task-recovery

すでに同一のSHAを指している場合は `Already up to date` となり、追加のマージコミットの作成や cherry-pick は不要である。

### Case 2: 異なるベースからコミットしてしまった場合

正しいPRブランチがレスキューブランチの祖先でない場合、レスキューブランチ全体をPRブランチとしてプッシュしてはならない。まず対象となるコミットを古い順に特定し、正しいブランチへ移動してから必要なコミット（例: 該当する5つのコミットなど）のみを cherry-pick する。

    git log --reverse --format="%H %s" <base>..rescue/task-recovery
    cd -- "<absolute-checkout-root>" && git switch feat/example
    git status --short
    git branch --show-current

対象SHAを確認後、cherry-pickはroot anchor付きの独立commandとして実行する。

    cd -- "<absolute-checkout-root>" && git cherry-pick <SHA1> <SHA2> <SHA3> <SHA4> <SHA5>

コンフリクト（conflict）が発生した場合は、対象コミットの内容と既存PRの差分を比較する。本来の意図を保持した最小限の解決が安全に行えない場合は、追加操作を停止し、状態を保持してユーザーの判断を仰ぐ。force pushや既存PRの履歴削除によって強引に解決してはならない。

## リモートのmainへプッシュしていない場合の復旧

- リモートのmainに誤ったコミットが含まれていないことを、コミットSHAと祖先関係（ancestry）から確認する。
- リモートのmainに対しては一切の修正操作を行わない。force push、revert、ブランチの履歴書き換えなどは行わない。
- 正しいPRブランチへの履歴のみを確認し、必要な場合のみ明示的なrefspecを用いてプッシュする。
- レスキューブランチは、ユーザーが復旧結果を確認・承認するまで削除しない。

## リモートのmainへプッシュ済みの場合

- 自動での修復は行わない。
- リモートのmainに対する履歴の書き換え（history rewrite）、force push、ブランチの削除は行わない。
- 誤ってプッシュしたコミットのSHA、プッシュ時刻、変更されたファイル、影響範囲、およびGitHub上のPRやブランチの状態を記録する。
- 状況を直ちにユーザーへ報告し、リモートmainの修復方法について明確な判断・指示を仰ぐ。

## checkout / worktree移行時の差分・commit保全

root不一致やcheckout移行が必要な場合、既存checkoutを切り替え・上書きして調整しない。まずread-only情報を取り、未commitの変更とcommitを別々に保護する。

    git status --short --untracked-files=all
    git branch --show-current
    git rev-parse HEAD
    git diff --stat
    git diff --cached --stat
    git worktree list --porcelain

未commit差分を移す必要があり、ユーザーがその移行を依頼している場合は、Git管理外の安全な保管先へstaged / unstaged patchを個別に保存し、untracked pathを列挙して内容を別途保全する。patch作成の例:

    git diff --cached --binary > "<safe-backup>/staged.patch"
    git diff --binary > "<safe-backup>/unstaged.patch"
    git ls-files --others --exclude-standard

既存commitは元のbranchを保持し、さらに現在のHEADを指すrescue refをroot anchor付きで作成する。元checkoutやrescue refは検証完了まで保持する。

    cd -- "<absolute-source-checkout-root>" && git branch rescue/task-recovery HEAD

期待するbranchが他worktreeで使用中でないことを確認してから、別のpathにworktreeを作る。branchがsource worktree自身ですでにcheckoutされている場合は重複追加せず、そのworktreeを保全して使用する。既存branchがない場合は、確認済みの開始点から非保護branchを作成する。

    cd -- "<absolute-source-checkout-root>" && git worktree add "<absolute-new-worktree>" feat/example

branchも同時に作成する場合は、明示した開始点を使う。

    cd -- "<absolute-source-checkout-root>" && git worktree add -b feat/example "<absolute-new-worktree>" "<verified-start-point>"

sandboxまたはOS権限が移行先pathを拒否したら停止してhandoffする。

worktree作成後、source sessionはtargetの内容をread-onlyで検証する。canonical target root、branch、HEAD、status、開始点との履歴関係、およびworktree一覧を確認する。検証例:

    cd -- "<absolute-new-worktree>" && git rev-parse --show-toplevel
    cd -- "<absolute-new-worktree>" && git branch --show-current
    cd -- "<absolute-new-worktree>" && git rev-parse HEAD
    cd -- "<absolute-new-worktree>" && git status --short --untracked-files=all
    git worktree list --porcelain

target rootが期待したcanonical pathで、branch / HEAD / statusが保全した開始点と一致することを確認したら、target rootを作業rootとする新しいCodexまたはOpenCode sessionを開始する。source sessionが行うGit状態変更は、source rootをanchorした`git worktree add`によるtargetの初期作成までとし、作成後のtarget worktree内のファイル、index、refは変更しない。source sessionはtargetに対してpatch適用、untracked file複製、checkout / switch、cherry-pick、add、commit等を実行せず、scriptや別API経由でも変更しない。初期作成後のtargetへの変更と以降のGit mutationは新sessionだけに任せる。

新sessionでは、最初に作業rootとHookの所有rootがtarget rootであること、branch、HEAD、status、rescue refをread-onlyで再確認する。以降の各Git mutationはtarget rootをanchorした独立commandとして実行する。staged / unstaged patchはtarget sessionから個別に適用し、untracked fileも同sessionから同じ相対pathへ個別に複製して既存ファイルを上書きしない。移行先でHookを使う場合、anchorは移行先Pluginが所有するcheckout rootに合わせる。

    cd -- "<absolute-new-worktree>" && git apply --index "<safe-backup>/staged.patch"

    cd -- "<absolute-new-worktree>" && git apply "<safe-backup>/unstaged.patch"

既存commitを期待branchへ移す場合は、履歴と変更内容を比較して必要なSHAだけを古い順に選び、移行先で1つのroot-anchored commandとしてcherry-pickする。patch適用、branch切替、commit移行で競合・不一致が出たら、source checkoutを保持したまま止めてユーザーへhandoffする。`reset --hard`、force checkout、worktree強制追加で合わせてはならない。

新sessionでの移行後は、sourceとtargetのHEAD、rescue ref、staged / unstaged diff、untracked file一覧、対象commitとremote refを比較する。すべて確認できるまでsource checkout、backup patch、rescue refを残す。元worktreeのremoveやbackupの削除はこの手順に含めない。

新sessionでもsandboxが`.git`への書込みを拒否した場合、別worktreeへの移行を繰り返さない。拒否元と実効設定をread-onlyで確認し、そのruntimeが提供する公式のapproval経路を確認する。現在のproject configは `approval_policy = "on-request"` で、実効policyも `on-request` なら対象操作の承認要求経路を利用できる。ただし、CLI optionやmanaged policy等が実効設定を変える場合がある。実効policyが `never` なら通常の承認要求は出ず、auto-reviewにも審査対象の要求が渡らない。`on-request`は承認経路を提供するだけで、`.git`書込みが許可される保証ではない。

Codex CLIをone-shotで起動でき、runtime / managed policyが許す場合の公式候補は、対話承認を要求する`--ask-for-approval on-request`、または`workspace-write`と`on-request`のauto-reviewを使う`--approve-for-me`である。後者は前者や`--sandbox`と併用できない。いずれもこの環境で利用可能とは限らず、`.git`操作が許可される保証もないため、CLI version、起動時に受理されたoption、sessionの実効permission、実際の承認またはreview結果をruntimeで確認する。明示的に承認された操作だけを再開し、optionが使えない、承認要求が出ない、拒否される、またはsandbox / OSが引き続き拒否する場合は、差分・target worktree・rescue refを保持してユーザーhandoffにする。OpenCodeにはCodex CLI optionを適用せず、OpenCode側の公式runtime approval経路を別に確認する。

one-shot optionはこのsession起動時だけの候補であり、project設定を永続変更する権限ではない。`approval_policy`等の永続設定変更はrepository ownerの明示承認がない限り行わない。Codexのsandbox / approvalの説明は[公式agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security)、optionの仕様は[公式Codex CLI reference](https://learn.chatgpt.com/docs/cli/reference)を参照する。

## `.git/index.lock`等の安全対応

`index.lock`、`packed-refs.lock`などのlockが原因なら、Git writerが動作中でないことをread-onlyのprocess確認で調べる。Git操作を並行実行してlockを回避したり、lock fileを削除・rename・編集したりしない。processが見つからない場合も自動でstale lockと判断せず、path、存在時間、直前のGit command、確認したprocessを記録してユーザーまたはrepository ownerへhandoffする。lockが解消されても、元のbranch/root/diffを再確認してから通常のGit CLIで再開する。

## ユーザーhandoff

許可された通常Git CLIで解消できない拒否・失敗、`reset --hard`が必要に見える状態、remoteの履歴統合、権限・credential・lockの解消判断はユーザーへ戻す。handoffには次を含め、秘密値やcredentialは含めない。

- 最初に出た拒否・失敗の分類と要点（G10 / execpolicy / sandbox / OS権限 / lock / auth / network / non-fast-forward等）。
- canonical checkout root、branch、HEAD SHA、status、staged / unstaged diffの有無、untracked fileの有無。
- 対象remote / refとread-onlyで確認できた状態。credential、token、秘密を含むURLは伏せる。
- 実行できたread-only調査と、mutationが拒否・未完了であること。
- 次に必要な判断または環境変更の担当者。

ユーザーの返答までは同じmutationを別API、script、library、`.git`編集、別agentへ移さず、worktreeとcommitを保持する。

## 禁止操作

- force push variant（`--force` / `-f` / `--force-with-lease`）
- HookがG1で拒否する`git reset --hard`は復旧候補にしない。必要に見える場合は状態を保持してユーザーへhandoffする。
- 強制branch削除と強制clean
- リモートmainへのbare pushまたは暗黙的なプッシュ
- 誤ったブランチの全履歴をPRブランチとして無条件にプッシュすること
- PRをマージすることで復旧を完了扱いにすること

復旧にworking treeやindexの破棄が必要に見える場合も、reset等で同期させず、現在のHEAD・差分・indexを保持してユーザーへ判断を戻す。

## 完了確認

プッシュ後、以下を確認する。

    cd -- "<absolute-checkout-root>" && git fetch origin
    git branch --show-current
    git branch -vv
    git status --short
    git rev-parse HEAD
    git rev-parse origin/<expected-branch>
    git rev-parse origin/main
    gh pr view <PR_NUMBER> \
      --repo <OWNER>/<REPOSITORY> \
      --json headRefName,headRefOid,state,url

- 現在のブランチ（current branch）が期待されるブランチ（expected branch）であること。
- ローカルのHEADとリモートのPRブランチのコミットSHAが一致していること。
- PRの headRefName と現在のブランチ名が一致していること。
- リモートのmainのコミットSHAが意図せず変更されていないこと。
- レスキューブランチが保持されており、対象コミットを参照できる状態にあること。
- ワーキングツリーがクリーンであるか、未コミットの変更がある場合はそれが明示的に報告されていること。
- PRが意図せずマージ（merge）されていないこと。
