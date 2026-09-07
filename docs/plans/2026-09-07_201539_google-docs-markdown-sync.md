# Google Docs ↔ Markdown 双方向同期 実装計画

## 0. 依頼概要

### 目的

`docs/spec/**/*.md` と `docs/curriculum/**/*.md` だけを対象に、1 Markdown = 1 Google Doc の対応で Google Docs と GitHub の双方向同期を構築する。

Google Docs は人間が編集しやすい編集面として使い、Git 側では既存のレビュー、履歴管理、Markdown lint、仕様 Validator、カリキュラム Validator を維持する。

同期は Last Writer Wins にせず、前回同期 baseline と現在の Git / Google canonical content を比較して安全に判定する。同期先を一意に決定できない場合、双方変更が競合する場合、Preflight 後に Google 側が変化した場合は、自動上書きせず停止する。

### 期待成果

- Git → Google:
  - `main` の対象 Markdown 変更を Google Docs へ反映する。
  - 対応 Google Doc がなければ作成する。
  - 対応 Google Doc があれば同じ file ID を維持して内容を全面更新する。
  - 全件 read-only Preflight の後、各 write 直前にも snapshot freshness を確認する。
- Google → Git:
  - Google Docs を `text/markdown` で export する。
  - Git content 変更が必要なら targeted validation 後に automation branch / commit / push / Pull Request を作る。
  - `main` へ直接 push しない。
  - Git `main` と Google が既に canonical equal で PR 不要なら、safe adoption / converged state-only finalize を許可する。
- 初回:
  - 対象全ファイルを Git → Google で bootstrap する。
  - 全対象で Markdown → Google Docs → Markdown の round-trip を行い、strict canonical equality を確認する。
- 安全性:
  - conflict / duplicate / ambiguous mapping / unsupported rename・move / stale Preflight を write 前に検出する。
  - create / update の不確定失敗は blind retry せず reconciliation する。
  - 自動 delete / rename / move / conflict 解決は実装しない。

---

## 1. 対象範囲

同期対象は次の 2 glob **だけ**とする。

```text
docs/spec/**/*.md
docs/curriculum/**/*.md
```

Repository 相対 path を `/` 区切りへ正規化したうえで対象判定する。

### Google Drive 側の対応範囲

Git の `docs/` より下の階層を、指定した同期 root folder 配下へ mirror する。

```text
Git:
docs/spec/features/cart.md

Google Drive:
<sync-root>/spec/features/cart.md
```

`cart.md` は通常ファイルではなく Google Docs MIME type の Google Doc とし、表示名に `.md` を含める。

### 初期版の Drive 対応範囲

- 同期 root は **My Drive 配下の folder のみ**正式対応する。
- Shared Drive は初期版では非対応。
- root が Shared Drive 配下と判定された場合は `unsupported Shared Drive root` として fail する。
- Shared Drive 対応のための `supportsAllDrives`、`includeItemsFromAllDrives`、`driveId` 指定、`corpora=drive` 等は初期版へ追加しない。

---

## 2. 非対象 / Non-goals

以下は初期版では実装しない。

- `docs/spec/**/*.md` / `docs/curriculum/**/*.md` 以外の同期
- Google Docs Document Tabs を使った複数 Markdown の集約
- 自動 delete / Trash / Trash 復元
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
- Google 側編集 lock / cross-system transaction
- 観測されていない Markdown 差分への先回り adapter
- Service Account
- Workload Identity Federation
- PAT
- GitHub App
- Workflow の方向別ファイル分割
- Shared Drive
- 将来用途だけを目的とした過度な class / interface 分割
- Git 側画像 asset 自体の Google Drive 同期

---

## 3. 現状理解 / Repository・Google API 整合性

### 3.1 Repository

現在の Repository では次を確認済み。

- `package.json` に以下が存在する。
  - `format:check`
  - `lint:markdown`
  - `validate:spec`
  - `validate:spec-visuals:final`
  - `validate:curriculum`
  - `build:spec`
  - `verify`
- `verify` は Markdown / spec / curriculum だけでなく lint、typecheck、test、web build 等も含む重い総合検証である。
- `.github/workflows/ci.yml` は GitHub Actions を commit SHA で pin し、`persist-credentials: false`、job timeout、最小権限を利用する。
- `.github/workflows/expo-dependency-maintenance.yml` には、重い処理より前の open PR guard、automation branch、`GITHUB_TOKEN`、`gh auth setup-git`、non-force push、`gh pr create`、`cancel-in-progress: false` の既存 convention がある。
- `scripts/spec/validate-all.ts`、`scripts/validate-curriculum.ts`、`scripts/spec/build-spec.ts` が対象 Markdown の既存契約を検証 / build する。
- 対象 Markdown には table、fenced code block、inline code、relative link、anchor、relative image、`.webp`、BR / AC / SCREEN 等の識別子、ordered / unordered list 等が含まれ、Validator pass だけでは Google round-trip の意味同一性を保証できない。

### 3.2 Google Drive / OAuth 公式仕様

実装時は Google 公式仕様を正本とする。主要参照:

- Google Docs の Markdown export:
  - <https://developers.google.com/workspace/drive/api/guides/ref-export-formats>
- upload / Markdown import / Google Workspace conversion / update:
  - <https://developers.google.com/workspace/drive/api/guides/manage-uploads>
- `File` resource:
  - <https://developers.google.com/workspace/drive/api/reference/rest/v3/files>
- `files.list`:
  - <https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list>
- `about.importFormats` / `about.exportFormats`:
  - <https://developers.google.com/workspace/drive/api/reference/rest/v3/about>
- custom file properties / `appProperties`:
  - <https://developers.google.com/workspace/drive/api/guides/properties>
