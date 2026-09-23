# Issue #177 worktree Hook / format check failure 調査・恒久対応 Plan

## 0. 依頼概要

- 対象Issue: #177 investigate: worktreeでのHook / format check失敗の原因と恒久対応を整理する
- 作業branch: plan/issue-177-windows-crlf-prettier
- branch作成時のmain: 01cd8ab15078d479e821d373445af1e16a469519
- 今回はPlan作成のみとし、Prettier設定、Husky、Git属性、Codex Hook、Product code、CI実装は変更しない。
- 2026-09-23のIssue更新で、CRLF問題に加えてHusky pre-commitの検査範囲、Codex文章品質Hookのworktree-local dependency、`diagnose:hooks`のbootstrap、linked worktree回帰テストが対象へ追加された。
- branch名は既存の`plan/issue-177-windows-crlf-prettier`を維持し、Issue更新だけを理由にrenameしない。
- 実装開始時は最新mainとWindows実環境へrebaselineしてから、このPlanの調査順序で進める。

## 1. 結論

現在のRepositoryには、2026-08-17に導入済みのLF契約がある。

- .gitattributes: * text=auto eol=lf
- .editorconfig: end_of_line = lf
- .prettierrc.json: endOfLine = lf
- ADR-0017で、Git管理下のtext fileをcheckout時もLFとする方針をAcceptedとしている。
- package.jsonのformat:checkはRepository全体をPrettier --checkで読む。
- .husky/pre-commitはformat:checkをRepository全体に対して実行する。

したがって、Issue #177で最初に行うべきことは、同じLF設定を追加し直すことではない。

