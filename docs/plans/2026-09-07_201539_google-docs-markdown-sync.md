# Google Docs ↔ Markdown 双方向同期 実装計画

## 0. 依頼概要

### 目的

`docs/spec/**/*.md` と `docs/curriculum/**/*.md` だけを対象に、1 Markdown = 1 Google Doc の対応で Google Docs と GitHub の双方向同期を構築する。

Google Docs は人間が編集しやすい編集面として使い、Git 側では既存のレビュー、履歴管理、Markdown lint、仕様 Validator、カリキュラム Validator を維持する。

同期は Last Writer Wins にせず、前回同期 baseline と現在の Git / Google canonical content を比較して安全に判定する。同期先を一意に決定できない場合や双方変更が競合する場合は、自動上書きせず停止する。

### 期待成果

- Git → Google:
  - `main` の対象 Markdown 変更を Google Docs へ反映する。
  - 対応 Google Doc がなければ作成する。
  - 対応 Google Doc があれば同じ file ID を維持して内容を全面更新する。
- Google → Git:
  - Google Docs を `text/markdown` で export する。
  - 対象 Markdown を新規作成または更新する。
  - targeted validation 後、automation branch / commit / push / Pull Request を作る。
  - `main` へ直接 push しない。
- 初回:
  - 対象全ファイルを Git → Google で bootstrap する。
  - 全対象で Markdown → Google Docs → Markdown の round-trip を行い、canonical equality を確認する。
- 安全性:
  - Git → Google は全対象の read-only Preflight が成功した場合だけ Apply する。
  - conflict / duplicate / ambiguous mapping / unsupported rename・move を write 前に検出する。
  - create の不確定失敗は blind retry せず reconciliation する。
  - 自動 delete / rename / move / conflict 解決は実装しない。

---

## 1. 対象範囲

同期対象は次の 2 glob **だけ**とする。

```text
docs/spec/**/*.md
docs/curriculum/**/*.md
```

path 判定は Repository 相対 path を `/` 区切りへ正規化したうえで行う。

### Google Drive 側の対応範囲

Git の `docs/` より下の階層を、指定した同期 root folder 配下へ mirror する。

例:

```text
Git:
docs/spec/features/cart.md

Google Drive:
<sync-root>/spec/features/cart.md
```

`cart.md` は通常ファイルではなく Google Docs MIME type の Google Doc とし、Google Doc の表示名に `.md` を含める。

---

## 2. 非対象 / Non-goals

以下は初期版では実装しない。

- `docs/spec/**/*.md` / `docs/curriculum/**/*.md` 以外の同期
- Google Docs Document Tabs を使った複数 Markdown の集約
- 自動 delete / Trash
- 自動 rename / move
- Git rename の推測
- Last Writer Wins
- 3-way merge
- 自動 conflict 解決
- Google Drive webhook
- polling / schedule
- Google Picker
- repository 内 mapping JSON / DB
- Redis 等の外部 state
- Google Docs comments / suggestions / revision history の同期
- Git commit history と Google Docs revision history の対応
- 独自 Markdown parser / AST 変換基盤
- HTML 中間表現
- Google Docs API の paragraph 単位編集
- 観測されていない Markdown 差分への先回り adapter
- Service Account
- Workload Identity Federation
- PAT
- GitHub App
- Workflow の方向別ファイル分割
- 将来用途だけを目的とした過度な class / interface 分割
- Git 側画像 asset 自体の Google Drive 同期

---

## 3. 現状理解 / Repository 整合性

### 3.1 Repository

現在の Repository では次を確認済み。

- `package.json` に次の command が存在する。
  - `format:check`
  - `lint:markdown`
  - `validate:spec`
  - `validate:spec-visuals:final`
  - `validate:curriculum`
  - `build:spec`
  - `verify`
- `verify` は format / Markdown lint / spec / visual / curriculum に加えて lint、typecheck、test、web build 等も含む重い総合検証である。
- `.github/workflows/ci.yml` は GitHub Actions を commit SHA で pin し、`persist-credentials: false`、job timeout、最小権限を利用している。
- `.github/workflows/expo-dependency-maintenance.yml` に以下の automation convention がある。
  - automation branch
  - `github.token` / `GITHUB_TOKEN`
  - `gh auth setup-git`
  - non-force branch push
  - `gh pr create`
  - `cancel-in-progress: false`
- `scripts/spec/validate-all.ts` は仕様 Markdown、Agentic QA contract、visual contract を検証する。
- `scripts/validate-curriculum.ts` はカリキュラム必須ファイル、リンク、spec reference 等を検証する。
- `scripts/spec/build-spec.ts` は `docs/spec/**/*.md` を列挙し、仕様サイトを build する。
- 対象 Markdown には table、fenced code block、inline code、relative link、anchor、relative image、`.webp`、BR / AC / SCREEN 等の識別子、list 等が含まれるため、Google Docs round-trip の fidelity は Validator pass だけでは保証できない。

### 3.2 Google Drive / OAuth 公式仕様

実装時は Google 公式仕様を正本とする。2026-09-07 時点で確認する主要資料:

- Google Docs の Markdown export:
  - https://developers.google.com/workspace/drive/api/guides/ref-export-formats
- upload / Markdown import / Google Workspace conversion / update:
  - https://developers.google.com/workspace/drive/api/guides/manage-uploads
- `files.list` / pagination:
  - https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
- custom file properties / `appProperties`:
  - https://developers.google.com/workspace/drive/api/guides/properties
- Drive OAuth scopes:
  - https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- OAuth offline access / refresh token:
  - https://developers.google.com/identity/protocols/oauth2
  - https://developers.google.com/identity/protocols/oauth2/web-server

確認済みの前提:

