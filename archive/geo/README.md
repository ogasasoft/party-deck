# 日本マップ当て（アーカイブ）

日本マップ当ては2026-07-23に本番サービスから完全に外した。ゲームカード、画面遷移、Leaflet CSS、Mapillary通信、公開地点データは本番ビルドに含めない。

## 保持している資産

- ゲーム状態・採点: `src/games/geoGuessr.ts`, `src/core/distance.ts`
- 地点読み込み・画像変換: `src/games/geoLocationRepository.ts`, `src/games/mapillaryProvider.ts`
- fallback地点: `src/data/geoLocations.ts`
- 地点データ: `archive/geo/data/`
- 収集・検証・QAスクリプト: `scripts/collect-mapillary-japan.ts`, `scripts/geo-quality.ts`, `scripts/validate-geo-locations.ts`, `scripts/audit-geo-images.ts`, `scripts/update-geo-qa.ts`
- ロジックテスト: `src/__tests__/game-core.test.ts` と `scripts/smoke-test.ts` のGeoセクション
- 画面実装: アーカイブ直前のGit履歴にある `src/App.tsx`
- 画面スタイル: アーカイブ直前のGit履歴にある `src/styles.css` のLeaflet、地図、street image関連ルール

Geoモジュールは本番のimport graphから切り離しているため、ソースとテストを保ったまま配信コードには混入しない。

## メンテナンス

地点データ用コマンドは既定で `archive/geo/data` を参照する。

```sh
npm run validate:geo
npm run audit:geo-images
npm run geo:qa -- --id <location-id> --status rejected --dry-run
```

`npm run collect:mapillary:sample` も生成結果を公開ディレクトリではなく `archive/geo/data` へ入れる。

## 復活手順

1. 復活時点のMapillary、OpenStreetMap、プライバシー、attribution条件を再確認する。
2. `archive/geo/data` を `public/data/geo` へコピーする。
3. `GameId` と `gameRegistry` に `geo` を再登録する。
4. アーカイブ直前のGit履歴から `App.tsx` のGeo setup、進行画面、保存復帰処理と `main.tsx` のLeaflet CSS importを戻す。
5. `VITE_MAPILLARY_ACCESS_TOKEN` を設定し、Geo固有テスト、全体テスト、ビルド、本番監査、スマホ実機QAを行う。

復活作業が完了するまで `public/data/geo` を作らない。Viteは `public` 配下をそのまま配信するため、データだけ先に戻すと非公開のつもりでもURLから取得できる。
