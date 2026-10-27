# M10 CI統合提出

- 変更範囲・PR・対象spec:
- workflow差分 / permissions / Secret / deploy確認:
- ローカル結果とCI環境差:
- 対象PR HEADの完全SHA:
- Run / Check / Artifactの識別情報。PR head SHA、Run/Check SHA、Artifact target SHAの違い:
- `workspace/M10/ci-run-evidence.json`に記録したPR・Run参照:
- PASS / FAIL / 未実行と根拠:
- CI-only failure / spec failureの調査:
- 変更条件での停止・再実行・不要trigger停止の判断:
- AI提案の採否と未確認事項:

Run evidence JSONへToken、Secret、個人評価記録を書かない。Tokenはローカル環境変数`GH_TOKEN`または`GITHUB_TOKEN`から読ませる。