- Google Docs は Drive API `files.export` で `text/markdown` へ export できる。
- Markdown は Google Docs への import format としてサポートされる。
- Google Docs へ media を伴う `files.update` を行うと document full contents が置換される。
- `files.list` は `nextPageToken` がある限り追加ページを取得する必要がある。
- Drive では同一 parent に同名 file / folder が存在できるため、name を一意キーとして扱えない。
- `appProperties` は private custom property として利用できるが、1 property の UTF-8 `key + value` は最大 124 bytes、1 application あたり private property は最大 30 個である。
- OAuth offline access を要求すれば、user が不在でも Refresh Token から Access Token を取得できる。
- External + Testing の OAuth consent screen で Drive scope を利用する場合、Refresh Token が 7 日で失効する制約がある。
- `drive.file` は narrower scope だが、アプリが作成・選択・明示共有された per-file access が中心であり、Drive folder に人間が直接作った新規 Google Doc を Actions が探索する今回の要件とは相性が悪い。
- 今回は `https://www.googleapis.com/auth/drive` を使用する。これは restricted scope であるため、OAuth app の利用形態に応じた verification / organization policy も運用時に確認する。
- Google は Markdown source の byte-for-byte round-trip を保証していないため、実 Repository 全件で canonical round-trip を実証する必要がある。
- Google Workspace format への conversion create では pre-generated file ID を使った idempotent create が使えないため、create の不確定失敗は Drive 再検索による reconciliation を行う。

---

## 4. 前提条件 / 認証・Secrets

### 4.1 OAuth

初期版は OAuth Client ID / Client Secret / Refresh Token を維持する。

Refresh Token 取得時は `access_type=offline` を使用する。

継続運用では次のいずれか等、External + Testing の 7-day Refresh Token 制約を受けない適切な OAuth 設定を使う。

- Google Workspace 組織内だけで使う Internal app
- External app を継続運用可能な In production / Published 状態へ移行した構成

Refresh Token は恒久的に必ず有効とはみなさない。token endpoint が `invalid_grant` 等を返した場合:

1. 明確な認証エラーとして扱う。
2. Google API の write を開始しない。
3. workflow を fail する。
4. token endpoint response body の生データを log しない。
5. 管理者が再認証して Refresh Token を更新する。
6. 自動再認証は実装しない。

### 4.2 Drive scope

初期版:

```text
https://www.googleapis.com/auth/drive
```

を使用する。

理由:

- Google Drive 上で人間が同期 root 配下へ直接作成した Google Doc を自動探索する必要がある。
- `drive.file` はより狭く推奨される scope だが、今回の「人間が Drive UI から直接追加した未登録 file の探索」とは access model が合わない。
- scope 縮小のためだけに Picker / 独自登録 UI を追加するのは今回の要件から外れる。

full Drive scope は強い権限のため、コード上の操作範囲は同期 root 配下へ hard-bound し、credential と log の取り扱いを厳格にする。

### 4.3 GitHub Secrets

初期版で使用する Secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_DRIVE_ROOT_FOLDER_ID
```

以下を log / PR body / artifact / error dump に出さない。

- Client Secret
- Refresh Token
- Access Token
- Authorization header
- token endpoint response body
- Secret が埋め込まれた URL / curl command
- Secret として管理している root folder ID の生値

Client ID も workflow では Secret 経由で注入し、不必要に log しない。

---

## 5. Google Drive 構造 / 命名 / identity

### 5.1 Drive hierarchy

```text
<GOOGLE_DRIVE_ROOT_FOLDER_ID>
├─ spec/
│  ├─ README.md                  (Google Doc)
│  ├─ features/
│  │  ├─ cart.md                 (Google Doc)
│  │  └─ ...
│  └─ ...
└─ curriculum/
   └─ test-automation/
      ├─ README.md                (Google Doc)
      ├─ part1/
      │  └─ ...
      └─ part2/
         └─ ...
