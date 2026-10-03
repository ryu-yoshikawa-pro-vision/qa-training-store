# Report（追記のみ）

## 2026-10-02 17:34 (JST)

- Summary: GitHub Codespaces + OpenCode Free model の検証・導入Planを作成し、実装前の変更範囲と停止条件を確定した。
- Changes: `plan/codespaces-opencode-devcontainer` branchを作成し、canonical Planとplan-only Run Artifactだけを追加した。`.devcontainer`、README、source、test、workflowは変更していない。
- 判断 / 理由: plain CodespaceでOpenCode / Zen Free modelの疎通を先に確認し、成功後だけ最小devcontainerを追加する。これによりOpenCode側failureとDev Container側failureを分離する。Nativeは既存Windows / macOS経路を維持する。
- Validation: Repositoryの`package.json`、README、CI、AGENTS、既存OpenCode Security fallback、Plan / Run規約と、GitHub Codespaces / Dev Containers / OpenCode公式資料を照合した。Codespace実機検証とRepository `pnpm run verify` は今回のplan-only scopeでは未実行。
- ブロッカー / 残作業: なし。後続実装ではcanonical PlanのPhase Aから開始し、Free model / OpenCode versionを実装時点で再確認する。
- Progress: 100% (6/6)

## 2026-10-02 18:38 (JST)

- Summary: 既存PlanへCodex CLIを追加し、CodespacesでOpenCodeとCodexの両方を使う導入方針へ更新した。
- Changes: canonical Planとplan-only Run Artifactだけを更新した。`.devcontainer`、README、source、test、workflow、既存`.codex/**`実装は変更していない。
- 判断 / 理由: Codex CLI自体はdevcontainerでexact versionを再現し、認証は`Sign in with ChatGPT`で各Codespaceから行う。`OPENAI_API_KEY`を通常経路へ追加せず、ChatGPTプラン利用とAPI課金を混同しない。Codex auth file / tokenはRepositoryやCodespaces Secretへコピーしない。
- Validation: OpenAI公式のCodex CLI、ChatGPT plan、config referenceを確認。Codex CLIはLinuxで利用でき、初回起動時に`Sign in with ChatGPT`を選択できる。ChatGPTアカウントでのCodex利用はChatGPTプランの利用枠を使用する。Codespace実機検証は後続Phase Bで行う。
- ブロッカー / 残作業: なし。後続実装ではOpenCodeとCodexをplain Codespaceで個別に疎通確認してから`.devcontainer`を追加する。
- Progress: 100% (7/7)

## 2026-10-02 19:59 (JST)

- Summary: OpenCode Free modelの学習利用に関する前提を更新した。
- Changes: `qa-training-store` がpublic Repositoryであることを確認し、Repository内容やprompt / completionが学習利用される可能性を許容する方針へcanonical PlanとRun Artifactを修正した。
- 判断 / 理由: 学習利用可否はFree modelの選定条件・停止条件から外す。一方で、`OPENCODE_API_KEY`、ChatGPT認証情報、その他Repositoryに含まれないSecretはOpenCodeへ送信しない。
- Validation: GitHub Repository metadataでvisibility=`public`を確認した。Repositoryがprivateへ変更された場合だけ、この前提を再確認するgateをPlanへ残した。
- ブロッカー / 残作業: なし。
- Progress: 100% (8/8)

## 2026-10-02 複数レビュー統合（JST）

- Summary: PR #188の複数レビューを統合し、実装前に必要な修正をcanonical Planへ反映した。以前のplan-only完了状態は、ユーザー指示により同じPRで実装まで進めるactive Runへ拡張した。
- Changes: Full Rebuild + Fresh Create、OpenCode `model` / `small_model` Free固定、auto update無効、stable channel限定、Codex代替認証監査、project / Hook trustと既存harness検証、Phase B→C checkpoint、目的達成に必須な変更を同一PRで扱うscopeルール、8081のみforward、ignored smoke artifactを削除不要とする契約を追加した。
- 判断 / 理由: OpenCode公式仕様では`small_model`が別modelを利用でき、自動更新も既定で有効。GitHub Codespacesの通常Rebuildはcacheを再利用するためFresh CreateだけでなくFull Rebuildとの両方を検証する。CodexはRepository固有のproject / Hook trustがあるためCLI単体疎通だけを合格にしない。
- Validation: Repositoryの`package.json`、`.codex/config.toml`、`scripts/codex-safe.sh`、`AGENTS.md`、`.gitignore`、Playwright configと、GitHub Codespaces / Dev Containers / OpenCode / OpenAI公式資料を照合した。
- ファイル分割: 実施しない。単一の検証→確定→実装→再現性検証の流れで共通条件が多く、分割すると重複が増えるため。
- Blocker: なし。実装はPhase Aから開始する。
- Progress: 23% (5/22)