- Drive OAuth scopes:
  - <https://developers.google.com/workspace/drive/api/guides/api-specific-auth>
- OAuth offline access / Refresh Token:
  - <https://developers.google.com/identity/protocols/oauth2/web-server>

確認済みの前提:

- Google Docs は Drive API `files.export` で `text/markdown` へ export できる。
- Markdown は Google Docs への import format としてサポートされる。
- Google Docs へ media を伴う `files.update` を行うと document full contents が置換される。
- `about.importFormats` / `about.exportFormats` は現在利用可能な conversion format を返すため、runtime capability check に利用できる。
- `files.list` は `nextPageToken` がある限り全ページ取得する。
- Drive では同一 parent に同名 item が存在できるため、name を一意キーとして扱わない。
- `File.version` は server 上の変更ごとに増える単調増加値である。winner 判定には使わず、Preflight snapshot の freshness 判定にだけ使う。
- `File.capabilities` は current user が item に対して実行可能な action を表す。Preflight で予定 action の権限確認に使う。
- `File.trashed` を使い、active candidate は `trashed = false` に限定する。
- Shared Drive item の判定に必要な metadata（`driveId` 等）は取得できる。初期版では Shared Drive と判定した root を fail するだけで、Shared Drive 処理を実装しない。
- `appProperties` は private custom property として利用できるが、1 property の UTF-8 `key + value` は最大 124 bytes、1 application あたり private property は最大 30 個である。
- OAuth offline access により unattended execution で Refresh Token から Access Token を取得できる。
- External + Testing の OAuth consent screen で Drive scope を利用する場合、Refresh Token が 7 日で失効する制約がある。
- `drive.file` は narrower scope だが、Drive UI から人間が直接作成した未登録 Doc の自動探索要件とは相性が悪いため、初期版は full Drive scope を使う。
- Google は Markdown source の byte-for-byte round-trip を保証していないため、実 Repository 全件で canonical round-trip を実証する。
- Google Workspace format への conversion create では pre-generated ID による idempotent create を前提にできないため、create の不確定失敗は Drive 再検索で reconcile する。
- Drive API の media update に cross-system transaction / atomic compare-and-swap があるとは仮定しない。

---

## 4. 前提条件 / OAuth・Secrets

### 4.1 OAuth

初期版は OAuth Client ID / Client Secret / Refresh Token を維持し、Refresh Token 取得時は `access_type=offline` を使用する。

継続運用では External + Testing の 7-day Refresh Token 制約を受けない適切な OAuth 設定を使う。

- Google Workspace 組織内だけで使う Internal app
- External app を継続運用可能な In production / Published 状態へ移行した構成

token endpoint が `invalid_grant` 等を返した場合:

1. 明確な認証エラーとして扱う。
2. Google write を開始しない。
3. Workflow を fail する。
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

- 同期 root 配下へ人間が Drive UI から直接作成した新規 Google Doc を自動探索する必要がある。
- `drive.file` は今回の discovery model に合わない。
- scope 縮小のためだけに Picker / 独自登録 UI を追加しない。

full Drive scope は強い権限なので、操作範囲を検証済み My Drive sync root 配下へ hard-bound する。

### 4.3 GitHub Secrets

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
- Secret として管理する root folder ID の生値

---

## 5. Drive root / path / identity contract

### 5.1 root validation

Google API を使った target discovery の前に `GOOGLE_DRIVE_ROOT_FOLDER_ID` 自体を `files.get` で検証する。

最低条件:

- item が存在する。
- `trashed == false`。
- `mimeType == application/vnd.google-apps.folder`。
- My Drive 配下である。Shared Drive item と判定された場合は `unsupported Shared Drive root` で fail。
- children を list できる。
- direction と予定 action に必要な capability を持つ。

root 不正時は target 探索へ進まない。

初期版では Shared Drive 対応 parameter を追加しない。

### 5.2 import / export runtime capability check

OAuth / root validation の初期段階で1回だけ `about.get` を実行し、少なくとも以下を確認する。

- `importFormats` で `text/markdown` → Google Docs (`application/vnd.google-apps.document`) の conversion が利用可能。
- `exportFormats` で Google Docs → `text/markdown` が利用可能。

満たさなければ Google write 前に fail する。file ごとには確認しない。

### 5.3 Drive hierarchy

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

`docs/spec/features/cart.md` は `<sync-root>/spec/features/cart.md` に対応する。

### 5.4 active item discovery / fields

子 item の探索 query は `trashed = false` を必須とし、Trash item を candidate / duplicate 数へ含めない。

`files.list` は `nextPageToken` がなくなるまで処理し、必要 field のみ取得する。少なくとも次の情報を取得する。

```text
nextPageToken
files.id
files.name
files.mimeType
files.parents
files.trashed
files.appProperties
files.version
files.capabilities
files.modifiedTime
files.driveId   # My Drive / Shared Drive判定に必要な場合
```

`files.get` でも予定 action / stale check に必要な同種 field を明示する。

`modifiedTime` は diagnostics のみで、winner 判定には使わない。

### 5.5 name / duplicate

同一 parent / 同一 folder name:

| 件数 | 判定 |
| --- | --- |
| 0 | direction / plan に応じて create 候補 |
| 1 | 利用 |
| 2 以上 | ambiguous。fail |

同一 parent / 同一 `.md` name / Google Docs MIME type:

| 件数 | 判定 |
| --- | --- |
| 0 | direction / state に応じて create 候補 |
| 1 | 利用 |
| 2 以上 | ambiguous。fail |

別 parent の同名 item は問題にしない。

### 5.6 Drive item name → Git path segment

