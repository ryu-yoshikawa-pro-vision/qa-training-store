# Issue #140 Windows launcher contract test timeout 調査・修正計画

## 0. 依頼概要

- 依頼内容: Issue #140「test: Windows launcherのcontract testが5秒timeoutになる原因を調査する」に対応するため、原因調査から修正・検証までの実装Planを作成する。
- 背景: Windowsローカル環境の`pnpm run verify`で、`test:contracts`内のWindows launcher関連テスト2件がVitest既定の5秒timeoutを超えて失敗することがある。PR #139の差分は文書・Run Artifactのみで、Issue作成時点では直接因果は確認されていない。
- 期待成果: PR #139との因果を切り分け、遅延箇所を計測して原因を特定する。原因に応じた最小修正を行い、対象テストと`pnpm run verify`を標準条件で安定してPASSさせる。原因を特定できない場合は、未確認点と得られた証跡を残す。

## 1. ゴール / 完了条件

### ゴール

Windows launcherを経由するcontract testが5秒を超える理由を、再現結果・処理時間の計測・呼び出し経路から切り分ける。timeout延長を先に決めず、遅延原因に対応する最小変更を選ぶ。

### 完了条件

- 失敗対象2件について、単独実行・`test:contracts`・`pnpm run verify`での再現条件と実行時間のばらつきが記録されている。
- 文書・Run Artifact変更を含まない`main`相当baselineでも再現するか確認し、PR #139との差分との因果関係が整理されている。
- Windows launcherの呼び出し経路について、少なくともprocess起動、PowerShell、repo root解決、Node hook起動、stdin転送・close、stdout/stderr回収、終了待機・cleanupのどこで時間を消費しているか確認されている。
- 原因を特定できた場合は、その原因に直接対応する最小修正が選ばれている。特定できない場合は、確認済み事項と未確認点が明示されている。
- 修正する場合、対象2件が標準の5秒条件で複数回安定してPASSする。
- `pnpm run test:contracts`と`pnpm run verify`が標準条件でPASSする。
- timeout変更のみを採用する場合は、実測値・ばらつき・必要値の根拠が記録され、必要以上に大きな値へ変更していない。
- safe/deny、quote/backslash、LF/CRLF、exit code、stdout/stderrの既存contractを変更していない。

## 2. 現状理解と前提

### 確認済み

- Issue #140では、Windowsローカルの`pnpm run verify`で次の2件が5秒timeoutを超えたと記録されている。
  - `Windows launcher safe/deny semantics`: 5569ms
  - `quote/backslash/LF/CRLF stdin semantics`: 5071ms
- 同じ2件はtimeoutを30秒にした対象確認では2/2 PASSしている。ただしIssueでは、これだけを根拠にWindows環境依存やtimeout不足と断定しない方針が明示されている。
- `package.json`の`test:contracts`は`vitest run tests/contracts --no-file-parallelism --maxWorkers=1`である。
- `tests/contracts/codex-hook-contract.test.ts`のWindows launcherテストは、テスト側からlauncherを起動し、safe/deny、stdin、cwd等のcontractを確認している。
- `.codex/hooks/pre_tool_use_policy_windows.ps1`はNode child processを起動し、stdinをchildへ転送してcloseし、stdout/stderrを非同期で読み出しながら最大15秒`WaitForExit`する。外側のVitest 5秒timeoutより内側のchild process timeoutが長い。
- 現行`.github/workflows/ci.yml`のVitest matrixは`ubuntu-latest`で実行される。Windows上の`test:contracts`を継続実行する既存CIは、確認した範囲では存在しない。そのため、GitHub Actionsの結果をWindows baselineとして扱わない。

### 前提

- 調査はWindows実環境を主な再現環境とする。
- 5秒timeoutそのものが短すぎる可能性は残すが、先にtimeout値を変更しない。
- 計測のためのdiagnosticを追加する場合も、既定のstdout/stderr、exit code、payload contractを変えない。恒久化が不要なら修正完了前に削除する。
- 原因がテスト・launcher・Hook・workflowのどこにあるかは事前に固定しない。

