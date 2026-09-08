# Google Docs ↔ Markdown 双方向同期 実装計画

## 0. 目的

`docs/spec/**/*.md` と `docs/curriculum/**/*.md` だけを対象に、**1 Markdown = 1 Google Doc** の対応で Google Docs と GitHub の双方向同期を構築する。

Google Docs は人間向けの編集面、Git は review / history / validator の管理面として使う。同期は Last Writer Wins にせず、前回同期 baseline と current Git / Google canonical content を比較し、安全に一意決定できない場合は停止する。

主要な安全境界は次のとおり。

- Git → Google は全件 read-only Preflight 後に Apply する。
- existing Doc の content / state write 直前に snapshot freshness を再確認する。
- Google → Git は local commit 作成後、**remote push 直前**に `main` と Google source snapshot の freshness を再確認する。
- create / update の結果不明時は blind retry せず reconciliation する。
- Google Doc create は baseline finalize 直前にも duplicate 一意性を確認する。
- strict canonical round-trip equality を成功条件とする。
- 自動 delete / rename / move / merge / conflict 解決は行わない。

---

## 1. 対象範囲

同期対象は次の2 glob **のみ**。

```text
docs/spec/**/*.md
docs/curriculum/**/*.md
```

Google Drive 側は Git の `docs/` より下の directory hierarchy を同期 root 配下へ mirror する。

```text
Git:    docs/spec/features/cart.md
Drive:  <sync-root>/spec/features/cart.md
```

Google Doc の表示名には `.md` を含める。Google Docs Document Tabs を複数 Markdown の同期単位として使わない。

初期版の同期 root は **Shared Drive ではない folder** のみ正式対応する。Shared Drive は非対応。

---

## 2. 非対象 / Non-goals

初期版では以下を実装しない。

- 対象2 glob以外の同期
- Document Tabsへの複数Markdown集約
- 自動 delete / Trash復元
- 自動 rename / move
- Git rename推測
- Last Writer Wins
- 3-way merge / 自動 conflict 解決
- Google Drive webhook / polling / schedule
- Google Picker / 独自登録UI
- repository内 mapping DB / JSON
- Redis等の外部state
- Google Docs comments / suggestions / revision history同期
- Git commit historyとGoogle Docs revision対応
- Google Docs paragraph APIによる差分編集
- Google revision APIによるmerge
- Google側lock
- 独自Markdown parser / AST変換基盤 / HTML中間表現
- Google固有format保存機構
- 観測されていないMarkdown差分への先回りadapter
- Service Account / Workload Identity Federation
- PAT / GitHub App
- open PR自動更新 / 自動rebase / 自動merge
- automatic branch cleanup
- full Drive全域のmanaged Doc探索
- Shared Drive support
- Unicode専用dependency
- generic shell escaping framework / command DSL
- Drive query AST / ORM / third-party query builder
- 独自credential broker
- 将来用途だけの過度な抽象化

---

## 3. Repository / Google API 前提

### 3.1 Repository整合性

現在のRepositoryでは以下を利用する。

- `pnpm run lint:markdown`
- `pnpm run validate:spec`
- `pnpm run validate:spec-visuals:final`
- `pnpm run validate:curriculum`
- `pnpm run build:spec`
- 実装完了時のみ `pnpm run verify`

既存 `.github/workflows/ci.yml` の pinned Actions、`persist-credentials: false`、job timeout、最小権限に合わせる。

`.github/workflows/expo-dependency-maintenance.yml` の以下の convention を再利用する。

- 重い処理より前の open PR guard
- automation branch
- `github-actions[bot]` commit identity
- `GITHUB_TOKEN`
- `gh auth setup-git`
- explicit non-force push
- `gh pr create`
- `cancel-in-progress: false`

### 3.2 Google Drive API公式契約

実装時はGoogle公式仕様を正本とする。

主要参照:

- <https://developers.google.com/workspace/drive/api/guides/manage-uploads>
- <https://developers.google.com/workspace/drive/api/guides/ref-export-formats>
- <https://developers.google.com/workspace/drive/api/guides/manage-downloads>
- <https://developers.google.com/workspace/drive/api/reference/rest/v3/files>
- <https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list>
- <https://developers.google.com/workspace/drive/api/guides/search-files>
- <https://developers.google.com/workspace/drive/api/reference/rest/v3/about>
- <https://developers.google.com/workspace/drive/api/guides/properties>
- <https://developers.google.com/workspace/drive/api/guides/api-specific-auth>
- <https://developers.google.com/identity/protocols/oauth2/web-server>

前提:

- Google Docsは`files.export(..., text/markdown)`でMarkdown export可能。
- MarkdownはGoogle Docsへのimport formatとしてサポートされる。
- mediaを伴う`files.update`でGoogle Docs full contentsを置換できる。
- multipart uploadによりmetadataとmediaを同一`files.create`で送信できる。
- `File.version`はAPI上stringで返る。stale snapshot検出専用とし、winner判定には使わない。
- `File.capabilities`はcurrent userがitemへ実行可能なactionを表す。
- `File.driveId`はShared Drive itemの識別に利用できる。
- active探索は`trashed = false`のみ。
- `files.list`は`nextPageToken`がなくなるまで全ページ処理する。
- Drive search queryのstring literalでは、apostrophe / backslash等をquery syntaxに従ってescapeする必要がある。可能な箇所では動的nameを`q`へ含めず、parent childrenを列挙してNode側でexact matchする。
- `files.export`のexported contentは10MB上限がある。上限超過時はfailし、自動分割・partial export・Docs API fallbackは行わない。
- Google APIにcross-system transaction / atomic compare-and-swapがあるとは仮定しない。

### 3.3 `File.version` 型契約

Drive API `File.version` は **opaque string** として扱う。

```text
snapshot.version: string
current.version: string
```

禁止:

- JavaScript `Number` への変換
- `parseInt`
- 大小比較
- increment値としての計算
- version値によるwinner判定

stale判定で必要なのは文字列完全一致だけである。

```text
snapshot.version === current.version
```

`"9007199254740993"` のような値でも精度を失わない設計とする。

---

## 4. OAuth / Secrets / credential boundary

### 4.1 OAuth

