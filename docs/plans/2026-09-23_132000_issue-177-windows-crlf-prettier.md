# Issue #177 Windows worktree CRLF / Prettier format check 調査・恒久対応 Plan

## 0. 依頼概要

- 対象Issue: #177 investigate: Windows worktreeのCRLFでPrettier format checkが失敗する原因と恒久対応を整理する
- 作業branch: plan/issue-177-windows-crlf-prettier
- branch作成時のmain: 01cd8ab15078d479e821d373445af1e16a469519
- 今回はPlan作成のみとし、Prettier設定、Husky、Git属性、Product code、CI実装は変更しない。
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
3. Repository側で発生源を制御できず、CRLF worktreeでもGit indexはLFへ正規化されることを実証できた場合だけ、ローカルpre-commitのEOL判定を緩和する案を採用候補にする。この場合もCIとverifyのformat:checkはLF strictのまま維持する。

最初から --end-of-line auto、独自EOL正規化script、新規dependency、全file一括変換を採用しない。

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

### 2.4 公式仕様から確認できること

Git公式gitattributesでは、eol=lfはcheckout時のworking tree EOLをLFとする契約であり、text fileはindexへ追加される際にLFへ正規化される。

また、attributesはroot .gitattributesだけではなく、より高優先度の .git/info/attributes や、core.attributesFileで指定されたglobal/system attributeも影響し得る。

Prettier公式ではendOfLine=lfがRepositoryをLFへ保つ設定として案内され、Windowsでは.gitattributes導入後に既存worktreeを再作成する必要がある場合も示されている。