### 対象外

- PR #139の契約変更内容の再設計。
- 原因未確認のまま5秒から30秒へtimeoutを延長すること。
- 対象テストのskipや除外。
- CI全体のtimeout緩和。
- 無関係なProduct Code、Product Test、Hook、workflowの変更。
- 将来用途を想定したlauncherやprocess管理の全面的な抽象化・リファクタリング。

## 3. 質問 / 曖昧性

### 実装前に調査で確定する点

- 5秒の大半を消費しているのがPowerShell起動、`git rev-parse`、Node起動、stdin転送、stdout/stderr drain、`WaitForExit`、process終了後のcleanupのどこか。
- safeとdeny、root cwdとnested cwd、LFとCRLFで処理時間に有意な差があるか。
- 対象テスト単独、`pnpm run test:contracts`、`pnpm run verify`で実行時間が変わるか。
- 1テスト内でWindows launcherを複数回起動する回数に比例して遅くなっているだけか、特定呼び出しで待機が発生しているか。
- cleanな`main`相当baselineで同じ5秒超過が再現するか。
- Node hookの処理完了後もPowerShellまたは親processが残る、もしくはI/O待機が継続するケースがあるか。

### 未回答の重要事項

- Issue作成時点のWindowsローカルで観測された約5.1〜5.6秒が通常値なのか、外れ値なのかは未確定。
- 現行CIはVitest contractsをWindowsで実行していないため、GitHub-hosted Windows runnerでの同一テスト時間は未確認。
- timeout変更が必要かどうかは、計測完了まで決めない。

## 4. 影響範囲

### 最初に確認するファイル

- `tests/contracts/codex-hook-contract.test.ts`
- `.codex/hooks/pre_tool_use_policy_windows.ps1`
- `.codex/hooks/pre_tool_use_policy.mjs`
- `config/vitest.contracts.config.ts`
- `package.json`
- `.github/workflows/ci.yml`

### 原因次第で変更候補になるファイル

- launcher側の待機・I/O・process終了処理が原因の場合: `.codex/hooks/pre_tool_use_policy_windows.ps1`
- テストhelperのprocess起動・待機・cleanupが原因の場合: `tests/contracts/codex-hook-contract.test.ts`
- 5秒設定の所在またはテスト固有timeoutが原因と判断できた場合: `tests/contracts/codex-hook-contract.test.ts`または`config/vitest.contracts.config.ts`。ただし全contract testへ影響するglobal timeout変更は避け、必要範囲を最小化する。
- Windows環境で継続検証が必要と判断した場合のみ: `.github/workflows/ci.yml`。Issueの対象外指定があるため、原因・必要性を確認せず変更しない。

## 5. 変更方針

### 方針

baseline再現 → 計測 → 遅延箇所の特定 → 原因に応じた修正判断 → 回帰検証、の順で進める。timeout延長を原因調査の代替にしない。

### 実行タスク

