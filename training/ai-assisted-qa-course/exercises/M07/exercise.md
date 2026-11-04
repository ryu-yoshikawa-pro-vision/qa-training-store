# M07 実技：失敗原因を証拠で分ける

## 入力

`failure-cases.md`のAは意図的に誤ったAssertionを持つ実行可能なspecです。BはReset metadataの違いを表す説明用ログ、Cは待ち時間の仮説です。B/Cを実アプリで観測済みの事実として扱いません。

## 手順

1. 診断素材Aの`workspace/M07/failure-assertion.spec.ts`を**変更せず**実行し、存在しない商品見出しを期待したAssertionの失敗とTraceを確認します。このRunは修正対象のbefore Runとは別の診断記録です。

   ```bash
   pnpm course:run M07 failure-assertion.spec.ts --label main
   ```

2. 修正対象の`workspace/M07/repaired-assertion.spec.ts`をまだ編集せず、before Runを保存します。初期状態のこのspecは**明示的なTODOエラー**で失敗するため、診断素材AのLocator/Assertion失敗と混同しません。

   ```bash
   pnpm course:run M07 repaired-assertion.spec.ts --label before
   ```

3. 診断素材Aと正式なCart仕様を参照し、修正対象のTODOを必要な業務Assertionに置き換えます。対象商品と数量1など、実際に保証すべき結果を検証し、Assertionを削除してPASSにしません。修正対象の別Runを実行します。

   ```bash
   pnpm course:run M07 repaired-assertion.spec.ts --label after
   ```

4. B/CではTest、Product、Environment、Flakyの仮説を列挙し、追加で必要な証拠を示します。
5. RetryやTimeout延長を原因修正と呼ばず、Trace、Screenshot、ログが示す範囲と限界を記録します。
6. `workspace/M07/maintenance.spec.ts`の2件を単独実行し、変更前Runを記録します。両testのResetと「マグ追加→カート表示」の重複を探します。
7. テストごとのResetをPlaywright標準fixtureへ移し、重複する画面操作を小さなPage Objectへまとめます。追加ボタンのLocatorには完全一致を指定し、変更箇所を1か所に集めます。数量1・数量2のAssertionは各testに残し、仕様の確認を弱めません。
8. 既存2件を共通化した後、P05にある「数量を2へ更新してCartを開き直す」**3件目のtest**を追加します。各testが独立してResetを実行し、業務Assertionを維持していることを確認します。変更前後のspec・コマンド・結果を記録し、1件だけの操作で抽象化が不要な別例も挙げます。失敗時はReset、Locator、AssertionとTraceを確認し、結果を推測しません。

変更前にCodespacesのターミナルで次を実行し、2件の結果を記録します。

```bash
pnpm course:run M07 maintenance.spec.ts --label before
```

Page Objectとfixtureの実装後に**3件目の回帰testを追加してから**、次のコマンドを実行します。出力先を分けて変更前の結果を上書きせず、`before`は2件PASS、`after`は3件以上PASSを確認します。`after`で2件だけPASSしても正式な証拠条件を満たしません。

```bash
pnpm course:run M07 maintenance.spec.ts --label after
```

`course:run`は検証済み配布manifestの`source_sha`と実行specの`spec_sha256`を含むreceipt、spec snapshot、JSON reportと、生成されたattachmentを一意のRun directoryに保存します。新課程Configは`trace: "retain-on-failure"`、`screenshot: "only-on-failure"`のため、PASSしたRunに自動Trace・Screenshotがなくても、それだけで未実行とは判断しません。再挑戦しても前の結果は上書きされません。`course:assess M07`は同じ配布`source_sha`に属し、修正前後で異なるspec SHAを持つ別Runを照合します。

## 提出物

`workspace/M07/diagnosis.md`に診断と保守演習のbefore/afterの別Run ID、証拠、原因、差分、未解決事項を記録します。編集した`workspace/M07/maintenance.spec.ts`も提出します。

## 理解ノード別の確認

既存の演習と提出物を利用して、次の能力を別々に確認してください。本人が実行していない操作を完了と報告せず、未確認を明示します。

- **K-M07-06**：画面操作をPage Objectへまとめ、仕様Assertionの責務を保持して別Runで検証できる
- **K-M07-07**：fixtureのスコープを理解し、各テスト前Resetとテスト間独立性を確認できる

## 反復実践：実失敗から原因を探し、保守変更を比較する（P01〜P06）