初期版は OAuth Client ID / Client Secret / Refresh Token を使用する。

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_DRIVE_ROOT_FOLDER_ID
```

Refresh Token取得時は`access_type=offline`を使用する。

**External + Testing のOAuth consent構成ではRefresh Tokenが7日で失効するため、継続的なGitHub Actions運用には使用しない。**

継続運用は次のいずれかを前提とする。

- Google Workspace Internal app
- 適切にProduction状態へ移行したExternal app

full Drive scopeは強いscopeであるため、External運用ではGoogle OAuth verification等の**実装・運用時点の現在要件**を確認する。Internal利用とExternal公開では条件が異なるため、特定のverificationが必ず必要とはPlan段階で一律断定しない。

`invalid_grant`等ではGoogle write前にfailし、管理者がRefresh Tokenを更新する。自動再認証は実装しない。

### 4.2 Drive scope

初期版は以下を使用する。

```text
https://www.googleapis.com/auth/drive
```

`drive.file`はより狭いが、Drive UIから人間が同期rootへ直接作成した新規Docを自動探索する今回の要件と合わないため採用しない。

### 4.3 Secret exposure / logging boundary

上位ルール:

> GitHub Secretsとして投入された `GOOGLE_*` 値はlogへ出さない。

対象:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

GitHubのautomatic maskingだけに依存せず、sync code自身が値をlogしない。

Google credentialはworkflow-level / job-level global `env`へ置かず、Google APIを実際に呼ぶsync step / processにだけ明示的に渡す。Prettier、markdownlint、validator、build、Git操作stepへ渡さない。

Access Tokenは可能な限りsync process内memoryだけに保持し、以下へ書かない。

- `GITHUB_ENV`
- `GITHUB_OUTPUT`
- artifact
- temporary plain-text credential file
- PR body

禁止log:

- `GOOGLE_*` Secret値
- Access Token
- Authorization header
- token endpoint response body
- Secret値を含むURL / curl command / request dump

logへ出してよいのは、必要なfile path、action、HTTP status、retry count、`version`等の非credential diagnosticsに限定する。Google file IDも必要性がある場合だけ出す。

`GH_TOKEN: ${{ github.token }}`もjob全体へ置かず、open PR guard、automation branch push、`gh pr create`等の必要stepだけへ渡す。

---

## 5. Google Docs content / Drive root / path / identity contract

### 5.1 Google側contentの同期境界

Google側で同期対象とするcontentは、**Drive API `files.export(..., text/markdown)`で表現されるMarkdown**と定義する。

Markdown exportへ表現されないGoogle Docs固有情報は同期保証外。

例:

- Markdownへ変換されない装飾
- Google Docs固有layout
- comments
- suggestions
- revision history
- Markdown exportに含まれない付加情報

Git → GoogleはMarkdown mediaによるfull content replacementを行うため、Markdown exportに現れないGoogle Docs固有情報の保持を保証しない。これは初期版の同期契約であり、paragraph単位編集や独自diff engineは導入しない。

### 5.2 root validation / Shared Drive境界

Google API discovery開始前に`GOOGLE_DRIVE_ROOT_FOLDER_ID`を`files.get`で検証する。

最低条件:

- itemが存在する。
- `trashed == false`。
- `mimeType == application/vnd.google-apps.folder`。
- Shared Drive itemではない。
- childrenをlistできる。
- direction / planned actionに必要なcapabilityを持つ。

`driveId`等でShared Drive itemと確認できた場合は`unsupported Shared Drive root`でfailする。

初期版ではShared Drive対応parameterを意図的に使用しないため、Shared Drive root IDのmetadata取得自体が失敗した場合は`unsupported or inaccessible root`としてfailしてよい。

`supportsAllDrives`、`includeItemsFromAllDrives`、`corpora=drive`等を追加しない。

### 5.3 runtime import / export capability

WorkflowのGoogle API処理開始時に1回だけ`about.get`を実行する。

```text
fields=importFormats,exportFormats
```

を指定し、response全体を要求しない。

確認するのは次だけ。

- `text/markdown` → `application/vnd.google-apps.document` import
- `application/vnd.google-apps.document` → `text/markdown` export

利用不可ならwrite前にfailする。

### 5.4 Drive discovery fields

`files.list` / `files.get`では必要fieldだけ明示する。

最低限:

```text
id
name
mimeType
parents
trashed
appProperties
version
capabilities
modifiedTime
```

rootのShared Drive判定に必要な場合のみ`driveId`も取得する。listでは`nextPageToken`も取得する。

`modifiedTime`はdiagnosticsだけに使用する。

### 5.5 Drive hierarchy / active discovery

Drive hierarchyはGit pathをmirrorする。

```text
<sync-root>/spec/...
<sync-root>/curriculum/...
```

探索queryは`trashed = false`を必須とし、Trash itemをcandidate / duplicateへ含めない。

同一parent / 同一folder name、または同一parent / 同一`.md` name / Google Docs MIME typeの候補件数:

| 件数 | 判定 |
| --- | --- |
| 0 | directionに応じてcreate候補 |
| 1 | 利用 |
| 2以上 | ambiguous / duplicate fail |

### 5.6 Drive item name → cross-platform safe Git path

Drive item name 1件を必ず**1 Git path segment**として扱う。Google name中の文字をdirectory separatorとして再解釈しない。

拒否するsegment:

- `/`、`\\`
- `.`、`..`
- NUL / control character
- `<`、`>`、`:`、`"`、`|`、`?`、`*`
- trailing `.`
- trailing space
- case-insensitiveで`.git`
- Windows予約device名をcase-insensitiveで拒否
  - `CON`、`PRN`、`AUX`、`NUL`
  - `COM1`〜`COM9`
  - `LPT1`〜`LPT9`
  - 拡張子付きも拒否（例: `CON.md`、`aux.txt`、`LPT1.md`）

さらにrepository root escape、正規化後segment消失、path collisionをfailする。

#### Unicode normalization contract

collision keyのUnicode normalizationは **NFC** に固定する。

概念:

```text
normalizedSegment = segment.normalize("NFC")
normalizedPath = all segmentsをNFC化して結合
```

Unicode normalization collision:

- 異なるDrive pathが同一`normalizedPath`へ収束したらfail。

cross-platform case collision:

- NFC normalize後、Node標準のlocale非依存lowercase相当（例: `toLowerCase()`）で比較keyを作る。
- 異なるDrive pathが同一比較keyへ収束したらfail。

例: `cart.md` と `Cart.md` は`cross-platform path collision`でfailする。

厳密なUnicode Case Folding libraryやlocale依存処理は導入しない。NFC後も異なる正常な日本語pathは許可する。

### 5.7 capabilities

full Drive scopeでもitem単位の権限は保証されない。Preflightで予定actionに必要な`File.capabilities`を確認する。

- folder discovery: childrenをlist可能
- folder / Doc create: parentへchild追加可能
- existing Doc update: content変更可能
- state-only update: metadata edit可能

具体的field名は実装時点の公式仕様を正本とする。

### 5.8 managed Doc rename / move limitation

managed Docの`appProperties.githubPath`と、sync root探索内で現在のfolder hierarchy + nameから導出したpathが異なる場合は`unsupported rename/move`でfailする。

ただしmanaged Docがsync root**外**へmoveされた場合、そのDocはroot探索で発見できずactive missingと区別できない。

その場合はSection 7のmissing contractに従い、remaining Gitからsync root配下へ新しいGoogle Docがrecreateされる可能性がある。root外へ移動した旧Docを自動探索・delete・復元しない。

### 5.9 Drive-derived path / process argument safety

Section 5.6のpath safetyと、process invocation時のcommand safetyは別契約とする。

Google Drive由来のfile / directory pathは **untrusted external data** として扱う。Drive由来pathをshell command文字列へ直接連結・展開しない。