- [ ] 1. `main`相当baselineを別worktreeまたは同等のcleanな状態で用意し、PR #139の文書・Run Artifact差分を含まない状態で対象2件を実行する。
- [ ] 2. Windowsで対象2件を個別に複数回実行し、各runの所要時間、PASS/FAIL、safe/deny、root/nested cwd、LF/CRLFの差を記録する。
- [ ] 3. `pnpm run test:contracts`と`pnpm run verify`でも同じ2件の時間を記録し、単独実行との差を比較する。
- [ ] 4. 既存ログだけで遅延区間が分からない場合、テストhelperまたはPowerShell launcherへ一時的な時刻計測を追加する。最低限、親process起動前後、repo root解決、Node起動、stdin copy/close、stdout/stderr read完了、`WaitForExit`完了、親process終了までを区別する。
- [ ] 5. process treeと終了状態を確認し、Node hook完了後にPowerShell、cmd、Node等が残存していないか、stdin EOF待ち、stdout/stderr buffering、`WaitForExit`待ちが発生していないかを確認する。
- [ ] 6. Windows launcherへ渡すcommand lineとquotingを確認し、quote/backslash/LF/CRLFケースで余分なshell解析や再試行が発生していないか確認する。
- [ ] 7. safe/deny双方を比較し、policy判定そのものの時間とlauncher共通部分の時間を分離する。
- [ ] 8. 原因を次の基準で分類し、修正対象を決める。
  - launcherの不要な待機・process/I/O処理が原因: launcherを最小修正する。
  - テストhelperの待機・cleanup・process起動方法が原因: testを最小修正する。
  - Hook処理が原因: Hook側の具体的な遅延原因を修正する。Issue対象外との境界を確認し、必要なら別対応へ分離する。
  - 正常処理に必要な時間が5秒付近で、不要な待機を確認できず、実測上5秒が不適切: 対象テストに限定してtimeoutを見直す。値は実測の最大値とばらつきから決める。
  - 原因を一意に特定できない: 推測で修正せず、確認済み証跡、否定できた仮説、残る未確認点を整理する。
- [ ] 9. 一時diagnosticが不要なら削除する。残す場合も明示的なdiagnostic有効化時のみ出力し、通常のcontractへ影響させない。
- [ ] 10. 対象2件、Windows launcher関連contract、`test:contracts`、`pnpm run verify`の順に回帰検証する。

## 6. 検証方法

### 再現・計測

Issueで失敗が確認された対象を、まず標準の5秒条件のまま実行する。

```powershell
pnpm exec vitest run --config config/vitest.contracts.config.ts tests/contracts/codex-hook-contract.test.ts tests/contracts/codex-hook-log-contract.test.ts
```

対象2件はtest name filterを使った個別実行も行い、同一Windows環境で複数回の所要時間を記録する。単発PASSだけでは安定化と判定しない。

### 回帰検証

```powershell
pnpm run test:contracts
pnpm run verify
```

追加で次を確認する。

- safeは既存の許可contractを維持する。
- denyは既存の拒否contractを維持する。
- quote/backslashおよびLF/CRLF stdinの結果が変わらない。
- root cwdとnested cwdの双方で結果が変わらない。
- stdout/stderrとexit codeのcontractが変わらない。
- process残存や一時diagnostic出力がない。
- 修正対象外のcontract testに新しい失敗がない。

### CI確認

現行Web CIのVitest matrixはUbuntuのみなので、通常CI PASSだけをWindows安定化の根拠にしない。Windows上の継続検証を追加する必要性が調査で確認された場合だけ、Issueの対象範囲と照合してworkflow変更を判断する。

## 7. リスクと未解決論点

- Windowsのprocess起動時間にはばらつきがあり、数回の計測だけでは通常値と異常待機を区別できない可能性がある。複数回の分布を確認する。
- 一時diagnosticそのものがprocess timingへ影響する可能性がある。計測点を最小限にし、diagnosticあり・なしの結果も比較する。
- PowerShell launcher内部には15秒のchild process timeoutがあるため、外側のVitest timeoutだけを延ばすと内部の異常待機を隠す可能性がある。
- PR #139の差分との因果はIssue作成時点で未確認である。baseline比較前に因果を仮定しない。
- GitHub Actionsの通常Vitest jobはUbuntuであり、ローカルWindowsと直接比較できるWindows CIデータが現状ない。

## 8. 成果物

- 原因調査結果を反映した最小限の実装・テスト変更。変更不要と判断した場合は調査結果のみ。
- timeoutを変更する場合は、その値を決めた実測結果と判断根拠。
- 必要に応じて、IssueまたはPRへ記載できる再現条件・計測結果・未確認点の要約。

## 9. 備考

- このPlanでは原因を事前に決めない。特に「Windowsだから遅い」「5秒が短い」という説明だけでは修正根拠にしない。
- Issue #140の完了条件に従い、原因を特定できない場合でも、どこまで確認できたかと何が未確認かを明示して次の判断へ繋げる。
