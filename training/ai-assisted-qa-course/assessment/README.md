# 公開評価資料

模範解答、採点テスト、完成状態データ、Phase別ルーブリックはpublicなqa-training-storeに通常のMarkdown/JSONファイルとして保存します。Git差分とPull Requestで内容をレビューできます。これらは秘密ではありません。

- reference-solutions/M00.md〜M10.md: 各モジュールの根拠付き標準例。文面一致ではなく意味・出典・判断・証拠を評価します。
- playwright/M05〜M07/: M05の修正版リンクspec、M06の固定3 Caseと追加2 Case（CASE-CART-004/005）、M07の意図的失敗specと修正版spec。公開評価用の完成コードです。
- scoring-tests/M00.json〜M10.json: 学習目標/知識ノード別基準と正答/誤答/部分/許容別解/評価不能の公開校正例。`expected_decision`は校正fixtureのラベルであり、受講者のLevel 0〜3へ変換しません。正式評価はM04/M07/M10で独立AI候補、実証拠・版のNode.js検証、全Phase目標の決定論的集計を行います。
- completed-states/M00.json〜M10.json: end-state契約に対応する完成参照データ。reference_onlyであり、受講者本人の評価結果や実行成功を記録したものではありません。

学習用Template、同期、module load、Web build/public artifactからは配布許可リストで除外します。この除外は秘密保持・アクセス制御ではありません。学習用CLIは配布元SHAへ固定した公開評価資料を必要なPhaseの分だけHTTPS取得し、パス・content SHA-256・schema・revisionを検証します。開発者は既存の`training:ai-assisted-qa:test`と専用Configで完成specをローカル実行できます。M07の意図的失敗と修正版は別々のtest rootで実行し、前者の期待失敗を通常のPASSと混同しません。M04/M07/M10の本人判断課題では評価時に出典と期待結果を検証できる条件変化を作り、条件・本人回答・証拠ハッシュは個人の非公開評価記録だけに保存します。人間の最終承認や評価担当者による採点は要求しません。実受講者の学習効果試行は後工程です。

各moduleのSkill一覧はqa-workflow-skills@7cc6cba7772de549841a39d71694cbafbc783324の固定revisionに照合しています。受講者の提出物・氏名・評価結果・Secretはここへ保存しません。本人の評価記録は`workspace/.course-assessments/`でGit外に保管し、`workspace/.gitignore`で除外します。評価者や中央成績DBを必要としません。

## Playwright Run証拠の照合

`course:run`のJSON reporterは`spec.file`を`config.rootDir`相対で記録します。正式評価では`config.rootDir`と対象モジュール、許可済みspec、実行対象testを照合し、別spec・skip・期待失敗を通常PASSとして採用しません。

Run receiptにはspec snapshot・JSON reportのSHA-256に加え、Trace等のattachmentのSHA-256も記録します。既存のreceiptにattachmentのSHA-256がない場合、添付物の改変を検出できないため正式な実行証拠として再利用せず、元の履歴を保持したまま新しい`course:run`で再実行してください。これらのハッシュはRun保存後の改変検出であり、外部から持ち込んだログが実際に実行されたことを単独で証明するものではありません。

## M05 P05 の独立した実行証拠

M05の`product-link.spec.ts` before/afterとは別に、P05の本人作成`workspace/M05/p05-cart-locator.spec.ts`を `pnpm course:run M05 p05-cart-locator.spec.ts --label main` で実行できます。Phase 2の正式評価では、このmain RunのPASSとspec snapshot・report・receiptのSHA-256を追加で要求します。公開の`scoring-tests/M05.json`の`required_runs`は配布Validatorとの固定契約により変更しません。追加Runの照合規則は評価器側に置きます。

P05はdefaultをResetし、Mugとlow-stockの各1点を追加したCartで、全体の数量select・削除buttonがそれぞれ2件、対象明細内ではそれぞれ1件、数量が1であることをread-only Assertionで検証します。削除は実行しません。**RunがPASSした事実だけで業務Assertionの妥当性・DB永続化まで証明したことにはなりません。** それぞれの証拠・本人の説明はM05の正式AI評価で区別します。

