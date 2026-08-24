# Git Branch Safety

## 目的

Git mutationが許可された作業でも、Codexが作業対象branchを外れたままcommitやpushを実行しないための運用契約を定める。特に、PR branchの作業中にローカルbranchのupstreamがorigin/mainへ誤設定されている場合や、意図せずmainへswitchした場合に、履歴を失わず復旧できることを目的とする。

この文書は、PR番号、commit SHA、特定の依存修正に依存しない。リポジトリの通常のGit作業と、branch mismatchからのboundedな復旧に適用する。

## Protected/default branch policy

- main、master、repository default branchへCodexが直接commit/pushしない。
- ユーザーの「commitして」「pushして」という指示だけでは、default branchへの直接反映許可とは解釈しない。
- default branchへ直接反映する必要がある場合は、ユーザーが対象branchを明示したうえで、目的、影響、現在のremote状態を確認する。
- PR、Issue、feature、fix branchが作業対象として存在する場合、PRのheadRefNameまたはユーザー指定branchを作業対象とする。
- branch safety確認なしのremote mainへのpush、remote history rewrite、force pushは行わない。

## PR作業開始時の確認

Git mutationを伴うタスクでは、変更・commit・pushの前に次を確認する。

    git status --short
    git branch --show-current
    git branch -vv
    git log -15 --oneline --decorate --graph
    git remote -v
    git fetch origin

PR対応ではGitHubの状態を取得する。

    gh pr view <PR_NUMBER> \
      --repo <OWNER>/<REPOSITORY> \
      --json number,state,isDraft,headRefName,headRefOid,baseRefName,url

次を満たさなければmutationを開始しない。

- PRが対象repository・対象baseに存在する。
- headRefNameがユーザー指定または作業計画のbranchと一致する。
- git branch --show-currentがheadRefNameと一致する。
- git branch -vvのupstreamが意図したremote branchを指している。少なくともorigin/mainをPR作業branchのupstreamとして残さない。
- working treeの既存変更が把握され、今回の変更と混同されていない。

必要ならupstreamをローカル設定だけ変更する。

    git branch --set-upstream-to=origin/<expected-branch> <expected-branch>

この設定変更はremote履歴を変更しない。以後もpushは明示refspecで行い、upstream表示だけに依存しない。

## commit前チェック

git commitの直前に、確認済みの期待branchと現在branchが一致していることを再確認する。

    git status --short
    git branch --show-current
    git branch -vv
    git diff --check
    git diff --cached --stat

- current branchが期待branchと異なる場合はcommitしない。
- mainへ自動switchして帳尻を合わせない。
- 期待branchが不明な場合はcommitを止め、PR headRefName、ユーザー指定、run planを確認する。
- stage対象は明示し、git add .を使わない。
- commit前に、main固有の変更、unrelated dependency、source、test、workflow、意図しない削除がstageされていないことを確認する。

## push前チェック

git pushの直前に、同一shellの最新状態で次を実行する。

    git fetch origin
    git status --short
    git branch --show-current
    git branch -vv
    gh pr view <PR_NUMBER> \
      --repo <OWNER>/<REPOSITORY> \
      --json headRefName,headRefOid,state

PR作業では以下がすべて必須である。

- current branch == PR headRefName
- push対象がPR branchである
- PRがOPENであり、mergeや別baseへの変更ではない
- remote mainに今回の誤branch commitが含まれていない
- working treeは意図したcommit後の状態である

pushはbare形式ではなく、対象branchをrefspecに明示する。

    git push origin HEAD:<expected-branch>

branch名が検証済みで、upstreamも正しい場合だけ、git push -u origin HEADを使える。ただしcurrent branchがmain/default branchのときは使わない。non-fast-forwardになった場合もforceせず、fetchして履歴とremote更新者を調査する。

## upstream確認

git branch -vvに表示されるupstreamは、push先の意図を確認する重要な証拠である。PR branchが[origin/main: ahead N]と表示される場合は安全状態ではない。次を実行して意図したPR remote branchへ是正する。

    git branch --set-upstream-to=origin/<expected-branch> <expected-branch>
    git branch -vv

upstreamの是正後も、git push origin HEAD:<expected-branch>でrefspecを明示する。

## branch mismatch時の停止条件

期待branchとcurrent branchが異なる状態で、変更またはcommitが存在する場合は次の順序を守る。

