# M09：CIと品質ゲート

## このモジュールで学ぶこと

CIは指定イベントでRunner上の手順を実行する仕組みです。workflowは自動化の定義、triggerは起動条件、jobは実行単位、stepはjob内の処理です。Build→Serve→Testの順序と、失敗した最初のstepを追います。ローカルとCIの環境差、対象SHA、Run、Artifactを一緒に確認します。

## workflowを読む

演習で使うGitHub Actionsファイルは `training/ai-assisted-qa-course/templates/phase3/` に置き、同期時は無効サンプルのままです。学習者がPhase 3を選択した場合だけ自分の作業用リポジトリで有効化します。workflowは新課程specに限定し、`permissions: contents: read`、Secretなし、deployなしを基本とします。対象SHAとRunを確認できる情報を保存します。

```yaml
name: AI QA course checks
on:
  pull_request:
permissions:
  contents: read
jobs:
  course-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          persist-credentials: false
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build:web
      - run: pnpm run training:ai-assisted-qa:test
```

このworkflowは`pull_request`のmerge commitではなく`github.event.pull_request.head.sha`をcheckoutします。GitHub Actionsの既定ではmerge commitがcheckoutされるため、受講者はPR HEADとテスト対象を明示して照合します。同期対象の無効サンプルはcheckout直後に`git rev-parse HEAD`をArtifactへ記録し、専用のPlaywright結果と同じRunから保存します。教材例は読み方を示す短い抜粋です。完全な無効サンプルは必要なNode/pnpm準備、Build/Serve/Playwright依存、Artifact保存を含み、契約テストで検証します。Templateではworkflowを有効化しません。古いSHAの成功Runを現在のHEADの証拠に使いません。

## 失敗調査・費用・権限

依存導入、Build、サーバー起動、Test、Artifactのどこで止まったかをログから特定します。公開リポジトリの標準Runnerとprivate/larger runnerの費用条件は利用時にGitHubの最新条件を確認します。教材は無料枠を約束しません。公開実行前に個人データやSecretをcommitしないことを確認します。

## 演習と提出

`workspace/M09/`のworkflow断片について、trigger・Runner・job・step・権限を注釈します。Artifact stepを欠いた例から、結果だけでは提出証拠が残らないことを説明します。次にBuild失敗・Test失敗・SHA不一致の3ログを分類し、最初に見るstepと次の確認を記録します。

## 確認と復習

[M09の確認クイズ](../../quizzes/M09.json)を回答します。SHAとRunの対応を誤った場合は「commit作成→workflow起動→Runのhead_sha→Artifact」の順に追い直します。

## 参考

- [M09の学習項目と基準](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_learning-map.md)
- [Phase 3実行環境](../../../../plans/2026-10-16_qa-curriculum-ai-agent-redesign_target.md)
- [GitHub Actionsのpull_requestイベントとSHA](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [開始・終了状態契約](../../../../../training/ai-assisted-qa-course/states/M09/start.json)