教材PR #215のM05演習には従来の「`course:run`がP05を拒否する」という説明が残るため、#199への統合前に教材側の記述をこの実行契約へ合わせる必要があります。教材専有ファイルはこのPRで編集しません。

## M07のbefore/afterは異なるspec SHAで受け入れる

M07 `maintenance.spec.ts`のbeforeは2テストのRunと当時の保存済みspec snapshotで確認し、afterは3テストのRun・保存snapshotと**現在のspec SHA**でも確認します。beforeのsnapshotがafterの現行specと同一SHAである必要はありません。むしろ両Runでspecが変更され、afterがbeforeの完了より後に実行されたことを別途検証します。現在のspecとbeforeのSHAを同一視すると、正常なリファクタリング後のbeforeが不合格になるため、この区別が必要です。

この照合は当時のRunを再解釈する契約であり、業務Assertionを維持したことをHashだけで証明するものではありません。テスト数やRun件数のPASSに加え、beforeの2件・afterの3件それぞれの業務Assertion、Page Objectとfixtureの適用、Cart再入場の条件は提出物とAI意味評価で独立に確認します。本人の実Chromium Runによる受入は#199に残ります。

## M07 のPage Object・fixtureとRun証拠

M07の`workspace/M07/maintenance.spec.ts`は、教材の指定どおりPage Objectとfixtureを**同じspec内**に定義してください。Nodeの`course:run`はTypeScript構文を読み、`@playwright/test`と固定教材の`../../training/playwright/support/reset-scenario`以外のstatic import/re-export、dynamic import、`require`を拒否します。評価時も現在のspecとRunに保存されたspec snapshotの両方を再検査します。

この制約は、別ファイルのPage Object/fixtureを変更しただけで、元のspec snapshotのSHAが変わらない問題を防ぐものです。別ファイルへ分割した実装を合格させる契約ではありません。配布済みReset補助関数の同一性は、事前に検証した教材の固定source SHAに依存します。TypeScriptのimport検査だけでテスト内容・業務Assertionの妥当性やRun実行の真正性を保証できるわけではありません。M07のbefore/afterは別Runの成功・テスト数・specの変更と、提出物にある数量Assertion・Cart再入場などを別に評価します。

## 同一試行の再開と排他ロック

`pnpm course:assess <module> --model <id> --resume <assessment-id>` は、
`workspace/.course-assessments/<phase>/attempts/<assessment-id>/.resume.lock/` を排他的に作成し、
同じ試行IDの並列再開を拒否します。評価モデルへの重複送信や結果保存の競合を防ぐため、
同じ試行を複数のターミナルで同時に再開しないでください。

強制終了でロックが残ったときは、自動削除しません。該当する評価CLIが
**実行中でないことをプロセス一覧で確認**し、対象試行の`.resume.lock`だけを手動で削除してから
同じ`--resume`コマンドを再実行してください。
`result.json`、`calibration-result.json`、`ai-candidate.json`などの評価記録は削除しないでください。
別試行のロックは削除しないでください。

## 最新結果ポインタの公開中断

正式結果の保存後に `current.json` を公開する処理も、
Phase単位の `.current-publish.lock/` で排他制御しています。
このロックが残っている場合、`result.json` が保存済みでも
最新結果ポインタの更新は拒否されます。中断時に残ったロックを自動削除しません。

復旧時は、そのPhaseの評価・再開プロセスが**すべて停止していること**を確認してください。
`.current-publish.lock/` だけを手動で削除した後、
保存済みの試行IDと同じ `--resume` コマンドで再開します。
CLIは保存済みの正式結果を照合し、`summary.md` と `current.json` を再生成します。
`current.json` や `result.json` を手動編集・削除せず、
他Phaseのロックや別試行の履歴も削除しないでください。

## 共有校正キャッシュの検証範囲

