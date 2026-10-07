# GitHub Codespaces IDE拡張・Playwright GUI録画導入計画

## 0. 依頼概要

- 既存PR #188の同じbranch `plan/codespaces-opencode-devcontainer`で、Codespacesのブラウザ版VS CodeからCodex、OpenCode、Playwrightの拡張機能を利用できる状態にする。
- Playwrightについてはテスト実行だけでなく、Codespace内のheaded ChromiumをnoVNCで表示し、`Record new`、`Record at cursor`、locator取得、codegenを利用できる状態にする。
- 既存のOpenCode / Codex CLI導入計画は維持し、このPlanはIDE拡張とPlaywright GUI録画の追加差分だけを扱う。

作成基準:

- branch: `plan/codespaces-opencode-devcontainer`
- PR: `#188`
- 作成時PR head: `0d554416d2e31eeda89f705dbe2a3db79492a3b6`
- 作成日: 2026-10-04 JST
- 関連Plan: `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`

### Plan間の責務

- 既存PlanはOpenCode / Codex CLI、認証、GitHub CLI、Full Rebuild / Fresh Create、CI、cleanupの正本として維持する。
- このPlanはVS Code拡張、`desktop-lite`、6080 forwarding、Playwright Chromium導入、GUI録画の正本とする。
- `.devcontainer/devcontainer.json`の`features`、`customizations.vscode.extensions`、`forwardPorts` / `portsAttributes`、Playwright browser install、GUI smokeで両Planが重なる場合は、このPlanの追加要件を既存Planへ加算して実装する。既存Planの他の契約を置き換えない。

## 1. ゴール / 完了条件

### ゴール

Codespacesをブラウザから開くだけで、Repositoryの通常開発に加えてCodex / OpenCodeのIDE統合とPlaywrightの実行・デバッグ・GUI録画を利用でき、同じ設定をFull RebuildとFresh Createで再現できる状態にする。

### 完了条件

以下をすべて満たす。

1. `.devcontainer/devcontainer.json`で`OpenAI.chatgpt`、`sst-dev.opencode`、`ms-playwright.playwright`を明示的に導入する。
2. OpenCode拡張はCodespace内に導入済みのOpenCode CLIを利用して起動でき、選択中のファイルまたは範囲をOpenCodeへ渡せる。
3. Codex拡張はCodespacesのブラウザ版VS Codeで起動し、既存PlanでCLIが同じeffective `CODEX_HOME`へ保存したcached loginを共有してChatGPTアカウントを利用できることを確認する。CLIが認証済みなのにIDE拡張が再ログインを要求する場合はPASSにせず、`CODEX_HOME`またはExtension Hostの環境差をintegration failureとして扱う。
4. Playwright拡張が既存`playwright.config.ts`と`@playwright/test@1.62.0`を認識し、Testing sidebarから既存Chromiumテストを列挙・実行できる。
5. `ghcr.io/devcontainers/features/desktop-lite:1`を追加し、`DISPLAY=:1`のGUI環境、Fluxbox、TigerVNC、noVNCを利用できる。
6. noVNCの6080だけを`forwardPorts`へ追加し、5901は外部forwardしない。6080はGitHub Codespacesのprivate visibilityを維持し、public / orgへ変更しない。
7. 既存Web Runtimeの8081 forwardingを維持し、6080追加によって8081の動作を変えない。
8. RepositoryのPlaywright versionからChromium browser binaryと必要なLinux依存を導入し、headless / headedの両方を実行できる。
9. Codespace内で`pnpm exec playwright codegen http://127.0.0.1:8081`を起動し、ChromiumとPlaywright InspectorをnoVNC上で表示できる。
10. codegenで1回以上のクリックまたは入力を行い、操作コードとlocatorが生成される。
11. Playwright VS Code拡張の`Record new`でChromiumがnoVNC上に表示され、人間の操作からPlaywrightコードが生成される。
12. `Record at cursor`で既存の一時テストへ1操作以上を追加できる。
13. GUI録画確認で作成した検証専用ファイルや変更は最終成果物へ残さず、Repositoryの安全契約に従ってcleanupし、検証後のworking treeをcleanに戻す。
14. GUI機能を追加したcandidate SHAに対して、既存PlanのFull Rebuild / Fresh Create検証をやり直す。
15. Fresh Createでも3拡張、Chromium、`DISPLAY=:1`、6080 noVNC、codegen、Playwright拡張の録画経路を再現できる。
16. `pnpm run verify`、既存Web smoke、既存OpenCode / Codex smokeを維持し、今回の追加による回帰がない。
17. READMEへCodespacesでの3拡張とPlaywright Desktopの利用方法、6080がprivate前提であることを記載する。