Drive の folder / Doc name 1件を **必ず1 Git path segment** として扱う。name 内の文字を新しい directory separator として解釈しない。

最低限拒否する name:

```text
/
\\
.
..
NUL
control characters
```

さらに Repository path として安全でない path escape、正規化後の segment 消失、異なる Drive path が同一 Git path へ衝突する normalization collision を fail する。

`foo/bar.md` という1つの Google Doc name を `foo/` + `bar.md` に分解してはいけない。

日本語 / Unicode 一般は禁止しない。

### 5.7 capabilities

full Drive scope を持っていても item ごとの実権限は保証されないため、Preflight で **予定 action に必要な capability** を確認する。

例:

- folder discovery: children を list 可能。
- folder / Doc create: parent へ child を追加可能。
- existing Doc content update: content を変更可能。
- metadata state-only update: metadata update に必要な edit capability。

具体的な `File.capabilities` field 名は実装時点の公式仕様を正本とし、Planの例だけを盲目的に固定しない。permission failure を write 開始後まで持ち越さないことが目的である。

### 5.8 rename / move

managed Doc の `appProperties.githubPath` と、現在の Drive folder hierarchy + Google Doc name から導出した Git path が異なる場合:

```text
unsupported rename/move
```

として fail する。

Git 側でも旧 path 削除 + 新 path 追加を rename と推測しない。

---

## 6. Canonicalization / sync metadata

### 6.1 canonical representation

Git / Google の同期判定は raw bytes / `modifiedTime` / commit time ではなく、同一 canonicalization 後の SHA-256 で行う。

初期 canonicalization:

1. CRLF / CR → LF
2. EOF newline を Repository 契約へ統一
3. Repository 既存 Prettier による Markdown formatting

Google Docs 固有挙動を推測した変換は追加しない。

### 6.2 strict round-trip

初回 bootstrap:

```text
Git Markdown
→ canonicalize
→ Google Docs import
→ Google Docs export text/markdown
→ canonicalize
→ equality check
```

原則成功条件:

```text
Git canonical SHA-256 == Google export canonical SHA-256
```

Validator pass だけで差分を許容しない。

差分が残る場合:

1. bootstrap fail。
2. raw / canonical diff を確認。
3. Google Docs 由来の非意味的変換であることを実測確認。
4. 必要な場合だけ最小 adapter / normalization を追加。
5. 観測 construct を fixture / regression test 化。
6. 全対象 round-trip を再実行。

### 6.3 sync metadata

managed Google Doc の `appProperties` に次だけを必須 state として保持する。

```text
githubPath = "docs/spec/features/cart.md"
lastSyncedSha256 = "<canonical SHA-256>"
```

- `githubPath`: identity / rename・move 検出。
- `lastSyncedSha256`: Git と Google が最後に同じ canonical content へ収束した単一 baseline。

以下は初期版では持たない。

```text
qaTrainingStoreSync
lastGitSha256
lastGoogleSha256
```

`appProperties` write 前に 124-byte `key + value` 制約を UTF-8 bytes で検証し、超過時は fail する。path hash 等へ自動フォールバックしない。

---

## 7. Sync state / Decision Table（同期判定の唯一の正本）

以降の flow / Risk / DoD は **この Section 7 の判定を正本**とし、同じ状態遷移を別定義しない。

記号:

```text
B = appProperties.lastSyncedSha256
G = current Git main canonical SHA-256
D = current active Google Doc export canonical SHA-256
```

`changed / unchanged` は `B` との比較を意味する。

### 7.1 existence / baseline / content decision

| Git | active Google | Baseline | 現在状態 | Git → Google | Google → Git |
| --- | --- | --- | --- | --- | --- |
| なし | なし | なし | 対象なし | no-op | no-op |
| あり | なし | baseline取得不能 | remaining Git のみ | Google Doc create / recreate | pending opposite-direction restoration。Gitを削除しない |
| なし | あり | なし | Google-only new | pending opposite-direction restoration。Docを削除しない | Git create PR |
| なし | あり | あり | Git missing / managed Google remains | pending opposite-direction restoration。Docを削除しない | Git recreate PR。PR mergeまでBは進めない |
| あり | あり | なし | `G == D` | safe adoption / state-only finalize | safe adoption / state-only finalize。ただしSection 10のfreshness条件を満たし、runがPR不要の場合のみ |
| あり | あり | なし | `G != D` | ambiguous fail | ambiguous fail |
| あり | あり | あり | `G == B && D == B` | no-op | no-op |
| あり | あり | あり | `G != B && D == B` | Git changed → update候補 | direction mismatch fail |
| あり | あり | あり | `G == B && D != B` | direction mismatch fail | Google changed → Git update PR候補 |
| あり | あり | あり | `G != B && D != B && G == D` | converged → state-only finalize | converged → state-only finalize。ただしSection 10のfreshness条件を満たし、runがPR不要の場合のみ |
| あり | あり | あり | `G != B && D != B && G != D` | conflict fail | conflict fail |

重要:

- active Google Doc が missing の場合、baseline state はその Doc の `appProperties` とともに読めない。実装は「過去にbaselineがあったか」を推測せず、remaining Git を source とする recreate contract を適用する。
- trashed Doc は active Google Doc なしとして扱う。Trash から復元しない。
- wrong direction では remaining side を削除 / 上書きしない。
- `version` / `modifiedTime` / commit time で newer side を勝たせない。

### 7.2 safe adoption / converged finalize

Google → Git でも、**Git content変更・PRが不要な run** では state-only finalize を許可する。

#### baselineなし + `G == D`

```text
safe adoption
```

- content write なし。
- `githubPath` を確定 / 検証。
- `lastSyncedSha256 = G` を保存可能。
- PRなし。