## 2026-10-02 最終レビュー統合（JST）

- Summary: PR #188の追加レビューをRepository実装とcurrent公式仕様に照らし、実装開始前に必要な条件をcanonical Planへ追加した。
- Changes: Personal dotfilesをcanonical Fresh Createから除外、OpenCode Free-onlyをprovider / agent / command / usageまで閉じる、Free-only設定をdevcontainerの既定runtimeへ反映、Zen認証exact mechanismをPhase Bで確定、Codex device-code authentication、`ci_wait` MCP、CLI install path / user / PATH、Repository-derived development smokeを追加した。
- CI: head `75462e9c4a7eb9811b1579cd1d09f96d807347b6` のWeb CIはStyle Quality failure。実ログでcanonical PlanのMD032 3件・MD034 13件を確認し、今回のPlan全面更新でblank lineとMarkdown linkへ修正した。
- 根拠: OpenCode公式はconfig merge順、`OPENCODE_CONFIG_CONTENT`、`small_model`、agent / command model override、`enabled_providers`、`opencode debug config`を定義する。GitHub Codespaces公式は新規Codespaceへのdotfiles自動適用と`GITHUB_TOKEN`提供を定義する。Codex公式はremote / headless環境でdevice-code authenticationを推奨する。
- ファイル分割: 実施しない。既存Phase B / B→C / E / Smoke契約への追記で収まり、別ファイル化すると共通条件が重複する。
- Blocker: なし。次はPhase A。
- Progress: 24% (6/25)

## 2026-10-03 06:53 (JST)

- Summary: 追加の複数レビューを統合し、Fresh Createの実行順序、OpenCode Free-onlyの負方向検証、Free status、usage evidence、Codex Hook実Runtimeをcanonical Planへ反映した。
- Changes: 環境影響変更をcandidate commitへ通常pushしてSHAを固定した後、同じSHAで`gh codespace rebuild --full`とdotfilesなしFresh Createを行う順序へ変更した。Phase Bもdotfilesなし新規Codespaceへ変更した。OpenCode候補はmodel名ではなくcurrent Zen metadata / pricingのzero-costを根拠にし、`--model` negative control、全config source監査、session-bound usage evidence、一意artifact pathを追加した。Codexは`pnpm run test:hooks`、same-session Hook runtime、bounded subagentを追加した。
- OpenCode認証: Personal Secretの直接認識が成立しない場合、official env substitutionでprovider `options.apiKey`へ`{env:OPENCODE_API_KEY}`相当を渡す経路を検証し、auth cache copyは採用しない。
- Evidence: OpenCode current docsでconfig merge / precedence、CLI `--model`優先、`stats --models`、session export、Zen pricing / model metadataを確認した。GitHub Codespaces current docsでFull Rebuildと`/workspaces` persistenceを確認した。既存`.codex/hooks/log_event.mjs`はUserPromptSubmit / PostToolUse / SubagentStart / SubagentStop / Stopをsession単位JSONLへ記録できる。
- CI: 反映前head `b843ba2d4188051c71f887fa69a4a778e743d35e` のWeb CI / Mobile App CIはいずれもsuccess。
- ファイル分割: 実施しない。追加内容は既存Phase A / B / B→C / E / Smoke契約へ収まり、分割するとcandidate SHAと停止条件が二重管理になる。
- Blocker: なし。次はPhase A。
- Progress: 21% (7/34)

## 2026-10-03 OpenCode model選択方針変更（JST）