## 2. 現状理解と前提

### Entry points

- Codespaces環境: 将来作成する`.devcontainer/devcontainer.json`。
- 既存Codespaces計画: `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`。
- Playwright依存: `package.json`の`@playwright/test@1.62.0`。
- Playwright設定: `playwright.config.ts`。
- 通常Web Runtime: 8081。
- Training Web Runtime: 8082。

### Main flow

想定する利用経路は次のとおり。

```text
GitHub Codespacesをブラウザで開く
  -> devcontainerを作成
  -> VS Code拡張を自動導入
  -> pnpm依存 / OpenCode CLI / Codex CLI / Chromiumを導入
  -> desktop-liteがDISPLAY=:1とnoVNCを起動
  -> 8081でqa-training-storeを起動
  -> 6080のprivate forwarded URLでFluxbox desktopを表示
  -> Playwright codegen / VS Code Record new / Record at cursor
```

### Key abstractions

- Dev Container Featureは環境機能の導入境界とし、GUI基盤は自前のX11 / VNC scriptを作らず`desktop-lite`を使う。
- VS Code拡張の配布は`customizations.vscode.extensions`を正本とし、ユーザーごとのSettings Syncや手動installを成功条件にしない。
- Playwright browserはRepositoryの`@playwright/test`と同じversionのCLIから導入し、browser executableのversionずれを避ける。
- Playwright GUIはCodespace内で起動し、表示だけをnoVNC経由で手元のブラウザへ転送する。ローカルPCのブラウザへPlaywrightを接続する別拡張や独自bridgeは追加しない。

### Existing tests / validation

- `pnpm run verify`はFormat、lint、typecheck、Vitest、Web Build等を実行するがPlaywright E2Eは含まない。
- 既存Playwright Chromium経路は`pnpm run test:e2e:chromium`。
- `playwright.config.ts`は通常Runtimeを`http://127.0.0.1:8081`として扱う。
- 既存PR #188はFull Rebuild / Fresh Create、Web smoke、OpenCode / Codex smoke、GitHub API接続を検証対象としている。

### Safe change surface

- `.devcontainer/devcontainer.json`
- `README.md`
- このPlanと既存PlanのPlan間参照
- active Run Artifact

Application source、Playwright test本体、CI workflow、Native build経路は今回の機能要件だけでは変更不要。

### 公式仕様として確認済みの事項

- Dev Containersは`customizations.vscode.extensions`でcontainer作成時にVS Code拡張を導入できる。
- `desktop-lite`はFluxbox、TigerVNC、noVNCを提供し、既定web portは6080、VNC portは5901、container環境へ`DISPLAY=:1`を設定する。
- Playwright公式Docker資料はGitHub Codespacesで`desktop-lite` + noVNCを使い、record、selector pick、codegenをcontainer上で利用する方法を案内している。
- Playwright公式VS Code拡張は`Record new`、`Record at cursor`、Show Browser、locator pick、trace viewerを提供する。
- GitHub Codespacesのforwarded portは既定でprivateであり、private portはCodespace作成者がGitHub認証後にアクセスする。