#### baselineあり + `G == D` + `B != G`

```text
converged
```

- content write なし。
- `lastSyncedSha256 = G` へ更新可能。
- PRなし。

ただし Google → Git の state-only finalize は Section 10 の以下をすべて満たす場合だけ行う。

- `origin/main` が開始時 `initialMainSha` から進んでいない。
- Google snapshot が write 直前まで変わっていない。
- 現在も `G == D`。
- run 内に Git content変更を必要とする target がなく、PRを作らない。

### 7.3 content PR と baseline

Google → Git で Git content変更が必要な場合:

```text
Google export
→ Git working tree
→ validation
→ branch
→ commit
→ push
→ PR
```

この run では Google baseline / `githubPath` を進める state write を行わない。

PR close / reject:

```text
baseline unchanged
```

PR merge:

```text
main push
→ Git → Google
→ Section 7 decision
→ G == D を確認
→ state-only finalize
```

で baseline を確定する。

### 7.4 deletion / missing contract

削除は同期イベントとして伝播しない。

- Git exists / Google missing:
  - Git → Google で recreate。
  - create後に strict round-trip equality、`githubPath`、`lastSyncedSha256` を再確定。
  - Google → Git では Gitを削除せず pending opposite-direction restoration。
- Git missing / Google exists:
  - Google → Git で Git recreate PR。
  - PR mergeまでは baseline を進めない。
  - Git → Google では Docを削除せず pending opposite-direction restoration。

詳細判定はこの Section 7 を正本とする。

---

## 8. Git → Google: Phase 1 Read-only Preflight

**全対象の Preflight が完了するまで Google Drive / Google Docs を変更しない。**

### 8.1 Git validation

Google write 前:

```bash
pnpm run lint:markdown
```

spec が対象なら:

```bash
pnpm run validate:spec
```

curriculum が対象なら:

```bash
pnpm run validate:curriculum
```

manual 全件同期では spec / curriculum の両 targeted validator を実行する。web build / 全 test suite / `pnpm run verify` は runtime で重複実行しない。

### 8.2 global preflight

1. OAuth token取得。
2. `about.importFormats` / `about.exportFormats` を1回確認。
3. sync root を Section 5.1 どおり検証。
4. Git対象Markdownを全件列挙。
5. root配下を `trashed = false` + pagination で探索。
6. Drive item name / path segmentを検証。
7. duplicate folder / Doc / normalization collisionを検出。
8. 予定actionに必要な capabilities を検証。
9. managed Doc metadata / `appProperties` を検証。
10. Google Docs を export。
11. Git / Google を canonicalizeし `G / D / B` を計算。
12. Section 7 の Decision Table だけで判定。
13. `githubPath` mismatch を unsupported rename/move として検出。
14. create / update / no-op / state-only / pending の Apply plan をメモリ上に構築。

1件でも以下があれば Google write **0件**のまま fail:

- conflict / direction mismatch
- path ambiguity / unsafe path / normalization collision
- duplicate folder / Doc
- unsupported rename / move
- invalid sync metadata / appProperties size overflow
- unsupported Shared Drive root
- root / item capability不足
- import/export capability不足
- export failure after bounded retry
- OAuth failure
- その他、同期先 / state を一意に決定できない状態

### 8.3 Preflight snapshot

既存 managed Doc ごとに Apply の staleness 判定用 snapshot を保持する。

最低限:

```text
fileId
version
D  # preflight Google canonical SHA-256
githubPath
parentId
name
relevant appProperties
```

`modifiedTime` は diagnostics として保持してよいが、winner判定には使わない。

---

## 9. Git → Google: Phase 2 Apply / stale snapshot check

Preflight全件成功後だけ Apply を開始する。

### 9.1 existing Doc content update

`files.update` の **直前** に同じ Doc を再取得 / 再exportする。

最低確認:

1. current `fileId`
2. current `version`
3. current canonical hash
4. current `githubPath`
5. current parent
6. current name
7. relevant `appProperties`
8. 予定actionに必要な capability

以下をすべて満たす場合だけ content update 可能:

```text
current fileId == preflight fileId
current version == preflight version
current canonical hash == preflight D
current githubPath == preflight githubPath
current parent/name == preflight identity
relevant metadata/capability is still valid
```

1つでも違えば:

```text
stale preflight / concurrent Google edit
```

として **そのDocをwriteせず run fail**。

`version` は snapshot freshness detection 専用で、winner 判定に使わない。

update後は必ず re-exportし、desired Git canonical と strict equality を確認してから baseline を更新する。

### 9.2 state-only update / safe adoption

content write を伴わない metadata update でも、古い snapshot に baseline を付けてはいけない。

metadata write 直前に Section 9.1 と同等の freshness check を行い、最低でも:

```text
current canonical == expected canonical
identity unchanged
version unchanged
```

を確認する。

staleなら baselineを書かず fail。

### 9.3 create

既存Doc snapshotはないため、create直前に:

- parent identity / `trashed == false`
- parent capability
- same parent / same name の duplicate再検索
- target path / metadata identity

を再確認する。

createの結果不明は Section 11 の reconciliation に従う。

### 9.4 partial failure / safe rerun

Apply全体は atomic ではない。

- 成功済み Doc / folder を rollback delete しない。
- fail run を successful と扱わない。
- 次回は全件 Preflight から再実行。
- canonical-equal success item は no-op / state-only finalize。
- create / update の結果不明は reconciliation。

### 9.5 Residual TOCTOU Risk

初期版では:

```text
full Preflight
+
write直前 stale snapshot check
+
post-write strict re-export
```

まで行う。

ただし最終 freshness check と実際の Google API update のごく短い間に人間が編集する TOCTOU を完全には排除できない。

