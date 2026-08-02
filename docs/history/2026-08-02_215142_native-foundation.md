# Native Foundation 実装・検証方針の更新

日付: 2026-08-02（JST）

## 変更

- Phase 2前半のNative/Web分離、Native Customer SQLite、Guest Storefront／Cart、PBKDF2 adapter、Native KV、Asset Map、Test Control、Jest境界を追加した。
- ApplicationからDexie／Infrastructure具象への直接依存を除去し、Web Dexie Composition RootとNative Customer Composition Rootを分離した。
- Route InventoryとPlatform／SQLiteのADRを追加した。
- EASはユーザー方針により本Runの実装・検証対象から除外し、ローカルAndroid／iOS経路だけを残した。

## 未確認

- 現在のWindows環境にはAndroid SDK／`adb`／Emulator／iOSの`xcrun`／Simulatorがないため、実Native Build、Install、起動、SQLite Smoke、Guest操作は未実施である。
- Web export、Node tests、Native Jestは通過しているが、Native moduleの実装差を証明するものではない。
