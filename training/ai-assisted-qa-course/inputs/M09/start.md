# M09 開始サンプル：CI workflowを読む

`training/ai-assisted-qa-course/templates/phase3/course-e2e.workflow.yml.disabled` は実行されない教材見本です。workflow、trigger、job、runner、step、Build、Test、Artifactの役割を読みます。

権限はcontents: readを基本にし、Secretもdeployも使わない案と比較します。対象SHA、Run、Check、Artifactが結び付いているか、失敗がどのstepで起きたかを説明します。