- Summary: OpenCodeのmodel選択をRepository / harness側で制御せず、ユーザーがOpenCode上で選択する前提へ変更した。
- Changes: Free-only guard、zero-cost / pricing判定、selected model固定、provider whitelist、negative control、model usage evidence、Model access / fail-closed launcher検討をcanonical Planとactive Runの今後タスクから削除した。
- 維持する契約: OpenCode stable exact version、auto update無効、Personal `OPENCODE_API_KEY` を使ったFresh Create再現可能なZen認証、Secret非露出、read-only / bounded development smoke。
- 理由: ユーザーはFree modelを主に利用予定だが、paid modelを選ぶ可能性もあり、model選択はユーザー操作である。Repository側のmodel制限は現在要件ではなく、実装と検証を不必要に複雑化する。
- Candidate SHA / Full Rebuild / Fresh Create / Codex Repository integrationの契約は変更しない。
- ファイル分割: 実施しない。model制御削除によりPlanは単純化され、分割理由はさらに弱くなった。
- Blocker: なし。次はPhase A。
- Progress: 25% (8/32)

## 2026-10-03 08:50 (JST)

- Summary: 最新の複数レビューを現在の「OpenCode modelはユーザー選択」前提で再評価し、まだ必要な契約だけをcanonical Planへ反映した。
- Changes: Full Rebuild直前のcandidate SHA / clean worktree /環境影響差分 /対象Codespace確認、candidate検証中のbranch freeze、OpenCode smokeのmodel能力precondition、workspace root・逐次・fail-fastのpostCreate、Repository既存`wait_for_required_ci`契約へのCI同期、「同等環境」の契約レベル定義を追加した。
- CI contract: `docs/reference/codex-implementation-harness.md` を正本とし、final exact HEADで`Web CI` / `Mobile App CI`を待つ。`wait_for_required_ci`は1回だけ使用し、Agent pollingへfallbackしない。CI結果だけのためにRun Artifactを再commitしない。
- Full Rebuild: `gh codespace rebuild --full -c <codespace-name>`で対象を明示する。GitHub公式上、Rebuildはworking directoryのdev container設定を使い、`/workspaces`は保持されるため、workspace clean-stateはFresh Createで検証する。
- OpenCode: Free-only / pricing / negative control / launcher / Model access関連レビューは、modelをユーザーが選択する最新要件と矛盾するため採用しない。smokeに必要なmodel能力だけをpreconditionにする。
- Style Quality: 前headで発生したMD029はE-3 ordered listの`9 → 11 → 12`が原因。今回`9 → 10 → 11 → 12`へ修正した。
- ファイル分割: 実施しない。今回の修正は既存Phase C / E / F / Smoke契約の補強だけで、別ファイル化するとcandidate SHAとCI lifecycleが分散する。
- Blocker: なし。次はPhase A。
- Progress: 27% (9/33、必須CI確認1件を含む)

## 2026-10-03 10:07 (JST)

- Summary: 複数モデルの追加レビューを現在の要件とRepository実装へ照合し、実装結果を誤判定し得る未確定契約をcanonical Planへ反映した。
- Changes: Phase Bのplain環境provenanceをtarget contractから分離、OpenCode Personal Secret利用のone-shot evidence、canonical Zen provider smoke、model failure分類、latest non-prerelease stable決定規則、dotfiles元状態の保存 / 復元、validation-only Codespace stop、Fresh Create auth zero-state、explicit devcontainer path、Full Rebuild / Fresh Create内`pnpm run verify`、`waitFor: "postCreateCommand"`、Web process cleanupを追加した。
- ci_wait: Phase B / Full Rebuild / Fresh CreateではMCP server startupと`wait_for_required_ci` discoveryだけを確認しtoolは呼ばない。canonical processから`GH_TOKEN`を除外しCodespaces標準`GITHUB_TOKEN`を利用する。final exact HEADでのみwait toolを1回呼ぶ。
- OpenCode: model ID / Free / paidはユーザー選択のまま維持する。canonical smokeのみZen providerを要求する。smoke成功だけをPersonal Secret認証の証拠にせず、exact versionのcredential pathとauth cache / alternate source排除を組み合わせる。
- Codespaces lifecycle: Phase Aでdotfiles設定を記録して一時OFF、Fresh Create evidence取得後に復元する。validation-only Codespaceはstopし、delete候補をREPORTへ記録するが自動deleteしない。
- main baseline: Phase A時点のlatest mainを固定し、mainが進んだだけでは再検証しない。branchへmain変更を取り込んだ場合だけcandidate変更として扱う。
- ファイル分割: 実施しない。今回追加した契約もcandidate SHA → Full Rebuild → Fresh Create → cleanup → final CIの一続きであり、分割すると状態と停止条件が重複する。
- Blocker: なし。次はPhase A。
- Progress: 27% (10/37、必須CI確認1件を含む)
