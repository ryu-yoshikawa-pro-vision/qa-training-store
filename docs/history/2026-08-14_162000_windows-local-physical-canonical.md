# Windows Local Android Physical Device Canonical分離（2026-08-14）

PR #25の方針変更により、Windows Local Fresh Learner / Part 1 NativeのAndroid Canonical経路を、Android Emulator / AVDからUSB接続されたPhysical Android Deviceへ変更した。

- Localは明示serial、ADB status `device`、USB debugging / authorization、起動済み・画面ロック解除済みを前提とする。
- `scripts/native/windows/android-local.ps1`は`-RequirePhysicalDevice`指定時に、Emulator serialだけでなく`ro.kernel.qemu` / `ro.boot.qemu`、Repositoryの`minSdkVersion`、ABI、package service、awake、unlockedを有限チェックする。
- Device ABIのAuto検出、Release APKのBuild / integrity、Install、Smoke、Test Control、Training Maestro baseline、Evidenceを同じserialへ接続する。
- Windows Local専用で未検証だった`scripts/training/android-emulator.ps1`はCanonical経路から除去した。
- GitHub Native CIのAPI 34 / `google_apis` / `x86_64` Emulator、Formal Maestro、Training Maestro baselineは維持する。iOSのBuild-only保証も変更しない。
- 旧Canonical AVDのSystem UI ANRと旧契約下のPhysical Device補助実行はRun Artifactの履歴として保持し、新契約後のPhysical Device実行と混同しない。