共有キャッシュを再利用するときは、固定されたモデル・教材のidentity・Case数に加え、
成功状態、schema、日時、Session IDの形式を確認します。
破損や成功状態とエラー件数の矛盾を検出した場合、**自動で再評価・再送せず**エラーにします。
過去の失敗キャッシュは監査用に維持します。

新規校正と候補だけが残った中断からの復旧のどちらでも、
`calibration-result.json`には検証済みCase判定のSHA-256を保存し、
正式修了の復旧時に`calibration-candidate.json`のCase ID・判定値・根拠・
校正ID・identity・日時・Session IDと照合します。旧試行にSHA-256がない場合は
Case形式と保存済み識別情報を検証しますが、Case別判定が未改変であることは証明できません。

新規の成功キャッシュには、Case別判定・根拠と`case_results_sha256`を保存します。
再利用時は固定済みの期待Caseと照合し、正式修了結果の復旧時は少なくとも
Case別判定の形式・件数・ハッシュを照合します。
従来のCase別判定がない成功キャッシュは**自動再利用しません**。
旧キャッシュを再利用できない場合は、評価プロセスが停止していることを確認し、
元ファイルを削除せずGit外の非公開保管場所へ移動してから、利用条件・料金を確認し、
本人の明示的な承認を得て新しい試行で再校正してください。
旧試行の候補・結果ファイルは移動・削除しないでください。

これらはローカルJSONの整合検証です。Case別判定とハッシュの両方を
意図的に書き換えられた場合、その正当性を保証できません。
試行固有の校正を復旧する際、既存の成功キャッシュがあればCase ID・判定・根拠・
schema・日時・Session IDを照合します。Case別判定のない旧成功キャッシュは再利用せずに停止し、
既存の失敗キャッシュは監査用に保持します。
実モデルの106 Case校正を代替するものでもありません。

## OpenCode V2の正式評価プロセス

正式評価はOpenCode CLI `2.0.22`を要求し、`opencode run --standalone --pure --model <provider/model-id> --agent <assessor> --format json --file <prompt>`を使用します。OpenCode V2の設定には`update: "disable"`を指定し、専用Agentの`permissions`へ全リソース・全操作の`deny`を設定します。`OPENCODE_DISABLE_PROJECT_CONFIG`と`OPENCODE_DISABLE_EXTERNAL_SKILLS`も有効にします。

