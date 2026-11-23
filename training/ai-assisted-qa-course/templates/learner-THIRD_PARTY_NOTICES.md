# 第三者ライセンス・著作権表示

この配布物の `LICENSE` は、本人が権利を持つプロジェクト独自の教材・コード・Skillに適用するMIT Licenseです。ユーザー本人が作成した固定 `qa-workflow-skills` の13 Skill（commit `7cc6cba7772de549841a39d71694cbafbc783324`）も本人の著作物としてこのMIT Licenseの対象とし、本人は学習者Templateへの配布を承認しています。第三者の著作物や依存パッケージのライセンスをMITへ変更するものではありません。その他の素材については、配布元のGitHub所有者名だけで個々の著作権者を判断しません。

## Codexによる生成画像の出典

次の商品画像9件は、ユーザー本人の指示に基づきCodexを使用して生成したものです。この生成経緯を出典情報として記録し、外部画像サイトから取得した素材として扱いません。

- `public/images/products/basic-shirt-front.a1b2c3.webp`
- `public/images/products/basic-shirt-back.d4e5f6.webp`
- `public/images/products/color-pouch.webp`
- `public/images/products/compact-towel.webp`
- `public/images/products/mug.11aa22.webp`
- `public/images/products/premium-bag.webp`
- `public/images/products/retired.55cc66.webp`
- `public/images/products/running-shoes.33bb44.webp`
- `public/images/products/training-wear.webp`

第三者の既存作品を具体的に使用・複製した証拠が確認された場合に限り、その画像に対象を絞って出典と根拠を記録します。抽象的な可能性だけで同じ出典確認を繰り返しません。この扱いは、次節に記載するExpo Router／React Navigation等が配布する既存画像や、外部ライブラリのコード・素材には適用しません。

## 配布済みWebフォント

Web Buildの `course/shop/_expo/static/css/files/` に含まれる以下のファイルは、MITではなくSIL Open Font License 1.1（OFL-1.1）です。全文は同じTemplate内の `learner-OFL-1.1.txt` を参照してください。各フォント内部の著作権メタデータとReserved Font Nameも維持します。

| フォント | 対象ファイル | 著作権表示（配布ファイル内のメタデータ） | ライセンス |
| --- | --- | --- | --- |
| Inter | `inter-latin-{400,600,700}-normal.woff{,2}` | Copyright 2016 The Inter Project Authors (`https://github.com/rsms/inter`) | OFL-1.1 |
| Noto Sans JPとして配布されるファイル | `noto-sans-jp-japanese-{400,600,700}-normal.woff{,2}` | (c) 2014-2021 Adobe (`http://www.adobe.com/`), with Reserved Font Name 'Source'. | OFL-1.1 |

