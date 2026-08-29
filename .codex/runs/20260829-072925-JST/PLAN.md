# Plan

## Objective

保存済みPlan `docs/plans/2026-08-28_212400_run-json-machine-managed-contract.md`を正本として、`run.json`のmachine-managed契約とinteractive `codex-safe`終了時同期を実装する。

## Scope

- In: Planに列挙されたAGENTS、codex-safe（PowerShell/Bash）、collector Python／PowerShell wrapper、reference docs、collector／codex-safe contract tests、consumer verifyの最小positive check。
- Out: manifest schema／template shape、`codex-task` lifecycle、Bash collector wrapper、Hook／evaluation、Product／EC／curriculum、RunId自動探索・伝播・registry、session attribution、追加runtime／test infrastructure。

## Confirmed repo mapping

- Entry points: `scripts/new-run.*`、`scripts/codex-task.*`、`scripts/codex-safe.*`、`scripts/collect-run-artifacts.*`、`scripts/verify*`。
- Main flow: `new-run`が新規Runを生成し、`codex-task`が非対話manifestを更新する。interactive `codex-safe`は現状manifest同期を行わず、collectorは既存manifestのsummaryだけを再集約する。
- Existing tests: `tests/contracts/codex-run-manifest-contract.test.ts`にv1/v2、既存changed_files、writer形状の契約がある。codex-safe sync contract testは未作成。
- Safe change surface: Planの変更対象10ファイルと新規contract test。Bash collector wrapper、template、new-run、codex-task、config、Hookは確認のみ。
- Unknowns resolved: Windows `powershell.exe`は実装前環境確認で利用可能か検証する。Codex実機／child launch failureは利用可能な既存runtime範囲だけ実行し、追加shim等は作らない。

## Assumptions

- `collect-run-artifacts.py`は`Path(__file__).resolve().parents[1]`でrepository rootを解決でき、refresh testはtemporary Git repositoryへscriptをcopyして検証する。
- `git diff --name-only --relative -z HEAD --`と`git ls-files --others --exclude-standard -z`をrepository rootで実行し、filesystem decodingとPOSIX pathへ正規化する。
- active RunのRunIdは呼び出し側が明示し、wrapperは自動探索・推測・環境変数伝播を行わない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: sync eventのreason／exit codeは既存harness logの短いJSON dataとして記録する。
- 未回答の重要質問: なし。

## Change strategy

1. AGENTSのactual `run.json` machine-managed境界とactive Runのinteractive `RunId`指定契約を修正する。
2. PowerShell／Bash `codex-safe`へ、ログ生成前のRun Directory precondition、existing manifest guard、終了時collector sync、failure capture、warning、exit precedenceを追加する。
3. collector Pythonへoptional `--refresh-git-changed-files`を追加し、既存changed_filesを保持したunionとGit path除外を実装する。PowerShell wrapperだけoption pass-throughを追加する。
4. reference docsをlifecycleに合わせ、collector／safe contract testとverify positive checksを追加する。
5. targeted tests、利用可能なverify、Markdown lint、diff checkを実行し、Plan外差分とStop条件を自己レビューする。

## Definition of Done

- Plan §6のDoDを満たし、existing manifestだけがinteractive終了時に一度同期される。
- manifest-less Runは生成されず、RunId不在のad-hoc実行は同期されない。
- changed_filesの保持、tracked／untracked／日本語・空白path、`.codex/runs/**`新規除外、status非変更、Git failureが契約化される。
- PowerShell／Bashのexit semanticsとNoLog／preflight／PrintCommand境界が一致する。
- targeted contract、verify、Markdown lint、diff checkがPASS、利用不能runtimeはSKIP理由付きで記録される。

## Stop conditions

manifest schema／field変更、RunId自動correlation／registry／propagation、session attribution／snapshot、Hook解決、full workflow runner化、新runtime／cross-platform infrastructureが必要になった場合は実装を停止する。

## Thinking Log

- 2026-08-29 07:29 JST: 指定branch、必須docs、最近のADR／Runを確認し、対象branchはcleanでPlanと現状実装の重大な不一致はないと判断した。
- 2026-08-29 07:29 JST: `codex-task`、Bash collector wrapper、template／Hookは既存contractとして変更せず、Planのsafe change surfaceへ固定した。