### 前提

- 既存PlanのNode 24 / TypeScript devcontainer imageは維持する。Playwright公式Docker imageへ切り替えない。
- GUI録画で必要なbrowserはまずChromiumだけとする。Firefox / WebKitのGUI録画を今回のDoDへ含めない。
- `desktop-lite`のVNC password optionは明示設定せず、Feature既定値を利用する。6080をpublicへ変更しないことを外側のアクセス制御とする。
- Playwright browserは`pnpm install --frozen-lockfile`後にRepositoryのCLIから導入する。
- browser / OS依存導入はまず`pnpm exec playwright install --with-deps chromium`を候補とし、target `node` userでの実行可否を実機で確認する。

### 対象外

- 独自X11 server、独自VNC server、Docker Composeの追加。
- ローカルPCのChromeへCodespaceから接続するbridge。
- Playwright GUI用のpublic port。
- Firefox / WebKitのheaded録画保証。
- Native Android / iOS GUIをCodespacesへ移すこと。
- Playwright test設計や既存E2E内容の変更。
- Codex / OpenCodeのCLI契約の再設計。

## 3. 質問 / 曖昧性

### 未回答の重要質問

- なし。今回の目的、対象範囲、成功条件はユーザー指示から確定している。

### 実機でのみ確定できる事項

- CodespacesのWeb版VS Codeで各拡張機能が起動し、期待するUI機能まで利用できるか。
- `ms-playwright.playwright`の`Record new` / `Record at cursor`がCodespaces WebのExtension Hostから`DISPLAY=:1`を継承してheaded Chromiumを起動できるか。
- `pnpm exec playwright install --with-deps chromium`がtarget `node` user + devcontainerのsudo構成で追加調整なしに成功するか。

これらはblocking questionとして事前推測せず、Full Rebuild / Fresh Createのruntime smokeで判定する。失敗時は原因をGUI基盤、browser install、VS Code extension integrationに分離する。

## 4. 影響範囲

### 変更対象

1. `.devcontainer/devcontainer.json`
   - `ghcr.io/devcontainers/features/desktop-lite:1`を追加。
   - `customizations.vscode.extensions`へ3拡張を追加。
   - `forwardPorts`を8081 + 6080へする。
   - `portsAttributes`で8081と6080を識別しやすくする。
   - postCreateのPlaywright Chromium導入を既存CLI install順へ統合する。
2. `README.md`
   - Codespacesの起動後に利用できるIDE拡張を記載。
   - Playwright Desktopの6080へのアクセス、private維持、Record / codegenの使い方を記載。
3. `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`
   - この追加Planへの参照だけを追記し、既存Plan本文を再設計しない。
4. active Run Artifact
   - 実装時の検証結果、blocker、cleanupを記録する。

### 原則変更しない対象

- `package.json` / `pnpm-lock.yaml`: `@playwright/test@1.62.0`が既に存在するため、新規package追加は不要。
- `playwright.config.ts`: GUI録画を成立させるための恒久設定変更は原則不要。
- `.github/workflows/**`: 今回の機能追加だけを理由にCI workflowを追加しない。
- `e2e/**`: 検証用の一時生成物を恒久testとして残さない。

## 5. 変更方針

### 5.1 devcontainerへ公式GUI基盤を追加する

既存Planが予定している`github-cli` Featureへ`desktop-lite`を追加する。

```jsonc
{
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/desktop-lite:1": {}
  }
}
```

- `desktop-lite`が提供する`DISPLAY=:1`をそのまま利用する。
- 自前でXvfb、TigerVNC、noVNC、websockifyの起動scriptを追加しない。
- 5901はforwardしない。
- 6080だけをnoVNC用にforwardする。
- `desktop-lite`のFeature major `:1`を利用し、実装時に解決されたversionをevidenceへ記録する。

### 5.2 VS Code拡張をRepository設定として導入する

