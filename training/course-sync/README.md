# AI協働QA 学習用Templateの正本と配布手順

## 正本

学習用Templateのコード・教材・環境設定は、この`qa-training-store`リポジトリを正本とします。別の公開リポジトリは**生成された配布先**であり、編集の正本ではありません。

- `training/course-sync/manifest.json`：許可する配布元/先、固定Skill、評価資料の参照と配布除外
- `training/ai-assisted-qa-course/templates/learner-repo-README.md`：配布先ルートの`README.md`
- `training/ai-assisted-qa-course/templates/learner-repo.gitignore`：配布先ルートの`.gitignore`
- `training/ai-assisted-qa-course/templates/learner-devcontainer.json`：配布先の`.devcontainer/devcontainer.json`
- `scripts/training/ai-assisted-qa-course-core.mjs`：固定SHA/許可リストに基づく`course:sync`と、配布後のハッシュ照合
- `scripts/training/ai-assisted-qa-course.mjs`：`course:load`、`course:run`、`course:assess`等
- 管理者Build済みの`dist/**`は`course/shop/**`へコピーする。受講者に製品全Buildを要求しない

別リポジトリに原本を複写して二重管理せず、**確定commitごとに同じ生成手順**を利用します。公開Gitの評価資料は秘密ではありませんが、Template、ロード対象、Web Build/Artifactから除外します。

## 初回生成

作成者は所有アカウント、公開リポジトリ名、管理権限、課金条件を作成前に確認します。候補名は`ryu-yoshikawa-pro-vision/qa-training-store-learning-template`です。実在確認後に別名を指定しても構いません。

ソースの作業ツリーがcleanで、指定commitが現在のHEADである必要があります。`course:sync`は対象ディレクトリを新規作成しないため、別の空ディレクトリを用意します。

```bash
# qa-training-store の作業ツリー
pnpm run validate:ai-assisted-qa
git status --short
SOURCE_SHA="$(git rev-parse HEAD)"
mkdir -p ../qa-training-store-learning-template
pnpm course:sync --source-sha "$SOURCE_SHA" --target ../qa-training-store-learning-template
cd ../qa-training-store-learning-template
node scripts/training/ai-assisted-qa-course.mjs verify-distribution
git init -b main
git add .
git commit -m "chore: initialize pinned AI-assisted QA learner template"
```

`course:sync`は固定SHA・配布許可リスト・評価資料の除外・symlink禁止・衝突時非破壊性を検査します。GitHub上で作成する場合は、別の公開リポジトリへの**新規作成権限**が必要です。以下は初回だけ実行し、既存リポジトリを上書き・force pushしません。

```bash
gh repo create ryu-yoshikawa-pro-vision/qa-training-store-learning-template --public --source . --push
gh api --method PATCH repos/ryu-yoshikawa-pro-vision/qa-training-store-learning-template -F is_template=true
gh repo view ryu-yoshikawa-pro-vision/qa-training-store-learning-template --json isTemplate,isPrivate,url
```

受講者側はこの公開Templateの **Use this template** から個人の非公開リポジトリを作成し、2-core Codespaceを選択します。公開fork→非公開化は利用しません。受講者の答案・Secret・個人評価結果は管理者Templateへ取り込みません。

## 更新・検証

- 更新時も配布元HEADと配布元固定SHAを一致させ、変更理由・対象ファイルと配布差分をレビューする。
- `course:sync`は既存ファイルを上書きしない。配布先の既存内容が変わった場合は自動で置換せず、差分の確認と安全な新規生成・通常pushの方針を別途決める。
- 公開Templateの存在、`is_template=true`、配布manifestの`source_sha`とハッシュ、配布除外、Devcontainerで2-core起動、Shop Serve/Reset、Playwright実Run、評価結果の非公開保存を実地確認する。
- 教材変更時にTemplateが古いままであれば、古い版の存在を隠さない。新しい教材版を受講者の作業領域へ無断同期しない。
- 無料枠やOpenCodeモデルの利用条件は個人ごとに確認し、課金が必要ならBLOCKEDとして停止する。

このREADMEは配布設計と再現手順を示すものであり、外部GitHubリポジトリの作成・Codespaces起動の成功証拠ではありません。