Google側編集 lock、paragraph単位編集、cross-system transaction / atomic CAS は初期版では導入しない。

---

## 10. Google → Git flow

Google → Git は `workflow_dispatch` の manual direction のみ。scheduleは作らない。

### 10.1 early guard / initial main snapshot

重い処理より先に:

1. manual ref が `main` であることを確認。
2. `main` を checkout。
3. checkout SHA を `initialMainSha` として保存。
4. open Google Docs sync PR guard を実行。
5. open sync PR があれば `blocked` として終了し、dependency install / Google OAuth / discovery へ進まない。
6. dependency install。
7. OAuth / about capability / root validation。
8. Google discovery / export。

既存Expo automation Workflowと同様、duplicate/open PR guardを重い処理より前へ置く。

### 10.2 discovery

Section 5 の root / Trash / path / duplicate / capability contractに従う。

| Google item | 扱い |
| --- | --- |
| sync root 外 | 無視 |
| root配下だが `spec/` / `curriculum/` 外 | 無視 |
| Google Docs MIME type以外 | 無視 |
| target subtree内のDocだが `.md` で終わらない | warning + 無視 |
| `.md` かつ安全なGit pathへ一意変換可能 | candidate |
| 同一Git pathへ複数Docs mapping | ambiguous fail |
| managed Doc の `githubPath` と derived path 不一致 | unsupported rename/move fail |

candidate の状態判定は Section 7 だけを使用する。

### 10.3 PR不要の state-only finalize

run 内に Git content変更 candidate がなく、Section 7 で safe adoption / converged のみが必要な場合:

1. `git fetch origin main`。
2. `current origin/main SHA == initialMainSha` を確認。
3. 異なれば `main advanced during sync` で fail。
4. metadata write直前に Google Doc metadata + version + export を再取得。
5. snapshot identity / version / canonical が unchanged であることを確認。
6. 現在も checkout `G == D` であることを確認。
7. `githubPath` / `lastSyncedSha256` を state-only update。
8. PRは作らない。

Google snapshotまたはmainが変わっていれば baseline を書かない。

### 10.4 Git content変更が必要な場合

Google changed / Git unchanged、または Google-only target の restore は Section 7 に従い working tree update / create candidate とする。

1. Google export結果をworking treeへ反映。
2. changed MarkdownのみPrettier。
3. target-only changed-file allowlist。
4. targeted validation。
5. validation後も allowlist を再確認。
6. `git fetch origin main`。
7. `current origin/main SHA == initialMainSha` を確認。
8. 異なれば `main advanced during sync` として fail。自動rebase / merge /再判定しない。
9. automation branch作成。
10. target Markdownのみcommit。
11. `gh auth setup-git`。
12. explicit branchをnon-force push。
13. `gh pr create --base main`。
14. auto-mergeしない。

この run では Google baseline / `githubPath` を進める write を行わない。

### 10.5 main race

Google → Git開始後に別PR merge等で `origin/main` が進んだ場合、古いbaseのPRを作らない。

```text
main advanced during sync
→ fail
→ workflow再実行
```

初期版では自動rebase / merge / incremental re-evaluationを実装しない。

---

## 11. Retry / reconciliation

### 11.1 bounded retry

小さい bounded retry + backoff / jitter を許可:

- `files.list`
- `files.get`
- `files.export`
- `about.get`
- token refresh の一時的 transport failure
- 429
- 一時的 500 / 502 / 503 / 504
- same file ID / same desired body の update で、reconciliation後に安全と確認できる場合

### 11.2 原則retryしない

- 400系入力エラー
- `invalid_grant` 等 OAuth semantic error
- permission / capability failure
- conflict / stale preflight
- invalid metadata
- ambiguous mapping / duplicate
- unsupported rename / move / Shared Drive
- canonical round-trip mismatch

### 11.3 `files.create`

timeout / connection reset / 5xx 等で成功不明なら blind retryしない。

same:

1. parent
2. name
3. Google Docs MIME type
4. `appProperties.githubPath`

で `trashed = false` + pagination付き再検索。

| 結果 | 処理 |
| --- | --- |
| 0件 | create retry可能 |
| 1件 | 作成済みとしてfile ID再利用 |
| 2件以上 | ambiguous fail |

folder createも same parent / name / folder MIME type で reconcile。

### 11.4 `files.update`

update成功不明時は同じ file ID を metadata get + re-export。

- current canonical == desired canonical:
  - update成功済みとして post-write equality / metadata finalizeへ。
- current canonical == pre-write snapshot canonical かつ identity/version関係が安全:
  - fresh stale check をやり直したうえで bounded retry可能。
- それ以外:
  - concurrent edit / unexpected mutation として failし、上書きしない。

### 11.5 state metadata update

metadata update成功不明時は `files.get` で desired `appProperties` と current version / identity をreconcileする。

- desired stateが反映済み: success。
- old stateのまま、Google content / identityもfresh: bounded retry可能。
- unexpected state / content: fail。

---

## 12. GitHub Actions Workflow

### 12.1 1 Workflow

```text
.github/workflows/google-docs-sync.yml
```

1ファイルのみ。

### 12.2 Trigger

概念:

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

- `push` to `main`: Git → Google。
- `workflow_dispatch`: direction明示、refは`main`限定。
- Google → Git scheduleなし。

### 12.3 permissions

Git → Google job:

```text
contents: read
```

Google → Git job:

```text
contents: write
pull-requests: write
```

既存 convention:

- pinned Actions
- `persist-credentials: false`
- `GITHUB_TOKEN`
- `gh auth setup-git`
- explicit non-force branch push
- `gh pr create`

PAT / GitHub App は追加しない。