特に以下のprocessへ動的pathを渡す場合に適用する。

- Prettier
- `git add`
- `git diff`等のGit command
- その他Drive-derived pathをargumentとして受け取る外部process

Nodeから動的filenameを含むprocessを起動する場合は、原則として`child_process.spawn` / `execFile`等の**argument arrayを渡せるAPI**を使い、`shell: false`で実行する。

概念:

```text
spawn("pnpm", ["exec", "prettier", "--write", ...paths], { shell: false })
spawn("git", ["add", "--", ...paths], { shell: false })
```

禁止:

```text
exec(`pnpm exec prettier --write ${paths.join(" ")}`)
exec(`git add ${paths.join(" ")}`)
```

Git pathspecへDrive-derived pathを渡す箇所では、commandの対応範囲で`--`を使用し、`-leading-name.md`等がoptionとして解釈されないようにする。

GitHub Actionsの固定shell処理を使う場合もcommand構造は固定し、外部由来pathからshell codeを組み立てない。必要ならNUL-delimited / argument-array相当の境界を用いる。

`$`、backtick、`&`、`;`、apostrophe、space、先頭`-`等は、Section 5.6のpath契約上安全である限り**shell都合だけを理由にfilenameとして禁止しない**。独自shell escaping libraryは追加しない。

### 5.10 Drive query literal safety

Drive API `files.list(q=...)`へ、Google Doc nameや`githubPath`等の外部由来stringをraw interpolationしない。

初期版は、可能な箇所では次を優先する。

```text
parent childrenをpagination付きで列挙
→ Node側で exact match:
   name === expectedName
   mimeType === expectedMimeType
   appProperties.githubPath === expectedGithubPath
```

これにより、動的name / `githubPath`をDrive query syntaxへ埋め込む箇所を最小化する。

`q`へ動的literalを含める必要がある場合は、Drive query syntax上必要なescapingを**1つのhelper**へ集約する。

概念責務:

```text
escapeDriveQueryLiteral(value)
```

少なくともapostrophe / backslashをGoogle公式query syntaxに従ってescapeする。各call siteで個別escaping / raw interpolationを行わない。generic query builder / AST / ORMは作らない。

create response不明時のreconciliationでも同じ契約を使う。可能ならparent children listing後にNode側で`name` / MIME / `appProperties.githubPath`をexact matchし、queryへ`githubPath`を直接埋め込まない。Drive queryを使う場合は必ず共通escape helperを通す。

---

## 6. Canonicalization / sync metadata

### 6.1 canonical representation

Git / Googleの同期判定はraw bytes、`modifiedTime`、commit timeではなく、同一canonicalization後のSHA-256で行う。

初期canonicalization:

1. CRLF / CR → LF
2. EOF newlineをRepository契約へ統一
3. Repository既存PrettierによるMarkdown formatting

Google固有挙動を推測した変換は先回り追加しない。

### 6.2 strict round-trip

```text
Git Markdown
→ canonicalize
→ Google Docs import
→ files.export(text/markdown)
→ canonicalize
→ equality
```

原則成功条件:

```text
Git canonical SHA-256 == Google canonical SHA-256
```

Validator passだけで差分を許容しない。

差分が残ればbootstrap failとし、実際に観測した非意味的差分だけfixture化して最小adapterを検討する。

### 6.3 sync metadata / appProperties limits

managed Google Docの`appProperties`は次だけを必須stateとする。

```text
githubPath = "docs/spec/features/cart.md"
lastSyncedSha256 = "<canonical SHA-256>"
```

- `githubPath`: identity / rename・move検出
- `lastSyncedSha256`: GitとGoogleが最後に同一canonical contentへ収束した単一baseline

Google Drive custom property制約:

- custom properties: file全体で最大100
- private `appProperties`: 1 applicationあたり最大30
- 1 propertyの`key + value`: UTF-8で最大124 bytes

write前に少なくとも各必須propertyで次を検証する。

```text
Buffer.byteLength(key, "utf8") + Buffer.byteLength(value, "utf8") <= 124
```

特に`githubPath`をtruncateしない。path hashへ自動変換しない。別mapping DBを作らない。制約超過時はfail-safeに停止する。

---

## 7. Sync state / Decision Table（同期判定の唯一の正本）

以降のflow / Risk / DoDはこのSection 7を状態遷移の正本とし、別sectionで再定義しない。

```text
B = appProperties.lastSyncedSha256
G = current Git main canonical SHA-256
D = current active Google Doc export canonical SHA-256
```

| Git | active Google | Baseline | 現在状態 | Git → Google | Google → Git |
| --- | --- | --- | --- | --- | --- |
| なし | なし | なし | 対象なし | no-op | no-op |
| あり | なし | 取得不能 | remaining Gitのみ | Google Doc create / recreate | pending opposite-direction restoration。Gitを削除しない |
| なし | あり | なし | Google-only new | pending。Docを削除しない | Git create PR |
| なし | あり | あり | Git missing / managed Google remains | pending。Docを削除しない | Git recreate PR。mergeまでBを進めない |
| あり | あり | なし | `G == D` | safe adoption / state-only finalize | safe adoption / state-only finalize。PR不要runのみ |
| あり | あり | なし | `G != D` | ambiguous fail | ambiguous fail |
| あり | あり | あり | `G == B && D == B` | no-op | no-op |
| あり | あり | あり | `G != B && D == B` | Git update候補 | direction mismatch fail |
| あり | あり | あり | `G == B && D != B` | direction mismatch fail | Google update PR候補 |
| あり | あり | あり | `G != B && D != B && G == D` | converged state-only finalize | converged state-only finalize。PR不要runのみ |
| あり | あり | あり | `G != B && D != B && G != D` | conflict fail | conflict fail |

原則:

- missing / deleteを逆側へ伝播しない。
- trashed Docはactive missing。
- active Google missingでは過去baselineを推測しない。
- `version` / `modifiedTime` / commit timeをwinner判定へ使わない。
- Google → Gitでcontent PRが必要なrunではbaselineを書かない。
- PR不要かつ`G == D`なら、main / Google freshness確認後にsafe adoption / converged state-only finalizeを許可する。

Google → Git PRがmergeされた後は`main` pushのGit → Googleで`G == D`を確認しbaselineをfinalizeする。

---

## 8. Git → Google: Phase 1 Read-only Preflight

**全対象のPreflightが完了するまでGoogle writeを行わない。**

1. targeted Git validator実行。
2. OAuth token取得。
3. `about.get(fields=importFormats,exportFormats)`確認。
4. sync root検証。
5. Git対象Markdownを全件列挙。
6. root配下を`trashed=false` + paginationで探索。
7. Drive path segment / NFC / cross-platform collision検証。
8. duplicate folder / Doc検出。
9. planned actionに必要なcapability確認。
10. managed Doc metadata / `appProperties`検証。
11. Google Docs export。
12. Git / Google canonical hash算出。
13. Section 7だけでdecision。
14. `githubPath` mismatch検出。
15. create / update / no-op / state-only / pendingのApply planをメモリ上へ固定。

