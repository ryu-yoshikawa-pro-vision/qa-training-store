# G3/G4 Native Catalog・Route Authorization履歴

## 2026-08-22 15:54 JST

- Repository Audit Remediation PlanのG3/G4を実装した。
- Native CatalogはSession-awareな`ProductViewer`をUseCase、Gateway、Native Repository、SQLiteまで伝播し、既存`canViewerSeeProduct()`とpricing semanticsを再利用するよう更新した。
- Native Storefrontのfilter、facet、pagination、stable sort、Suggestionを既存Contractへ接続し、Native SearchからSuggestion serviceを利用できるようにした。
- Native ShellはGuestのCustomer-only direct routeをLogin boundaryへRedirectし、management roleの既存unsupported boundaryを維持した。
- Node SQLite、Repository contract、Native component、route boundaryのFocused Validationを実行した。物理Android deviceはADBが`unauthorized`のため、Native runtime Before/Afterは実行していない。
