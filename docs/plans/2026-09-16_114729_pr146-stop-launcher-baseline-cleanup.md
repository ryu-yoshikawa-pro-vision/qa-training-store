# PR #146 Stop launcher baseline cleanup 修復計画

## 0. 依頼概要

- 依頼内容: configured `Stop` launcherがactive Stopをfail-openする際、current sessionのbaselineだけをbest-effort cleanupする。
- 背景: launcher failure時はHook本体のcleanupを通らないため、allow後に同一sessionの古いbaselineが残る。
- 期待成果: `stop_hook_active === true`の安全な入力だけが固定structured allowへ進み、対応するstateだけが削除される。

## 1. ゴール / 完了条件

- ゴール:
  - Unix／Windowsのconfigured Stop launcherで、active=true時のcurrent session state cleanupを実装する。
  - inactive／missing／malformed／wrong typeではblockとstate保持を維持する。
- 完了条件（DoD）:
  - state directory全体や他session stateを削除しない。
  - cleanup成功・不存在・失敗のいずれでもactive Stopはexit 0＋固定structured diagnosticとなる。
  - process-boundary contractでUnix／Windowsのfailure fixture、state lifecycle、再baseline、漏えい防止を確認する。
  - SessionStart、Hook本体、既存launcher、state schema、Expo対応を変更しない。

## 2. 現状理解と前提

- 現状理解:
  - current HEADは`6c9a38514bacbad020cb2a49671c22dbae3c1c43`で、Stop launcherのactive=true fallbackは固定structured diagnosticを返すがstate cleanupを行わない。
  - Hook本体の`makeStatePath()`はrepository root hashとSHA-256(session_id)をstate filenameへ使い、`cleanupAllowedStop()`は正常Hook経路で既にcleanupする。
  - UnixはNode→Pythonの既存JSON parser、WindowsはPowerShellの厳密なboolean判定を持つ。
- 前提:
  - repository rootは既存の`git rev-parse --show-toplevel`結果だけを使い、root不明時はpathを推測しない。
  - Node／Python／PowerShell標準機能だけを使い、cleanup errorは診断へ出さない。
- 対象外:
  - `.codex/hooks/text_quality_gate.mjs`、SessionStart、baseline schema／生成ロジック、他launcher、Plan本文の正しい記述、Expo／Native／workflow。

## 3. 質問 / 曖昧性

- 必ず質問する不透明点: なし。削除対象、active判定、fail-open契約は依頼と既存Planで確定している。
- 仮定してよい細部: state directory内のsuffix一致かつ通常fileだけを列挙し、個別unlinkする。session_idが空またはroot不明ならcleanupを省略してallowする。
- 未回答の重要質問: なし。

## 4. 影響範囲

- 影響範囲: `.codex/config.toml`のconfigured Stop Unix／Windows fallback、既存contract test、Run Artifact、PR本文。
- 確認対象ファイル:
  - `.codex/config.toml`
  - `.codex/hooks/text_quality_gate.mjs`
  - `tests/contracts/codex-text-quality.test.ts`
  - `tests/contracts/codex-hook-contract.test.ts`
  - `docs/plans/2026-09-12_220014_codex-hook-quality-gates.md`
  - PR #146本文

## 5. 変更方針

- 変更方針:
  1. Unixの既存Node／Python active parserへ、root envとsession hashの個別state cleanupを追加する。
  2. Windowsの既存PowerShell active fallbackへ、SHA-256と列挙済みfileの`-LiteralPath`削除を追加し、EncodedCommandを可読scriptから再生成する。
  3. 既存process-boundary testを拡張し、failure前のbaseline、false／invalid保持、true削除、他session保持、次UserPromptSubmitでの再作成、failure outputの非漏えいを確認する。
- 実行タスク:
  - [ ] 1. Unix／Windows launcher fallbackへ最小cleanupを追加する。
  - [ ] 2. configured Stop lifecycle／scope／再作成のcontractを更新する。
  - [ ] 3. focused／標準検証、lint、diff、artifact sanitizationを実行する。
  - [ ] 4. commit／通常push、最新CI、PR本文、head一致を確認する。

## 6. 検証方法

- 検証計画:
  - 指定focused contract、`scripts/verify.ps1 -HookContracts`、`pnpm run verify`、`lint:text`、`lint:markdown`、`git diff --check`。
  - Windowsでは実configured `command_windows`をdecode・実行し、Unixは同じtestをUbuntu CIで実行する。
  - push後の最新PR headでWeb CI／Mobile App CIと関連jobを確認する。
- 成功判定:
  - false／invalidはstructured block＋state保持、trueはstructured allow＋current state削除。
  - 他session state保持、cleanup後の同一session再baseline、raw output／secret／path／exception非漏えいを確認する。

## 7. リスクと未解決論点

- リスク:
  - shell／PowerShellのstdin・環境変数・path境界、EncodedCommandの再生成、state suffixの誤削除。
  - cleanup失敗をthrow／stderrへ出すとactive Stopのfail-openまたは漏えい契約を壊す。
- 未解決の質問: なし。

## 8. 成果物

- 変更ファイル:
  - `.codex/config.toml`
  - `tests/contracts/codex-text-quality.test.ts`
  - 必要な`tests/contracts/codex-hook-contract.test.ts`
  - Run Artifact
- 付随ドキュメント: PR #146本文へbest-effort cleanupの事実と検証結果を追記する。既存Plan／ADR／referenceは記述が正しいため変更しない。

## 9. 備考

- merge、force push、mainへの直接push、PR／Issue close、branch削除、release、tag作成は行わない。