```

Git path:

```text
docs/spec/features/cart.md
```

は:

```text
<sync-root>/spec/features/cart.md
```

へ決定的に対応する。

### 5.2 name は一意キーではない

各 parent で候補を全件確認する。

#### Folder

同一 parent / 同一 folder name:

| 件数 | 判定 |
| --- | --- |
| 0 | Apply で必要なら作成 |
| 1 | 利用 |
| 2 以上 | ambiguous。Preflight fail |

#### Google Doc

同一 parent / 同一 `.md` name / Google Docs MIME type:

| 件数 | 判定 |
| --- | --- |
| 0 | direction と state に応じて create 候補 |
| 1 | 利用 |
| 2 以上 | ambiguous。Preflight fail |

別 parent にある同名 Doc は別 Git path なので問題としない。

`files.list` は必ず `nextPageToken` がなくなるまで pagination する。1ページ目だけで candidate 数を判定しない。

### 5.3 sync metadata

Repository 内 mapping file は作らず、managed Google Doc の `appProperties` に最小 state を持つ。

初期版の必須 property:

```text
githubPath = "docs/spec/features/cart.md"
lastSyncedSha256 = "<canonical SHA-256>"
```

意味:

- `githubPath`
  - managed Doc の identity / rename・move 検出用。
- `lastSyncedSha256`
  - Git と Google が最後に同じ canonical content へ収束した時点の単一 baseline。

以下は初期版では持たない。

```text
qaTrainingStoreSync
lastGitSha256
lastGoogleSha256
```

Git / Google 双方の hash を別 baseline として保持するのは、全件 round-trip 後に「正常同期状態でも canonical hash が一致しない」ことが実証された場合だけ再検討する。初期版ではその状態自体を bootstrap failure とする。

`githubPath` / `lastSyncedSha256` を書く前に `appProperties` の 124-byte `key + value` 制約を UTF-8 bytes で検証する。超える場合は安全に fail し、path hash 等へ自動フォールバックしない。

### 5.4 rename / move

managed Doc の:

```text
appProperties.githubPath
```

と、現在の:

```text
Drive folder hierarchy + Google Doc name
```

から導出した Git path が異なる場合:

```text
unsupported rename/move
```

として fail する。自動修正しない。

Git 側でも「旧 path 削除 + 新 path 追加」を rename と推測しない。削除・rename はサポート外であり、人間が必要に応じて Drive / Git を整理する。

---

## 6. Canonicalization / hash

### 6.1 canonical representation

Git / Google の同期判定は raw bytes / `modifiedTime` / commit time ではなく、同じ canonicalization を適用した Markdown の SHA-256 で行う。

初期 canonicalization は次だけとする。

1. CRLF / CR → LF
2. EOF newline を Repository 契約へ統一
3. Repository で既に使用している Prettier による Markdown formatting

Google Docs 固有挙動を推測した追加変換は初期版に入れない。

`modifiedTime` は diagnostics に表示してよいが、newer-wins や conflict decision に使用しない。

### 6.2 round-trip 差分

初回 bootstrap では:

```text
Git Markdown
→ canonicalize
→ Google Docs import
→ Google Docs export text/markdown
→ canonicalize
→ equality check
```

を全対象で行う。

成功条件は原則:

```text
Git canonical SHA-256 == Google export canonical SHA-256
```

である。

Validator pass だけでは許容しない。

差分が残る場合:

1. bootstrap を失敗扱いにする。
2. raw / canonical diff を確認する。
3. Google Docs 由来の非意味的変換であることを実データで確認する。
4. 必要な場合のみ最小 adapter / normalization を追加する。
5. 観測された construct を fixture / regression test として固定する。
6. 全対象 round-trip を再実行する。

「将来ありそう」という理由だけで adapter を追加しない。

---

## 7. Sync state / conflict decision

### 7.1 hash

記号:

```text
B = appProperties.lastSyncedSha256
G = current Git canonical SHA-256
D = current Google export canonical SHA-256
```

Baseline が存在する場合、変更判定は `B / G / D` だけで行う。

### 7.2 基本 decision table

| Git | Google | Baseline | 判定 |
| --- | --- | --- | --- |
| なし | なし | なし | 対象なし |
| あり | なし | なし | Git → Google create |
| なし | あり | なし | Google → Git create 候補 |
| あり | あり | なし | `G == D` なら safe adoption、不一致なら ambiguous |
| unchanged | unchanged | あり | no-op |
| changed | unchanged | あり | Git changed |
| unchanged | changed | あり | Google changed |
| changed | changed | あり | `G == D` なら converged / state-only update、それ以外 conflict |

`changed / unchanged` は baseline `B` との比較を意味する。

### 7.3 direction rule

#### Git → Google

- Git changed / Google unchanged:
  - update 候補。
- Google changed / Git unchanged:
  - **停止**。Git で Google を上書きしない。
- Git changed / Google changed:
  - `G == D` なら state-only update。
  - `G != D` なら conflict。
- baseline なし・双方存在:
  - `G == D` なら safe adoption。
  - `G != D` なら ambiguous。
- Git のみ・baseline なし:
  - create 候補。
- Google のみ・baseline なし:
  - Google → Git の新規候補として認識するだけで、Git → Google では削除・上書きしない。

#### Google → Git

- Google changed / Git unchanged:
  - Git update 候補。
- Git changed / Google unchanged:
  - **停止**。Google で Git を上書きしない。
- Git changed / Google changed:
  - `G == D` なら content change 不要。baseline は Google → Git では進めない。
  - `G != D` なら conflict。
- baseline なし・双方存在:
  - `G == D` なら safe adoption 候補だが、Google → Git 実行では baseline を Google 側へ書かない。
  - `G != D` なら ambiguous。
- Google のみ・baseline なし:
  - Git create 候補。
- Git のみ・baseline なし:
  - Git → Google の新規候補として認識するだけで、Google → Git では削除・上書きしない。

### 7.4 safe adoption

Git / Google 双方に対象があり sync baseline がない場合でも:

```text
G == D
```

なら dead-end にしない。

Git → Google 実行で:

1. content write は行わない。
2. `githubPath` を確定 / 検証する。
3. `lastSyncedSha256 = G` を保存する。
4. synchronized state へ遷移する。

`G != D` の場合は、どちらを正とするか自動判断せず ambiguous fail。

### 7.5 Google → Git PR と baseline

Google → Git では次を行っても baseline を確定しない。

```text
Google export
→ Git working tree
→ validation
→ automation branch
→ commit
→ push
→ PR
```

PR が close / reject される可能性があり、PR 作成時点では `main` が更新されていないためである。

PR merge 後:

```text
main push
→ Git → Google
→ G == D を確認
→ safe adoption / state-only update
→ baseline 確定
```

とする。

Google → Git の処理は原則 Google Drive を read-only とし、PR 作成のために `githubPath` / baseline を先行更新しない。

---

## 8. Git → Google: Phase 1 Read-only Preflight

Git → Google は対象 file を1件ずつ判定して即 write してはいけない。

**全対象の Preflight が完了するまで Google Drive / Google Docs を変更しない。**

### 8.1 Git 側 validation

Google を外部 write する前に、同期対象 Markdown が明らかに壊れていないことを確認する。

共通:

```bash
pnpm run lint:markdown
```

対象変更に `docs/spec/**/*.md` が含まれる場合:

```bash
pnpm run validate:spec
```

対象変更に `docs/curriculum/**/*.md` が含まれる場合:

```bash
pnpm run validate:curriculum
```

`main` push は既存 CI を通過していることを基本前提とし、Google sync workflow では web build / 全 test suite を重複実行しない。

manual Git → Google で全件同期する場合は spec / curriculum の両 targeted validator を実行する。

### 8.2 Preflight steps

write なしで最低限次を全件実行する。

1. Git の同期対象 Markdown を全件列挙。
2. Google Drive 同期 root 配下の対象 folder / Google Doc を取得。
3. `files.list` を `nextPageToken` がなくなるまで全ページ取得。
4. Drive folder hierarchy を解決。
5. 同一 parent 内の duplicate folder を検出。
6. 同一 parent 内の duplicate Google Doc を検出。
7. managed Doc の `appProperties` を取得・検証。
8. Google Docs を `text/markdown` export。
9. Git / Google 双方を canonicalize。
10. `G` / `D` / baseline `B` を計算。
11. safe adoption / no-op / create / update / state-only update / direction mismatch / conflict を判定。
12. `githubPath` と folder-derived path の不一致を unsupported rename/move として検出。
13. `appProperties` の型・hash format・byte-size constraint を検証。
14. Google 側新規 Doc の path mapping を検証。
15. 全対象の Apply plan をメモリ上に構築。

### 8.3 Preflight failure

1件でも次がある場合、Google 側 write は **0 件** のまま fail する。

- conflict
- direction mismatch で source side を上書きする危険がある状態
- path ambiguity
- duplicate folder
- duplicate Google Doc
- unsupported rename / move
- invalid sync metadata
- invalid / unsafe Git path
- appProperties size overflow
- Google export failure after bounded retry
- OAuth failure
- その他、同期先 / state を一意に決定できない状態

### 8.4 Preflight output

全件を次のいずれかへ分類してから Apply へ進む。

```text
create
update
no-op
state-only update
safe adoption
skip / pending opposite direction
```

`safe adoption` は content write を伴わないため Apply では state-only update として実行してよい。

---

## 9. Git → Google: Phase 2 Apply

Preflight が全件成功した場合だけ Apply を開始する。

### 9.1 Apply order

Preflight で確定した plan 以外の対象を Apply 中に新規推測しない。

各 item:

- `no-op`
  - write なし。
- `state-only update` / `safe adoption`
  - content write なし。
  - `githubPath` / `lastSyncedSha256` の必要な metadata だけ更新。
- `update`
  1. 同じ file ID へ Markdown media update。
  2. re-export。
  3. strict canonical equality を確認。
  4. equality 成功後だけ `lastSyncedSha256` を更新。
- `create`
  1. 必要 folder を一意性確認後に作成。
  2. Google Doc を Markdown import で作成。
  3. create metadata に `githubPath` を付与して reconciliation identity に使う。
  4. re-export。
  5. strict canonical equality を確認。
  6. equality 成功後だけ `lastSyncedSha256` を保存。

### 9.2 Apply 中の部分成功

Google API の通信障害等により、Apply 全体の atomicity は保証できない。

例えば:

```text
10 files
→ 1-8 success
→ 9th network failure
```

は起こり得る。

方針:

- 自動 rollback として成功済み Doc / folder を delete しない。
- 成功済み Doc と baseline は残す。
- fail した run は bootstrap / sync successful と扱わない。
- 次回は最初から read-only Preflight を再実行する。
- canonical-equal な成功済み Doc は no-op / safe adoption。
- create の結果不明は reconciliation。
- duplicate / conflict がなければ残りを安全に再実行できるようにする。

---

## 10. Google → Git flow

Google → Git は `workflow_dispatch` の manual direction で実行する。初期版で schedule は作らない。

### 10.1 Discovery

同期 root 配下を再帰探索し、`files.list` の pagination を最後まで処理する。

Google side item:

| 状態 | 扱い |
| --- | --- |
| 同期 root 外 | 無視 |
| root 配下だが `spec/` / `curriculum/` 外 | 無視 |
| Google Docs MIME type 以外 | 無視 |
| target subtree 内の Google Doc だが name が `.md` で終わらない | warning + 無視。全体 fail にはしない |
| `.md` かつ安全な Git path へ一意に変換可能 | candidate |
| 同一 Git path へ複数 Google Docs が mapping | ambiguous fail |
| managed Doc の `githubPath` と folder-derived path が不一致 | unsupported rename/move fail |

`.md` suffix を、人間が Google 側から新規 Markdown を作成する明示的契約とする。

### 10.2 Google 新規 Doc

新規 Google Doc が既存 Git Markdown と同じ path へ mapping する場合:

- canonical content 同一:
  - safe adoption candidate。
  - Google → Git では content diff / baseline write は不要。
  - merge 後または次回 Git → Google で baseline を確定する。
- canonical content 不一致:
  - ambiguous fail。
  - Google 優先 / Git 優先を自動判断しない。

Git file が存在しない場合:

1. export / canonicalize。
2. safe target path を確認。
3. Git working tree に新規 Markdown を作成。
4. targeted validation。
5. PR 化。
6. Google metadata baseline はまだ進めない。

### 10.3 Existing Doc update

baseline がある場合は decision table を使う。

Google changed / Git unchanged の場合だけ Git update candidate とする。

Git changed / Google unchanged、または divergent both-changed は fail し、Google content で Git を上書きしない。

### 10.4 PR creation

全 candidate を working tree へ反映した後:

1. changed Markdown だけ Prettier。
2. target-only changed-file allowlist。
3. targeted validation。
4. diff なしなら no-op 終了。
5. open sync PR guard。
6. automation branch 作成。
7. bot identity で target Markdown のみ commit。
8. `gh auth setup-git`。
9. explicit branch を non-force push。
10. `gh pr create --base main`。
11. auto-merge しない。

既存 open Google Docs sync PR が存在する場合:

```text
blocked
```

として新規同期を開始 / PR 作成しない。

通常の no-op と区別して明確な message と non-success / blocked 扱いにする。既存 PR への自動追記・force push は初期版では実装しない。

---

## 11. Retry / reconciliation

### 11.1 Retry policy

小さい bounded retry と exponential backoff + jitter を許可する対象:

- `files.list`
- metadata `get`
- `files.export`
- token refresh の一時的 transport failure。ただし OAuth semantic error は retry しない。
- 同じ file ID / 同じ desired body の update で idempotent に扱える一時失敗
- 429 / rate limit
- 一時的な 500 / 502 / 503 / 504

retry 回数 / backoff は小さく bounded にし、Workflow timeout 内へ収める。無制限 retry は禁止する。

### 11.2 原則 retry しない

- 400 系入力エラー
- `invalid_grant` 等の OAuth semantic error
- permission / policy error
- conflict
- invalid metadata
- ambiguous mapping
- duplicate
- unsupported rename / move
- canonical round-trip mismatch

### 11.3 `files.create` は blind retry しない

Google Doc create が timeout / connection reset / 5xx 等で「Google 側で成功したか不明」になった場合、同じ POST を即 retry しない。

同じ:

1. parent
2. Google Doc name
3. Google Docs MIME type
4. `appProperties.githubPath`

で Drive を pagination 付きで再検索する。

| 再検索結果 | 処理 |
| --- | --- |
| 0 件 | create retry 可能 |
| 1 件 | 作成済みとしてその file ID を再利用 |
| 2 件以上 | ambiguous fail |

Google Workspace conversion create では pre-generated ID による idempotent create を前提にしない。

folder `files.create` も同じ考え方を適用し、結果不明時は same parent / name / folder MIME type で reconcile して duplicate folder を防ぐ。

### 11.4 update の不確定失敗

update が成功したか不明な場合、blind write retry の前に同じ file ID を re-export する。

- current Google canonical == desired Git canonical:
  - update 成功済みとして扱い、strict round-trip / metadata finalize へ進む。
- current Google canonical == Preflight 時 Google canonical:
  - bounded retry 可能。
- それ以外:
  - human edit / unexpected mutation の可能性があるため fail し、上書きしない。

---

## 12. GitHub Actions Workflow

### 12.1 1 Workflow を維持

実装対象:

```text
.github/workflows/google-docs-sync.yml
```

1ファイルだけとし、direction ごとに Workflow を分けない。

### 12.2 Trigger

概念上:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - docs/spec/**/*.md
      - docs/curriculum/**/*.md
  workflow_dispatch:
    inputs:
      direction:
        type: choice
        options:
          - git-to-google
          - google-to-git
```