`customizations.vscode.extensions`へ次を追加する。

```text
OpenAI.chatgpt
sst-dev.opencode
ms-playwright.playwright
```

- OpenCode側の自動extension installには依存しない。Fresh Createの再現性を優先し、devcontainerで明示する。
- Codex CLIとCodex IDE extensionは同じeffective `CODEX_HOME`とcached loginを共有する。認証状態は共通だが、IDE UI / Extension Host経路の機能は別integrationとして検証する。
- Playwright拡張は既存`playwright.config.ts`を利用する。

### 5.3 ChromiumをFresh Create時から利用可能にする

既存Planの`postCreateCommand`へPlaywright Chromium導入を同期し、dependency install後、OpenCode / Codexの前に実行する。

期待順序:

```text
pnpm install --frozen-lockfile
-> Playwright Chromium + Linux dependencies
-> OpenCode exact install
-> Codex exact install
```

Playwrightの第一候補は次とする。

```bash
pnpm exec playwright install --with-deps chromium
```

- `@playwright/test`を別versionでglobal installしない。
- browser cache pathをRepository内へ固定しない。
- `node` userでOS依存導入が失敗した場合だけ、sudo境界を確認して最小修正する。
- browser installのためだけにbase imageをPlaywright imageへ変更しない。

### 5.4 port契約を更新する

`forwardPorts`は8081と6080だけとする。

```jsonc
{
  "forwardPorts": [8081, 6080],
  "portsAttributes": {
    "8081": {
      "label": "qa-training-store"
    },
    "6080": {
      "label": "Playwright Desktop",
      "onAutoForward": "notify"
    }
  }
}
```

- GitHub Codespacesのprivate既定値を利用する。
- runtime smokeで`gh codespace ports`を確認し、6080がprivateでない場合はFAILとする。
- 8081 / 6080のvisibilityを検証目的でpublicへ変更しない。

### 5.5 GUI基盤をPlaywright CLIから先に検証する

VS Code extensionより先にCLI codegenでGUI基盤を確認する。

1. Codespace内で`echo "$DISPLAY"`が`:1`であることを確認する。
2. 6080がlistenし、private forwarded URLからnoVNCへ接続できることを確認する。
3. `pnpm run start:web`で8081を起動する。
4. `pnpm exec playwright codegen http://127.0.0.1:8081`を実行する。
5. noVNC上にChromiumとPlaywright Inspectorが表示されることを確認する。
6. Storefrontで1回以上クリックまたは入力し、codegen側にPlaywright actionが生成されることを確認する。
7. locator pickが対象elementを識別できることを確認する。
8. codegenとWeb processを終了し、8081を解放する。

この段階が失敗した場合、VS Code拡張のRecorder検証へ進まずdesktop / browser / DISPLAYの問題として切り分ける。

### 5.6 Playwright VS Code拡張を検証する

CLI GUI基盤がPASSした後だけ拡張機能を確認する。

1. `ms-playwright.playwright`がcontainer側へ導入されていることを確認する。
2. Testing sidebarで`playwright.config.ts`のChromium projectと既存testが表示されることを確認する。
3. `pnpm run start:web`を別processで起動し、8081がlisten状態になることを確認する。
4. headlessで既存の小さいChromium testを1件実行してPASSを確認する。
5. Show Browserを有効化して同testを実行し、headed ChromiumがnoVNC上に表示されることを確認する。
6. `Record new`を開始し、ChromiumがnoVNC上に表示されることを確認する。
7. 8081のStorefrontを開き、1回以上操作し、VS Code側へtest codeが生成されることを確認する。
8. 検証専用の一時testで`Record at cursor`を実行し、cursor位置へ1操作以上が追加されることを確認する。
9. 起動したWeb processを停止し、8081が解放されたことを確認する。
10. 検証用test / 差分をRepository safety契約に従ってcleanupし、working treeをcleanに戻す。

