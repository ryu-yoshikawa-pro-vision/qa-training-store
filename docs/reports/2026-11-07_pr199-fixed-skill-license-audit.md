# PR #199：固定Skillのライセンス・通知の確認結果（2026-11-07）

## 対象

PR #199の配布manifestは、[外部リポジトリ `qa-workflow-skills`](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/tree/7cc6cba7772de549841a39d71694cbafbc783324) のcommit `7cc6cba7772de549841a39d71694cbafbc783324`から**13 Skill・105ファイル**を学習者の`.agents/skills/**`へ配布する契約である。実配布manifestはWeb CI #42359608112のArtifact #13568279521から確認した。ファイル数・Skill数はmanifestの実エントリから集計した。

ライセンス監査は、固定リポジトリのルート`LICENSE`・`LICENSE.md`・`NOTICE`・`NOTICE.md`・`README.md`と、13件の`skills/<name>/SKILL.md`を固定commitで直接取得して確認した。

## 確認結果

- **ルート`LICENSE`、`LICENSE.md`、`NOTICE`、`NOTICE.md`は固定commitに存在しない**（GitHubのファイル取得は404）。READMEに第三者作品・再配布許諾を特定するライセンス記載は確認できなかった。
- 次の13 Skillの`SKILL.md`にはいずれもYAML Front Matterの`license:`項目がなく、本文にも当該Skillの再配布許諾と著作権者を特定する記載がない。

  `adversarial-review`、`coverage-analysis`、`e2e-test-execution`、`e2e-test-implementation`、`e2e-test-inspection`、`e2e-test-reporting`、`e2e-test-result-analysis`、`qa-workflow`、`spec-analysis`、`test-analysis`、`test-case-design`、`test-condition-design`、`test-requirement-design`

- 配布manifestの外部Skillファイル105件には、`LICENSE`・`NOTICE`・`COPYING`に相当する配布先ファイルが登録されていない。
- 学習者用`training/ai-assisted-qa-course/templates/learner-LICENSE`はMITだが、同じ配布物の`learner-THIRD_PARTY_NOTICES.md`が**第三者作品の権利は別であり、全件監査が未完了**と明示している。学習者用MITが外部Skillの著作権者による許諾の代替になるとは判断しない。

## 判定

**再配布権限・第三者の権利表示は未確認。公開許諾の受入はBLOCKEDのまま。** ライセンスファイルの不存在が直ちに権利侵害を証明するわけではないが、権利者の許諾が確認できない時点で「許諾済み」と判定する根拠はない。

上記は13件の`SKILL.md`とルートの有無の確認であり、105ファイルの参考資料・assets・scriptsの著作権者や元ライセンスまでは特定していない。WebのJS bundle・フォント・画像の第三者権利監査も独立して残る。出典リポジトリの所有者名を著作権帰属の証明に使わない。

## 公開前の次の対応

1. 固定Skillの作品ごとに、再配布可能な権利者・使用許諾の根拠と、元作品の採用・改変範囲を確認する。必要なら権利者による明示的なLICENSE/NOTICEや書面許可を取得する。
2. 105ファイルを対象に第三者引用・コード・画像・資料・フォントとライセンス条件を全件照合し、実配布manifestと`THIRD_PARTY_NOTICES.md`へ必要な表示を反映する。
3. 許諾のある版だけを固定commitとして配布し、実生成ArtifactでLICENSE/NOTICEの存在・固定SHA・配布先一致を検証する。認証済みモデルや本人環境による受入でこの権利判断を代替しない。

**現状の対応は調査結果の記録のみ。** 外部Skillリポジトリにライセンスを追加・変更せず、公開承認も行わず、既存44受入条件のチェック数は変更しない。