- `push` to `main`:
  - Git → Google のみ。
- `workflow_dispatch`:
  - direction 明示。
  - manual 実行対象 ref は `main` に限定する。
- Google → Git の schedule は初期版では作らない。

### 12.3 Jobs / permissions

1 Workflow 内で direction ごとに job を分け、job-level permissions を最小化する。

#### Git → Google job

```text
contents: read
```

Repository write / PR permission は持たせない。

#### Google → Git job

```text
contents: write
pull-requests: write
```

既存 automation convention に合わせ:

- `actions/checkout` 等は既存 pin を利用。
- `persist-credentials: false`。
- `github.token` / `GITHUB_TOKEN` を利用。
- `gh auth setup-git`。
- explicit automation branch push。
- force push 禁止。

### 12.4 concurrency

Git → Google / Google → Git で共通の固定 concurrency group を使う。

```text
group: google-docs-markdown-sync
cancel-in-progress: false
```

同じ Drive root を操作するため、direction 別 group に分けない。

### 12.5 timeout

各主要 sync job に `timeout-minutes` を設定する。

初期値:

```text
30 minutes
```

実測で不足が確認されるまで過度に延長しない。

### 12.6 `GITHUB_TOKEN` と PR CI

初期版では PAT / GitHub App を追加しない。

