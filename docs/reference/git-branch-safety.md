# Gitブランチの安全性

## 目的

Gitの変更操作（mutation）が許可されている作業であっても、Codexが作業対象のブランチから外れた状態でコミットやプッシュを実行しないための運用ルールを定める。特に、PRブランチでの作業中にローカルブランチのアップストリーム（upstream）が誤ってorigin/mainに設定されている場合や、意図せずmainブランチへ切り替えてしまった（switchした）場合に、コミット履歴を失わずに安全に復旧できるようにすることを目的とする。

この文書は、特定のPR番号やコミットSHA、依存関係の修正内容には依存しない。リポジトリでの通常のGit作業全般、およびブランチの不一致（branch mismatch）が発生した際の影響範囲を限定した復旧（bounded recovery）に適用する。

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
    git fetch origin

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

    git branch --set-upstream-to=origin/<expected-branch> <expected-branch>

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

## プッシュ前チェック

`git push` の直前に、同一シェルの最新の状態で以下を実行する。

    git fetch origin
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

    git push origin HEAD:<expected-branch>

ブランチ名が検証済みで、アップストリームも正しく設定されている場合に限り、`git push -u origin HEAD` を使用できる。ただし、現在のブランチがmainやデフォルトブランチの場合は使用しない。ノンファストフォワード（non-fast-forward）になった場合も強制プッシュ（force push）は行わず、fetchを実行して履歴とリモートの更新者を確認・調査する。

## アップストリームの確認

`git branch -vv` で表示されるアップストリームは、プッシュ先が意図通りかを確認するための重要な情報である。PRブランチが `[origin/main: ahead N]` と表示されている場合は、安全な状態ではない。以下のコマンドを実行し、意図したPRのリモートブランチへ修正する。

    git branch --set-upstream-to=origin/<expected-branch> <expected-branch>
    git branch -vv

アップストリームを修正した後も、`git push origin HEAD:<expected-branch>` のようにrefspecを明示してプッシュする。

## ブランチ不一致時の停止条件

期待されるブランチと現在のブランチが異なる状態で、変更またはコミットが存在する場合は、以下の順序を厳守する。

1. コミット、プッシュ、reset、rebase、ブランチの削除、force操作を直ちに停止する。
2. ワーキングツリーを変更せず、現在のHEAD、status、ブランチ名、リモート情報を記録する。
3. 現在のHEADを指すレスキューブランチ（rescue branch）を作成し、対象のコミットを参照可能な状態にして保護する。
4. `git fetch origin` を実行した後、GitHub APIまたは `git rev-parse origin/main` でリモートのmainの状態を確認する。
5. 誤ったコミットがリモートのmainに含まれてしまっていないかを確認する。含まれている場合は自動修復を試みず、履歴を書き換えないままユーザーへ報告する。
6. 正しいPRのリモートブランチとレスキューブランチの祖先関係（ancestry）を確認する。
7. ファストフォワード（fast-forward）が可能であれば「Case 1」へ、そうでなければ対象コミットのみを古い順に移す「Case 2」へ進む。

リモートのmainに誤ったコミットが含まれている場合は、この文書で扱う自動復旧の対象外である。リモートのmainに対してforce push、revert、ブランチ削除などを自動で実行せず、コミットSHA、影響範囲、確認したリモートの状態を報告し、ユーザーの判断を待つ。

## 誤ったブランチでコミットした場合の復旧手順

### レスキューブランチ（rescue branch）の作成手順

現在のHEADを最優先で保護する。ブランチ名は作業内容が識別できる一時的な名称にする。

    git branch rescue/<task>-recovery
    git log -7 --oneline --decorate rescue/<task>-recovery

以下が確認できるまで、reset、rebase、ブランチ削除、force pushは一切行わない。

- レスキューブランチが正常に作成されていること。
- 誤ったブランチで作成された対象コミットが、レスキューブランチから参照できること。
- コミットの親コミット（parent）、コミットメッセージ、変更ファイルの内容を確認できること。

### Case 1: 正しいブランチでのファストフォワード継続

正しいPRブランチがレスキューブランチの祖先（ancestor）である場合、履歴は以下の構造になる。

    expected PR branch -> accidental commits -> rescue HEAD

正しいブランチへ移動し、`--ff-only` オプションのみを用いて統合する。

    git switch <expected-branch>
    git status --short
    git branch --show-current
    git merge --ff-only rescue/<task>-recovery

すでに同一のSHAを指している場合は `Already up to date` となり、追加のマージコミットの作成や cherry-pick は不要である。

### Case 2: 異なるベースからコミットしてしまった場合

正しいPRブランチがレスキューブランチの祖先でない場合、レスキューブランチ全体をPRブランチとしてプッシュしてはならない。まず対象となるコミットを古い順に特定し、正しいブランチへ移動してから必要なコミット（例: 該当する5つのコミットなど）のみを cherry-pick する。

    git log --reverse --format="%H %s" <base>..<rescue-branch>
    git switch <expected-branch>
    git status --short
    git branch --show-current
    git cherry-pick <SHA1> <SHA2> <SHA3> <SHA4> <SHA5>

コンフリクト（conflict）が発生した場合は、対象コミットの内容と既存PRの差分を比較する。本来の意図を保持した最小限の解決が安全に行えない場合は、`git cherry-pick --abort` を含むこれ以上の追加操作を行わずに作業を停止し、ユーザーの判断を仰ぐ。force pushや既存PRの履歴削除によって強引に解決してはならない。

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

## 禁止操作

- git push --force
- git push -f
- git push --force-with-lease（今回のブランチ復旧作業でも使用しない）
- rescue確認前のgit reset --hard
- git branch -D
- git clean -fd
- リモートmainへのbare pushまたは暗黙的なプッシュ
- 誤ったブランチの全履歴をPRブランチとして無条件にプッシュすること
- PRをマージすることで復旧を完了扱いにすること

ユーザーから復旧作業の明確な指示があり、対象コミットがレスキューブランチと期待されるブランチの双方から参照可能で、かつリモートの状態も確認済みである場合に限り、ローカルブランチを正規のリモートブランチに同期させるための限定的な手段として `git reset --hard origin/<expected-branch>` の実行を検討できる。ただし、これはリモートのmainを書き換える操作ではなく、あくまで最終手段であり、今回のように不要であれば実行しない。

## 完了確認

プッシュ後、以下を確認する。

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

- 現在のブランチ（current branch）が期待されるブランチ（expected branch）であること。
- ローカルのHEADとリモートのPRブランチのコミットSHAが一致していること。
- PRの headRefName と現在のブランチ名が一致していること。
- リモートのmainのコミットSHAが意図せず変更されていないこと。
- レスキューブランチが保持されており、対象コミットを参照できる状態にあること。
- ワーキングツリーがクリーンであるか、未コミットの変更がある場合はそれが明示的に報告されていること。
- PRが意図せずマージ（merge）されていないこと。