1件でもconflict、direction mismatch、unsafe path、duplicate、unsupported rename/move、invalid metadata、capability不足、unsupported root、import/export capability不足、export failure等があればGoogle write **0件**でfailする。

### 8.1 existing Doc snapshot

Apply対象となり得るexisting managed Docでは最低限以下を保持する。

```text
fileId: string
version: string
canonicalSha256: string
githubPath: string
parentId: string
name: string
relevantAppProperties: key/value snapshot
```

`version`はopaque stringとして保持し、Section 3.3の契約に従う。`modifiedTime`はdiagnosticsのみ。

---

## 9. Git → Google: Phase 2 Apply

### 9.1 existing Doc update / state-only stale check

content updateまたはstate-only metadata update直前に`files.get` + `files.export`を再実行する。

以下がPreflight snapshotと一致する場合だけwriteする。

- fileId
- version（opaque string完全一致）
- canonical hash
- githubPath
- parent / name
- relevant metadata
- planned actionに必要なcapability

差異があれば`stale preflight / concurrent Google edit`で、そのDocをwriteせずrunをfailする。

content update後はstrict re-export equality成功後だけ`lastSyncedSha256`を更新する。

### 9.2 Google Doc create flow

新規Doc createは次の順で固定する。

```text
1. global Preflightでcreate候補確定
2. create直前parent identity / capability / duplicate確認
3. metadata + Markdown mediaをmultipart files.createで送信
4. response不明ならreconciliation
5. created fileId確定
6. text/markdown re-export
7. strict canonical equality
8. identity / content freshness再確認
9. baseline finalize直前にsame parent / same name / Google Docs MIME / trashed=falseを再検索
10. 候補1件かつcreated fileId一致を確認
11. lastSyncedSha256 metadata finalize
```

multipart createのmetadata部には同一requestで以下を含める。

```text
name
parents
mimeType = application/vnd.google-apps.document
appProperties.githubPath
```

media部は`text/markdown`。

**`lastSyncedSha256`はcreate requestへ含めない。** round-trip equalityとbaseline直前duplicate一意性確認後にのみstate metadata updateする。

baseline直前duplicate再検索結果:

| 候補 | 処理 |
| --- | --- |
| 0 | unexpected missing → fail |
| 1 | そのIDが今回created fileIdなら続行 |
| 2以上 | duplicate race → fail。baselineを書かず、自動deleteしない |

create直後の別duplicate checkは必須にせず、**baseline finalize直前の一意性確認を安全境界の正本**とする。

duplicate再検索はSection 5.10のquery safety契約に従い、可能ならparent children列挙 + Node exact matchで行う。

### 9.3 folder create / reuse

folder createはresponse不明時のreconciliationを維持する。

子item createへ進む**直前**に、今回利用する各created/reused folderについて以下を再確認する。

```text
same parent
same folder name
folder MIME
trashed=false
```

候補が1件だけで、そのIDが予定folder IDと一致する場合のみ子item createへ進む。0件または2件以上ならfailし、自動deleteしない。

folder一意性確認もSection 5.10のquery safety契約に従う。folder lockは追加しない。

### 9.4 partial failure / residual TOCTOU

Apply全体はatomicではない。成功済みDoc / folderをrollback deleteせず、次回full Preflightからsafe rerunする。

`freshness check → files.update`間の短いTOCTOUは完全には排除できない。Google-side lockやcross-system transactionは初期版へ追加しない。

---

## 10. Google → Git flow

Google → Gitはmanual `workflow_dispatch`のみ。

### 10.1 early guard

```text
manual main確認
→ checkout main
→ initialMainSha保存
→ open sync PR guard
→ blockedなら終了
→ dependencies
→ OAuth / about / root validation
→ discovery
```

open PR guardは重い処理より前に行う。

automation branch prefixは固定する。

```text
automation/google-docs-sync-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}
```

open sync PRは最低限以下で識別する。

```text
base = main
state = open
isCrossRepository = false
headRefName startsWith("automation/google-docs-sync-")
```

PR titleは識別キーにしない。既存PRへのforce push / 自動更新はしない。

### 10.2 Google source snapshot

今回Git contentへ反映する各source Docについてdiscovery / export時に最低限以下を保持する。

```text
fileId: string
version: string
canonicalSha256: string
githubPath: string
parentId: string
name: string
```

`version`はopaque string。Section 7に従いworking tree更新候補を決める。

### 10.3 PR不要 state-only finalize

run内にGit content変更candidateがなく、safe adoption / converged finalizeのみの場合:

1. `git fetch origin main`。
2. `origin/main == initialMainSha`確認。
3. Google metadata + exportを再取得。
4. source snapshotのfileId / version / canonical / identityがunchangedであることを確認。
5. current `G == D`確認。
6. `githubPath` / `lastSyncedSha256`をstate-only finalize。
7. PRなし。

mainまたはGoogleが変わっていればbaselineを書かずfailする。

### 10.4 Git content変更PR flow

remoteへ古いGoogle snapshotをpushしないことを安全境界とし、freshness checkを**local commit後・non-force push直前**へ置く。

```text
manual main
↓
checkout
↓
initialMainSha保存
↓
open sync PR guard
↓
dependencies
↓
OAuth / about / root validation
↓
Google discovery / source snapshot取得
↓
Section 7 decision
↓
working tree更新
↓
Prettier
↓
tracked + untracked changed-file allowlist
↓
targeted validation
↓
allowlist再確認
↓
automation branch作成
↓
対象Markdownだけ安全なargument境界でstage
↓
staged allowlist
↓
git diff --cached --check
↓
github-actions[bot] identity設定
↓
local commit
↓
git fetch origin main
↓
origin/main == initialMainSha確認
↓
Google source snapshot freshness再確認
↓
GH_TOKEN step-localでgh auth setup-git + non-force push
↓
PR
```

このrunではGoogle baseline writeなし。

local branch / stage / commitはremote stateを変更しないためfreshness checkより前でよい。remoteへ影響するpushはmain + Google sourceの両freshness成功後だけ許可する。

### 10.5 push直前 Google source freshness

local commit作成後、push直前に今回のPR source Google Docs全件を再確認する。

まず:

```text
git fetch origin main
origin/main SHA == initialMainSha
```

を確認する。

続いて各source Docで`files.get` + `files.export`を再実行し、最低限以下をsource snapshotと比較する。

```text
current fileId == snapshot fileId
current version == snapshot version
current canonical == snapshot canonical
current githubPath / parent / name == snapshot identity
```

`version`比較は文字列完全一致のみ。

1件でも変わっていれば:

```text
Google source changed during sync
```

としてfailする。

main freshnessまたはGoogle freshness failure時:

- pushしない
- PRを作らない
- Google baselineを書かない
- local automation branch / commitが残っても問題なし
- Workflowをfail
- 次回Workflowは新しいrun-specific branchを使用