現在確認されている「Git上は差分0だが、Windows worktreeのapp/** 78 filesだけがCRLFで、Prettierが失敗する」状態について、Repository保存内容、Git index、checkout結果、worktreeを後から書き換える処理を分離して調べる。

恒久対応は原因調査後に次の優先順で決める。

1. Repository内のscript、formatter、generator等がCRLFへ書き換えているなら、その発生源を修正する。
2. Editorまたは開発ツール経路が原因で、Repository側から安全に固定できる既存設定があるなら、その設定を最小変更する。
3. Huskyをcommit対象へ限定する場合、Prettier / ESLintはstaged pathの現在worktree内容ではなく、Git indexのstage 0にある次回commit予定内容を検査する。worktree EOL差の許容とstaged-only化を同じ変更として扱わない。
4. Repository側でCRLF発生源を制御できず、Windows worktreeのCRLFが残る場合だけ、ローカルRepository-wide `format:check` / `verify`とCIのstrict LF検査をどう分けるかを比較する。CIでRepository保存LF契約を維持することを先に固定し、ローカル側のEOL許容方法は調査結果から選ぶ。

最初から `--end-of-line auto`、独自EOL正規化script、新規dependency、全file一括変換を採用しない。

Issue更新後は、同じworktree利用時に表面化する次の3つを分けて扱う。

1. **EOL経路**: Windows worktreeでLFがCRLFへ変わり、Repository全体のPrettier checkが失敗する。
2. **Husky経路**: pre-commitがRepository全体を検査するため、commit対象外の既存差分でもcommitを停止する。
3. **Codex Hook経路**: linked worktreeに`node_modules`がないと、文章品質Hookや診断scriptが内部の通常診断へ到達する前にmodule loadで失敗し得る。

3つはworktreeという利用条件を共有するが、原因は同一と決めつけない。共通frameworkへまとめることも目的にしない。

Huskyのstaged-only化はIssue更新後は対象内の候補とする。ただし、Prettier / ESLint / `security:check`を機械的に同じ規則へ揃えない。Prettier / ESLintは「次回commitへ入るindex内容」を検査する。さらに、その判定に使う`.prettierignore`、`.prettierrc.json`、`.editorconfig`、`eslint.config.js`がindexとworktreeで意味のある差分を持つ場合は、存在しないsource/configの組み合わせで判定せずfail-closeする。`security:check`はRepository-wide責務を別に判断する。

Codex Hookは現在のtextlint品質契約と`UserPromptSubmit` / `PostToolUse` / `Stop`のfail-open / fail-close契約を維持する。dependency不足を識別可能にすることと、Hook全体をdependency-freeへ作り直すことは分けて判断する。

## 2. 確認済みの事実

### 2.1 現在のEOL契約

main 01cd8ab15078d479e821d373445af1e16a469519 では次を確認済み。

- .gitattributes
  - * text=auto eol=lf
- .editorconfig
  - charset = utf-8
  - end_of_line = lf
  - insert_final_newline = true
- .prettierrc.json
  - endOfLine = lf
- package.json
  - format = prettier --write . --ignore-path .prettierignore
  - format:check = prettier --check . --ignore-path .prettierignore
  - verifyの先頭でformat:checkを実行
- .husky/pre-commit
  - pnpm run format:check
  - pnpm run lint
  - pnpm run security:check

.prettierignoreではdocs、.codex、generated output等を除外しているが、app/**はPrettier対象である。

### 2.2 2026-08-17の既存対応

ADR-0017と保存Planでは、当時の原因としてRepository側のcheckout EOL契約不足を扱い、次を実装している。

- .gitattributesへeol=lfを追加
- root .editorconfigを追加
- PrettierへendOfLine=lfを追加
- git add --renormalize . を実行
- global core.autocrlf=trueは変更しない
- Windows Native相当のclean checkoutとbranch A -> B -> Aでformat:checkを確認

docs/history/2026-08-17_064054_repository-eol-contract.mdでは、上記のclean checkoutとbranch切替後のformat:check成功が記録されている。

今回のIssueは、この対策が存在する状態で再発しているため、2026-08-17以前と同じ「eol=lfが未設定」という原因ではない。

### 2.3 再発の履歴

Repository内のRun Artifactから次を確認した。

- 2026-09-06のRunにはpnpm run format:check PASSの記録がある。
- 2026-09-14のRunでは、今回変更外のapp/** 78 filesによりformat:checkがFAILした記録がある。
- 2026-09-15のRunでも、app/**/*.tsx 78 filesの既存failureが継続している。
- 2026-09-19から20のRunでは、Husky pre-commitが同じapp/** 78 filesを検出してcommitを停止した記録がある。

これらの記録だけでは同一physical worktreeだったことを証明できないため、「9月6日から14日の間に同じworktreeが書き換えられた」とは断定しない。ただし、EOL契約導入後もWindowsローカルで同じ78 filesのfailureが複数Runにまたがって観測されていることは事実として扱う。

### 2.4 Husky pre-commitの現在の責務

現在の`.husky/pre-commit`は次を順にRepository全体へ実行する。

- `pnpm run format:check`
- `pnpm run lint`
- `pnpm run security:check`

`tests/contracts/husky-config.test.ts`は、この3 commandの完全一致と順序、`lint-staged`非導入を現在のcontractとして固定している。

過去Runでは、今回のcommit対象外である`app/**` 78 filesや未追跡`coverage/coverage-summary.json`をRepository-wide `format:check`が検出し、通常の`git commit`を停止した記録がある。

Issue更新後は、このcontract自体を再評価対象とする。既存contractがあることを理由に現状維持を前提にしない。

### 2.5 `security:check`は現在file引数を受け取らない

`scripts/security-static-check.ts`を確認した結果、現在はCLI file引数を受け取らず、次をRepository rootから自前で列挙する。

- runtime検査: `src`、`app`
- credential検査: `src`、`app`、`config`、`public`、`scripts`、`.github`、`dist`
- 固定のruntime seed / database検査
- `src/test-controls/test-api.web.ts`の固定契約確認

そのため、pre-commitをstaged-onlyへ変更する場合でも、`security:check`へ単純にstaged pathを渡すだけでは実現できない。

次のどれが現在の保証を最も小さく保てるかを実装前に決める。

- Repository-wideのworktree検査のままpre-commitへ残す。
- Git indexが表す「次回commit snapshot」を対象にRepository-wideで検査するmodeを追加する。
- pre-commitから外し、`verify` / CIのRepository-wide worktree検査へ責務を残す。

staged pathだけへ限定してworktree fileを読むmodeは採用候補にしない。credentialやruntime禁止patternを含むstaged contentが、その後のunstaged修正で隠れるためである。index modeを採用する場合は、staged fileだけでなくindexに存在する対象tracked file全体を次回commit snapshotとして扱い、固定Test API契約やruntime aggregate検査も同じsnapshot上で成立させる。untracked / generated `dist`を現在pre-commitで検査する意味があるかは別途確認する。

### 2.6 Codex文章品質Hookと診断scriptの起動dependency

`.codex/hooks/text_quality_gate.mjs`は起動時に`scripts/lint-text-quality.mjs`を静的importする。

`scripts/lint-text-quality.mjs`はさらに起動時に次を静的importする。

```js
import { createLinter, loadTextlintrc } from "textlint";
```

`textlint`とrule packageはdevDependencyである。linked worktreeにはtracked fileは展開されるが、ignoreされた`node_modules`は自動共有されないため、install前のworktreeではHook本体の通常のfailure分類へ到達する前にES module loadが失敗し得る。

`scripts/diagnose-codex-hooks.mjs`も起動時に次を静的importする。

```js
import { parse as parseToml } from "smol-toml";
```

したがって、`node_modules`不在が原因の場合、Hookが案内する`pnpm run diagnose:hooks`も同じbootstrap条件で起動不能になり得る。

### 2.7 現在の文章品質contract testはlinked worktree未準備状態を再現しない

`tests/contracts/codex-text-quality.test.ts`のfixtureは次の構成になっている。

- temporary directoryで通常の`git init`を実行する。
- fixture commitを作る。
- `linkTextlintDependencies()`でRepository本体の`node_modules`からtextlintとrule packageをfixtureへ明示的にsymlinkする。

そのため、現在のcontract testは次の条件を直接保証していない。

```text
git worktree add で作成したlinked worktree
+
node_modulesなし
+
Codex Hook起動
```

今回の回帰テストでは、production用のworktree managerを新設せず、test fixture内で実際の`git worktree add`を使ってこの境界を再現する。

### 2.8 Git / Prettier / ESLint公式仕様から確認できること

Git公式gitattributesでは、`eol=lf`はcheckout時のworking tree EOLをLFとする契約であり、text fileはindexへ追加される際にLFへ正規化される。

attributesはroot `.gitattributes`だけではなく、`$GIT_DIR/info/attributes`が最優先で、`core.attributesFile`で指定されたglobal / system attributeも影響し得る。linked worktreeでは`.git`をdirectoryと仮定せず、Git内部pathは`git rev-parse --git-path <path>`で解決する。

Gitのindexは次回commitへ入るfile contentを保持するstaging areaである。stage 0のindex blobは`:0:<path>`または同等のGit標準機能で参照できる。したがって、staged-only pre-commitで「commitされる内容」を検査する場合、pathだけ取得してworktree fileを読むのでは不十分である。

Git configにはsystem / global / localに加えてworktree scopeがある。`extensions.worktreeConfig=true`の場合、linked worktree固有の`config.worktree`が共通Repository configの後に読み込まれる。Issue #177ではmain worktreeとlinked worktreeの差を扱うため、`git config --show-origin --show-scope`で実効scopeまで確認する。

PrettierのNode APIには、文字列を検査する`prettier.check(source, options)`、file pathに対する設定を解決する`resolveConfig()`、ignore / parser判定に使える`getFileInfo()`がある。これらを使えばsource本体はworktreeから読み直さず、index blobの文字列へ既存Prettier設定とpath意味を適用できる。一方、`resolveConfig()`と`getFileInfo()`が参照する設定・ignore fileはfilesystem上の状態であるため、sourceだけindex版にして設定fileがunstaged変更を持つ状態は別途禁止する必要がある。

ESLintのNode APIには`eslint.lintText(code, { filePath })`があり、file pathに対応する設定を適用して与えた文字列をlintできる。ignore判定には`isPathIgnored()`も利用できる。一方、適用される`eslint.config.js`はfilesystem上の状態であるため、Prettierと同様にindex / worktree不一致を検出する。

Prettier公式では`endOfLine=lf`がRepositoryをLFへ保つ設定として案内されている。Case CでローカルworktreeのEOL差を許容する場合も、CIのstrict LF検査とGit indexのLF契約を同時に維持する。

参考:
- [Git gitattributes](https://git-scm.com/docs/gitattributes)
- [Git git-add](https://git-scm.com/docs/git-add)
- [Git gitrevisions](https://git-scm.com/docs/gitrevisions)
- [Git git-config](https://git-scm.com/docs/git-config)
- [Git git-worktree](https://git-scm.com/docs/git-worktree)
- [Git git-rev-parse](https://git-scm.com/docs/git-rev-parse)
- [Prettier API](https://prettier.io/docs/api)
- [Prettier Options - End of Line](https://prettier.io/docs/options#end-of-line)
- [ESLint Node.js API](https://eslint.org/docs/latest/integrate/nodejs-api)

## 3. Repository mapping

### 3.1 Entry points

今回の問題に関係する主な入口は次。

- Git checkout / switch / add
- .gitattributes
- `git rev-parse --git-path info/attributes`で解決したinfo attributes、core.attributesFile、extensions.worktreeConfig
- .editorconfig
- .prettierrc.json
- .prettierignore
- eslint.config.js
- package.json の format / format:check / verify
- .husky/pre-commit
- tests/contracts/husky-config.test.ts
- scripts/security-static-check.ts
- .codex/config.tomlの文章品質Hook launcher
- .codex/hooks/text_quality_gate.mjs
- scripts/lint-text-quality.mjs
- scripts/diagnose-codex-hooks.mjs
- tests/contracts/codex-text-quality.test.ts
- tests/contracts/codex-hook-diagnostics.test.ts
- Web CIのformat check
- Editor保存
- Repository内でapp/**を書き込むscript / generator
- AI / agentによるfile更新

### 3.2 Main flow

現在の通常経路は次。

Git checkout
-> .gitattributesに従いworktreeへLFを展開
-> Editor / formatter / script / agentがworktreeを編集
-> pre-commitがworktree全体をPrettier --checkで読む
-> git add時はtext fileをindexへLF正規化
-> CI checkoutでもLF worktreeを作成
-> CIのformat:checkがLF + Prettier styleを検査

Issue #177では、Git diffが0でもworktree bytesがCRLFになり得るため、Gitの意味上の差分判定とPrettierのworktree byte検査が一致していない。

pre-commit側は現在次の流れになっている。

```text
git commit
-> Husky pre-commit
-> format:check (Repository全体)
-> lint (Repository全体)
-> security:check (Repository全体)
-> いずれかFAILならcommit停止
```

このため、staged差分が正常でも、commit対象外のworktree状態がfailure原因になり得る。

staged-onlyを採用する場合の正しい判定対象はpathだけではない。

```text
git commit
-> staged changeをNUL-safeに列挙
-> 各pathのGit index stage 0 blobを取得
-> Prettier / ESLintへ「index content + repository-relative path」を渡す
-> staged contentの違反だけでcommit可否を決める
```

pathだけをPrettier / ESLint CLIへ渡すとworktree contentを読むため、partial stagingやstage後のunstaged編集で「次回commitへ入る内容」と検査対象がずれる。この実装は採用しない。

さらに、Prettier / ESLintの設定fileはfilesystemから解決される。次のfileについてindexとworktreeに意味のある差分がある場合、sourceだけindex版にして検査すると、次回commitには存在しないsource/configの組み合わせを評価する。

- `.prettierignore`
- `.prettierrc.json`
- `.editorconfig`
- `eslint.config.js`

そのためstaged-only helperは、品質検査の前に上記4 fileのindex-to-worktree差分をGitの意味上で確認する。差分がある場合はfail-closeし、対象設定をstageするかworktreeへ戻してから再commitするよう固定診断を返す。EOLだけがGit上の差分として扱われない状態は、このguardだけを理由にFAILさせない。

Codex文章品質Hook側は概念上次の流れになっている。

```text
configured launcher
-> node .codex/hooks/text_quality_gate.mjs
-> static import scripts/lint-text-quality.mjs
-> static import textlint
-> Hook本体のevent処理
```

linked worktreeに`node_modules`がない場合は、event処理より前にdependency resolution failureとなる可能性がある。doctorも`smol-toml`を静的importするため、同じbootstrap不足から独立していない。

### 3.3 既存の保護

- ADR-0017
- .gitattributes
- .editorconfig
- .prettierrc.json
- package.json format:check
- .husky/pre-commit
- verify
- Web CIのstyle quality
- 2026-08-17のEOL契約Plan / History
- tests/contracts/husky-config.test.ts
- 文章品質Hookの既存contract test
- Hookのoffline diagnostics contract

### 3.4 Safe change surface

原因が判明するまでは設定を変更しない。

調査後の変更候補は、確認した原因と責務に応じて次へ限定する。

- CRLFを書き込むことが確認されたRepository-owned writer
- EOL fallbackが必要な場合の`package.json`、必要ならCIのstrict format check entry point
- staged path列挙、index stage 0 content検査、品質設定fileのindex/worktree整合guardを実装する既存Hookまたは必要最小限のscript
- `security:check`の責務を変更する場合の`scripts/security-static-check.ts`
- Codex Hookのbootstrap failureを分類するために必要な`.codex/hooks/text_quality_gate.mjs` / `scripts/lint-text-quality.mjs`
- bootstrap前でも最低限の診断を行うために必要な`scripts/diagnose-codex-hooks.mjs`
- 既存の`tests/contracts/husky-config.test.ts`、文章品質Hook / diagnostics contract test
- 必要なら、実linked worktree条件だけを再現する最小のtest helper
- 既存ADRまたはPROJECT_CONTEXTの現在説明が実装とずれる場合だけ文書更新

`lint-staged`、新しいHook framework、worktree manager、別runtimeは既存機能だけで要求を満たせないEvidenceがない限り追加しない。

### 3.5 Unknowns

実装開始前に確定していないのは次。

- 現在のWindows worktreeで有効なsystem / global / local / worktree Git configの実値・scope・設定元
- `extensions.worktreeConfig`の有無と、linked worktree固有`config.worktree`の影響
- `git rev-parse --git-path info/attributes`で解決したinfo attributesまたはcore.attributesFileによる上書き有無
- 78 filesが現在もすべて i/lf w/crlf なのか
- 最初にCRLFへ変化させる操作
- VS Code等のEditorでEditorConfigが実際に適用されているか
- Repository script、code generation、agent file writeのどれが発生源か
- clean linked worktreeとfresh cloneで同じ状態が再現するか
- Prettier / ESLintへstaged pathではなくindex stage 0のcontentを安全に渡す最小経路
- rename、削除、partial staging、対象外拡張子、空白を含むfile名をstaged content検査でどう扱うか
- Prettier 3.8.1のNode APIで`.prettierignore` / `.prettierrc.json` / `.editorconfig`を現在CLIと同じ意味で適用できるか
- ESLint 9.39.2のNode APIでignore / warning-only / error終了条件を現在`eslint .`と同じ意味で維持できるか
- 品質設定fileのindex / worktree不一致guardをGitの意味上の差分で判定し、CRLFだけの差を再び不要failureへしない最小経路
- `security:check`をpre-commitでRepository-wideのworktree検査のまま維持する必要があるか
- `security:check`をGit indexの次回commit snapshotへ移した場合に、credential / runtime aggregate / seed / Test API固定契約を維持できるか
- index snapshotでは扱えないuntracked / generated `dist`をpre-commitで検査する必要があるか
- linked worktree + `node_modules`なしで、各configured launcherが実際にどの出力とexit statusになるか
- textlintのdynamic importだけで既存fail-open / fail-close契約を維持できるか
- launcher側preflightが必要か、それともHook内部分類だけで十分か
- `diagnose:hooks`の最低限診断をNode標準機能だけでどこまで実行するか

これらはPlan上の実装ブロッカーではない。今回のIssue自体が調査Issueのため、実装フェーズのPhase 1で順番に確定する。

## 4. 調査方針

### Phase 1: 現在のWindows worktreeを破壊せず固定観測する

最初に現在状態を保存する。format、checkout、restore、renormalize等、file bytesを変える操作は観測完了まで行わない。

確認する内容:

1. Git version
2. current branch / HEAD / status
3. `git config --show-origin --show-scope`でsystem / global / local / worktreeの実効値と設定元を確認
   - core.autocrlf
   - core.eol
   - core.safecrlf
   - core.attributesFile
   - extensions.worktreeConfig
4. `git rev-parse --git-path config.worktree`でworktree固有configの実pathを確認し、存在時は内容とscopeを照合
5. `git rev-parse --git-path info/attributes`で実pathを解決し、info attributesの有無と内容を確認
6. failing fileに対するgit check-attr --all
7. failing file全体に対するgit ls-files --eol
8. Prettierが報告するfailure file集合とw/crlf file集合の一致
9. git diff / git diff --cachedが0であること
10. HEAD / index側がLFで、worktree側だけCRLFであること

期待する代表状態は次のような形だが、実測値を優先する。

- index: LF
- worktree: CRLF
- effective attribute: text=auto eol=lf
- Git content diff: 0
- Prettier check: EOL差だけでFAIL

この状態にならないfileがあれば、78 filesを一括原因として扱わずgroup分けする。

### Phase 2: clean checkout境界を比較する

現在worktreeを直接修復する前に、Windowsで次を比較する。

A. 現在RepositoryのGit metadataを共有するdetached linked worktree
B. 現在RepositoryとはGit metadataを共有しない独立fresh clone

両方でmainの同一SHAをcheckoutし、書き込み前の状態を確認する。

- `git config --show-origin --show-scope`の対象設定
- `git rev-parse --git-path info/attributes`
- `git ls-files --eol`
- app/**のCRLF byte有無
- `git check-attr --all`

AはPhase 1の観測完了後にだけ作成する。`git worktree add --detach`と後片付けの`git worktree remove`自体はworktree registryを更新するため、厳密なread-only操作ではない。許可するmutationはこの作成・削除だけに限定し、probe内部ではtracked file、Git config、info attributes、dependency、Husky metadataを変更しない。`pnpm install`、`pnpm run prepare`、`pnpm run format`、Repository-owned writerは実行しない。

Aを作る前後で`git worktree list --porcelain`、common config、`git rev-parse --git-path info/attributes`の内容を記録する。削除後はprobeのworktree entryが残っていないことと、common config / info attributes / tracked file内容が観測前から変化していないことを確認する。worktree registryに作成・削除履歴相当の一時変化が生じること自体は想定内とする。

Bは独立Repositoryなので、checkout直後のbaselineを固定した後、Phase 3のmutation実験用親Repositoryとして利用してよい。

判定:

- fresh cloneもcheckout直後からCRLF:
  - Git属性、Git config、attributes overrideの問題を優先する。
- fresh cloneはLF、同一Repository metadataを共有するlinked worktreeだけCRLF:
  - repository-local / worktree config、info attributes、worktree lifecycleを優先する。
- fresh cloneとlinked worktreeはLF、現在worktreeだけCRLF:
  - checkout後にfileを書き換えるEditor / script / agent経路を優先する。

### Phase 3: LFからCRLFへ変わる最初の操作を特定する

mutationを伴う再現は、現在Repositoryの`$GIT_COMMON_DIR`を共有しないtemporary cloneを親にする。そのtemporary clone内で必要なら追加linked worktreeを作り、現在Repositoryのconfig、Husky metadata、worktree metadataを変更しない。

LF baselineから、通常開発で実際に使う操作を1つずつ実行し、各操作の前後で`git ls-files --eol`とbyte状態を確認する。

優先順:

1. branch switch / checkout
2. `pnpm install --frozen-lockfile --ignore-scripts`
3. `pnpm run prepare`（Husky初期化をdependency展開と分離して確認）
4. 必要な場合だけ通常の`pnpm install --frozen-lockfile`をend-to-endで再確認
5. `pnpm run format:check`
6. `pnpm run format`
7. app/**へ書き込むことがRepository内で確認されたgenerator / maintenance script
8. VS Code等のEditorで代表fileを変更せず保存
9. 通常利用しているAI / agentの代表的なfile更新方式

すべてのpackage scriptを無差別に実行しない。app/**を書き込む可能性をコードから確認できたものだけ対象にする。

各操作について次を記録する。

- before / afterのEOL
- file set
- Git status / diff
- Prettier結果
- 操作がfile contentを更新したか
- Git common / worktree metadataを変更したか
- 期待したwriterか、意図しない副作用か

最初にLF -> CRLFへ変わった操作を原因候補とし、同じ操作を独立temporary環境で再実行して再現できた場合だけ原因として確定する。

### Phase 4: 原因別に最小の恒久対応を選ぶ

#### Case A: Repository-owned writerが原因

例:
- script
- generator
- formatter wrapper
- PowerShell等のfile writer

対応:

- CRLFを書き込む箇所だけをLF出力へ修正する。
- 共通原因を1箇所で直せる場合、呼び出し元ごとのworkaroundは追加しない。
- 既存の標準APIでLFを明示できるなら新規dependencyを追加しない。
- そのwriterの回帰テストで、生成後のEOLと内容を確認する。

変更しないもの:

- .gitattributesのLF契約
- Prettier endOfLine=lf
- CI strict format check

#### Case B: Editor / 開発ツールが原因

Repository側で既存標準設定により確実に制御できるかを確認する。

- .editorconfigが無視されている理由を特定する。
- Editor固有設定をRepositoryへ追加する場合は、そのEditorがこのRepositoryの正式な開発経路であり、設定追加で他EditorやCIへ副作用がないことを確認する。
- 個人global設定をRepositoryから変更しない。
- user profileやsystem Git configの書き換えを恒久対応にしない。

文書だけで再発防止できない場合は、原因を「解消済み」と扱わない。

#### Case C: Repository側でCRLF発生源を制御できず、Windows worktreeのCRLFが残る

このCaseはA/Bを否定した場合だけ検討する。

Huskyのstaged-only化とは分離する。Case Dを採用した場合、pre-commitのPrettier / ESLintはindex stage 0 contentを検査するため、worktree CRLFを許容するための`--end-of-line auto`をpre-commitへ入れる必要はない。

Case Cで残る対象は、worktreeを直接読むローカルRepository-wide `format:check` / `verify`である。

実装前に現在のcallerを列挙し、次を比較する。

1. local `format:check` / `verify`をstrictのまま維持してもIssueの成功状態を満たせるか。
2. CRLFだけのローカルfailureを解消する必要がある場合、ローカル用EOL-tolerant checkとCI用strict LF checkを分離するか。
3. 既存command名を変更する場合、`.husky/pre-commit`、`package.json#verify`、`.github/workflows/ci.yml`、関連contractの意味が曖昧にならない最小構成はどれか。

EOL-tolerant checkを採用する場合の条件:

- `.prettierrc.json`の`endOfLine=lf`はRepository標準として維持する。
- ローカルCRLF + 正しいstyleは、採用したローカルcheckでPASSする。
- LF / CRLFを問わず実際のPrettier違反はFAILする。
- CIは明示的なstrict LF checkを実行し、CRLF sourceをFAILさせる。
- `git add`後のindexはLFになる。
- ローカル許容をCIへ暗黙に伝播させない。

採用しない案:

- CIのstrict LF checkまで`--end-of-line auto`へ変更する。
- `.prettierrc.json`を`auto`へ変更する。
- pre-commitを無効化する。
- `--no-verify`を通常運用にする。
- commit前に全Repositoryを自動formatして大量fileを変更する。
- EOL変換だけのために新規dependencyまたは汎用frameworkを追加する。

### Phase 5: 既存worktreeの修復

恒久対応を先に確定し、その後で現在worktreeを修復する。

既存78 filesを実装PRの意味変更として混ぜない。

修復は、原因と採用方針に合わせてdisposable環境で手順を検証してから実施する。

修復直前に現在worktreeを再確認する。

- `git status --porcelain=v1 -z`
- `git diff --`
- `git diff --cached --`
- untracked fileの有無
- Phase 1でCRLF-onlyと確認した対象path集合と現在状態の一致

Issue #177と無関係なtracked / staged / untracked変更がある場合は、それらを破棄・上書きし得る`reset --hard`、`git clean`、一括`restore`、worktreeの作り直しを実行しない。stashを自動作成して退避したことにもしない。現在変更を保持したまま安全に修復できない場合は、そのworktreeの修復を停止し、独立clean worktreeで実装・検証を継続する。

候補:

- local変更がない、または破棄対象がIssue #177のCRLF-only状態だけと確認できた場合のclean checkout / worktree再作成
- 採用したwriterで、Phase 1でCRLF-onlyと確認した対象pathだけをLFへ再出力
- Prettier writeを使う場合もRepository全体の`pnpm run format`ではなく、Phase 1でCRLF-onlyと証明した対象pathへ限定してLF化

修復後は、対象pathについてHEAD / indexとの意味上のcontent diffが0で、`git ls-files --eol`のworktree側だけが期待するLFへ戻ったことを確認する。Issue #177と無関係なlocal変更のstatus / diffが修復前後で不変であることも確認する。

`git add --renormalize .`はindexのnormalization用であり、今回の「worktree bytesを何がCRLFへしたか」の調査前に実行しない。

全file一括EOL変更をProduct変更と同じcommitへ混ぜない。

### Phase 6: Husky pre-commitの検査範囲と検査対象contentを決める

EOL原因の有無とは別に、pre-commitがcommit対象外のfileで停止する現在の責務を見直す。

staged-onlyを採用する場合、対象は「staged pathの現在worktree file」ではなく「Git indexのstage 0に保存された次回commit予定content」とする。partial stagingを含め、worktreeとindexが異なる状態を正常系として扱う。

最初に3 commandを分けて確認する。

#### 品質設定fileの整合guard

Prettier / ESLintのstaged content検査より先に、次の設定fileについてindexとworktreeの意味上の差分を確認する。

- `.prettierignore`
- `.prettierrc.json`
- `.editorconfig`
- `eslint.config.js`

実装はGit標準のindex-to-worktree diffを使い、file内容を独自parserで比較しない。4 fileのいずれかに差分がある場合は固定メッセージでfail-closeし、「設定fileをstageするかworktreeへ戻してからcommitする」ことを案内する。

このguardはcommit対象外fileで停止しない原則の例外である。これら4 fileはstaged sourceの判定規則そのものだからである。

必須fixture:

- `.prettierignore` / `.prettierrc.json` / `.editorconfig` / `eslint.config.js`の各fileについて、staged source + その設定fileのunstaged変更 -> FAIL
- 上記4 fileの各fileについて、設定fileをstage後に同fileをさらにunstaged変更 -> FAIL
- 設定fileのindex / worktreeが一致 -> 通常のstaged検査へ進む
- Git上で差分0のEOL-only差 -> このguardではFAILしない

4 fileの同じ契約はparameterized test等でまとめてよく、ほぼ同じtestを4本ずつ手書きしない。

#### staged changeの取得

- `git diff --cached --name-status -z --find-renames --diff-filter=ACMR`等のNUL-safeなGit標準出力を候補にする。
- shellの空白区切りや改行区切りでpathを展開しない。
- add / copy / modify / renameの新しいpathを検査対象とし、deleteはformatter / linterへ渡さない。
- 各pathのstage 0 blobをGit indexから取得する。`git ls-files -s -z`でblob IDを得て`git cat-file`で読む、`:0:<path>`を参照する等のGit標準機能を比較し、shell quotingに依存しない最小実装を選ぶ。
- unmerged indexが存在する場合はstage 0を推測せずfail-closeするか、既存commit禁止状態として明示的に拒否する。

#### Prettier

- index blobの文字列へRepository-relative pathを付け、Prettier APIで検査する方法を第一候補にする。
- 現在の`prettier --check . --ignore-path .prettierignore`と同じRepository設定・ignore意味を維持する。
- `prettier.getFileInfo(filePath, { ignorePath: path.join(root, ".prettierignore") })`相当で、Repository rootの`.prettierignore`を明示する。独自のignore listを追加しない。
- `prettier.resolveConfig(filePath, { editorconfig: true })`相当で`.prettierrc.json`と`.editorconfig`を解決し、`check(source, { ...(config ?? {}), filepath: filePath })`相当でindex contentを検査する。実装時はPrettier 3.8.1の実APIで同じ意味になることをfocused testで固定する。
- `getFileInfo()`がignoredまたはparser非対象と判定したfileはpre-commit対象外とし、手書きの拡張子allowlistでPrettier対象を再定義しない。
- worktree fileを読み直さない。
- staged違反をstage後のunstaged修正で隠せず、staged正常contentをunstaged違反で誤ってFAILさせないことを必須契約にする。

#### ESLint

- index blobの文字列へRepository-relative pathを付け、ESLint Node APIの`lintText(code, { filePath })`を使う方法を第一候補にする。
- `eslint.config.js`のfiles / ignores / rulesを再実装せず、既存ESLint設定を正本として利用する。ignore判定が必要なら`isPathIgnored()`等の既存APIを使う。
- 現在の`eslint .`と同じ終了条件を維持する。staged-only helperはESLint resultの`errorCount > 0`またはfatal errorをcommit failureとし、warning-onlyはPASSとする。`--max-warnings`相当の新しい閾値を追加しない。
- ignored fileやESLint対象外fileはcommitを停止しない。ignore warningそのものをfailureへ昇格させない。
- config変更等によりRepository-wide影響が出るケースはCI / `verify`が正本として検出する。
- pre-commitでRepository全体lintを維持する必要があるEvidenceがあればstaged-onlyへ機械的に変更しない。

#### security:check

現在のscriptはfile引数を受けず、Repository-wideのworktree fileを読み、credential検査、runtime aggregate検査、seed / database検査、固定Test API契約を確認する。

次を比較し、現在の安全性を最も小さい変更で維持する案を選ぶ。

1. pre-commitではRepository-wideのworktree検査のまま維持する。
2. Git indexが表す次回commit snapshotをRepository-wideで検査するmodeを追加する。
3. pre-commitから外し、`verify` / CIのRepository-wide worktree検査へ残す。

2を採用する場合、staged pathだけをworktreeから読む実装は禁止する。対象tracked fileはGit indexから取得し、credential pattern、runtime禁止pattern、seed / database、`src/test-controls/test-api.web.ts`の固定契約を同じ次回commit snapshotで評価する。staged secretをunstaged修正で隠せないことを必須回帰testにする。

現在のscriptは`dist`が存在すれば走査するが、`dist`はGit管理外である。index snapshot modeでこの保証をそのまま再現できない場合、pre-commitでuntracked / generated `dist`まで検査する必要性を実測・既存契約から確認する。必要性がなければindex modeから除外し、Repository-wide worktree検査は`verify` / CIへ残す。必要性がありindex modeが複雑になるなら、2を無理に採用せず3を優先する。

「他2つがstaged-onlyになるから」という理由だけで3を選ばない。逆に、Repository-wide worktree security checkがcommit対象外の状態で不要に停止し、index snapshot modeが現在の保証を単純に維持できない場合は、3を選んで`verify` / CIを正本とする。

`tests/contracts/husky-config.test.ts`は「現行3 command完全一致」を固定しているため、採用後の責務へ更新する。文字列だけのcontractにせず、temporary repositoryで実Git index / 実Hookを使って次を固定する。

- staged違反 + 同pathのunstaged修正 -> FAIL
- staged正常 + 同pathのunstaged違反 -> PASS
- partial stagingでindexとworktreeが異なる -> index contentを判定
- `.prettierignore` / `.prettierrc.json` / `.editorconfig` / `eslint.config.js`の各fileでindex / worktree差分 -> 固定診断でFAIL
- 上記4 fileの各fileをstage後にさらにunstaged変更 -> 固定診断でFAIL
- 品質設定fileのGit上の差分がEOL-onlyで0 -> config guardだけではFAILしない
- Prettierの`.prettierignore`対象 -> PASSし、独自対象判定を行わない
- ESLint warning-only -> PASS
- ESLint error / fatal error -> FAIL
- ESLint ignore対象 -> PASS
- rename / delete / 空白を含むpath -> pathを誤解釈しない
- commit対象のPrettier / ESLint対象fileが0件 -> helperは成功終了
- 既存Husky契約の`git commit --allow-empty` -> PASSし、HEADが1 commit進む
- commit対象外のuntracked / unstaged違反 -> Prettier / ESLintでは不要停止しない
- `security:check`でindex snapshot modeを採用した場合、staged secret + worktreeでsecret削除 -> FAIL
- `security:check`でindex snapshot modeを採用した場合、unstagedだけのsecurity違反 -> pre-commitでは判定対象外、`verify` / CIではFAIL

#### linked worktreeでのHusky受入

Codex Hookとは別に、Huskyはlinked worktreeごとに通常のdependency準備後に有効になることを確認する。install前でもHuskyを動作させることは今回の要件にしない。

isolated temporary Repositoryでactual `git worktree add`を使い、linked worktree側で次を確認する。

1. linked worktree作成直後の`core.hooksPath`と`.husky/_`の状態を記録する。
2. linked worktree側で通常の`pnpm install --frozen-lockfile`、またはdependency準備済みfixtureでは`pnpm run prepare`を実行する。
3. `git config --get core.hooksPath`がHuskyの期待値を返し、linked worktree側に必要なHusky runtimeが存在することを確認する。
4. staged内容が正常な実`git commit`がPASSする。
5. staged Prettier違反を含む実`git commit`がFAILし、HEADが変わらない。
6. primary worktree側のHook実行を壊していないことを確認する。

この受入は通常install後のHusky契約を確認するものであり、`node_modules`なしのlinked worktreeでもHusky品質scriptを実行可能にする変更は行わない。

### Phase 7: Codex文章品質Hookのworktree bootstrapを調査・修正する

actual linked worktree fixtureで次を再現する。

```text
primary temporary repository
-> candidate Hook / scanner / configをcommit
-> git worktree add <linked>
-> linked側はnode_modulesなし
-> linkedRoot/.codex/hooks/text_quality_gate.mjsをconfigured launcher相当で起動
```

確認対象:

- `UserPromptSubmit`
- `PostToolUse`
- inactive `Stop`
- active `Stop`
- Hook file欠落
- Node利用不可
- dependencyあり / なし

node_modulesなしでraw `MODULE_NOT_FOUND`やunstructured stack traceを利用者へ漏らさず、既存launcherの安全なdiagnosticまたはHook内部の固定分類へ到達することを要求する。no-dependency caseではprimary worktree側のHook pathを実行してはならない。linked worktree自身のHook pathを起動し、Node module resolutionもlinked worktree側の実条件で確認する。

候補Eとして次を比較する。

1. `scripts/lint-text-quality.mjs`のtextlint依存を必要時までdynamic importし、dependency resolution failureを既存の安全な文章品質failure分類へ接続する。
2. launcherで必要packageまたは`node_modules`の利用可否を先に判定し、固定診断を返す。
3. worktree作成後にinstallを必須化する。
4. Hookをdependency-freeへ再実装する。

1または2で現在の品質契約を維持できるなら、3の運用依存や4の再実装を追加しない。

`UserPromptSubmit` baseline、`PostToolUse` fail-open、inactive / active `Stop`の既存block / allow、safe diagnostic、state cleanupの意味は変更しない。

### Phase 8: `diagnose:hooks`をbootstrap failureから独立させる

`scripts/diagnose-codex-hooks.mjs`の最初の`smol-toml` static importを前提にしない構成を比較する。

最低限のdependency-free診断候補:

- Node version / executable
- Git repository root
- `.codex` / Hook fileの存在とregular file境界
- `node_modules`の有無
- `textlint` / `smol-toml`等、必要packageをresolve可能か
- runtime state directoryの安全な存在確認

TOMLの詳細parseが必要な段階だけ`smol-toml`をdynamic importする。必要dependencyが利用不能でもdoctor process自体はraw `MODULE_NOT_FOUND`で落とさず、最低限診断と安全な原因表示を完了する。

dependency不足は診断成功扱いにしない。`smol-toml`またはHook実行に必要な`textlint` / rule packageが不足している場合は`ERROR`として報告し、doctorはexit 1とする。Git repository context自体を確立できない既存ケースはexit 2を維持する。既存のWARN-only状態はexit 0、その他の診断ERRORはexit 1という現在の意味を変えない。

新しいTOML parserを自作しない。diagnosticのためだけに新規dependencyや別runtimeを追加しない。

`tests/contracts/codex-hook-diagnostics.test.ts`へ、dependencyなしでも最低限診断が起動できるfixtureを追加する。

no-dependency回帰testでは、現在の`doctorPath = path.join(repoRoot, "scripts", "diagnose-codex-hooks.mjs")`をそのまま再利用しない。actual `git worktree add`で作成したlinked worktreeの`linkedRoot/scripts/diagnose-codex-hooks.mjs`そのものを`process.execPath`で起動する。primary Repositoryのscriptを実行するとprimary側`node_modules`から`smol-toml`を解決でき、linked worktreeのdependency不足を再現できないためである。

linked worktreeはprimary Repositoryの`node_modules`が親directory探索で見える配置に置かない。dependenciesありcaseはisolated temporary Repository側へ意図的にdependencyを準備し、dependenciesなしcaseと明確に分ける。

### Phase 9: 3トラックの変更を統合して検証する

EOL、Husky、Codex Hookは原因と修正ownerを別々に確定する。

同じIssue / PRで実装する場合でも、共通のworktree abstractionや汎用Hook frameworkへまとめない。各修正が独立して現在要件を満たす最小差分であれば、その分離を維持する。

最終的に次の責務を明確にする。

- Repository保存EOL: Git attributes / CI strict check
- local commit早期検査: pre-commit
- Repository全体整合: `verify` / CI
- Codex session文章品質: Codex Hook
- Hook故障診断: `diagnose:hooks`
- linked worktree regression: contract test fixture

## 5. 実装タスク

実装時は次の順序で進める。

- [ ] 1. 最新main、更新後Issue #177、ADR-0017、Husky / Codex Hook関連の既存Planとcontractをrebaselineする。
- [ ] 2. Windows current worktreeのGit config、attributes、index/worktree EOL、Prettier failure集合をread-onlyで採取する。
- [ ] 3. system / global / local / worktree scope、`extensions.worktreeConfig`、`git rev-parse --git-path info/attributes`、core.attributesFileを含むoverrideを確認する。
- [ ] 4. Phase 1完了後に現在Repository metadataを共有するlinked detached worktreeを`git worktree add --detach`で作成し、probe内部は非変更でEOL / config / attributesを確認する。確認後に`git worktree remove`し、worktree entry、common config、info attributes、tracked contentが想定どおり復元・不変であることを確認する。
- [ ] 5. Git metadataを共有しないfresh cloneでclean checkout時のEOLを確認し、mutation実験用baselineを作る。
- [ ] 6. 独立temporary Repositoryでbranch switch、install、Husky prepare、format check / write、Repository-owned writerの順に実行し、最初のLF -> CRLF変換操作を特定する。
- [ ] 7. 必要ならEditor保存とAI / agent file更新をdisposable環境で再現し、EOL発生源を確定する。
- [ ] 8. EOL原因をCase A / B / Cへ分類し、採用案と不採用案の根拠をRun Artifactへ記録する。
- [ ] 9. Case A/BならEOL発生源だけを最小修正し、回帰テストを追加または更新する。
- [ ] 10. Case Cならlocal Repository-wide format checkとCI strict LF checkのcallerを整理し、CI契約を弱めない最小fallbackを設計する。
- [ ] 11. Huskyの3 commandについて、staged-only可否と現在の責務を個別に確認する。
- [ ] 12. NUL-safeなstaged path列挙とindex stage 0 blob取得方式をrename / delete / partial staging / 空白pathを含むfixtureで決める。
- [ ] 13. Prettier / ESLintがworktreeではなくindex contentを検査し、Prettierの`.prettierignore` / `.prettierrc.json` / `.editorconfig`と、ESLintのignore / warning / error終了条件を現在CLIと同じ意味で維持する最小実装を検証し、採用可否を決める。
- [ ] 14. `.prettierignore` / `.prettierrc.json` / `.editorconfig` / `eslint.config.js`のindex / worktree差分guardを追加し、4 fileすべてを同じcontractで検証して、staged sourceをworktree側だけの設定で判定しないことをfixtureで固定する。
- [ ] 15. `security:check`をRepository-wide worktree維持 / Git indexの次回commit snapshot検査 / pre-commit外へ移す3案で比較し、安全性を落とさない最小案を決める。
- [ ] 16. `tests/contracts/husky-config.test.ts`を採用後の責務へ更新し、staged違反 + unstaged修正、staged正常 + unstaged違反、partial staging、品質設定file不一致、Prettier / ESLint ignore、ESLint warning-only、commit対象0件、`git commit --allow-empty`、commit対象外fileをbehaviorで検証する。
- [ ] 17. isolated temporary Repositoryのactual linked worktreeで通常install / Husky prepare後の実`git commit`成功・失敗経路を確認する。
- [ ] 18. actual `git worktree add` fixtureでlinked worktree自身のHook pathを起動し、dependenciesあり / なしのCodex Hookを再現する。
- [ ] 19. textlint dependency load failureをraw module failureにせず固定診断へ分類する最小修正を決めて実装する。
- [ ] 20. `UserPromptSubmit` / `PostToolUse` / inactive Stop / active Stopの既存fail-open / fail-close契約を回帰確認する。
- [ ] 21. actual linked worktree自身のdoctor pathを起動するfixtureで、`diagnose:hooks`をdependency不足でも最低限起動できるようにし、dependency不足=ERROR / exit 1、repository context確立不能=exit 2、WARN-only=exit 0の境界を固定する。
- [ ] 22. Hook file欠落、Node不足、dependency不足、state failureの既存診断を回帰確認する。
- [ ] 23. 現在worktreeのstatus / staged / unstaged / untracked状態を再取得し、Issue #177と無関係なlocal変更を保護したうえで、Phase 1でCRLF-onlyと確認したpathだけを修復する。修復後に意味上のcontent diff 0と無関係なlocal変更の不変を確認する。
- [ ] 24. EOL / Prettier、Husky staged境界・linked worktree、Codex Hook worktree、diagnosticsのfocused test / 受入を実行する。
- [ ] 25. `pnpm run format:check`、`pnpm run test:hooks`、`pnpm run test:contracts`、`pnpm run verify`、`git diff --check`、Run Artifact sanitizerを実行する。
- [ ] 26. clean Windows環境で実pre-commit、actual linked worktreeでHusky通常install後の実commit、linked worktree Codex Hookを確認する。
- [ ] 27. 最新PR headのWeb CI / Mobile App CIでRepository-wide品質ゲートが弱まっていないことを確認する。
- [ ] 28. 必要な場合だけADR-0017 / PROJECT_CONTEXT / Hook referenceへ今回確定した責務を追記し、既存判断を重複定義しない。

## 6. 検証方法

### 6.1 調査結果の受入条件

最低限、次を実測する。

| ケース | Git index | worktree | Git diff | Prettier strict |
|---|---|---|---|---|
| clean LF | LF | LF | なし | PASS |
| 現在の再発状態 | LF想定 | CRLF想定 | なし想定 | FAIL想定 |

想定と異なる場合は実測値を正とし、PlanのCase分類を更新する。

### 6.2 恒久対応後のEOL / Prettier matrix

Issue記載の4ケースを必須とする。pre-commitはCase D採用時にGit index contentを検査し、worktree contentを判定根拠にしない。

| 状態 | local Repository-wide check | pre-commit | CI strict LF |
|---|---|---|---|
| LF worktree + 正しいformat + index正常 | PASS | PASS | PASS |
| CRLF worktree + 内容は正しい + index LF正常 | Case A/Bでは再発させない。Case Cでは採用方針に従う | PASS | clean checkoutではPASS。CRLF source fixtureはFAIL |
| staged indexに実際のformat違反、worktreeは修正済み | worktree側結果とは分離 | FAIL | commit後ならFAIL |
| staged index正常、worktreeだけ実際のformat違反 | worktree側checkはFAILし得る | PASS | commitされないため影響なし |
| LF + 実際のformat違反をstage | FAIL | FAIL | FAIL |
| CRLF + 実際のformat違反をstage | Case CでもEOL以外の違反はFAIL | FAIL | FAIL |

Case Cを採用した場合は、ローカルEOL許容がCIのstrict LF checkへ伝播しないcontractを追加する。

### 6.3 Git保存契約

- git check-attrでtext / eolを確認する。
- git ls-files --eolでindex LFを確認する。
- CRLF worktree fixtureをgit addした後、index内容がLFになることを確認する。
- RepositoryへCRLF text blobを新規commitできる状態へ契約を弱めていないことを確認する。

### 6.4 Repository標準検証

実装内容に応じて最低限次を実行する。

- focused contract test
- pnpm run format:check
- Case Cでlocal / strict checkを分離した場合は、local用checkとCIが使用するstrict LF checkの両方
- pnpm run test:contracts
- pnpm run verify
- git diff --check
- Run Artifact sanitizer

Case Aで特定writerのtest suiteが別にある場合は、そのfocused testを追加する。

### 6.5 Windows受入

clean Windows環境で採用Caseに応じて確認する。

共通条件:

- 採用した恒久対応の再現手順が期待どおり
- pre-commitがEOLだけの不要failureを起こさない
- 実際のPrettier違反はpre-commitで失敗する
- Git indexはLF
- CIのstrict LF checkは維持される
- global / system Git configを変更しなくても成立する

Case A / B:

- clean checkout直後のapp/**がLF
- 原因となったwriter / Editor / 開発ツール操作を再実行しても、対象fileが意図せずCRLFへ戻らない

Case C:

- Phase 1から3で確定した再現条件によりworktreeがCRLFになっても、採用したlocal Repository-wide checkが定義どおりPASS / FAILを判定する
- pre-commitはGit index contentを正本として判定し、CRLF worktreeだけを理由にFAILしない
- 同じsourceをCIのstrict LF fixtureへ与えた場合はLF契約違反をFAILとして検出する

### 6.6 Husky staged boundary

最低限、次を実際のGit indexを使って確認する。

- staged indexに正しいformatの変更のみ -> PASS
- staged indexにPrettier違反 -> FAIL
- staged indexに違反 + 同pathのworktreeで未stage修正 -> FAIL
- staged index正常 + 同pathのworktreeだけ未stage違反 -> PASS
- partial stagingでindex / worktree内容が異なる -> index contentで判定
- 品質設定fileにindex / worktree差分 -> 固定診断でFAIL
- 品質設定fileのGit上の差分がEOL-onlyで0 -> config guardだけではFAILしない
- unstaged fileだけにPrettier違反 -> commitを不要に停止しない
- untrackedかつcommit対象外fileだけにPrettier違反 -> commitを不要に停止しない
- renameを含むstaged変更 -> 新しい対象pathを正しく検査
- 削除file -> formatter / linterへ存在しないpathを渡さない
- file名に空白を含む -> pathを誤分割しない
- 対象外拡張子だけのcommit -> 不要なformatter起動で失敗しない
- staged fileのESLint warning-only -> PASS
- staged fileのESLint error / fatal error -> FAIL
- Prettier / ESLintのignore対象 -> PASS
- commit対象のPrettier / ESLint対象fileが0件 -> PASS
- `git commit --allow-empty` -> PASS
- `security:check`の採用後責務がcontract testで固定される
- index snapshot modeを採用した場合、staged security違反をunstaged修正で隠せない
- index snapshot modeを採用した場合、固定Test API / runtime aggregate / seed契約を次回commit snapshotで維持する
- `verify` / CIはcommit対象外を含むRepository-wide worktree違反を引き続き検出する

### 6.7 Husky / linked worktree

isolated temporary Repositoryのactual linked worktreeで次を確認する。

- linked worktree作成直後の`core.hooksPath` / Husky runtime状態を記録
- linked側の通常`pnpm install --frozen-lockfile`またはdependency準備後の`pnpm run prepare` -> PASS
- `git config --get core.hooksPath` -> Husky期待値
- linked側に必要なHusky runtimeが存在
- staged正常の実`git commit` -> PASS
- staged Prettier違反の実`git commit` -> FAIL、HEAD不変
- primary worktreeのHusky実commit経路 -> 退行なし
- linked worktreeの`node_modules`未準備状態でHusky品質scriptを動作させることは要求しない

### 6.8 Codex Hook / linked worktree

actual `git worktree add`を使い、最低限次を確認する。

- 通常Repository + dependenciesあり -> 現行正常系を維持
- linked worktree + dependenciesあり -> linked worktree自身のHook pathで正常動作
- linked worktree + `node_modules`なし -> linked worktree自身のHook pathでraw exception / `MODULE_NOT_FOUND`を利用者へ漏らさず原因を識別可能
- linked worktree + Hook file欠落 -> 既存fallbackを維持
- `UserPromptSubmit` -> baseline契約を維持
- `PostToolUse` -> 既存fail-openを維持
- inactive `Stop` -> 既存の必要なblockを維持
- active `Stop` -> 既存allow / cleanup契約を維持

fixtureは既存Repositoryの`node_modules`をsymlinkした通常fixtureだけで代用しない。

### 6.9 Hook diagnostics bootstrap

- `node_modules`あり -> 現行offline診断を維持
- `node_modules`なし -> linked worktree自身の`scripts/diagnose-codex-hooks.mjs`を起動し、raw module failureなしでdependency不足をERRORとして識別しexit 1
- `smol-toml`なし -> primary Repositoryのdoctorへfallbackせず、最低限診断まで実行し、詳細config parse未実行をERRORとして報告してexit 1
- `textlint`または必要rule packageなし -> Hook runtime dependency不足をERRORとして識別しexit 1
- Git repository context確立不能 -> 既存どおりexit 2
- WARN-only -> 既存どおりexit 0
- state fileのsafe diagnosticとsecret非露出を維持
- doctorはread-onlyのまま
- doctor実行が新しいpackage installやworktree mutationを要求しない

### 6.10 Remote CI

最新PR headに対して次を確認する。

- Web CI: success
- Mobile App CI: success
- Web CIのformat checkはstrict endOfLine=lfを維持。Case Cでlocal checkと分離した場合は、CIがstrict用entry pointを明示的に呼ぶ
- CI / `verify`のRepository-wide lint / security意味を不必要に弱めていない
- pre-commitをstaged-onlyへ変更しても、その限定がCIへ伝播していない
- Codex Hookのworktree用修正が通常CIのHook contractを壊していない

## 7. 変更対象の候補

調査段階では変更fileを確定しない。

原因別の上限は次。

### Case A

- CRLFを書き込むことが確認された既存writer
- そのwriterの既存test、または最小の新規contract test
- 必要なRun Artifact
- 必要なら既存ADR / PROJECT_CONTEXTの最小更新

### Case B

- 原因を制御するためにRepositoryへ置くことが妥当と確認された既存標準設定
- 回帰検証
- 必要なRun Artifact
- 必要なら既存ADR / PROJECT_CONTEXTの最小更新

### Case C

- package.json（local / strict format checkのentry point分離が必要な場合）
- .github/workflows/ci.yml（CIがstrict commandを明示する必要がある場合）
- format check責務を固定する既存または最小contract test
- 必要なRun Artifact
- 必要ならADR-0017 / PROJECT_CONTEXTの最小更新

### Case D: Husky staged-only

候補:

- .husky/pre-commit
- package.json
- 必要ならstaged path列挙 + index content検査 + 品質設定file整合guardだけを持つ小さいNode script
- scripts/security-static-check.ts（Git indexの次回commit snapshot modeを採用する場合だけ）
- tests/contracts/husky-config.test.ts
- 必要なbehavior contract test

既存のGit / Node / shellで十分なら`lint-staged`を追加しない。既存の`parseNameStatusZ`相当処理は参考にできるが、今回のためにGit差分処理全体を共通frameworkへ抽出しない。

### Case E: Codex Hook bootstrap

候補:

- .codex/hooks/text_quality_gate.mjs
- scripts/lint-text-quality.mjs
- .codex/config.toml（launcher変更が必要と確認された場合だけ）
- tests/contracts/codex-text-quality.test.ts
- tests/contracts/codex-hook-contract.test.ts
- 必要なRun Artifact

textlint rule、fingerprint、baseline semanticsは今回のbootstrap修正を理由に変更しない。

### Case F: Hook diagnostics bootstrap

候補:

- scripts/diagnose-codex-hooks.mjs
- tests/contracts/codex-hook-diagnostics.test.ts
- package.jsonの`diagnose:hooks`はcommand名を変える必要がある場合だけ更新
- 必要なRun Artifact

新規dependencyは追加しない。dependency不足時もdoctor process自体を起動し、ERROR / exit 1で原因を返せる構成にする。

## 8. リスクと対策

### 原因調査前にCRLFをLFへ直してEvidenceを失う

対策:
- 最初のPhaseはread-only観測に限定する。
- format、checkout、restore、renormalizeを観測完了前に実行しない。

### .gitattributes以外のattribute overrideを見落とす

対策:
- .git/info/attributesとcore.attributesFileを必ず確認する。
- git check-attr --allで実効値を確認する。

### Git diff 0を「byte差なし」と誤解する

対策:
- git ls-files --eolとraw byte確認を併用する。
- index / worktree / Prettierを別の観測対象として扱う。

### ローカルEOL許容をCIへ伝播させてRepositoryのLF契約まで弱める

対策:
- Case Cを採用する場合もCIのstrict LF checkを独立して維持する。
- local Repository-wide checkをEOL-tolerantにする必要がある場合は、CIが同じentry pointを暗黙利用しないようcallerを明示する。
- `.prettierrc.json`の`endOfLine=lf`とGit index LF契約を維持する。
- local / pre-commit / CIのmatrixをcontract testで固定する。

### staged pathだけ取得してworktree contentを検査し、次回commit内容と判定がずれる

対策:
- Prettier / ESLintはGit indexのstage 0 blobを検査する。
- 「staged違反 + unstaged修正」と「staged正常 + unstaged違反」を必須回帰testにする。
- partial stagingを通常ケースとして扱う。
- Prettier / ESLintのconfig / ignoreは既存Node APIを使い、手書きで再実装しない。

### Node API化でPrettier / ESLintの既存CLI意味を変える

対策:
- PrettierはRepository rootの`.prettierignore`を明示し、`.prettierrc.json`と`.editorconfig`を解決してindex contentへ適用する。
- ESLintは既存`eslint.config.js`を正本とし、warning-onlyを新たなfailureへ昇格させない。
- ignore対象、warning-only、error、対象0件をfocused contractで固定する。

### sourceはindex版だが品質設定fileだけworktree版を読み、存在しない組み合わせを検査する

対策:
- `.prettierignore`、`.prettierrc.json`、`.editorconfig`、`eslint.config.js`のindex / worktree差分を検査前に確認する。
- 差分がある場合はfail-closeし、設定fileのstageまたはworktree復元を案内する。
- EOL-onlyでGit上の差分が0なら、このguardだけでFAILさせない。
- index snapshot全体を展開する汎用worktree managerは作らない。

### `security:check`の限定modeがworktreeを読み、staged security違反を見逃す

対策:
- staged pathだけをworktreeから読むsecurity modeは採用しない。
- pre-commitへ残す場合は現行Repository-wide worktree検査、またはGit indexの次回commit snapshot全体を検査する。
- index snapshotで既存保証を単純に維持できない場合は、pre-commitから外して`verify` / CIをRepository-wide正本にする。
- staged secret + unstaged削除の回帰testを必須にする。

### pre-commitをstaged-onlyへ変えて既存保証を落とす

対策:
- Prettier / ESLint / securityを同じ規則で一括変更しない。
- `security:check`のRepository-wide検査、固定Test API確認、runtime aggregate検査を先に分解する。
- local pre-commitの早期検査とCI / `verify`のRepository-wide責務を明示する。
- `tests/contracts/husky-config.test.ts`を採用後contractへ更新し、実Git indexを使うbehavior testも追加する。
- 新規dependencyなしで安全に扱えるなら`lint-staged`を追加しない。

### Codex Hookのdynamic import化でfail-open / fail-close意味を変える

対策:
- 変更対象はbootstrapとfailure分類に限定する。
- `UserPromptSubmit`、`PostToolUse`、inactive / active `Stop`の既存contractをbefore / afterで固定する。
- textlint rule、baseline fingerprint、state schemaを今回の都合で変更しない。

### diagnosticsも同じdependency不足で起動不能になる

対策:
- doctorの最低限bootstrap診断をNode標準機能だけで先に実行できる構成を検討する。
- `smol-toml`は詳細config parseの段階だけに限定する案を優先する。
- dependency不足はERROR / exit 1として安全に報告し、raw module failureやexit 0の成功扱いにしない。
- Git repository context確立不能の既存exit 2、WARN-onlyのexit 0を維持する。
- 新しいTOML parserを自作しない。

### current Repository metadataを共有するlinked worktree probeが共通metadataへ不要な差分を残す

対策:
- Phase 1の証拠採取前にはlinked worktreeを作らない。
- current Repository側で許可するGit mutationは`git worktree add --detach`と後片付けの`git worktree remove`だけに限定する。
- probe内部ではtracked file、Git config、info attributes、dependency、Husky metadataを変更しない。
- install、Husky prepare、format write、writer実行は独立temporary clone側だけで行う。
- 作成前後と削除後に`git worktree list --porcelain`、common config、info attributesを比較し、probe entryや意図しない設定変更を残さない。

### linked worktreeでHusky runtimeが未準備のまま、Hookが有効だと誤認する

対策:
- actual linked worktreeで通常installまたは`pnpm run prepare`後の`core.hooksPath`とHusky runtimeを確認する。
- 実`git commit`の成功・失敗をlinked側で確認する。
- install前にHusky品質scriptを動かす要件は追加しない。
- Codex Hookのinstall前診断契約とHuskyの通常install後契約を混同しない。

### actual linked worktree testがprimary Repositoryのdependencyを使って偽陽性になる

対策:
- no-dependency Hook testは`linkedRoot/.codex/hooks/text_quality_gate.mjs`を直接起動する。
- no-dependency doctor testは`linkedRoot/scripts/diagnose-codex-hooks.mjs`を直接起動する。
- linked rootをprimary Repositoryの`node_modules`がancestor探索で見える場所に置かない。

### actual linked worktree testがOS差で不安定になる

対策:
- production worktree managerを作らず、temporary repository内の最小fixtureで`git worktree add`を実行する。
- Windows / POSIXでpath quoting、cleanup、junction / symlink差に依存しない条件へ絞る。
- 環境が機能自体を提供しない場合だけ明示skipし、通常fixtureへの置換でPASS扱いにしない。

### 現在worktree修復でIssue #177と無関係なlocal変更を破棄・上書きする

対策:
- 修復直前に`git status --porcelain=v1 -z`、`git diff`、`git diff --cached`、untracked fileを再確認する。
- 無関係なlocal変更がある場合は`reset --hard`、`git clean`、一括`restore`、worktree再作成を実行しない。
- 自動stashで退避したことにせず、安全に修復できなければ独立clean worktreeで実装・検証を継続する。
- Prettier writeを使う場合もPhase 1でCRLF-onlyと確認したpathに限定する。
- 修復前後で無関係なlocal変更が不変、対象pathの意味上のcontent diffが0であることを確認する。

### 既存78 filesの一括formatを実装差分へ混ぜる

対策:
- 発生源修正とworktree修復を分離する。
- Product codeの意味変更がないことをbyte / diffで確認する。
- 不要な大量fileのformat変更をPRへ含めない。

### local user設定を書き換える

対策:
- system / global Git configはEvidenceとして読むだけにする。
- 恒久対応を個人環境の強制変更へ依存させない。

## 9. 対象外

- Issue #130 / PR #176のNative CI内容
- Product behavior変更
- unrelatedなapp/**の整形
- 全fileの一括改行変換を目的としたPR
- Prettier削除
- Husky / pre-commit全体の無効化
- --no-verifyの通常運用化
- format checkの恒久skip
- Repository全体のformat:checkをendOfLine=autoへ弱めること
- Git global / system configの自動変更
- 新規EOL dependencyや汎用normalization framework
- `lint-staged`等の新規dependency（既存機能で要件を満たせないEvidenceがある場合を除く）
- Codex Hookのfail-open / fail-close仕様の全面再設計
- textlint rule自体の削除・簡略化
- worktree managerや独自runtimeの新設
- Hook / Husky全体をまとめる新規framework

## 10. 完了条件

- Windows worktreeでCRLFになる原因、または再現可能な発生条件を説明できる。
- Repository保存内容、Git index、worktree bytesのどこでLF / CRLFが変わるかを説明できる。
- system / global / local / worktree scope、`extensions.worktreeConfig`、`git rev-parse --git-path info/attributes`、core.attributesFile、core.autocrlf / eol / safecrlfを含めて実効設定を確認済み。
- clean linked worktreeとfresh cloneの結果を確認済み。
- EOLについてCase A / B / Cの採否と理由が記録されている。
- HuskyについてCase Dを採用するか、既存Repository-wide責務をどこまで維持するかが記録されている。
- Codex HookについてCase Eで採用した最小案と、比較して不採用にした案の理由が記録されている。
- Hook diagnosticsについてCase Fの採用内容と、比較して不採用にした案の理由が記録されている。
- CRLF/LFだけのローカル差で不要なpre-commit failureが発生しない。
- 実際のPrettier format違反は引き続きpre-commitで失敗する。
- .gitattributesとRepository indexのLF契約を維持している。
- .prettierrc.jsonのLF契約を維持している。
- CIのstrict LF format checkを維持し、Case Cを採用した場合はlocal `format:check` / `verify`との責務差を明示している。
- LF / CRLF x 正常 / format違反の4ケースを検証している。
- Git add後のindexがLFであることを検証している。
- clean Windows環境で、Case A/Bではclean checkout LFと再発防止、Case Cでは確定したCRLF再現条件下のlocal check / pre-commit / CI strict LFの責務差を検証している。
- 最新PR headのWeb CI / Mobile App CIが成功している。
- pre-commitの検査範囲が明確で、commit対象外の既存format / lint差分だけで不要に停止しない。
- Prettier / ESLintはstaged pathのworktree fileではなく、Git index stage 0のcommit予定contentを検査する。
- staged違反 + unstaged修正はFAILし、staged正常 + unstaged違反はPASSする。
- Prettierは現在の`.prettierignore` / `.prettierrc.json` / `.editorconfig`の意味を維持してindex contentを検査する。
- `.prettierignore` / `.prettierrc.json` / `.editorconfig` / `eslint.config.js`にindex / worktree差分がある場合は固定診断でfail-closeし、EOL-onlyのGit差分0では不要failureを起こさない。
- ESLint warning-onlyとignore対象はPASSし、error / fatal errorはFAILする。
- partial staging、rename、delete、空白を含むpath、対象0件、`git commit --allow-empty`の挙動を回帰testで固定している。
- `security:check`をpre-commitでどこまで実行するか、現在の実装責務に基づいて決定されている。
- `security:check`でindex snapshot modeを採用する場合は、staged security違反をunstaged修正で隠せず、固定Test API / runtime aggregate / seed契約を次回commit snapshotで維持している。
- actual linked worktreeで通常install / Husky prepare後の実pre-commit成功・失敗経路を検証している。
- CI / `verify`のRepository-wide品質ゲートを不必要に弱めていない。
- actual linked worktreeでCodex Hook failureを再現している。
- linked worktree + `node_modules`なしでlinked worktree自身のHook pathを起動しても、raw module failureを漏らさず原因を識別できる。
- linked worktree自身のdoctor pathを起動しても、`diagnose:hooks`が失敗原因と同じdependency不足で完全に起動不能にならず、dependency不足はERROR / exit 1、repository context確立不能はexit 2、WARN-onlyはexit 0として分類される。
- actual `git worktree add`を使う回帰testが追加または更新されている。
- Windows / macOS / Linux / CIでpre-commit、Repository-wide gate、Codex Hookの責務差を説明できる。
- 現在worktreeの修復でIssue #177と無関係なtracked / staged / untracked変更を破棄・上書きしていない。
- CRLF修復はPhase 1でCRLF-onlyと確認したpathへ限定し、修復後もHEAD / indexとの意味上のcontent diffが0である。
- unrelatedな大量fileのformat変更、新規dependency、Hook framework再設計を混ぜていない。

## 11. 未解決事項

実装開始を止めるユーザー判断待ちはない。

ただし、恒久対応の実装内容は原因調査前に固定しない。

- EOLはPhase 1から3のEvidenceでCase A / B / Cを選択する。Case Cではlocal Repository-wide checkとCI strict LF checkの分離要否まで決める。
- HuskyはPhase 6でCase Dを採用するか、現在のRepository-wide責務を部分的に維持するかをcommand単位で決める。Case Dを採用する場合、Prettier / ESLintはindex contentを検査し、品質設定fileのindex / worktree不一致はfail-closeする。`security:check`はRepository-wide worktree / index snapshot / pre-commit外の3案から選ぶ。
- Huskyのlinked worktree責務は「通常installまたはprepare後に実commit Hookが動作する」とし、install前のHook動作は要求しない。
- Codex HookはPhase 7でCase Eの最小案を決める。
- Hook diagnosticsはPhase 8でCase Fの最小案を決める。

3トラックの結論を無理に1つの共通抽象化へ統合しない。

実装開始時にmainのEOL契約、Prettier / Husky構成、Issue #177へ追加情報が入っていた場合は、その差分だけrebaselineしてから進める。