GitHub の現行仕様では、Workflow が `GITHUB_TOKEN` で Pull Request を作成 / 更新した場合、`pull_request` の opened / synchronize / reopened による Workflow run は approval-required state になる場合がある。

そのため:

- Google → Git sync Workflow 内の targeted validation を PR 作成 **前** に必ず成功させる。
- PR 上の通常 repository CI は補助的な review gate とする。
- 完全無人 CI が必須になった場合だけ認証方式を別途再検討する。
- 初期版では PAT / GitHub App を追加しない。

PR merge 自体は人間の review / merge を前提とし、merge 後の `main` push で Git → Google が起動して baseline を finalize する。

---

## 13. Validation

### 13.1 Google → Git runtime

変更 Markdown にのみ Prettier を適用する。

全 Markdown 共通:

```bash
pnpm exec prettier --write <changed markdown files only>
pnpm run lint:markdown
git diff --check
```

`docs/spec/**/*.md` が1件でも変更された場合は必須:

```bash
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run build:spec
```

`docs/curriculum/**/*.md` が1件でも変更された場合は必須:

```bash
pnpm run validate:curriculum
```

spec / curriculum の両方が変わった場合は両方の targeted validation を実行する。

`build:spec` 等が生成する ignored output を commit 対象にしない。validation 後も changed-file allowlist を再確認する。

### 13.2 Git → Google runtime

外部 write 前の最低限 gate:

共通:

```bash
pnpm run lint:markdown
```

spec が対象の場合:

```bash
pnpm run validate:spec
```

curriculum が対象の場合:

```bash
pnpm run validate:curriculum
```

既存 CI と重複する `pnpm run verify` / web build / 全 test suite は毎回実行しない。

### 13.3 `pnpm run verify`

責務を分ける。

- Google → Git runtime:
  - targeted validation のみ。
- Git → Google runtime:
  - external write 前に必要な targeted validation のみ。
- 実装完了時:
  - `pnpm run verify` を1回実行。
- 通常 PR:
  - repository CI。

同期 Workflow 内で targeted validation の直後に `pnpm run verify` を重複実行しない。

---

## 14. Initial bootstrap

### 14.1 対象

current `main` に存在する:

```text
docs/spec/**/*.md
docs/curriculum/**/*.md
```

全件。

3ファイル等の部分 PoC は行わない。