古いlocal branchのcleanup機構は追加しない。GitHub-hosted runner上の一時branch / commitはrun終了時に破棄される前提で十分とする。

### 10.6 tracked + untracked allowlist

Google新規Doc由来のMarkdownはuntrackedになり得るため、changed-file allowlistはtracked diffだけで判定しない。

最低限:

```bash
{
  git diff --name-only HEAD
  git ls-files --others --exclude-standard
} | sed '/^$/d' | sort -u
```

のunionを使う。

この一覧が次以外を含めばfailする。

```text
docs/spec/**/*.md
docs/curriculum/**/*.md
```

validation後にも再確認する。

Drive-derived pathを個別processへ渡す際はSection 5.9のargument safety契約に従う。

### 10.7 staged boundary

commit前は確定済みtarget Markdownだけを明示的にstageする。`git add .`は禁止。

Drive-derived target pathはjoined shell stringではなく1 path = 1 argumentとして渡す。Git pathspecとしてstageする場合は概念上:

```text
git add -- <path1> <path2> ...
```

とし、Node実装では`spawn` / `execFile`等のargument arrayを使う。先頭`-`を含むfilenameをoptionとして解釈させない。

stage後:

```bash
git diff --cached --name-only
git diff --cached --check
```

相当を実行し、以下を確認する。

- staged fileが1件以上ある。
- staged fileが対象2 globのみ。
- unexpected staged fileなし。
- staged whitespace errorなし。

違反時はcommit / push / PRを行わない。

### 10.8 PR snapshot運用契約 / residual TOCTOU

Google → Git PRは**remote push / PR作成時点に最も近いfreshness checkで検証したGoogle snapshot**を表す。

Google source freshnessはremote push直前に確認する。ただしfreshness確認からpush / PR作成までの短い間にGoogle Docが再編集されるTOCTOUは完全には排除できない。

PR作成後に対象Google Docが変更された場合は:

```text
既存sync PRをclose
→ Google → Git Workflowを再実行
→ 新しいsnapshotからPRを再作成
```

とする。

PR自動更新、Google lock、merge前Google API hook、polling、GitHub Appは追加しない。

### 10.9 automation commit identity / push authentication boundary

local commit前に既存Repository automationと同じidentityを設定する。

```bash
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
```

独自bot名や個人identityは使用しない。

remote pushは`GH_TOKEN`をstep-localに保つため、既存automation conventionと同じく**`gh auth setup-git`と`git push`を同じGitHub Actions stepの責務**として扱う。

概念:

```text
GH_TOKENを当該stepだけへinject
→ gh auth setup-git
→ git push --set-upstream origin <run-specific branch>
```

PR作成はその後の`gh pr create` stepで行う。push成功後にPR作成が失敗した場合の扱いはSection 20のResidual Riskに従う。

---

## 11. Retry / reconciliation

### 11.1 bounded retry

小さいbounded retry + backoff / jitterを許可:

- `about.get`
- `files.list`
- `files.get`
- `files.export`
- token refreshの一時的transport failure
- 429
- 一時的500 / 502 / 503 / 504
- reconciliation後に安全と確認できたupdate

### 11.2 原則retryしない

- 400系入力エラー
- `invalid_grant`等OAuth semantic error
- permission / capability failure
- conflict / stale snapshot
- invalid metadata
- ambiguous mapping / duplicate
- unsupported rename/move / Shared Drive
- canonical round-trip mismatch
- cross-platform path collision

### 11.3 create reconciliation

Doc create responseがtimeout等で成功不明なら、blind retry前に以下でactive candidateを再検索する。

```text
same parent
same name
Google Docs MIME type
appProperties.githubPath
trashed=false
```

検索方法はSection 5.10を正本とする。**parent children listing + Node exact matchを優先**し、`name` / `githubPath`をDrive `q`へraw interpolationしない。Drive queryに動的literalが必要な場合は共通`escapeDriveQueryLiteral`を必ず通す。

| 件数 | 処理 |
| --- | --- |
| 0 | retry可能 |
| 1 | created済みとしてfileId再利用 |
| 2以上 | ambiguous fail |

folderもsame parent / name / folder MIME typeで同じquery safety contractを使ってreconcileする。

response正常成功 / reconciliation成功のどちらでも、Section 9.2の**baseline finalize直前duplicate check**を必ず通す。

### 11.4 update / metadata reconciliation

update成功不明時はmetadata get + re-exportでcurrent stateを確認する。

- desired canonicalなら成功済み扱い。
- old snapshotのままでfreshness再確認可能ならbounded retry。
- third content / unexpected identityならfail。

state metadata update成功不明時もdesired `appProperties`を`files.get`で確認し、unexpected state / contentならfailする。

---

## 12. GitHub Actions Workflow

### 12.1 1 Workflow / trigger

```text
.github/workflows/google-docs-sync.yml
```

1ファイルのみ。

- `push` to `main` + 対象paths → Git → Google
- `workflow_dispatch` → `git-to-google` / `google-to-git`
- manual refは`main`限定
- Google → Git scheduleなし

### 12.2 permissions

Git → Google job:

```text
contents: read
```

Google → Git job:

```text
contents: write
pull-requests: write
```

### 12.3 authentication scope

Google SecretsはGoogle sync stepだけへinjectする。`GH_TOKEN`も必要stepだけへinjectする。job-global credential envは禁止。

checkoutは`persist-credentials: false`。

Google → Gitのautomation branch pushでは既存Repository conventionに合わせ、`GH_TOKEN`をそのpush stepだけへ渡し、**同一step内で**:

```text
gh auth setup-git
→ explicit automation branchをnon-force push
```

まで行う。validation / build stepへ`GH_TOKEN`を渡さない。

### 12.4 concurrency / timeout

```text
group: google-docs-markdown-sync
cancel-in-progress: false
```

方向共通groupを使用する。

主要jobに`timeout-minutes`を設定する。初期値30分程度とし、実測なしに過度に延長しない。

### 12.5 automation PR CI

`GITHUB_TOKEN`由来PRでは通常CIが自動実行されない/approvalを要する場合があるため、Google → Git targeted validationはPR作成前に必須。

PAT / GitHub Appは追加しない。auto-mergeしない。

open PR guardはopen PRだけを対象とし、PRを伴わないorphan automation branchの探索 / cleanup / reuseは行わない。

---

## 13. Validation

### 13.1 Google → Git runtime

changed MarkdownだけPrettierする。

共通:

