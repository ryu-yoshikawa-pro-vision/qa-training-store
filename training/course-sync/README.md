# AI協働QA 学習用Templateの正本と配布手順

## 正本

学習用Templateのコード・教材・環境設定は、この`qa-training-store`リポジトリを正本とします。別の公開リポジトリは**生成された配布先**であり、編集の正本ではありません。

- `training/course-sync/manifest.json`：許可する配布元/先、固定Skill、評価資料の参照と配布除外
- `training/ai-assisted-qa-course/templates/learner-repo-README.md`：配布先ルートの`README.md`
- `training/ai-assisted-qa-course/templates/learner-repo.gitignore`：配布先ルートの`.gitignore`
- `training/ai-assisted-qa-course/templates/learner-devcontainer.json`：配布先の`.devcontainer/devcontainer.json`
- `scripts/training/ai-assisted-qa-course-core.mjs`：固定SHA/許可リストに基づく`course:sync`と、配布後のハッシュ照合
- `scripts/training/ai-assisted-qa-course.mjs`：`course:load`、`course:run`、`course:assess`等
- `scripts/training/prepare-learner-template.mjs`：マージ後にコピー用の外部ディレクトリを生成・ハッシュ検査
- 管理者Build済みの`dist/**`は`course/shop/**`へコピーする。受講者に製品全Buildを要求しない

別リポジトリに原本を複写して二重管理せず、**確定commitごとに同じ生成手順**を利用します。公開Gitの評価資料は秘密ではありませんが、Template、ロード対象、Web Build/Artifactから除外します。

## PRマージ後：コピー元を生成する手順

公開先 `ryu-yoshikawa-pro-vision/ai-assisted-qa-learner` は本人がPRマージ後にGitHub上で作成する。**本PR内ではPublicリポジトリを作成・公開しない。** `training/ai-assisted-qa-course/templates/` はREADME等の配布**元**で、そのままコピーするとShopと固定Skillが欠ける。生成した配布物をPR内に二重保存しない。

マージ後、Node.js/pnpmを導入した **cleanなmain** で実行する。

```bash
git checkout main
git pull --ff-only
pnpm install --frozen-lockfile
node scripts/training/prepare-learner-template.mjs
```

生成スクリプトは既定でソース外の `../ai-assisted-qa-learner/` を作り、確定HEADのSHAで既存 `course:sync` を実行する。Shop Web Build、配布manifestに登録された固定Skill全ファイル・教材・LICENSE/NOTICEの配布後に `verify-distribution` でSHA等を検証する。固定Skillの件数を受入条件として固定せず、manifestと実ファイルの一致を確認する。生成先が既に空でない場合は上書きせず拒否。任意の別ディレクトリは `--target <空ディレクトリ>` で指定可。**実生成して成功ログがあるまでは配布実Run完了とはしない。**

成功した生成先ディレクトリの**中身を隠しファイルも含めて**、本人が用意した公開リポジトリのルートにコピーする。`.course/distribution-manifest.json` の `source_sha` はマージ後のHEADになり、`README.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`.devcontainer/devcontainer.json`、`course/shop/index.html` 等を含む。公開先はGitHubのTemplateリポジトリに設定する。

本人がマージ後に公開・コピーする方針は確定済みで、再質問しない。B1のPR内配布**準備は完了**。ただし固定Skill・第三者素材の再配布許諾と必要なLICENSE/NOTICEの最終監査は未完了であり、許諾を確認するまで公開受入はBLOCKEDとする。B3の本人Private repo/2コアCodespacesは他の全PR作業が完了してから後続受入し、無断課金しない。

## 更新・検証

- 更新時も配布元HEADと配布元固定SHAを一致させ、変更理由・対象ファイルと配布差分をレビューする。
- `course:sync`は既存ファイルを上書きしない。配布先の既存内容が変わった場合は自動で置換せず、差分の確認と安全な新規生成・通常pushの方針を別途決める。
- 公開Templateの存在、`is_template=true`、配布manifestの`source_sha`とハッシュ、配布除外、Devcontainerで2-core起動、Shop Serve/Reset、Playwright実Run、評価結果の非公開保存を実地確認する。
- 教材変更時にTemplateが古いままであれば、古い版の存在を隠さない。新しい教材版を受講者の作業領域へ無断同期しない。
- 無料枠やOpenCodeモデルの利用条件は個人ごとに確認し、課金が必要ならBLOCKEDとして停止する。

このREADMEは配布設計と再現手順を示すものであり、外部GitHubリポジトリの作成・Codespaces起動の成功証拠ではありません。