### 12.4 concurrency / timeout

direction共通:

```text
group: google-docs-markdown-sync
cancel-in-progress: false
```

各主要jobへ `timeout-minutes` を設定する。初期値は30分程度とし、実測なしに過度に延長しない。

### 12.5 automation PR CI

`GITHUB_TOKEN` 由来PRでは GitHub Actions の挙動により approval-required となる場合があるため、Google → Git targeted validation は **PR作成前** に必須。

PR自動mergeはしない。

---

## 13. Validation

### 13.1 Google → Git runtime

全変更Markdown:

```bash
pnpm exec prettier --write <changed markdown files only>
pnpm run lint:markdown
git diff --check
```

spec変更あり:

```bash
pnpm run validate:spec
pnpm run validate:spec-visuals:final
pnpm run build:spec
```

curriculum変更あり:

```bash
pnpm run validate:curriculum
```

### 13.2 Git → Google runtime

Google write前:

```bash
pnpm run lint:markdown
```

spec対象:

```bash
pnpm run validate:spec
```

curriculum対象:

```bash
pnpm run validate:curriculum
```

### 13.3 `pnpm run verify`

- runtime: targeted validationのみ。
- implementation完了時: `pnpm run verify` を実行。
- 通常PR: repository CI。

同期Workflow内で targeted validation + `verify` を重複実行しない。

---

## 14. Initial bootstrap

current `main` の対象全件を使用し、3ファイルPoCは行わない。

### Flow

1. targeted validator。
2. about/root validation。
3. full read-only Preflight。
4. duplicate / conflict / ambiguity 0。
5. Apply。
6. 各write直前 stale check。
7. import / update。
8. re-export。
9. canonical equality。
10. identity / baseline finalize。
11. targeted validator再確認。
12. 全件summary。

### Completion

全対象について以下すべて成功時だけ `bootstrap successful`。

- 列挙
- root / path mapping
- duplicateなし
- import / update
- pre-write stale check
- re-export
- canonical equality
- validator
- identity
- baseline
- conflict / ambiguityなし

summary:

```text
created
updated
adopted
state-only
no-op
pending
failed
```

1件でもfailなら成功表示しない。

partial failureでは成功済みDocをdeleteせず、次回full Preflightからsafe rerunする。

---

## 15. Error handling / Security

### Fail-safe

- OAuth / root / capability failure
- unsupported Shared Drive root
- path traversal / unsafe segment / normalization collision
- duplicate / ambiguous mapping
- invalid `appProperties`
- `githubPath` mismatch
- unsupported rename/move
- conflict / direction mismatch
- stale Preflight / concurrent edit
- canonical round-trip mismatch
- target allowlist violation
- unexpected managed MIME type
- create reconciliation 2件以上
- update reconciliation unexpected content
- `main advanced during sync`

### Warning / ignore

- sync root外
- target subtree外
- Google Docs以外
- target subtree内だが `.md` で終わらない unmanaged Doc

### Logs

file path、action、HTTP status、bounded retry count、diagnostic `version` / `modifiedTime` は出してよい。

credential / token / Authorization header / raw auth response は出さない。

---

## 16. Tests

API自体を再実装する過剰mockは避け、decision / path / request contract / orchestration boundaryを固定する。

### 16.1 Path / Drive

- target path allow / deny
- Windows separator normalization
- `/` / `\\` / `.` / `..` / NUL / control char をDrive item nameとして拒否
- 1 Drive item nameが複数Git segmentにならない
- root escape
- normalization collision
- duplicate folder / Doc
- same name different parent許可
- `githubPath` mismatch
- appProperties byte-size overflow
- `.md`でないDoc warning / ignore
- `trashed=true`はactive candidateにしない
- invalid root ID
- root non-folder
- root trashed
- Shared Drive root → unsupported fail
- insufficient capability
- `files.list` pagination
- about import/export capability不足 → write前fail

### 16.2 State / baseline

- Bなし / G==D → safe adoption
- Bあり / G==D / B!=G → converged state finalize
- Bなし / G!=D → ambiguous
- unchanged / unchanged
- Git-only changed
- Google-only changed
- both changed + G==D
- both changed + divergent
- wrong-direction overwrite prevention
- Git exists / Google missing → Git→Google recreate
- Git missing / Google exists → Google→Git recreate PR
- wrong directionではdeleteしない
- Google→Git PR必要run → baseline不変
- PR close → baseline不変
- PR merge → Git→Googleでbaseline finalize
- `modifiedTime` / `version`をwinner判定に使わない

### 16.3 Concurrent edit / stale snapshot

- Preflight後、Apply前にGoogle `version`変化 → updateせずfail
- Preflight後、Google canonical変化 → updateせずfail
- identity / relevant metadata unexpected change → updateせずfail
- state-only update直前にGoogle content変化 → baselineを書かない
- post-write equalityが成功しても pre-write stale checkを省略しない
- state-only Google→Git finalize時、Google snapshot変化 → baselineを書かない

### 16.4 Retry / reconciliation

- create timeout → search 0 / 1 / 2+
- folder create reconciliation
- update timeout → desired / old / third content
- metadata update reconciliation
- 400 / auth / conflict / staleはretryしない

### 16.5 Main race / Workflow

- Google→Git開始後 origin/main SHA変化 → PR作成せずfail
- state-only finalize前 origin/main SHA変化 → baselineを書かない
- open sync PR → dependency install / Google sync開始前にblocked
- full Preflight failure → Google write 0
- Apply partial failure → rollback deleteなし
- targeted validation failure → PRなし
- changed-file allowlist violation → PRなし

### 16.6 Round-trip fixtures