### 14.2 Bootstrap flow

1. Repository targeted validator を実行。
2. Git → Google Read-only Preflight を全件実行。
3. duplicate / conflict / ambiguity 0 件を確認。
4. Apply を開始。
5. 各 Git Markdown を Google Docs へ create / update。
6. 各 Doc を `text/markdown` re-export。
7. Git / Google 双方を最小 canonicalization。
8. **canonical equality** を確認。
9. equality 成功後だけ baseline を保存。
10. 全対象完了後、repository targeted validator を再確認。
11. 全件 summary を出す。

### 14.3 Bootstrap completion

全対象 Markdown について次がすべて成功した場合だけ bootstrap successful とする。

1. 全対象 file 列挙
2. path mapping 成功
3. duplicate folder / Doc なし
4. Google Docs import / update 成功
5. re-export 成功
6. canonical round-trip equality
7. repository validator 成功
8. Google Doc identity 確定
9. baseline 保存成功
10. conflict / ambiguity なし

1件でも失敗すれば bootstrap successful と表示しない。

summary では各 target の状態を最低限次で識別可能にする。

```text
created
updated
adopted
no-op
failed
```

必要に応じて `state-only` / `skipped` も区別してよい。

### 14.4 Bootstrap partial failure

Apply 中に失敗した場合:

- 成功済み Doc は残す。
- 自動 rollback / delete をしない。
- 次回は全件 Preflight から再実行。
- canonical-equal success item は no-op / safe adoption。
- create 不確定 item は reconciliation。
- mismatch / duplicate / conflict が残る場合は write 前に停止。

---

## 15. Error handling / Security

### 15.1 Fail-safe

次は fail-safe に停止する。

- OAuth / permission failure
- path traversal / unsafe path
- duplicate
- ambiguous mapping
- invalid `appProperties`
- `githubPath` mismatch
- unsupported rename/move
- conflict
- canonical round-trip mismatch
- target allowlist violation
- unexpected Google MIME type on a managed target
- create reconciliation が 2 件以上
- update reconciliation で unexpected content を観測

### 15.2 Warning / ignore

次は全体 fail にしない。

- sync root 外 item
- target subtree 外 item
- Google Docs 以外
- target subtree 内だが `.md` で終わらない unmanaged Google Doc
  - warning + ignore

### 15.3 Logs

log は file path、action、HTTP status、bounded retry count、diagnostic `modifiedTime` 等を含めてよい。

credential / token / raw auth response は含めない。

Google API error は status / sanitized error code / sanitized message だけに絞る。

---

## 16. Tests

ネットワーク API 自体を unit test で再実装するような過剰 mock は避け、pure decision / request contract / orchestration boundary を固定する。

最低限:

### Path / Drive mapping

- target path allow / deny
- Windows separator normalization
- `..` / root escape rejection
- Git path → Drive path
- Drive path → Git path
- duplicate folder
- duplicate Doc
- same name in different parent は許可
- `githubPath` mismatch → rename/move fail
- appProperties byte-size overflow
- `.md` でない Google Doc → warning / ignore
- multiple Docs → same Git path → ambiguous

### State / conflict

- baselineなし・Gitのみ → create
- baselineなし・Googleのみ → Google→Git create candidate
- baselineなし・双方同一 → safe adoption
- baselineなし・双方相違 → ambiguous
- unchanged / unchanged → no-op
- Git-only changed
- Google-only changed
- both changed + canonical equal → converged / state-only
- both changed + divergent → conflict
- wrong direction overwrite prevention
- `modifiedTime` が判定へ影響しない

### Retry / reconciliation

- list pagination
- GET / export bounded retry
- create timeout → search 0 → retry
- create timeout → search 1 → reuse
- create timeout → search 2+ → fail
- folder create reconciliation
- update timeout → desired content observed → success
- update timeout → old content observed → bounded retry
- update timeout → third content observed → fail
- 400 / auth / conflict は retry しない

### Workflow / orchestration

- full Preflight failure → Google write 0
- Preflight success → planned Apply のみ実行
- Apply partial failure → rollback delete なし
- Google→Git PR 前 validation failure → branch / PR 作成なし
- open sync PR → blocked、新規 PR なし
- no-op → PR なし
- changed-file allowlist violation → PR なし
- baseline は Google→Git PR 作成時に進まない
- PR merge 後の Git→Google safe adoption で baseline が確定可能

### Round-trip fixtures

実際の全件 bootstrap で差分が観測された construct だけ fixture 化する。

候補として事前に独自 adapter を作らない。

---

## 17. 実装責務 / ファイル構成方針

実装前 Plan で file 数 / class 構成を固定しすぎない。

必要責務:

- OAuth token refresh
- Drive REST client
- target file discovery
- Drive pagination
- path mapping / duplicate detection
- canonicalization / SHA-256
- sync metadata
- Preflight
- conflict decision
- Git → Google Apply
- Google → Git export / working tree update
- retry / reconciliation
- targeted validation
- GitHub PR orchestration

実装先は `scripts/docs/` 配下を基本とし、数百行の単一巨大 file と「1 function = 1 file」の両極端を避ける。

初期案としては次程度を検討してよいが、責務が自然にまとまるなら統合 / 分割してよい。

```text
scripts/docs/google-docs-sync/
  cli.ts
  drive-client.ts
  sync.ts
  state.ts
  path-mapping.ts
```

unit test は `tests/unit/` の既存 convention に合わせる。

大きな Google SDK dependency は追加せず、Node 標準 `fetch` を使った必要 endpoint だけの小さな REST boundary を基本とする。

---

## 18. Workflow / PR 運用

### Git → Google

#### main push

対象 path の merge / push:

```text
main
→ Google sync Workflow
→ targeted validation
→ read-only Preflight
→ Apply
```