録画確認のためだけに恒久的なsample testを追加しない。

### 5.7 Codex / OpenCode拡張を検証する

#### Codex

- `OpenAI.chatgpt`が導入済みであることを確認する。
- 既存PlanでCLI認証に使用したeffective `CODEX_HOME`をIDE拡張も使用していることを確認する。
- CLIの`codex login status`が認証済みの状態でCodespacesブラウザ版のCodex panelを開き、IDE拡張が同じcached loginを再利用してサインイン済みになることを確認する。
- IDE拡張だけが再ログインを要求する場合は別認証で回避せず、`CODEX_HOME`またはExtension Hostの環境差をintegration failureとして調査する。
- 現在開いているRepository fileをcontextにしたread-onlyな質問を1回実行し、応答できることを確認する。

#### OpenCode

- `sst-dev.opencode`が導入済みであることを確認する。
- extensionからCodespace内の既存OpenCode CLIを起動できることを確認する。
- 現在選択しているfileまたは範囲がOpenCode sessionへ渡ることを確認する。
- OpenCodeのmodel / credential方針は既存Planを変更しない。

### 5.8 Full Rebuild / Fresh Createへ統合する

`.devcontainer/devcontainer.json`は環境影響ファイルなので、今回の変更後は既存Planのcandidateを新しく固定し、Full Rebuild / Fresh Createを両方実行する。

Full Rebuild / Fresh Createでは追加で次を確認する。

- `desktop-lite`解決version。
- `DISPLAY=:1`。
- 6080 listen / private forwarding。
- Chromium install済み。
- 3つのVS Code extension導入済み。
- Codex IDE extensionがCLIと同じeffective `CODEX_HOME` / cached loginを共有し、再ログインなしで利用可能。
- CLI codegen GUI smoke。
- Playwright extension Test Explorer / Show Browser。
- Fresh Createで`Record new` / `Record at cursor`。

既存PlanのOpenCode / Codex CLI、GitHub API、Git write、`pnpm run verify`、Web smoke、cleanupも同じcandidateで維持する。

### 5.9 shared memory問題は実測時だけ対応する

Chromiumがshared memory不足を示す具体的なfailureを出した場合に限り、`desktop-lite`資料が案内する`runArgs: ["--shm-size=1g"]`を候補とする。

- 問題が再現していない段階では追加しない。
- `--cap-add=SYS_ADMIN`など権限を広げる設定は今回の通常解決策にしない。
- 追加した場合はFull Rebuild / Fresh Createを新candidateで再実行する。

## 6. 検証方法

| 対象 | 方法 | 成功条件 |
| --- | --- | --- |
| VS Code拡張配布 | container内extension一覧 + VS Code UI | 3拡張が導入済み |
| OpenCode extension | extension起動 + file context | Codespace内CLIを利用しcontext連携できる |
| Codex extension | shared `CODEX_HOME` / cached login + panel起動 + read-only prompt | CLI認証を共有し、再ログインなしでIDE利用可能 |
| Playwright extension | Testing sidebar | existing config / Chromium testsを認識 |
| Chromium install | `pnpm exec playwright install --list`等 | Repository version対応Chromiumが存在 |
| desktop-lite | `DISPLAY` / process / 6080 | `DISPLAY=:1`、desktop表示可能 |
| port安全性 | `gh codespace ports` | 6080がprivate |
| CLI codegen | `pnpm exec playwright codegen` | Chromium / Inspector表示、action生成 |
| Show Browser | VS Code Playwright extension | headed testがnoVNCに表示 |
| Record new | VS Code Playwright extension | 操作から新規test code生成 |
| Record at cursor | VS Code Playwright extension | cursor位置へaction追加 |
| Repository品質 | `pnpm run verify` / `git diff --check` | PASS |
| Rebuild再現性 | Full Rebuild | GUI + CLI + extensionsが再現 |
| Fresh再現性 | Fresh Create | clean stateから同じ機能が再現 |