参考:
- [Git gitattributes](https://git-scm.com/docs/gitattributes)
- [Prettier Options - End of Line](https://prettier.io/docs/options#end-of-line)

## 3. Repository mapping

### 3.1 Entry points

今回の問題に関係する主な入口は次。

- Git checkout / switch / add
- .gitattributes
- .git/info/attributes と core.attributesFile
- .editorconfig
- .prettierrc.json
- package.json の format / format:check / verify
- .husky/pre-commit
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

### 3.4 Safe change surface

原因が判明するまでは設定を変更しない。

調査後の変更候補は、原因に応じて次へ限定する。

- CRLFを書き込むことが確認されたRepository-owned writer
- 必要なら、そのwriterを保護する既存または新規contract test
- fallbackを採用する場合だけpackage.jsonと.husky/pre-commit
- fallbackの挙動を固定するcontract test
- 既存ADRまたはPROJECT_CONTEXTの現在説明が実装とずれる場合だけ文書更新

### 3.5 Unknowns

実装開始前に確定していないのは次。

- 現在のWindows worktreeで有効なsystem / global / local Git configの実値と設定元
- .git/info/attributesまたはcore.attributesFileによる上書き有無
- 78 filesが現在もすべて i/lf w/crlf なのか
- 最初にCRLFへ変化させる操作
- VS Code等のEditorでEditorConfigが実際に適用されているか
- Repository script、code generation、agent file writeのどれが発生源か
- clean linked worktreeとfresh cloneで同じ状態が再現するか

これらはPlan上の実装ブロッカーではない。今回のIssue自体が調査Issueのため、実装フェーズのPhase 1で順番に確定する。

## 4. 調査方針

### Phase 1: 現在のWindows worktreeを破壊せず固定観測する

最初に現在状態を保存する。format、checkout、restore、renormalize等、file bytesを変える操作は観測完了まで行わない。

確認する内容:

1. Git version
2. current branch / HEAD / status
3. system / global / localの設定元を含む次のGit config
   - core.autocrlf
   - core.eol
   - core.safecrlf
   - core.attributesFile
4. .git/info/attributesの有無と内容
5. failing fileに対するgit check-attr --all
6. failing file全体に対するgit ls-files --eol
7. Prettierが報告するfailure file集合とw/crlf file集合の一致
8. git diff / git diff --cachedが0であること
9. HEAD / index側がLFで、worktree側だけCRLFであること

期待する代表状態は次のような形だが、実測値を優先する。

- index: LF
- worktree: CRLF
- effective attribute: text=auto eol=lf
- Git content diff: 0
- Prettier check: EOL差だけでFAIL

この状態にならないfileがあれば、78 filesを一括原因として扱わずgroup分けする。

### Phase 2: clean checkout境界を比較する

現在worktreeを直接修復する前に、disposableなWindows環境で次を比較する。

A. 同じRepository metadataを共有するdetached worktree
B. 独立したfresh clone

両方でmainの同一SHAをcheckoutし、次を確認する。

- git ls-files --eol
- app/**のCRLF byte有無
- git check-attr
- dependency install前のEOL
- dependency install後のEOL
- format:checkの結果

判定:

- fresh cloneも最初からCRLF:
  - Git属性、Git config、attributes overrideの問題を優先する。
- fresh cloneはLF、同一Repositoryのlinked worktreeだけCRLF:
  - repository-local config / info attributes / worktree lifecycleを優先する。
- fresh cloneとlinked worktreeはLF、現在worktreeだけCRLF:
  - checkout後にfileを書き換えるEditor / script / agent経路を優先する。

### Phase 3: LFからCRLFへ変わる最初の操作を特定する

disposableなLF状態から、通常開発で実際に使う操作を1つずつ実行し、各操作の前後でgit ls-files --eolとbyte状態を確認する。

優先順:

1. branch switch / checkout
2. pnpm install --frozen-lockfile
3. pnpm run format:check
4. pnpm run format
5. app/**へ書き込むことがRepository内で確認されたgenerator / maintenance script
6. VS Code等のEditorで代表fileを変更せず保存
7. 通常利用しているAI / agentの代表的なfile更新方式

すべてのpackage scriptを無差別に実行しない。app/**を書き込む可能性をコードから確認できたものだけ対象にする。

各操作について次を記録する。

- before / afterのEOL
- file set
- Git status / diff
- Prettier結果
- 操作がfile contentを更新したか
- 期待したwriterか、意図しない副作用か

最初にLF -> CRLFへ変わった操作を原因候補とし、同じ操作をfresh disposable環境で再実行して再現できた場合だけ原因として確定する。

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

#### Case C: Repository側でwriterを制御できず、CRLF worktreeを許容する必要がある

このCaseはA/Bを否定した場合だけ検討する。

第一候補は、CI / verifyのstrict checkとローカルpre-commit checkを分離する。

想定する最小構成:

- .prettierrc.jsonのendOfLine=lfは維持
- package.jsonのformat:checkは現在のまま維持
- verifyとCIはformat:checkを継続
- pre-commit専用scriptだけ、Prettier CLI overrideでend-of-line autoを使う
- .husky/pre-commitだけpre-commit専用scriptへ切り替える

この構成ではRepository / CIのLF契約は弱めず、Windows worktreeのEOL差だけをpre-commitで許容する。

採用条件:

- CRLF + 正しいstyleがpre-commit専用checkでPASSする。
- CRLF + 実際のstyle違反はFAILする。
- LF + 実際のstyle違反もFAILする。
- CIのformat:checkはCRLFを引き続きFAILさせる。
- git add後のindexはLFになる。
- 変更がpackage.json、.husky/pre-commit、必要なcontract testに限定できる。

採用しない案:

- Repository全体のformat:checkを--end-of-line autoへ変更する。
- .prettierrc.jsonをautoへ変更する。
- pre-commitを無効化する。
- --no-verifyを通常運用にする。
- commit前に全Repositoryを自動formatして大量fileを変更する。
- EOL変換だけのために新規dependencyまたは汎用frameworkを追加する。

### Phase 5: 既存worktreeの修復

恒久対応を先に確定し、その後で現在worktreeを修復する。

既存78 filesを実装PRの意味変更として混ぜない。

修復は、原因と採用方針に合わせてdisposable環境で手順を検証してから実施する。

候補:

- clean checkout / worktree再作成
- 採用したwriterでLFへ再出力
- Prettier writeによるLF化

git add --renormalize . はindexのnormalization用であり、今回の「worktree bytesを何がCRLFへしたか」の調査前に実行しない。

全file一括EOL変更をProduct変更と同じcommitへ混ぜない。

## 5. 実装タスク

実装時は次の順序で進める。

- [ ] 1. 最新main、Issue #177、ADR-0017、現在のEOL設定をrebaselineする。
- [ ] 2. Windows current worktreeのGit config、attributes、index/worktree EOL、Prettier failure集合をread-onlyで採取する。
- [ ] 3. .git/info/attributesとcore.attributesFileを含むattribute overrideを確認する。
- [ ] 4. linked detached worktreeでclean checkout時のEOLを確認する。
- [ ] 5. fresh cloneでclean checkout時のEOLを確認する。
- [ ] 6. LF状態からbranch switch、install、format check / write、Repository-owned writerの順に実行し、最初のLF -> CRLF変換操作を特定する。
- [ ] 7. 必要ならEditor保存とAI / agent file更新をdisposable環境で再現し、発生源を確定する。
- [ ] 8. 原因をCase A / B / Cへ分類し、採用案と不採用案の根拠をRun Artifactへ記録する。
- [ ] 9. Case A/Bなら発生源だけを最小修正し、回帰テストを追加または更新する。
- [ ] 10. Case Cならstrict CI checkを維持したpre-commit専用EOL許容scriptへ分離し、contract testを追加する。
- [ ] 11. 現在worktreeの既存CRLFを実装差分と混ぜずに修復する。
- [ ] 12. EOL / Prettier検証matrix、pre-commit、index LF、Repository標準検証を実行する。
- [ ] 13. Windowsの実pre-commit経路を確認する。
- [ ] 14. PRのWeb CI / Mobile App CIで最新headを確認し、format checkがstrictのまま成功することを確認する。
- [ ] 15. 必要な場合だけADR-0017 / PROJECT_CONTEXTへ「今回判明した発生源と責務」を追記し、既存判断を重複定義しない。

## 6. 検証方法

### 6.1 調査結果の受入条件

最低限、次を実測する。

| ケース | Git index | worktree | Git diff | Prettier strict |
|---|---|---|---|---|
| clean LF | LF | LF | なし | PASS |
| 現在の再発状態 | LF想定 | CRLF想定 | なし想定 | FAIL想定 |

想定と異なる場合は実測値を正とし、PlanのCase分類を更新する。

### 6.2 恒久対応後のEOL / Prettier matrix

Issue記載の4ケースを必須とする。

| 入力 | strict format:check | pre-commit | 期待 |
|---|---|---|---|
| LF + 正しいformat | PASS | PASS | 必須 |
| CRLF + 正しいformat | 方針に応じる | 方針に応じる | Case A/Bでは再発させない。Case Cではstrict FAIL / pre-commit PASS |
| LF + 実際のformat違反 | FAIL | FAIL | 必須 |
| CRLF + 実際のformat違反 | FAIL | FAIL | 必須 |

Case Cを採用した場合、pre-commit専用checkはEOL以外のPrettier違反を確実に検出するcontract testを追加する。

### 6.3 Git保存契約

- git check-attrでtext / eolを確認する。
- git ls-files --eolでindex LFを確認する。
- CRLF worktree fixtureをgit addした後、index内容がLFになることを確認する。
- RepositoryへCRLF text blobを新規commitできる状態へ契約を弱めていないことを確認する。

### 6.4 Repository標準検証

実装内容に応じて最低限次を実行する。

- focused contract test
- pnpm run format:check
- pnpm run test:contracts
- pnpm run verify
- git diff --check
- Run Artifact sanitizer

Case Aで特定writerのtest suiteが別にある場合は、そのfocused testを追加する。

### 6.5 Windows受入

clean Windows環境で次を確認する。

- checkout直後のapp/**がLF
- 採用した恒久対応の再現手順が期待どおり
- pre-commitがEOLだけの不要failureを起こさない
- 実際のPrettier違反はpre-commitで失敗する
- Git indexはLF
- global / system Git configを変更しなくても成立する

### 6.6 Remote CI

最新PR headに対して次を確認する。

- Web CI: success
- Mobile App CI: success
- Web CIのformat checkはstrict endOfLine=lfを維持
- ローカルpre-commit専用の緩和を採用した場合、その緩和がCIへ伝播していない

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

- package.json
- .husky/pre-commit
- tests/contracts配下のEOL / pre-commit contract test 1 fileを基本とする
- 必要なRun Artifact
- 必要ならADR-0017 / PROJECT_CONTEXTの最小更新

新規dependencyは追加しない。

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

### --end-of-line autoでRepositoryのLF契約まで弱める

対策:
- Case Cでもformat:check、verify、CIはstrict LFを維持する。
- 緩和はpre-commit専用scriptだけに限定する。
- strict / pre-commitの4ケースをcontract testで固定する。

### pre-commitの責務をstaged-only等へ広く再設計する

対策:
- Issue #177ではEOL問題だけを解く。
- lint-staged導入、Hook architecture変更、全Hookの責務見直しは行わない。

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
- staged-only formatter等へのHook architecture再設計

## 10. 完了条件

- Windows worktreeでCRLFになる原因、または再現可能な発生条件を説明できる。
- Repository保存内容、Git index、worktree bytesのどこでLF / CRLFが変わるかを説明できる。
- .git/info/attributes、core.attributesFile、core.autocrlf / eol / safecrlfを含めて実効設定を確認済み。
- clean linked worktreeとfresh cloneの結果を確認済み。
- 採用する恒久対応がCase A / B / Cのどれか明示され、不採用案の理由も記録されている。
- CRLF/LFだけのローカル差で不要なpre-commit failureが発生しない。
- 実際のPrettier format違反は引き続きpre-commitで失敗する。
- .gitattributesとRepository indexのLF契約を維持している。
- .prettierrc.jsonのLF契約を維持している。
- CI / verifyのstrict format checkを維持している。
- LF / CRLF x 正常 / format違反の4ケースを検証している。
- Git add後のindexがLFであることを検証している。
- clean Windows環境でpre-commitを検証している。
- 最新PR headのWeb CI / Mobile App CIが成功している。
- unrelatedな大量fileのformat変更、新規dependency、Hook再設計を混ぜていない。

## 11. 未解決事項

実装開始を止めるユーザー判断待ちはない。

ただし、恒久対応の実装内容は原因調査前に固定しない。Phase 1から3のEvidenceでCase A / B / Cを選択し、選択したCaseの範囲だけ実装する。

実装開始時にmainのEOL契約、Prettier / Husky構成、Issue #177へ追加情報が入っていた場合は、その差分だけrebaselineしてから進める。