全件bootstrapで**実際に観測された** constructだけ fixture化する。先回りadapterは作らない。

---

## 17. 実装責務 / ファイル構成方針

必要責務:

- OAuth token refresh
- Drive REST client
- about capability check
- My Drive root validation
- target discovery / pagination / Trash filtering
- path segment / mapping / duplicate detection
- canonicalization / SHA-256
- sync metadata
- Section 7 decision logic
- Preflight snapshot model
- stale snapshot check
- Git → Google Apply
- Google → Git initialMainSha / state-only finalize / working tree update
- retry / reconciliation
- targeted validation
- GitHub PR orchestration

実装先は `scripts/docs/` 配下を基本とし、数百行の単一巨大fileと1 function = 1 fileの両極端を避ける。

初期案:

```text
scripts/docs/google-docs-sync/
  cli.ts
  drive-client.ts
  sync.ts
  state.ts
  path-mapping.ts
```

責務が自然にまとまるなら統合 / 分割してよい。

Node標準 `fetch` を使い、大型Google SDK dependencyは追加しない。

---

## 18. Workflow / PR 運用

### Git → Google

```text
main push / manual
→ targeted validation
→ about + root validation
→ full read-only Preflight
→ per-item stale check
→ Apply
→ post-write strict re-export
```

Googleだけ変更されたmanaged DocをGitで上書きしない。

### Google → Git

```text
manual main
→ checkout + initialMainSha
→ open PR guard
→ install
→ OAuth / about / root validation
→ discovery/export
→ Section 7 decision
```

- PR不要: main freshness + Google snapshot freshness後にstate-only finalize。
- PR必要: working tree → validation → main freshness → branch / commit / push / PR。baseline writeなし。

---

## 19. 削除 / Trash

削除は同期イベントとして伝播しない。

- active Google探索は `trashed = false`。
- trashed managed Doc は active missing と扱う。
- Trashから自動復元しない。
- Trash itemをduplicate candidateへ数えない。
- Trash itemを自動deleteしない。
- remaining sideから**正しい方向**で同期した場合に再生成される。

詳細な missing-side decision は Section 7 を正本とする。

---

## 20. リスク

### R1. Markdown round-trip incompatibility

- 全件bootstrap。
- canonical equality。
- Validator passだけで許容しない。
- 観測差分だけ最小adapter + regression fixture。

### R2. Apply partial success

- full Preflight。
- per-item stale check。
- post-write re-export。
- rollback deleteなし。
- safe rerun。

### R3. create / update ambiguity

- blind retry禁止。
- create / folder / update / metadata reconciliation。
- ambiguousならfail。

### R4. full Drive scope

- Secrets。
- log redaction。
- validated My Drive root hard-bound。
- Shared Drive unsupported。

### R5. Human edit during Apply

対策:

- full read-only Preflight。
- snapshotに `fileId` / `version` / canonical hash / identity / relevant metadataを保持。
- content write直前に snapshot freshness を再確認。
- staleならwriteせずfail。
- state-only metadata updateでも同様にfreshness確認。
- update後はstrict re-export。

Residual Risk:

- final freshness check と Google API update の間の TOCTOU は完全には排除できない。
- Google側編集lock、paragraph単位編集、cross-system transaction / atomic CASは初期版では導入しない。

### R6. Google → Git main race

- `initialMainSha`を固定。
- state-only finalize / PR作成前に `origin/main` freshness確認。
- advancedならfailして再実行。
- 自動rebase / mergeなし。

### R7. Automation PR CI approval

- PR作成前 targeted validation。
- auto-mergeなし。
- PAT / GitHub Appなし。

---

## 21. Open questions

Blockingな未確定事項はなし。

Shared Driveは未確定事項ではなく **初期版 unsupported** と確定する。

実データでのみ確認する事項:

- Google Docs Markdown import / exportで、current Repositoryのどのconstructにcanonical diffが発生するか。

これはinitial all-file bootstrapの実測事項であり、差分が残ればbootstrap successfulとしない。

---

## 22. Definition of Done

### Scope / Drive boundary

- [ ] 対象が2 globのみにhard-bound。
- [ ] 1 Markdown = 1 Google Doc。
- [ ] Drive hierarchy / `.md` naming contract確定。
- [ ] initial versionはMy Driveのみ。
- [ ] Shared Drive rootをunsupported failできる。
- [ ] root存在 / folder / `trashed=false` / My Drive / list capabilityを検証。
- [ ] active探索は`trashed=false`。
- [ ] about import/export capabilityをruntime確認。
- [ ] `files.list` pagination全ページ対応。
- [ ] 必要なDrive response fieldsを明示。
- [ ] planned actionに必要なcapabilityをPreflight確認。
- [ ] Drive item nameを安全な1 Git path segmentとして検証。
- [ ] duplicate / normalization collisionをfail。

### State / decision

- [ ] Section 7を同期判定の唯一の正本とする。
- [ ] `githubPath` + `lastSyncedSha256`でbaseline表現。
- [ ] state missing + `G==D` safe adoption。
- [ ] Google→GitでもPR不要ならsafe adoption / converged finalize可能。
- [ ] Google→Git content PR runではmerge前にbaselineを進めない。
- [ ] PR merge後 Git→Googleでbaseline finalize。
- [ ] baselineあり / なしを含む片側missing decisionが明確。
- [ ] deleteを逆側へ伝播しない。
- [ ] Last Writer Winsなし。
- [ ] `version` / `modifiedTime` / commit timeをwinner判定に使わない。

### Git → Google safety

