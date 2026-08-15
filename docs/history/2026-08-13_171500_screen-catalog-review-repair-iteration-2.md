# Screen Catalog Review Repair iteration 2

## 判断

PR #24の追加reviewをCurrent Repositoryへrebaselineした。Checkout Processing、Android Capture Case、Phase 1 Required CI、Android startup raceを実装対象にした。

## 実装方針

- Checkout Processingは`支払いを処理しています`のexact headingだけを受理する。Product codeは変更しない。
- AndroidはRegistryのmachine-readableなsetup／ready IDを既存Maestro subflowへ接続する。自然言語のsetup／readyをshellで解析しない。
- Capture前にrole、route、readyを実画面でassertし、成功したflowの後だけraw screenshotを作る。API34 canonical captureがローカルで実行できない場合、blocked targetとFinal Gate failureを維持する。
- `launchApp(clearState: true)`のtask cleanup raceは、Android workflow helperのforce-stop→`pm clear`→PID消失確認→launchへ分離する。timeout増加やretry無制限化は行わない。
- Phase 1 Required pathへFinal Visual gateを接続する。Structural PASSとFinal Visual DoDは別判定とする。

## 検証境界

Maestro 2.8.0の全flow syntax、TypeScript、関連contract testはローカルで実行可能だった。API34 `google_apis`／`x86_64`／`pixel_2` Emulatorのcanonical capture／promotionと、修正後Native CIの実runtime再実行は、このworktreeのローカル環境とGitHub Actions dispatch制約のため未実施である。未実行をPASSへ昇格させない。