```bash
pnpm exec prettier --write <changed markdown files only>
pnpm run lint:markdown
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

changed-file allowlistはtracked + untracked unionでvalidation前後に確認し、commit前はstaged allowlist + `git diff --cached --check`を確認する。

Prettier等へDrive-derived pathを渡すprocess invocationはSection 5.9に従い、shell command stringへpathを埋め込まない。

### 13.2 Git → Google runtime

Google write前に最低限:

```bash
pnpm run lint:markdown
```

spec対象なら`pnpm run validate:spec`、curriculum対象なら`pnpm run validate:curriculum`。

### 13.3 `pnpm run verify`

runtimeでは重複実行しない。

- runtime: targeted validationのみ
- implementation完了時: `pnpm run verify`
- 通常PR: repository CI

---

## 14. Initial bootstrap

current `main`の対象全件で実施する。部分PoCは行わない。

```text
targeted validation
→ about/root validation
→ full read-only Preflight
→ Apply
→ per-item stale / duplicate check
→ import/update
→ re-export
→ canonical equality
→ identity / baseline finalize
→ targeted validation再確認
→ summary
```

全対象で成功した場合だけ`bootstrap successful`。

summary最低区分:

```text
created
updated
adopted
state-only
no-op
pending
failed
```

partial failure時はrollback deleteせず、次回full Preflightからsafe rerunする。

---

## 15. Error handling / Security

fail-safe対象:

- OAuth / root / capability failure
- unsupported / inaccessible Shared Drive root
- path traversal / unsafe segment
- NFC / case-insensitive path collision
- duplicate / ambiguous mapping
- invalid `appProperties`
- `githubPath` mismatch
- unsupported rename/move
- conflict / direction mismatch
- stale Preflight / concurrent edit
- Google source changed during sync
- canonical round-trip mismatch
- target allowlist / staged allowlist violation
- unexpected managed MIME type
- baseline直前create duplicate
- create / update reconciliation ambiguity
- `main advanced during sync`
- `files.export` 10MB上限等によりMarkdown exportできない状態

export上限超過では自動分割、partial export、Docs API fallbackを行わない。

warning / ignore:

- sync root外item
- target subtree外item
- Google Docs以外
- target subtree内だが`.md`で終わらないunmanaged Doc

Security / external input contract:

- Drive-derived pathはuntrusted dataとして扱い、shell command stringへinterpolateしない。詳細はSection 5.9。
- Drive queryへ外部由来literalをraw interpolateしない。詳細はSection 5.10。
- query / process境界の問題を理由に、Section 5.6で許可されるfilename文字を不必要に禁止しない。

---

## 16. Tests

API実装そのものを再現する過剰mockは避け、pure decision / request contract / orchestration boundaryを固定する。

### 16.1 Path / Drive

- target path allow / deny
- `/` / `\\` / `.` / `..` / NUL / control char
- `< > : " | ? *`
- trailing dot / space
- `.git`
- `CON.md` / `aux.md` / `LPT1.md`
- root escape
- NFC-equivalent path collision
- `cart.md` / `Cart.md` case-insensitive collision
- NFC後も異なる正常な日本語pathは許可
- duplicate folder / Doc
- same name different parentは許可
- Trash item除外
- invalid / trashed / non-folder root
- Shared Drive root unsupported
- insufficient capability
- pagination
- about import/export capability不足

### 16.2 State

- Section 7の全行
- safe adoption
- converged finalize
- wrong-direction overwrite prevention
- missing-side recreate / pending
- content PR時baseline不変
- PR closeでbaseline不変
- PR merge後Git→Google finalize
- `modifiedTime` / `version`をwinner判定に使わない

### 16.3 `File.version`

- `"9007199254740993"`等をstringとして保持
- Numberへ変換しない
- parseIntしない
- string equalityでfreshness判定
- version大小でwinner判定しない

### 16.4 Concurrent edit / Google source freshness ordering

- Git→Google Preflight後version変更 → writeなし
- canonical変更 → writeなし
- identity / relevant metadata変更 → writeなし
- state-only update直前content変更 → baselineなし
- Google→Gitではlocal commit作成までは可能
- main freshness failure → pushなし / PRなし
- Google source freshness failure → pushなし / PRなし
- main freshness成功 + source freshness成功後のみpush
- source freshness checkがremote pushより前に存在するcontractを固定
- freshness failure時Google baseline不変

YAML step順を過剰にhard-codeせず、**remote push前に両freshness checkが完了する安全境界**をtestする。

### 16.5 Create / multipart / duplicate timing

- create requestにname / parent / Google Docs MIME / `githubPath` / Markdown mediaを含む
- create requestに`lastSyncedSha256`を含めない
- re-export成功後、baseline直前duplicate=1 + ID一致 → finalize可能
- re-export後、baseline直前duplicate=2 → baselineを書かずfail
- folder利用時、子item create直前candidate=1 + ID一致 → 続行
- folder利用時candidate=2 → fail
- duplicate時deleteしない
- response lost reconciliation 0 / 1 / 2+

### 16.6 Git untracked / staged

- Google new Doc → untracked Markdownをallowlistで検出
- unexpected untracked file → fail
- validation後allowlist再確認
- target-only filesだけ明示stage
- unexpected staged file → fail
- staged empty → fail
- `git diff --cached --check` failure → commitなし

### 16.7 Workflow / Secrets

repository-contractへ自然に載る場合のみ固定する。

- open PR guardが重い処理前
- automation branch prefix固定
- Google Secretsがvalidation/build/Git stepへ渡らない
- `GOOGLE_*`値をlogしない
- Access Tokenを`GITHUB_ENV` / `GITHUB_OUTPUT`へ保存しない
- `GH_TOKEN`が必要stepだけ
- push step内で`gh auth setup-git`後にnon-force pushする
- full Preflight failure → Google write 0
- source freshness failure → remote push 0

### 16.8 Round-trip fixtures

全件bootstrapで**実際に観測されたconstructだけ**fixture化する。

### 16.9 Process argument / Drive query / Git identity boundary

process argument safetyは、少なくとも次のfilenameで固定する。

```text
foo$(echo x).md
foo`echo x`.md
foo;bar.md
foo&bar.md
foo's-guide.md
foo with space.md
-leading-name.md
```

Section 5.6のpath契約上許可されるものはfilenameとして扱い、shell codeとして評価しない。1 path = 1 subprocess argumentのまま渡し、先頭`-`はGit optionとして扱わせない。実際の悪性commandをshell上で実行するtestは不要で、process invocation wrapperのcontract testで十分とする。

Drive query / reconciliationは少なくとも次を扱う。

```text
user's-guide.md
folder\name
docs/spec/user's-guide.md
```

- parent children listing + Node exact matchで安全に処理できること、または共通literal escape helperでqueryが壊れないこと。
- reconciliationでも同じquery safety contractを通ること。
- raw query interpolationがないこと。

Git automation identityは、orchestration contractへ自然に載る場合に次をcommit前設定として固定する。

```text
user.name = github-actions[bot]
user.email = 41898282+github-actions[bot]@users.noreply.github.com
```

---

## 17. 実装責務 / ファイル構成方針

必要責務:

- OAuth token refresh
- Drive REST client
- about capability check
- sync root validation
- discovery / pagination / Trash filtering
- Drive query literal safety / parent-side listing + Node exact match
- NFC + cross-platform path mapping / duplicate detection
- safe process invocation for Drive-derived paths
- canonicalization / SHA-256
- `appProperties` validation
- Section 7 decision logic
- Git→Google Preflight snapshot / stale check
- multipart create / baseline直前duplicate check
- retry / reconciliation
- Google→Git initialMainSha / source snapshot / push直前source freshness
- tracked + untracked / staged Git boundary
- Git automation identity
- targeted validation
- GitHub PR orchestration

実装先は`scripts/docs/`配下を基本とし、大型Google SDKを追加せずNode標準`fetch`を用いる。ファイル数 / class構成は責務が分かる最小限とし、過剰分割しない。

safe process invocationは小さなprocess helper等へ自然にまとめてよい。Drive query safetyはDrive client/helper内へ置き、generic command/query frameworkへ拡張しない。

---

## 18. Operational flow summary

### Git → Google existing update

```text
main/manual
→ targeted validation
→ about/root
→ global read-only Preflight
→ write直前source freshness
→ files.update
→ strict re-export
→ baseline finalize
```

### Git → Google create

Section 9.2を正本とする。

### Google → Git content PR

Section 10.4を正本とする。

### Google → Git state-only

Section 10.3を正本とする。

---

## 19. Deletion / Trash / root外move

削除は同期イベントとして伝播しない。詳細なmissing-side decisionはSection 7を正本とする。

- active探索は`trashed=false`。
- trashed managed Docはactive missing。
- remaining sideから正しい方向で再生成され得る。
- root外へmoveされたmanaged Docはactive missingと区別できない。
- root外の旧Docをfull Drive探索で見つけに行かない。
- 自動delete / Trash復元しない。

---

## 20. Risks / Residual Risks / 運用契約

### R1. Markdown round-trip incompatibility

全件canonical equalityで検証し、観測差分だけ最小adapter化する。

### R2. Apply partial success / Git→Google TOCTOU

full Preflight + write直前stale check + post-write re-exportを行うが、checkとGoogle API write間の短いTOCTOUは残る。lock / atomic CASは導入しない。

### R3. create duplicate race

create前duplicate checkに加え、**baseline finalize直前**にDoc一意性を再確認する。folderも子item create直前に一意性を再確認する。duplicate時はfailしdeleteしない。

### R4. Google → Git source freshness / remote push TOCTOU

Google source freshnessはremote push直前に確認する。

ただしfreshness確認からpush / PR作成までの短い間にGoogle Docが再編集されるTOCTOUは完全には排除できない。

PR作成後に対象Google Docが変更された場合は既存sync PRをcloseし、Google → Git Workflowを再実行する。

### R5. root外move

root外へmoveされたmanaged Docはactive missingと区別できず、新Docがrecreateされ得る。旧Docは自動探索・整理しない。

### R6. full Drive scope / OAuth operation

Secret step-local化、log禁止、validated sync root hard boundaryでblast radiusを抑える。External利用時は運用時点のOAuth verification要件を確認する。

### R7. Automation PR CI

PR作成前targeted validationを必須とし、PAT / GitHub App / auto-mergeは追加しない。

### R8. push成功 / PR作成失敗によるorphan automation branch

freshness成功後にremote pushが成功し、その後の`gh pr create`だけが失敗した場合、open PRを伴わないrun-specific automation branchがremoteに残る可能性がある。

初期版では自動branch削除 / rollback / remote branch scan / age判定 / branch reuseを実装しない。次回runは`GITHUB_RUN_ID` / `GITHUB_RUN_ATTEMPT`を含む新しいautomation branchを使用する。

open PR guardの目的は複数のGoogle→Git **open PR**を同時生成しないことであり、orphan branchのgarbage collectionではない。

---

## 21. Open Questions

**Blocking Open Questions: なし。**

実測でのみ確認する事項:

- Google Docs Markdown import / exportでRepository内のどのconstructにcanonical diffが発生するか。

TOCTOU、PR snapshot、root外move、Shared Drive非対応、orphan automation branchはOpen Questionではなく既知のResidual Risk / Limitationとして扱う。

---

## 22. Definition of Done

### Scope / content / Drive

- [ ] 対象が2 globだけ。
- [ ] 1 Markdown = 1 Google Doc。
- [ ] Google側同期contentを`files.export(text/markdown)`で表現される内容と定義。
- [ ] Markdownへ表現されないGoogle Docs固有情報を同期保証外と明記。
- [ ] Shared Driveではないfolderだけをrootとしてサポート。
- [ ] Shared Drive / inaccessible rootをfail-safeに扱う。
- [ ] `about.get(fields=importFormats,exportFormats)`をruntime確認。
- [ ] `files.export`上限等でexport不可ならfallbackせずfail。
- [ ] `trashed=false`、pagination、必要fields、capability確認。
- [ ] cross-platform safe pathを検証。
- [ ] Unicode collision keyをNFCに固定。
- [ ] NFC + Node標準lowercase相当でcase-insensitive collisionを拒否。
- [ ] Drive-derived pathをshell command stringへ直接連結しない。
- [ ] subprocessへ動的pathをargument arrayとして渡す。
- [ ] Git pathspecで必要な箇所は`--`を使いoption解釈を防ぐ。
- [ ] Drive queryへ外部由来literalをraw interpolationしない。
- [ ] Drive query dynamic literalは共通escapingを通す、またはparent listing + Node exact matchを使う。
- [ ] create / folder reconciliationでも同じDrive query safety contractを守る。

### State / metadata

- [ ] Section 7をstate decisionの唯一の正本とする。
- [ ] `githubPath` / `lastSyncedSha256`を維持。
- [ ] `File.version`をopaque stringとして保持しNumberへ変換しない。
- [ ] `File.version`はstring equalityだけでstale判定する。
- [ ] custom properties最大100 / private appProperties最大30 / key+value 124-byte制約を認識する。
- [ ] `githubPath`等の124-byte制約をwrite前にUTF-8 byteLengthで検証する。
- [ ] Last Writer Winsなし。
- [ ] missing-sideでdelete伝播なし。
- [ ] PR不要`G == D`でsafe adoption / converged finalize可能。
- [ ] content PRではmerge前baseline更新なし。

### Git → Google

- [ ] global read-only Preflight後のみApply。
- [ ] existing content/state write直前にstale snapshot再確認。
- [ ] create直前parent / capability / duplicate再確認。
- [ ] multipart createでidentity metadata + Markdown mediaを同一requestへ含める。
- [ ] create requestへ`lastSyncedSha256`を含めない。
- [ ] Doc baseline finalize直前にduplicate一意性を再確認。
- [ ] folderは子item create直前に一意性を再確認。
- [ ] duplicate時baselineを書かず、自動deleteしない。
- [ ] strict round-trip成功後のみbaseline finalize。
- [ ] ambiguous create / updateをreconcile。
- [ ] rollback deleteなし。

### Google → Git