### 録画検証のcleanup

- `Record new` / `Record at cursor`で生成するtestは検証専用とし、commit対象にしない。
- cleanup対象pathは実行前に一意に決め、既存testを上書きしない。
- cleanup後に`git status --short`と`git diff --check`で残差がないことを確認する。
- Repository safety policyが削除承認を要求する場合は、その時点で承認経路を使う。承認なしに広いcleanup commandを実行しない。

## 7. リスクと未解決論点

### Codespaces WebとVS Code extensionのruntime差

拡張機能がMarketplaceで提供されていても、Codespaces WebのExtension Hostで全機能が成立することは文書だけでは保証できない。CLI / noVNCがPASSしてPlaywright Recorderだけ失敗した場合は、GUI基盤ではなくVS Code extension integration failureとして扱う。

### browser install時間とdisk使用量

Chromium binaryとLinux dependenciesの追加でFresh Create時間とdisk使用量が増える。今回の目的に必要なChromiumだけに限定し、Firefox / WebKitは追加しない。

### noVNCアクセス

6080は外部到達可能なforwarded URLになるためprivateを必須とする。GitHub Codespacesのprivate portは作成者のGitHub認証を要求する。public / org visibilityへ変更しない。

### desktop-liteのVNC password

Feature既定のdesktop passwordは強いsecretではない。今回の主要境界はCodespaces private portとし、6080をpublicにしない。独自Secret注入やpassword管理機構は追加しない。

### Chromium shared memory

headed Chromiumでshared memory不足が実測された場合だけ`--shm-size=1g`を検討する。予防目的でrunArgsや追加capabilityを増やさない。

## 8. 成果物

予定成果物:

- `docs/plans/2026-10-04_160000_codespaces-ide-playwright-recording.md`
- `.devcontainer/devcontainer.json`
- `README.md`
- active Run Artifact

最小更新:

- `docs/plans/2026-10-02_173400_codespaces-opencode-devcontainer.md`へこのPlanの参照を追加する。

原則追加しない:

- Dockerfile
- Docker Compose
- 独自X11 / VNC script
- 新しいnpm dependency
- 新しいPlaywright test fixture / permanent smoke test
- 新しいCI workflow
- 5901 forwarding

## 9. 実行タスク

- [x] 1. 実装開始時のPR headと既存Planの進捗を再確認する。
- [x] 2. `desktop-lite:1`、Playwright VS Code extension、Codex / OpenCode extensionの配布状態を確認し、設定へ反映する。
- [x] 3. 既存PlanのB→C checkpointへChromium install方法とVS Code extension listを追加する。
- [x] 4. `.devcontainer/devcontainer.json`へ`desktop-lite`、3拡張、8081 / 6080 forwardingを実装する。
- [x] 5. postCreateへRepository version由来のChromium + Linux dependencies導入を追加する。
- [x] 6. READMEへCodespaces IDE / Playwright Desktop利用手順とPlan linksを追加する。
- [x] 7. `pnpm run verify` / `git diff --check`を実行し、candidate SHAを固定する。
- [x] 8. 旧Phase B plain Codespaceからのmigration経路はRequired DoDから外れた。candidateを明示devcontainer pathでFresh Createし、同じcandidate-created CodespaceをFull Rebuildする契約へ置き換え、両方PASS。
- [ ] 9. Full Rebuildで3拡張、`DISPLAY=:1`、6080 private、Chromium、CLI codegenを個別確認する。Full Rebuild自体はPASSだが、この詳細セットはユーザー提供結果に個別記載がないため完了扱いにしない。
- [ ] 10. Full RebuildでPlaywright Test Explorer / headless / Show Browserを個別確認する。結果は未報告。
- [x] 11. 既存PlanのOpenCode / Codex CLI / GitHub API / Web / verify契約を再確認する。Task 22 / active Run Task 30のFull Rebuild evidenceを参照。
- [x] 12. canonical machineからcandidateのFresh Codespaceを作成する。Fresh Createのmetadata / target Runtime / initial cleanはcanonical Planに記録済み。
- [x] 13. Fresh CreateしたCodespaceと追加環境が動作することをユーザーが確認。Playwright Desktop / noVNC / Chromium GUI / CLI codegenもユーザー確認済み。個別VS Code extension操作は別判定。
- [ ] 14. Fresh CreateのCLI codegenはPASS。taskに含まれる`Record new` / `Record at cursor`の個別実測結果は提供されていないため、このtask全体は未完了として残す。
- [x] 15. 検証後のworking tree / index cleanを確認し、一時smoke artifactをcleanupした。
- [x] 16. GUI起因のresource failureは報告されていないため、`--shm-size=1g`は追加せず、new candidate再検証も不要だった。
- [x] 17. final `pnpm run verify` PASS、文書quality gate / `git diff --check`、exact-head required CI success、cleanupを確認する。
- [x] 18. required CI success後にPR #188本文へ実測結果を反映する。final documentation headのCI後に現在のIDE extension statusも同期する。