従来のAssertion失敗1件、説明用ログB/C、POM/fixture実装の手順を終えた後に、違う条件で診断力を確認します。失敗を作るのは**自分の学習用specだけ**で、製品コードや共通Config、他の受講者データを壊しません。診断で使ったTrace・spec SHA・期待結果・変更差分は`diagnosis.md`へ記録します。

1. **P01 Testと環境を分離する（M07-01・02）**：教材の実Run Aを使い、原因候補を「Assertionの期待」「Locatorの特定」「Reset/データ」「Browser/起動」の4つに分けます。最初の失敗行・実画面・仕様を根拠に、**調べる順序と一つずつ除外した事実**を記録します。**証拠**：少なくとも2つの候補の採否根拠と最小修正箇所。
2. **P02 Resetを変えた場合の診断計画（M07-01・02）**：`failure-cases.md`の合成Bについて、`default`と`low-stock`の違いを実際のSeed資料へ照合します。架空のログで最初に観測した値を抽出し、もし自分のspecでReset引数を誤ったら**どのmetadata・開始状態・業務Assertionで検知するか**を整理します。Bを再現済みと報告しません。**証拠**：仕様・Seed・追加取得する証拠の対応表。
3. **P03 Retry成功を原因修正と呼ばない（M07-01〜03）**：合成Cの初回失敗・Retry成功を読み、「遅延」「不安定なLocator」「前テストの残状態」の3仮説を立てます。それぞれを反証するためのTrace・Run順序・ネットワーク結果を指定し、根拠なくTimeoutを増やす提案を棄却します。**証拠**：仮説ごとの観測条件と結論保留の理由。
4. **P04 保守変更で業務Assertionを維持（M07-04・05）**：既存の2 testのPage Object/fixture化後、数量1と数量2のAssertionを**別testに維持したまま**、Locator変更の仮想要求「カート追加ボタンのaccessible nameが変わる」を当てます。変更前後で触るファイル・test・assertionの数を比較し、実在しない新しいラベルで実装を壊さず説明します。**証拠**：変更影響表、選んだ抽象化の責務。
5. **P05 新しい回帰条件を自分で追加（M07-04・05）**：既存2件とは異なる**「マグを追加→数量2へ変更→別ページへ移動→再度Cartを開いて数量2を確認」**という3番目のtestを、保守変更後の`maintenance.spec.ts`へ追加します。単にCartページを`reload()`するだけでは、「別ページからCartを開き直す」条件を満たしません。各testが個別のResetを使うこと、Page Objectに業務Assertionを隠さないことを確認します。**証拠**：新しいtest・期待結果・変更前後の責務・実Run。
6. **P06 再実行と変更の範囲を確かめる（M07-02・04・05）**：従来の2件のbefore Runを保全し、変更後の`pnpm course:run M07 maintenance.spec.ts --label after`では**3件以上PASS**することを確認します。条件・順番を変えてもResetが独立する理由を説明します。Run/Traceがなければ未検証、実Runで失敗が残ればそのまま報告します。**証拠**：before/afterのRun ID、件数、spec SHA、失敗診断、残る制約。

**完了条件**：P05は説明だけでなく新しいtestのコードと実行結果を提出します。P02/P03の合成ログは診断計画であり、再現性を実証した結果ではありません。

### Git/PRを使わないPhase 2成果物の保全

Phase 1/2の提出物やTraceを公開リポジトリへpushしません。保管用ファイルは配布済みの`workspace/.gitignore`でGit管理対象外の`M07/`配下に置きます。**生成されるアーカイブは暗号化されない**ため、外部共有・公開先へのpushをせず、本人のみがアクセスできる領域で扱ってください。M08へ移る前に、本人が保管先を決め、**必要なファイルを個別に選び、機密情報を確認してから**手元に保存してください。GitHubのcommit/PRや正式AI評価の実行は、この保全作業の前提ではありません。

1. `workspace/M05/`〜`workspace/M07/`にある本人の提出物とspecを確認します。Runの記録は各モジュールの`evidence/runs/<実際のrun_id>/`内にあり、`run-evidence.json`、`spec-snapshot.ts`、`playwright-result.json`、必要に応じてTrace・画像等のattachmentを選びます。修正前後の**別Run**と`source_sha`・`spec_sha256`を取り違えないよう、まず`phase2-handoff.md`へ実際の識別子を記録します。
2. Run内のJSON、Trace、画像、標準出力にはURL、認証状態、個人情報等が含まれる可能性があります。内容を確認できないものは外部へ持ち出さず、**未保全と理由**を記録します。`.env*`、トークン、ブラウザの認証プロファイル、`workspace/.course-assessments/`、非公開採点資料、無関係な生成物を含めません。
3. Codespacesのターミナルで、リポジトリルートから次のように、本人の成果物**だけ**を一覧にします。ファイルが未作成なら原因を確認し、架空の出力や空のファイルを作って完了扱いにしません。

   ```bash
   mkdir -p workspace/M07/exports
   cat > workspace/M07/exports/phase2-files.txt <<'EOF'
   workspace/M05/submission.md
   workspace/M05/product-link.spec.ts
   workspace/M06/submission.md
   workspace/M06/cart-cases.spec.ts
   workspace/M06/new-case.spec.ts
   workspace/M07/diagnosis.md
   workspace/M07/repaired-assertion.spec.ts
   workspace/M07/maintenance.spec.ts
   workspace/M07/phase2-handoff.md
   EOF
   ```