1. commit、push、reset、rebase、branch delete、force操作を停止する。
2. working treeを変更せず、current HEAD、status、branch、remoteを記録する。
3. current HEADを指すrescue branchを作成し、対象commitを参照可能にする。
4. git fetch origin後、GitHub APIまたはgit rev-parse origin/mainでremote mainを確認する。
5. 誤commitがremote mainへ入っているかを確認する。入っている場合は自動修復せず、履歴を書き換えずにユーザーへ報告する。
6. 正しいPR remote branchとrescue branchのancestryを確認する。
7. fast-forward可能ならCASE 1、そうでなければ対象commitだけを古い順に移すCASE 2へ進む。

remote mainへ誤commitが入っている場合は、この文書の自動復旧範囲外である。remote mainへforce push、revert、branch削除を自動実行せず、SHA、影響範囲、確認済みremote状態を報告してユーザー判断を待つ。

## 誤branchでcommitした場合の復旧手順

### rescue branchの作り方

現在HEADを最初に保護する。branch名は作業内容が分かる一時的な名前にする。

    git branch rescue/<task>-recovery
    git log -7 --oneline --decorate rescue/<task>-recovery

次が確認できるまでreset、rebase、branch delete、force pushを行わない。

- rescue branchが存在する。
- 誤branchで作成された対象commitがrescue branchから参照できる。
- commitのparent、message、変更ファイルを確認できる。

### Case 1: 正しいbranchのfast-forward continuation

正しいPR branchがrescue branchのancestorである場合、履歴は次の形である。

    expected PR branch -> accidental commits -> rescue HEAD

正しいbranchへ移動し、--ff-onlyだけで統合する。

    git switch <expected-branch>
    git status --short
    git branch --show-current
    git merge --ff-only rescue/<task>-recovery

既に同一SHAならAlready up to dateであり、追加のmerge commitやcherry-pickは不要である。

### Case 2: 別baseからcommitしてしまった場合

正しいPR branchがrescue branchのancestorでない場合、rescue branch全体をPR branchとしてpushしない。まず対象commitを古い順に明示し、正しいbranchへ移動して必要な5commit等だけをcherry-pickする。

    git log --reverse --format="%H %s" <base>..<rescue-branch>
    git switch <expected-branch>
    git status --short
    git branch --show-current
    git cherry-pick <SHA1> <SHA2> <SHA3> <SHA4> <SHA5>

conflictが発生したら、対象commitと既存PR差分を比較し、最小の意図保持解決ができない場合はcherry-pick --abortを含む追加操作をせず停止してユーザー判断へ戻す。force pushや既存PR履歴の削除で解決しない。

## remote mainへpushしていない場合の復旧

- remote mainが誤commitを含まないことをSHAとancestryで確認する。
- remote mainを修復しない。force push、revert、branchの書き換えを行わない。
- 正しいPR branchへの履歴だけを確認し、必要な場合のみ明示refspecでpushする。
- rescue branchは、ユーザーが復旧結果を確認するまで削除しない。

## remote mainへpush済みの場合

- 自動修復しない。
- remote mainのhistory rewrite、force push、branch deleteをしない。
- 誤commitのSHA、push時刻、変更ファイル、影響範囲、GitHub PR/branch状態を記録する。
- ユーザーへ報告し、remote mainの修復方法について明示判断を得る。

## 禁止操作

- git push --force
- git push -f
- git push --force-with-lease（今回のbranch復旧でも使用しない）
- rescue確認前のgit reset --hard
- git branch -D
- git clean -fd
- remote mainへのbare pushまたは暗黙push
- 誤branchの全履歴をPR branchとして無条件にpushすること
- PRをmergeして復旧を完了扱いにすること

ユーザーが明示した復旧で、対象commitがrescue branchと期待branchの両方から参照でき、remote状態を確認済みの場合に限り、ローカルbranchをcanonical remoteへ合わせる限定的なgit reset --hard origin/<expected-branch>を検討できる。ただし、これはremote mainを書き換える操作ではなく、最終手段であり、今回のように不要なら実行しない。

## 完了確認

push後、次を確認する。

    git fetch origin
    git branch --show-current
    git branch -vv
    git status --short
    git rev-parse HEAD
    git rev-parse origin/<expected-branch>
    git rev-parse origin/main
    gh pr view <PR_NUMBER> \
      --repo <OWNER>/<REPOSITORY> \
      --json headRefName,headRefOid,state,url

- current branchはexpected branchである。
- local HEADとremote PR branchのSHAが一致する。
- PR headRefNameとcurrent branchが一致する。
- remote mainのSHAが意図せず変わっていない。
- rescue branchが保持され、対象commitを参照できる。
- worktreeがclean、または未commit変更が明示的に報告されている。
- PRはmergeされていない。