- [ ] 開始時`initialMainSha`を保存。
- [ ] open PR guardを重い処理より前へ置く。
- [ ] source Doc snapshotで`version: string`を保持。
- [ ] target-only stage / cached diff check後にlocal commitを作成可能。
- [ ] local commit前に既存automationと同じ`github-actions[bot]` identityを設定。
- [ ] `user.name = github-actions[bot]` / `user.email = 41898282+github-actions[bot]@users.noreply.github.com`を使う。
- [ ] local commit後・remote push直前にmain freshnessを確認。
- [ ] local commit後・remote push直前にGoogle source freshnessを確認。
- [ ] main freshness failure時はpush / PRしない。
- [ ] Google source freshness failure時はpush / PRしない。
- [ ] local commit後のfreshness failureを安全にfailできる。
- [ ] source freshness成功後のみnon-force push。
- [ ] PR作成後再編集時はclose + rerunの運用契約を明記。
- [ ] tracked + untracked unionでallowlist確認。
- [ ] validation後にallowlist再確認。
- [ ] target Markdownだけ明示stageし`git add .`を使わない。
- [ ] stage時もDrive-derived pathをargument array + `--`で扱う。
- [ ] staged target-only allowlist / `git diff --cached --check`を確認。
- [ ] automation branch prefix固定・open PR guardへ利用。
- [ ] `gh auth setup-git`とpushを`GH_TOKEN`付き同一stepの責務として扱う。
- [ ] push成功・PR失敗でorphan branchが残り得ることをResidual Riskとして扱う。
- [ ] orphan branchの自動cleanup / branch reuseを追加しない。
- [ ] main直接push / auto-merge / force pushなし。

### Security / OAuth / Workflow

- [ ] `GOOGLE_*` Secret値をlogへ出さない。
- [ ] Google Secretsを必要sync stepだけへinject。
- [ ] Access TokenをWorkflow environment / artifactへ永続化しない。
- [ ] `GH_TOKEN`を必要stepだけへ限定。
- [ ] External + Testingの7-day Refresh Token制約を明記。
- [ ] External full Drive scope運用時は現在のGoogle verification要件を確認。
- [ ] direction共通concurrency / timeout。
- [ ] runtimeはtargeted validationのみ。
- [ ] implementation完了時`pnpm run verify`。

### Implementation readiness

- [ ] 実装着手前に最新`main`をfeature branchへ取り込む。
- [ ] 取り込み後にSection 23のRepository契約を再確認する。
- [ ] Critical / Majorな既知課題がない状態で実装へ進む。

---

## 23. 実装手順

### 23.1 実装着手前のmain同期

このPlan修正中は`main`をmerge / rebaseしない。

**同じfeature branchで実装を開始する直前**に:

```bash
git fetch origin main
```

を実行し、最新`main`を`feat/google-docs-markdown-sync`へ取り込む。merge / rebaseのどちらを使うかはその時点のRepository運用に従う。

最新main取り込み後、最低限以下を再確認する。

```text
package.json scripts
.github/workflows/ci.yml
.github/workflows/expo-dependency-maintenance.yml
scripts/spec/validate-all.ts
scripts/validate-curriculum.ts
scripts/spec/build-spec.ts
Repository contract tests
```

最低限、次のcommandが存在することを確認する。

```text
lint:markdown
validate:spec
validate:spec-visuals:final
validate:curriculum
build:spec
verify
```

既存automation conventionにdriftがないことを確認し、Google Docs syncへ直接影響する変更だけをPlan / 実装へ反映する。無関係なmain変更を理由に設計を広げない。

### 23.2 実装順序

1. target path / NFC / cross-platform collision / duplicate / Trash ruleをpure logic化。
2. Drive-derived pathをargument arrayでprocessへ渡すsafe invocation boundaryを実装・test。
3. canonicalization / SHA-256 / concrete `appProperties` limits validationを実装。
4. Section 7 Decision Tableをpure logicとして実装・test。
5. OAuth / about check / root validation / Drive REST boundaryを実装。
6. Drive discovery / reconciliationへparent listing + Node exact matchを優先したquery safetyを実装し、必要な場合だけ共通literal escape helperを追加。
7. `File.version: string`を含むsnapshot modelとpagination / get / export / multipart create / update / capability取得を実装。
8. Git→Google Preflight snapshot / write直前stale checkを実装。
9. multipart create + response reconciliation + baseline直前duplicate checkを実装。
10. folder子item create直前の一意性checkを実装。
11. Git→Google post-write re-export / baseline finalize / safe rerunを実装。
12. Google→Git early open PR guard / `initialMainSha` / source snapshotを実装。
13. Google→Git tracked+untracked allowlist / targeted validation / safe target-only stageを実装。
14. automation branch作成後、既存automationと同じ`github-actions[bot]` identityを設定してlocal commitを実装。
15. local commit後・push直前のmain freshness + Google source freshness checkを実装。
16. freshness成功後だけ、step-local `GH_TOKEN`で`gh auth setup-git` + non-force pushを行い、その後PR作成を既存conventionへ合わせる。
17. Secret / `GH_TOKEN`をstep-localにした1 Workflowを追加。
18. Section 16のtestを完了。
19. current `main`全対象でinitial bootstrap / strict canonical round-trip。
20. 観測diffだけfixture + 最小adapterで対応。
21. liveで既存edit / new Doc / new Git / concurrent edit / source race / duplicate race / missing-sideを確認。
22. implementation完了時の差分で`pnpm run verify`。

---

## 24. Plan修正時点のValidation

Plan-only修正では以下を実行する。

```bash
pnpm exec prettier --check docs/plans/2026-09-07_201539_google-docs-markdown-sync.md
pnpm run lint:markdown
git diff --check
git diff --name-only
```

`pnpm run verify`はPlan-only修正では必須にしない。

---

## 25. 変更境界

今回変更してよいのは以下のみ。

```text
docs/plans/2026-09-07_201539_google-docs-markdown-sync.md
```

変更禁止:

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

今回は実装しない。今回のPlan修正中に`main`をmerge / rebaseしない。

---

## 26. Branch / main drift

```text
feature branch:
feat/google-docs-markdown-sync
```

2026-09-08の確認時点で`main`はPlan作成時点から進んでいる。Plan修正中は取り込まず、**実装着手前にSection 23.1の手順で最新mainを取り込むことを必須**とする。

固定base SHAを実装時に信頼せず、取り込み後のRepository契約とGoogle API仕様を再確認する。

---

## 27. 実装時の優先順位

1. 対象glob / sync root hard boundary
2. Section 7 Decision Table
3. global read-only Preflight
4. Git→Google write直前freshness check
5. Google→Git remote push直前freshness check
6. strict canonical equality
7. create / update reconciliation + baseline直前duplicate check
8. safe adoption / baseline lifecycle
9. NFC / cross-platform path / process argument / Git staged boundary
10. Drive query literal safety
11. Secret least exposure / OAuth operation
12. Git automation identity / targeted validation + PR automation

このPlanを現時点の実装正本とする。Critical / Majorな既知課題がない状態で実装へ進み、安全性に直接寄与しない将来拡張は追加しない。