## 10. 公式資料

- [Dev Containers `desktop-lite`](https://github.com/devcontainers/features/tree/main/src/desktop-lite)
- [Playwright Docker / GitHub Codespaces + noVNC](https://playwright.dev/docs/docker)
- [Playwright VS Code extension](https://playwright.dev/docs/getting-started-vscode)
- [Playwright Codegen](https://playwright.dev/docs/codegen)
- [Playwright browser install](https://playwright.dev/docs/browsers)
- [VS Code Dev Container customizations](https://code.visualstudio.com/docs/devcontainers/tutorial)
- [GitHub Codespaces port forwarding](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
- [GitHub Codespaces security](https://docs.github.com/en/codespaces/reference/security-in-github-codespaces)
- [Codex VS Code extension](https://marketplace.visualstudio.com/items?itemName=OpenAI.chatgpt)
- [Codex authentication](https://learn.chatgpt.com/docs/auth)
- [Codex environment variables](https://learn.chatgpt.com/docs/config-file/environment-variables)
- [OpenCode IDE integration](https://opencode.ai/docs/ide/)

## 11. 最終実機結果と未達範囲

- **Codespaces:** user-confirmed Fresh Create PASS、同じcandidate-created Codespaceのsingle Full Rebuild PASS、target Runtime PASS、`pnpm run verify` PASS、Web smoke PASS、新規Codespaceでも追加環境が動作。
- **Codex:** CLI / device-code auth / Hook / bounded subagent / `ci_wait` integration PASS。ユーザーは`OpenAI.chatgpt` extensionがインストールされ、VS Code上で確認できることを確認。extensionのIDE prompt実行自体は、今回のユーザー提供結果では個別確認されていない。
- **OpenCode:** CLI `2.0.22` / Free model / Repository instructions / Skill / read-write smoke PASS。`sst-dev.opencode` extensionはインストール済みだが、IDE起動時に`opencode --port 65147`を呼び、pinned CLIが`--port`をunknown flagとして拒否するためIDE extension startupはBLOCKED。CLI downgrade、wrapper、compatibility layer、dependency、devcontainer修正は行わない。このupstream互換性問題は、CLIを主経路とするPR #188のmerge blockerではない。
- **Playwright:** overall PASS at the user's acceptance level: Playwright Desktop 6080 / noVNC、Chromium GUI、CLI `playwright codegen` are user-confirmed. Individual Testing sidebar enumeration、Show Browser、`Record new`、`Record at cursor` were not separately evidenced and remain unverified; do not claim those individual controls passed. The user accepts the overall Playwright result; these detail-level checks are not PR #188 merge blockers.
- README describes extension installation and usage rather than asserting a successful OpenCode IDE activation; no README change was required for consistency.