配布元パッケージ：`@fontsource/inter@5.3.0`、`@fontsource/noto-sans-jp@5.3.0`。OFL公式サイト：[OFL公式](https://openfontlicense.org/) 。

## Expo RouterとReact Navigationの配布画像

`course/shop/assets/expo-router/**` に含まれるPNG12件は、Expo Routerおよび同製品が含むReact Navigation Elementsの配布画像です。生成時は内容hash付きの名前に変わります。Expo Routerは`expo-router@57.0.31`で、root `pnpm-lock.yaml`のtarball integrityは`sha512-a1JskzAVbIFi9POmayde7U7TkvQHiK5NR2vqTeu4PbU+6oNg9dnsBRmP1kNimDjJJCj6VrGlKPhXASICeFOyYA==`です。固定ソース[Expo commit `76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6`](https://github.com/expo/expo/tree/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/packages/expo-router)のpackage metadataはversion `57.0.31`・MITで、同じcommitのExpo root [LICENSE](https://github.com/expo/expo/blob/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/LICENSE)が該当します。

| 配布元 | 対象画像 | 固定した元ソース | 著作権表示 | ライセンス |
| --- | --- | --- | --- | --- |
| Expo Router 57.0.31 | `assets/expo-router/`直下のPNG7種 | [Expo commit `76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6`](https://github.com/expo/expo/tree/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/packages/expo-router) | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) | [MIT](https://github.com/expo/expo/blob/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/LICENSE) |
| React Navigation Elements 2.9.10（Expo Routerへ同梱） | 下表のPNG5件 | [React Navigation commit `69573410534dc9a467ace6e749e82d32058b3092`](https://github.com/react-navigation/react-navigation/tree/69573410534dc9a467ace6e749e82d32058b3092/packages/elements) | Copyright (c) 2017 React Navigation Contributors | [MIT](https://github.com/react-navigation/react-navigation/blob/69573410534dc9a467ace6e749e82d32058b3092/packages/elements/LICENSE) |

React Navigationの5画像は、固定されたExpo Routerソースが参照するPNGと、固定版`@react-navigation/elements@2.9.10`のPNGをGit blob SHA-1で照合し、全件一致しました。Expo Routerがこれらを同梱しているため、このプロジェクトの依存lockfileに`@react-navigation/elements`の独立した直接依存はありません。

| 画像 | React Navigation 2.9.10とExpo Router 57.0.31で一致したGit blob SHA-1 |
| --- | --- |
| `back-icon-mask.png` | `7c1fd8493d91711b33e87bd36d6e9ae4363ed656` |
| `back-icon.png` | `17e52e8550e5668f7117bcb755beb70c3a21c9e9` |
| `clear-icon.png` | `d9af7b68070ef97abf8b805a32b99bdb7e2c340d` |
| `close-icon.png` | `34396d478f85572dd50c67a708cd3a752d785005` |
| `search-icon.png` | `87a30caff95ccb0bc812f8ee77abbe8a7a8f0ac6` |

生成Web Buildの`assets/expo-router/LICENSE`も、同じ固定ソースと著作権表示を含むMIT全文を出力します。生成処理はlockfileで固定した`expo-router@57.0.31`以外を検出した場合に停止します。MIT全文は学習者用`LICENSE`にも含まれます。

この照合は対象PNG5件の出典・ライセンスを特定するものです。生成Web JavaScript依存物全体の権利確認や、教材内の仕様画面素材の利用権限を証明しません。

<!-- BEGIN PUBLIC WEB THIRD-PARTY NOTICES -->
# Web Build third-party notices

This notice covers third-party code present in the generated Web JavaScript bundle and the bundled Web fonts. Exact package versions and registry tarball integrity values are pinned in the repository root `pnpm-lock.yaml`; JavaScript package rows below were selected from the bundle's source map. Available package LICENSE/NOTICE files were read from the corresponding frozen installed packages. Packages without those files are called out with their source or package metadata evidence. The own-project `learner-LICENSE` does not replace these notices.

## Web fonts

The Web build includes the following 12 font files from `@fontsource/inter@5.3.0` and `@fontsource/noto-sans-jp@5.3.0`. The build copies the complete OFL-1.1 text from `learner-OFL-1.1.txt` to the distribution root as `OFL-1.1.txt`.

| Font | Distributed files | Copyright notice in font metadata | License |
| --- | --- | --- | --- |
| Inter | `_expo/static/css/files/inter-latin-{400,600,700}-normal.woff{,2}` | Copyright 2016 The Inter Project Authors | OFL-1.1 |
| Noto Sans JP | `_expo/static/css/files/noto-sans-jp-japanese-{400,600,700}-normal.woff{,2}` | (c) 2014-2021 Adobe, with Reserved Font Name 'Source' | OFL-1.1 |

## Bundled package inventory

| Package and version | SPDX license | Copyright notice recorded by the package |
| --- | --- | --- |
| `@babel/runtime@7.29.7` | MIT | Copyright (c) 2014-present Sebastian McKenzie and other contributors |
| `@expo/cli@57.0.34` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `@expo/metro-runtime@57.0.18` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `@hookform/resolvers@5.5.7` | MIT | Copyright (c) 2019-present Beier(Bill) Luo |
| `@internationalized/date@3.12.2` | Apache-2.0 | Copyright 2020 Adobe. All rights reserved. |
| `@internationalized/number@3.6.7` | Apache-2.0 | Copyright 2020 Adobe. All rights reserved. |
| `@internationalized/string@3.2.9` | Apache-2.0 | Copyright 2022 Adobe. All rights reserved. |
| `@radix-ui/react-compose-refs@1.1.5` | MIT | Copyright (c) 2022 WorkOS |
| `@radix-ui/react-slot@1.3.3` | MIT | Copyright (c) 2022 WorkOS |
| `@react-native/js-polyfills@0.86.3` | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `@react-native/normalize-colors@0.74.89` | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `@swc/helpers@0.5.23` | Apache-2.0 | Copyright 2024 SWC contributors. |
| `client-only@0.0.1` | MIT | No package code bytes are included in the browser bundle (empty index.js); error.js is not mapped |
| `clsx@2.1.1` | MIT | Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com) |
| `color@4.2.3` | MIT | Copyright (c) 2012 Heather Arthur |
| `color-convert@2.0.1` | MIT | Copyright (c) 2011-2016 Heather Arthur <fayearthur@gmail.com> |
| `color-name@1.1.4` | MIT | Copyright (c) 2015 Dmitry Ivanov |
| `color-string@1.9.1` | MIT | Copyright (c) 2011 Heather Arthur <fayearthur@gmail.com> |
| `css-in-js-utils@3.1.0` | MIT | Copyright (c) 2017 Robin Frischmann |
| `decode-uri-component@0.2.2` | MIT | Copyright (c) 2017, Sam Verschueren <sam.verschueren@gmail.com> (github.com/SamVerschueren) |
| `dexie@4.4.4` | Apache-2.0 | Copyright (c) 2014-2017 David Fahlander |
| `escape-string-regexp@4.0.0` | MIT | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> ([sindresorhus.com](https://sindresorhus.com)) |
| `expo@57.0.33` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `expo-constants@57.0.24` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `expo-glass-effect@57.0.5` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `expo-linking@57.0.14` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `expo-modules-core@57.0.26` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `expo-router@57.0.31` | MIT | Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) |
| `fast-deep-equal@3.1.3` | MIT | Copyright (c) 2017 Evgeny Poberezkin |
| `fbjs@3.0.5` | MIT | Copyright (c) 2013-present, Facebook, Inc. |
| `filter-obj@1.1.0` | MIT | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com) |
| `hyphenate-style-name@1.1.0` | BSD-3-Clause | Copyright (c) 2015, Espen Hovlandsdal |
| `inline-style-prefixer@7.0.1` | MIT | Copyright (c) 2015 Robin Frischmann |
| `invariant@2.2.4` | MIT | Copyright (c) 2013-present, Facebook, Inc. |
| `is-arrayish@0.3.4` | MIT | Copyright (c) 2015 JD Ballard |
| `memoize-one@6.0.0` | MIT | Copyright (c) 2019 Alexander Reardon |
| `nanoid@3.3.18` | MIT | Copyright 2017 Andrey Sitnik <andrey@sitnik.ru> |
| `nullthrows@1.1.1` | MIT | Copyright (c) 2016 Andres Suarez |
| `postcss-value-parser@4.2.0` | MIT | Copyright (c) Bogdan Chadkin <trysound@yandex.ru> |
| `query-string@7.1.3` | MIT | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> ([sindresorhus.com](http://sindresorhus.com)) |
| `react@19.2.3` | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `react-aria@3.50.0` | Apache-2.0 | Copyright 2020–2025 Adobe. All rights reserved. |
| `react-aria-components@1.19.0` | Apache-2.0 | Copyright 2022–2025 Adobe. All rights reserved. |
| `react-dom@19.2.3` | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `react-fast-compare@3.2.2` | MIT | Copyright (c) 2018 Formidable Labs<br>Copyright (c) 2017 Evgeny Poberezkin |
| `react-hook-form@7.83.0` | MIT | Copyright (c) 2019-present Beier(Bill) Luo |
| `react-is@19.3.0` | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `react-native-safe-area-context@5.7.0` | MIT | Copyright (c) 2019 Th3rd Wave |
| `react-native-screens@4.26.0` | MIT | Copyright (c) 2018 Software Mansion <swmansion.com> |
| `react-native-web@0.21.2` | MIT | Copyright (c) Nicolas Gallagher.<br>Copyright (c) Meta Platforms, Inc. and affiliates. |
| `react-stately@3.48.0` | Apache-2.0 | Copyright 2020, 2022–2024, 2026 Adobe. All rights reserved. |
| `scheduler@0.27.0` | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `shallowequal@1.1.0` | MIT | Copyright (c) 2017 Alberto Leal <mailforalberto@gmail.com> (github.com/dashed) |
| `simple-swizzle@0.2.4` | MIT | Copyright (c) 2015 Josh Junon |
| `split-on-first@1.1.0` | MIT | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com) |
| `standard-navigation@0.0.5` | MIT | **Copyright notice unresolved.** The locked package metadata lists author Satyajit Sahoo but has no copyright line or LICENSE file; its bundled `lib/src/index.js` is 186 bytes. The fixed source repository tree contains no LICENSE file. The author's name is not treated as proof of copyright ownership. Do not externally distribute this Web Build until an applicable copyright notice is confirmed or this code is absent from the bundle. |
| `strict-uri-encode@2.0.0` | MIT | Copyright (c) Kevin Martensson <kevinmartensson@gmail.com> (github.com/kevva) |
| `styleq@0.1.3` | MIT | Copyright (c) Nicolas Gallagher |
| `use-sync-external-store@1.6.0` | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `warn-once@0.1.1` | MIT | Copyright (c) 2022 Satyajit Sahoo |
| `zod@4.6.6` | MIT | Copyright (c) 2025 Colin McDonnell |

`client-only@0.0.1` appears in the source map only as a zero-byte `index.js`; `error.js` and package source bytes are absent from the browser bundle. Its package metadata has no author, repository, or copyright notice.

Copyright notices above were obtained from bundled package source files or a package's own LICENSE/NOTICE files. For `@react-native/js-polyfills@0.86.3`, the source/license evidence is pinned to [React Native commit `4829a675c80e64f7c170b0f30d24b3808b7663d3`](https://github.com/react/react-native/tree/4829a675c80e64f7c170b0f30d24b3808b7663d3/packages/polyfills). For `@react-native/normalize-colors@0.74.89`, it is pinned to [React Native commit `a2066d730d933126bbf7055f4e47c575936e62f3`](https://github.com/react/react-native/tree/a2066d730d933126bbf7055f4e47c575936e62f3/packages/normalize-color). For `expo-router@57.0.31`, it is pinned to [Expo commit `76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6`](https://github.com/expo/expo/tree/76abe9f526cfd8f035d26f9b46ef2c6586b0c1f6/packages/expo-router). A package's registry metadata declaring an SPDX identifier does not identify its copyright holder.

`standard-navigation@0.0.5` remains the one concrete unresolved attribution in the current JavaScript bundle inventory. Its fixed upstream source tree is [commit `0016fae7800b9f27bab91326697b740a6d2266dc`](https://github.com/react-navigation/standard-navigation/tree/0016fae7800b9f27bab91326697b740a6d2266dc). The package metadata declares MIT, but the included source has no associated copyright notice or license file. External distribution remains blocked until a first-party copyright notice is established or this code is absent from the bundle.

## MIT License text

The copyright line for `@babel/runtime@7.29.7` is retained in this copied license text. Copyright lines for the other MIT packages are listed in the inventory table above.

`@babel/runtime@7.29.7/LICENSE`:

```text
MIT License

Copyright (c) 2014-present Sebastian McKenzie and other contributors

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Apache License, Version 2.0

The applicable package-specific copyright lines are listed in the inventory table. This full text is copied from `@internationalized/date@3.12.2/LICENSE`.

```text
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2019 Adobe

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

Dexie also ships this package-specific NOTICE, retained verbatim:

```text
Dexie.js

Copyright (c) 2014-2017 David Fahlander

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## BSD 3-Clause License

This full text is copied from `hyphenate-style-name@1.1.0/LICENSE`.

```text
BSD 3-Clause License

Copyright (c) 2015, Espen Hovlandsdal
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
<!-- END PUBLIC WEB THIRD-PARTY NOTICES -->

## Web JavaScriptの過去ライセンス監査記録

Web CI Run [41297580957](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/41297580957)（対象HEAD `708c7be0d6cb3a97050593f48939e073ef484bca`）の生成JavaScript `course/shop/_expo/static/js/web/entry-*.js`には、次の著作権・MITライセンス表示が含まれています。実際のファイル名にはBuildごとに変わるハッシュが付くため、この通知では固定しません。原文の表示を保持し、独自著作物のMITに帰属させません。

| 対象 | 著作権表示 | ライセンス |
| --- | --- | --- |
| React / react-dom / react-is / scheduler / use-sync-external-store-shim等 | Copyright (c) Meta Platforms, Inc. and affiliates. | MIT |
| bezier-easing | Copyright 2014-2015 Gaëtan Renaudeau | MIT |

MITの全文はこの配布物の`LICENSE`にも含まれますが、元の著作権者は上記のとおり別です。Webアプリの生成JSに含まれる依存物のライセンス・通知の**全件検査はまだ未完了**です。

### 2026-11-23 現行HEAD候補の確認

候補HEAD `24944a73f769d32f38061a26fce5911e2cbb8bc5`について、root `package.json`／`pnpm-lock.yaml`は同一で、`expo-router@57.0.31`を固定しています。一方、現在のcheckoutには`course/shop/**`配布物がなく、ignored `dist/`内の既存Bundleは候補HEADから生成したことを確認できず、source mapもありません。

lockfileどおりの隔離Buildを試すため、このHEADのGit archiveに対して`pnpm install --offline --frozen-lockfile --ignore-scripts`を実行しましたが、pnpm storeに`@expo/metro-runtime@57.0.18`のtarballがなく、`ERR_PNPM_NO_OFFLINE_TARBALL`で停止しました。旧remote HEAD `00670f8ca016845e288f019ae5ad160ca1eca051`のWeb CI Artifact（run `45071575804`、artifact `14773985467`）はGitHubのdownload APIから一時file URIを取得できましたが、このcheckoutで内容を読み出せる経路がなく、signed URLをshellから取得する試みもhostのDNS解決に失敗しました。このartifactは候補HEAD `24944a73f769d32f38061a26fce5911e2cbb8bc5`とは異なり、候補由来のsource mapもありません。したがって、履歴Runで確認済みのReact関連・`bezier-easing`等の表示を最新Bundleの全依存へ流用せず、最新のBundleに含まれる全packageとNOTICEの一致は未確認として残します。

B案1.4は、React Navigation PNG5件の固定出典・MIT・著作権表示を確認済みですが、現行Web Bundleの実体とsource mapから全依存ライセンスを照合できていないため、**全体として未受入（BLOCKED）**です。再開条件は最終HEADのWeb production Bundleとsource map（または同じ依存閉包を確定できるBuild証拠）を取得し、含有packageごとに固定version・ライセンス・NOTICEを照合することです。未確認の依存をMITと推定せず、未受入状態を維持します。

## その他の配布物

- `.agents/skills/**` は[qa-workflow-skills](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills)の[固定commit `7cc6cba7772de549841a39d71694cbafbc783324`](https://github.com/ryu-yoshikawa-pro-vision/qa-workflow-skills/tree/7cc6cba7772de549841a39d71694cbafbc783324)から取得する本人作成の13 Skillです。本人の決定により既存MIT Licenseの対象として学習者Templateへ配布します。第三者由来と確認できる個別ファイルがあれば、そのファイルの元ライセンス・表示を分けて扱います。
- `course/shop/**` のJS/CSS/画像、依存ライブラリ、その他の第三者素材にはそれぞれの元ライセンスが適用されます。依存物と素材の全件確認は公開前監査の受入条件であり、この文書だけで全件の権利確認が完了したことにはなりません。

公開・再配布前に、実際に生成した `course/shop/**` と配布manifestを照合し、含まれる第三者ファイルの表示とライセンスを確認してください。