4. 実際に採用したRunについて、`workspace/Mxx/evidence/runs/<run_id>/run-evidence.json`・`spec-snapshot.ts`・`playwright-result.json`と、必要なTrace・画像の**実在する相対パス**を`phase2-files.txt`の末尾へ一行ずつ追記します。Runの出力ディレクトリを丸ごと指定せず、対象と内容を確認したファイルだけ追加します。
5. 下記で対象パス・通常ファイルであることを確認し、アーカイブを作成してチェックサムを検証します。エラーになったら途中のアーカイブを成功証拠として使いません。

   ```bash
   workspace_root=$(realpath -e workspace)
   manifest=workspace/M07/exports/phase2-files.txt
   test -s "$manifest" || { echo "ファイル一覧が空です"; exit 1; }

   while IFS= read -r file || test -n "$file"; do
     case "$file" in
       workspace/M05/*|workspace/M06/*|workspace/M07/*) ;;
       *) echo "対象外のパス: $file"; exit 1 ;;
     esac
     test -f "$file" && test ! -L "$file" || {
       echo "存在しないファイル、通常ファイル以外、またはsymlinkです: $file"; exit 1;
     }
     resolved=$(realpath -e -- "$file") || exit 1
     case "$resolved" in
       "$workspace_root"/M05/*|"$workspace_root"/M06/*|"$workspace_root"/M07/*) ;;
       *) echo "workspace外のパスです: $file"; exit 1 ;;
     esac
     test "$file" = "workspace/$(realpath --relative-to="$workspace_root" -- "$file")" || {
       echo "相対移動（../）やsymlinkを含むパスです: $file"; exit 1;
     }
     case "$resolved" in
       "$workspace_root"/M07/exports/*)
         echo "保全用ファイルを入力へ混ぜられません: $file"; exit 1 ;;
     esac
   done < "$manifest"

   tar --create --gzip --file=workspace/M07/exports/phase2.tgz \
     --verbatim-files-from --no-recursion --files-from="$manifest" || exit 1
   sha256sum workspace/M07/exports/phase2.tgz > workspace/M07/exports/phase2.tgz.sha256
   sha256sum -c workspace/M07/exports/phase2.tgz.sha256 || exit 1
   tar -tzf workspace/M07/exports/phase2.tgz
   ```

6. `phase2.tgz`と`phase2.tgz.sha256`をCodespacesから本人だけがアクセスできるローカル保管先へダウンロードします。実際に保管したアーカイブのSHA-256を照合し、信頼できる**空の非公開ディレクトリ**で解凍して提出物・Run記録を読み取れることを確認します。公開URLやGitHub PRへ貼り付けず、`phase2-handoff.md`に保存先（個人情報・秘密情報を含まない表記）、SHA、復元確認の結果を記録します。

   ```bash
   mkdir -p workspace/M07/exports/restore-check
   tar -xzf workspace/M07/exports/phase2.tgz \
     -C workspace/M07/exports/restore-check --no-same-owner --no-same-permissions
   ```

この手順の確認項目は**ファイルの保全・同一性・読取り**です。コピーしたRun記録だけで未実施のテストをPASSにしたり、実際の製品や本人の修了を証明したりはできません。Codespacesでアーカイブ作成・ダウンロード・復元が行えなかった場合は未実施/BLOCKEDと書き、手順を実施したと偽らないでください。

### 固定Skillとの協働

`e2e-test-inspection`・`e2e-test-result-analysis`に実失敗AのspecとTraceを提示し、原因仮説を本人が仕様・前後Runで確認してください。`adversarial-review`で「Assertionを弱める」「Retryだけ追加」の提案を検査し、`e2e-test-reporting`で合成B/Cを実行済みと誤記していないか確認します。利用できないSkillは未実行/BLOCKEDと記録し、モデル未接続を本人の失敗診断成功へ読み替えません。