- [ ] 全件read-only Preflight後だけApply。
- [ ] Preflight snapshotにfileId/version/D/identity/metadataを保持。
- [ ] content write直前にsnapshot staleness再確認。
- [ ] Preflight後のGoogle human edit検出時、content writeしない。
- [ ] state-only metadata update前にもGoogle snapshot再確認。
- [ ] create直前にparent / duplicate / capability再確認。
- [ ] post-write strict re-export。
- [ ] create / update ambiguous failureをreconcile。
- [ ] partial failureでrollback deleteしない。
- [ ] safe rerun可能。
- [ ] final check→update間TOCTOUをResidual Riskとして明記。

### Google → Git

- [ ] 開始時`initialMainSha`を保持。
- [ ] open sync PR guardを重い処理より前へ置く。
- [ ] state-only finalize前にmain freshness確認。
- [ ] state-only finalize前にGoogle snapshot freshness確認。
- [ ] PR前に`origin/main == initialMainSha`確認。
- [ ] main advancedなら自動rebaseせずfail。
- [ ] Google新規Doc / Git missingをPRでrecreate可能。
- [ ] main直接pushなし。
- [ ] automation branch / non-force push / PR。
- [ ] auto-mergeなし。

### Round-trip / Validation / Security

- [ ] initial all-file round-trip。
- [ ] canonical equalityを成功条件。
- [ ] spec change時 `validate:spec` / `validate:spec-visuals:final` / `build:spec`。
- [ ] curriculum change時 `validate:curriculum`。
- [ ] runtimeで`verify`重複実行なし。
- [ ] implementation完了時`pnpm run verify`。
- [ ] OAuth offline access / External Testing制約反映。
- [ ] full Drive scope理由明記。
- [ ] Secret / tokenをlogしない。
- [ ] shared concurrency / timeout設定。
- [ ] `GITHUB_TOKEN`維持。

---

## 23. 実装手順

- [ ] 1. 実装時点の `main` / Repository conventions / Google API仕様を再確認。
- [ ] 2. target path / Drive segment / mapping / duplicate / Trash ruleをpure logic化。
- [ ] 3. canonicalization / SHA-256 / `appProperties` validationを実装。
- [ ] 4. Section 7 Decision Tableをpure logicとして実装・test。
- [ ] 5. Preflight snapshot model / stale snapshot checkを実装・test。
- [ ] 6. OAuth Refresh Token → Access Token REST boundary。
- [ ] 7. Drive REST clientへabout check / My Drive root validation / list pagination / get / export / create / update / metadata update / capabilities取得を実装。
- [ ] 8. retry / create・folder・update・metadata reconciliationを実装・test。
- [ ] 9. Git→Google full read-only Preflightを実装。
- [ ] 10. Git→Google Applyへper-item stale check / post-write re-export / baseline finalizeを実装。
- [ ] 11. Google→Git early open PR guard / `initialMainSha` captureを実装。
- [ ] 12. Google→Git discovery / state-only safe adoption・converged finalizeを実装。
- [ ] 13. Google→Git working-tree update / targeted validation / final main freshness checkを実装。
- [ ] 14. automation branch / commit / `gh auth setup-git` / non-force push / PRを既存 conventionに合わせる。
- [ ] 15. `package.json`に同期CLI command追加。
- [ ] 16. `.github/workflows/google-docs-sync.yml`を1ファイルで追加し、push / workflow_dispatch / job permissions / shared concurrency / timeoutを実装。
- [ ] 17. Section 16のunit / fake boundary testsを完了。
- [ ] 18. GitHub Secrets設定後、current `main` 全対象でinitial bootstrap。
- [ ] 19. 全対象 strict canonical round-trip。
- [ ] 20. 観測diffだけ regression fixture + 最小adapterで対応。
- [ ] 21. liveでGoogle edit→PR、Google new Doc→Git recreate、Git new→Google createを確認。
- [ ] 22. concurrent edit / stale version / state-only stale / main race / missing-side / Trash / Shared Drive root failを確認。
- [ ] 23. PR merge後 main push→Git→Google baseline finalize確認。
- [ ] 24. implementation最終差分で`pnpm run verify`。

---

## 24. Plan修正時点のValidation

Plan内 command 名が現在の `package.json` に存在することを確認する。

```text
lint:markdown
validate:spec
validate:spec-visuals:final
validate:curriculum
build:spec
verify
```

Plan-only修正:

```bash
pnpm exec prettier --check docs/plans/2026-09-07_201539_google-docs-markdown-sync.md
pnpm run lint:markdown
git diff --check
git diff --name-only
```

Plan-onlyのため`pnpm run verify`は必須にしない。

---

## 25. 成果物 / 変更境界

今回変更するfile:

```text
docs/plans/2026-09-07_201539_google-docs-markdown-sync.md
```

今回変更禁止:

```text
.github/workflows/**
scripts/**
tests/**
src/**
apps/**
package.json
pnpm-lock.yaml
docs/spec/**
docs/curriculum/**
```

実装時の変更候補は別途Planに従う。今回は実装しない。

---

## 26. Branch / Base

Branch:

```text
feat/google-docs-markdown-sync
```

現在のPlanは既存branch上で更新する。

実装開始時には固定base SHAを信頼せず、その時点の`main` / Repository conventions / package scripts / Google API仕様を再確認する。

---

## 27. 実装時の優先順位

1. **対象glob / My Drive rootのhard boundary**
2. **Section 7 Decision Tableの一意性**
3. **full read-only Preflight**
4. **write直前 stale snapshot check**
5. **canonical hashによるdata-loss prevention**
6. **strict all-file round-trip equality**
7. **safe adoption / baseline lifecycle**
8. **create / update reconciliationとsafe rerun**
9. **Google→Git main freshness**
10. **targeted validation + PR automation**

安全性を上げない抽象化や将来用途の機能は追加しない。
