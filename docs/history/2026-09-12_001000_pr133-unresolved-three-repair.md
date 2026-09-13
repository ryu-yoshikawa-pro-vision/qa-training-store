# PR #133 未対応3件の再対応

## 更新日

2026-09-12 JST

## 更新内容

- P1-2 / P1-3の標準学習導線から`src/seeds/metadata.ts`の直接読解を外し、仕様、seed catalog、`/guide`、現在UIの観察へ揃えた。Executable Sourceの具体ID確認はPlaywright実装後へ送る。
- `assertEvidenceReference()`へ`Trace:`直後のPath境界を追加し、空白なしのdrive、relative drive、file URL、親参照、UNC参照を拒否するcontractを追加した。`http` / `https`のscheme内のcolonと、Artifact、output、Runの追跡参照は許可する。
- source commit `7180db69ed196c69d04a39a37775d2f38cf7c374`の変更は指定4ファイルだけである。format failureの1行を整形した`d40b2e6183a7421d2d2a53d8de08f38abc2d9467`を最終source SHAとし、focused validation、Training Copy prepare / validate、machine-managed curriculum validation、Sanitizerを確認した。

## 検証上の扱い

- 標準`pnpm run test:contracts`では既存Hook contractのWindows subprocess timeoutを2回確認した。診断用のtimeout拡大では通過したが、Hook実装や既存Hook contractは今回のscopeに含めず、bounded repairの環境failureとして残す。
- `codex-task`の初回VerifyCommandはstdoutの戻り値配列化で失敗した。同じ検証を出力リダイレクト付きの一時wrapperから再実行し、Run reportの`verify_exit_code=0`と実出力を取得した。
- 同一source SHAのWeb CIはformat修正後にsuccessした。Mobile App CIのNative Staticは、今回変更していないExpo package 8件のpatch mismatchを2回検出したため、依存更新を行わず環境・依存調査へ分離した。

## 境界

Native CI、C09、C12、Training Workflow、Product Code、BR / AC、Seed Scenarioの意味、Workbook schema、Maestro Flow、外部Full Reviewは今回の対象外とした。