Nodeは標準出力のNDJSONを検査し、Tool使用・複数session・終了イベント欠落・未完了終了・終了後の追加イベントを拒否します。子プロセスのstderrは評価回答として採用しません。非0終了、タイムアウト、出力サイズ超過は正式なPASSへ変換しません。テストはこれらの拒否と独立した評価Agent設定を模擬・検証します。利用するCLIのフラグ・設定の基準は[OpenCode V2 Commands](https://dev.opencode.ai/v2/docs/cli/commands/)、[Config](https://dev.opencode.ai/v2/docs/config/)、[Permissions](https://dev.opencode.ai/v2/docs/permissions/)です。

これらは**設定の静的検証と模擬プロセスの検証**です。本人の認証付きOpenCode `2.0.22`で設定が実際に読み込まれること、既存のグローバル`AGENTS.md`や認証情報が評価へ流入しないこと、無料モデルの契約・価格、429/上限超過時の実応答は未受入です。実受入まで正式評価の最終校正をPASSにしないでください。

## 無料モデルの価格・利用可能性を送信前に確認

正式評価を開始する際は`--model opencode/<model-id>`で明示的にモデルを選択してください。OpenCode Goは月額契約が必要になるため、モデル単価が0でも正式評価の無料モデルとしては許可しません。Nodeは回答送信前に次を順に検証します。

1. 固定HTTPS URL `https://models.dev/api.json`へ読取りGETし、JSON・200・非redirect・20MiB上限を検証します。**学習者データ、Token、選択モデルIDをこのGETへ送信しません。**
2. 選択した提供者・モデルIDがカタログに存在し、入力・出力・その他の公表単価が数値の0であることを確認します。有料・不明・欠落・非数値・非0の料金、401/429、ネットワーク障害、モデル未登録はすべて送信前に`blocked`として拒否します。
3. 評価とは別の`opencode models`で指定したモデルIDが現在のCLIから列挙できるか確認します。認証不足・提供者未接続・モデル無効の場合はモデル評価へ進みません。本人の`SEND <model-id>`による送信同意は従来どおり必須です。

`models.dev`は公開されている参考料金カタログであり、**実アカウントの課金条件や無料枠の残量を保証しません**。本人が提供者の最新料金・利用規約・認証・上限を確認してください。`-free`という名前だけで料金を推定せず、有料モデルへの自動切替や再送を行いません。無料価格が確認できない場合は停止します。事前確認で`blocked`となった試行は勝手に修了・採点せず、価格/接続が正常になれば同じ回答を再開できます。本人の契約と料金の最終受入は#199で実施します。

## 正式評価と学習用OpenCodeの設定分離

正式評価の`opencode run`は、リポジトリ・学習用セッションとは別の、権限を制限した一時ディレクトリを作業ディレクトリにして実行します。`HOME`/`USERPROFILE`、`XDG_CONFIG_HOME`/`APPDATA`、`XDG_DATA_HOME`/`LOCALAPPDATA`、`XDG_CACHE_HOME`を一時ディレクトリへ切り替え、`OPENCODE_DB=:memory:`を使用します。終了後は作業ディレクトリを削除します。`--pure`、`OPENCODE_DISABLE_PROJECT_CONFIG`、`OPENCODE_DISABLE_EXTERNAL_SKILLS`に加え、評価Agentと全体の`permissions`でShell/edit/Web/MCP/Skill/子Agentの操作を拒否します。既存の学習用`AGENTS.md`・CLI構成・プラグインを正式評価の指示に取り込まないための措置です。

この分離では、通常のOpenCodeユーザーDBに保存した認証アカウントも**自動的には引き継ぎません**。明示選択した`opencode/`提供者に限り、利用者が自分で設定した`OPENCODE_API_KEY`を認証のために子プロセスの環境変数へ渡せます。Tokenを評価Prompt・結果JSON・READMEへ記録せず、他提供者のキーやGitHub Tokenは引き渡しません。提供者キーが不要なモデル以外では、適切な認証がなければ`blocked`となります。認証・セッションの実際の分離と権限拒否がOpenCode `2.0.22`で成立することは、#199のPrivate Codespaces実受入で確認してください。

OpenCode V2では`OPENCODE_DISABLE_PROJECT_CONFIG`だけではグローバル`AGENTS.md`を無効にできないため、一時HOMEと作業ディレクトリの分離が必要です。管理者が適用するOpenCodeの設定・ポリシーは通常設定より優先されることがあるため、CLIの実設定と模擬権限拒否も#199で検査します。これらの契約テストは実際のLLMに対する権限拒否の保証ではありません。

## OpenCode呼び出し中断時の扱い

評価モデルへ送信する前に、非公開の試行フォルダへ
`calibration-invocation.json`または`assessment-invocation.json`を不変記録として保存します。
モデルの回答が`calibration-candidate.json`または`ai-candidate.json`に保存されていれば、
固定済みの入力・モデル・版を確認し、呼び出し記録が残っていればその内容も照合して同じ試行で再利用します。
旧試行に呼び出し記録がない場合は、保存済みの候補自体を検証して再利用します。

呼び出し記録はあるが回答の保存がない場合、送信先が処理したか、料金が発生したかは
ローカルから確定できません。同じ試行での**自動再送は拒否**します。
提供者側の利用履歴・課金を確認し、再試行が必要なら本人の明示的な同意で
**新しい試行**を作成してください。新しい試行でも再送や料金の重複を
技術的に保証して防止できるわけではありません。
呼び出し記録や保存済み候補を削除して自動再送を回避しないでください。