Google 側だけに変更がある managed Doc を検出した場合は conflict / direction mismatch として停止し、Git で上書きしない。

#### manual

`workflow_dispatch(direction=git-to-google)` で `main` 全対象の整合 / bootstrap / repair run を実行可能にする。

### Google → Git

`workflow_dispatch(direction=google-to-git)` のみ。

```text
Google
→ read/export
→ conflict decision
→ Git working tree
→ targeted validation
→ automation branch
→ commit
→ non-force push
→ PR
```

PR が merge されるまで Google baseline は進めない。

open sync PR がある間は新規 pull を blocked とする。

---

## 19. 削除の扱い

自動 delete は一切行わない。

そのため、片側で同期済み対象を手動削除すると、逆方向同期で再生成される可能性がある。初期版では deletion 自体をサポート外とする。

- Git に file があり Google Doc がない:
  - baseline state が Doc とともに失われているため、新規 Git-only item と同様に Google create され得る。
- Google Doc があり Git file がない:
  - Google→Git を実行すれば Git file が再作成され得る。

これを自動 delete へ変換しない。

明示的 delete / rename workflow は今回作らない。

---

## 20. リスク

### R1. Markdown round-trip incompatibility

最重要。

対策:

- 全件 bootstrap。
- canonical equality を原則成功条件。
- Validator pass だけで許容しない。
- 実際に観測された非意味的差分だけ最小 adapter + regression fixture。

### R2. Apply partial success

Google API は複数 Doc の transaction を提供しない。

対策:

- full read-only Preflight。
- Apply plan 固定。
- item ごとの post-write re-export。
- baseline finalize は equality 後。
- rollback delete なし。
- safe rerun。

### R3. create duplicate

create response lost 後の blind retry。

対策:

- parent / name / MIME / `githubPath` reconciliation。
- 0 / 1 / 2+ の決定的処理。
- folder create も同様。

### R4. full Drive scope

credential compromise 時の blast radius が大きい。

対策:

- Secrets。
- log redaction。
- sync root hard-bound。
- Internal / appropriate production OAuth operation。
- 不要な scope / Picker UI は追加しない。

### R5. Human edit during Apply

Workflow concurrency は Actions 同士だけを防ぎ、人間の Google Docs 編集は停止できない。

対策:

- Preflight baseline。
- update の不確定 retry 前の re-export reconciliation。
- post-write strict re-export。
- unexpected content は fail。
- 完全な cross-system transaction / lock は初期版の対象外。

### R6. Automation PR CI approval

`GITHUB_TOKEN` 由来 PR の CI が approval-required になる可能性。

対策:

- PR 作成前 targeted validation 必須。
- auto-merge なし。
- PAT / GitHub App は初期版へ追加しない。

---

## 21. Open questions

Blocking な未確定事項はなし。

実装時に実データでのみ確定する事項:

- Google Docs Markdown import / export で current Repository のどの construct に canonical diff が発生するか。

これは設計上の未回答質問ではなく、initial all-file bootstrap validation の結果として扱う。

差分が1件でも残る場合は bootstrap successful とせず、観測された差分だけを分析して最小修正する。

---

## 22. Definition of Done

### Scope / mapping

- [ ] 対象が `docs/spec/**/*.md` / `docs/curriculum/**/*.md` のみに hard-bound されている。
- [ ] 1 Markdown = 1 Google Doc。
- [ ] folder hierarchy mapping が決定されている。
- [ ] Google Doc name に `.md` を含める。
- [ ] duplicate folder / duplicate Google Doc を検出できる。
- [ ] `files.list` の pagination を全ページ処理する。
- [ ] Drive name を一意キーとして1件目採用しない。

### State / conflict

- [ ] `githubPath` + `lastSyncedSha256` の最小 metadata で baseline を表現する。
- [ ] `appProperties` 124-byte `key + value` 制約を検証する。
- [ ] state missing + canonical equal を safe adoption できる。
- [ ] state missing + canonical unequal は ambiguous fail。
- [ ] Last Writer Wins を行わない。
- [ ] `modifiedTime` / commit time を winner 判定に使わない。
- [ ] opposite side only changed を wrong direction で上書きしない。
- [ ] both changed + divergent は conflict。
- [ ] Google→Git PR 作成時点で baseline を確定しない。
- [ ] PR merge 後、main push の Git→Google で canonical equality を確認して baseline を確定できる。

### Git → Google safety

- [ ] 全対象 read-only Preflight 後にだけ Apply する。
- [ ] conflict 発見前に Google を変更しない。
- [ ] Preflight で create / update / no-op / state-only / adoption を確定する。
- [ ] Apply 中の partial failure で rollback delete しない。
- [ ] 次回 full Preflight から安全に再実行可能。
- [ ] create ambiguous timeout を reconciliation できる。
- [ ] update indeterminate failure を re-export で reconcile する。

### Google → Git

- [ ] Google 新規 `.md` Doc から Git file を新規作成できる。
- [ ] `.md` でない unmanaged Doc は warning + ignore。
- [ ] 同一 Git path へ複数 Docs が mapping したら fail。
- [ ] managed Doc の current path と `githubPath` mismatch は unsupported rename/move fail。
- [ ] main へ直接 push しない。
- [ ] automation branch / commit / non-force push / PR。
- [ ] auto-merge しない。
- [ ] existing open sync PR は blocked とし、新規 PR を作らない。

### Round-trip / validation

- [ ] 初回は全対象 file を round-trip する。
- [ ] canonical equality を成功条件にする。
- [ ] Validator pass だけで canonical diff を許容しない。
- [ ] 観測されていない adapter を追加しない。
- [ ] spec change 時に `validate:spec` / `validate:spec-visuals:final` / `build:spec` を実行する。
- [ ] curriculum change 時に `validate:curriculum` を実行する。
- [ ] runtime で targeted validation + `pnpm run verify` を二重実行しない。
- [ ] implementation 完了時に `pnpm run verify` を実行する。

### Workflow / OAuth / Security

- [ ] `push main` + target paths で Git→Google が自動実行される。
- [ ] `workflow_dispatch` で Git→Google / Google→Git を選べる。
- [ ] Google→Git schedule を作らない。
- [ ] Workflow は1ファイル。
- [ ] Git→Google job は `contents: read`。
- [ ] Google→Git job は `contents: write` / `pull-requests: write`。
- [ ] direction 共通 concurrency group + `cancel-in-progress: false`。
- [ ] major job に `timeout-minutes` を設定する。
- [ ] OAuth offline access / Refresh Token で unattended execution できる。
- [ ] External + Testing の 7-day Refresh Token 制約を運用条件に反映する。
- [ ] Refresh Token `invalid_grant` 等で Google write 前に安全に停止する。
- [ ] full Drive scope を採用する理由を明記する。
- [ ] Secrets / token / Authorization header を log に出さない。
- [ ] `GITHUB_TOKEN` を維持し、automation PR CI の approval-required behavior を運用注意として扱う。

### Bootstrap completion

- [ ] 全対象列挙、mapping、duplicate check、import/update、re-export、canonical equality、validator、identity、baseline、conflict check が全件成功した時だけ bootstrap successful。
- [ ] summary で created / updated / adopted / no-op / failed を確認できる。
- [ ] 1件失敗時に bootstrap successful と誤表示しない。

---

## 23. 実装手順

実装時は次の順序を基本とする。

- [ ] 1. 実装時点の `main` と Repository conventions を再確認する。
- [ ] 2. target path policy / Drive path mapping / duplicate rule を pure logic として実装する。
- [ ] 3. minimal canonicalization / SHA-256 / `appProperties` validation を実装する。
- [ ] 4. `B / G / D` decision table と safe adoption を pure logic として実装・test する。
- [ ] 5. OAuth Refresh Token → Access Token の小さな REST boundary を実装する。
- [ ] 6. Drive REST client に list pagination / export / update / create / metadata update を実装する。
- [ ] 7. retry policy と create / folder / update reconciliation を実装・test する。
- [ ] 8. Git→Google read-only Preflight を実装し、failure 時 write 0 を test する。
- [ ] 9. Git→Google Apply を実装し、post-write re-export / baseline finalize / safe rerun を test する。
- [ ] 10. Google→Git discovery / new Doc / conflict / working-tree update を実装する。
- [ ] 11. targeted validation / changed-file allowlist / open PR blocked guard を実装する。
- [ ] 12. automation branch / commit / `gh auth setup-git` / non-force push / PR 作成を既存 convention に合わせる。
- [ ] 13. `package.json` に同期 CLI command を追加する。
- [ ] 14. `.github/workflows/google-docs-sync.yml` を1ファイルで追加し、push / workflow_dispatch / job permissions / shared concurrency / timeout を実装する。
- [ ] 15. unit / fake boundary test を完了する。
- [ ] 16. GitHub Secrets を設定し、current `main` の全対象で initial bootstrap を実行する。
- [ ] 17. 全対象 strict canonical round-trip を確認する。
- [ ] 18. canonical diff があれば bootstrap を止め、実際に観測した construct だけ regression fixture + 最小 adapter で対応する。
- [ ] 19. Google existing Doc edit → Google→Git PR を live 検証する。
- [ ] 20. Google new `.md` Doc → Git new Markdown PR を live 検証する。
- [ ] 21. Git new Markdown → Google new Doc を live 検証する。
- [ ] 22. both-side conflict / opposite-side-only change / rename-move / duplicate / create timeout 相当を検証する。
- [ ] 23. Google→Git PR merge 後の `main` push → Git→Google safe adoption / baseline finalize を確認する。
- [ ] 24. implementation 最終差分で `pnpm run verify` を実行する。

---

## 24. Plan 修正時点の Validation / 参照

Plan 実装時には以下の command 名が `package.json` に存在することを再確認済み。

```text
lint:markdown
validate:spec
validate:spec-visuals:final
validate:curriculum
build:spec
verify
```

Plan-only 修正の validation は次を使用する。

```bash
pnpm exec prettier --check docs/plans/2026-09-07_201539_google-docs-markdown-sync.md
pnpm run lint:markdown
git diff --check
git diff --name-only
```

Plan-only のため `pnpm run verify` はこの修正では必須にしない。

---

## 25. 成果物 / 変更境界

この Plan 修正で変更する file:

```text
docs/plans/2026-09-07_201539_google-docs-markdown-sync.md
```

実装時の変更候補:

```text
.github/workflows/google-docs-sync.yml
scripts/docs/google-docs-sync/**
tests/unit/google-docs-sync*.test.ts
package.json
```

依存追加は初期方針では不要のため `pnpm-lock.yaml` 変更は想定しない。

runtime の Google → Git が content として変更してよいのは:

```text
docs/spec/**/*.md
docs/curriculum/**/*.md
```

のみ。

---

## 26. Branch / Base

Branch:

```text
feat/google-docs-markdown-sync
```

Plan 作成時 base:

```text
856a14eb448a6ad6bf9722f623cf0d094b7a7d2a
```

実装開始時には base の固定 SHA を信頼せず、その時点の `main` を再取得して Repository conventions / package scripts / Google API 仕様に drift がないか確認する。

---

## 27. 実装時の優先順位

1. **対象 glob の hard boundary**
2. **全件 read-only Preflight before Apply**
3. **canonical hash による data-loss prevention**
4. **strict all-file round-trip equality**
5. **safe adoption / baseline lifecycle**
6. **create / update reconciliation と safe rerun**
7. **新規追加の双方向対応**
8. **targeted validation + PR automation**
9. **運用上の利便性**

安全性を上げない抽象化や将来用途の機能は追加しない。
