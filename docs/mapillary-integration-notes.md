# Mapillary連携メモ

## 確認日

2026-05-16

## 確認した仕様

- MapillaryJSの `ViewerOptions` は `accessToken` と `imageId` を受け取れる。
- MapillaryJSの `Viewer` は、初期画像IDを指定して表示するか、初期化後に `moveTo(imageId)` で移動できる。
- Graph APIの画像取得は `https://graph.mapillary.com/:image_id` で、画像メタデータとして `thumb_1024_url`、`thumb_2048_url`、`thumb_original_url`、`computed_geometry`、`geometry`、`computed_compass_angle` などを取得できる。

## MVPでの判断

日本マップ当てはNo Move固定なので、初期実装ではMapillaryJSの可動ビューアではなく、Graph APIで取得した `thumb_2048_url` を静止画像として表示する。

理由:

- 移動なしのゲーム性に合う。
- WebGLビューア導入より軽い。
- 読み込み失敗時のフォールバックを作りやすい。
- 回答前に前プレイヤーの操作状態が残るリスクを減らせる。

将来、周囲を見る、パンだけ許可する、画像間移動を許可するなどのルールを入れる場合はMapillaryJSへ切り替える。

## 実装方針

- `VITE_MAPILLARY_ACCESS_TOKEN` をブラウザ側で使う。
- `MapillaryProvider` がMapillary固有responseをアプリ内部型 `StreetImage` へ変換する。
- Guessr画面はMapillary responseの生構造を直接読まない。
- token未設定、画像未準備の地点、通信失敗、response不正の状態でもゲーム進行を止めない。
- 画像取得失敗時は再試行できる。まだ誰も回答していない場合のみ、同じラウンドの地点を代替地点へ切り替えられる。
- 1人でも回答済みの場合は、公平性を守るため地点を切り替えず再試行に限定する。
- 回答地図へ進むボタンは、Mapillary画像が表示できた後だけ有効になる。
- attributionとしてMapillaryへのリンクを表示する。

## 小範囲収集結果

2026-05-18に東京周辺の小範囲収集を実行した。

- preset: `tokyo-sample`
- collection: `lat/lng + radius` の近傍グリッド方式
- target: 100件
- playable: 100件
- validation: 100 valid / 0 rejected
- region: 関東 100件
- prefecture: 東京都 100件
- chunks: 31ファイル
- output: `data-generated/mapillary/tokyo-sample/public/data/geo`
- installed: `public/data/geo`

補足:

- `bbox` 検索はMapillary側から500が返るmeshがあった。
- `lat/lng + radius` 形式では200で画像候補を取得できた。
- `radius` は50以下が必要だった。
- ブラウザで実Mapillary画像とattributionリンクの表示を確認した。
- Vercel本番環境 `https://party-deck.vercel.app` でもMapillary画像表示を確認した。
- Vercel側には `VITE_MAPILLARY_ACCESS_TOKEN` を環境変数として登録済み。値はリポジトリに含めない。

## 画像表示監査

2026-06-04に `npm run audit:geo-images -- --limit 500 --concurrency 4` を実行した。

- checked: 100
- ready: 100
- failed: 0
- failureRate: 0
- output: `data-generated/mapillary/image-audit-report.json`

## 手動QAフラグ運用

問題画像を見つけたら、地点IDで `qaStatus` を更新する。

```sh
npm run geo:qa -- --id <location-id> --status rejected --dry-run
npm run geo:qa -- --id <location-id> --status rejected
npm run validate:geo
```

- `approved`: 手動確認済みで出題してよい。
- `unreviewed`: 未確認だがMVPでは出題してよい。
- `rejected`: 出題しない。
- `geo:qa` はchunkと `playable-index.json` を更新する。
- 複数IDは `--id id1,id2` または `--id id1 --id id2` で指定できる。

## 品質処理

初期の品質処理として以下を入れた。

- 簡易日本ポリゴンによる `point-in-polygon`
- 47都道府県bboxによる都道府県/地域タグ付け
- 同一sequenceの上限
- 近接地点の間引き
- `validate-geo-locations.ts` による検証report
- `stats.json` への件数、地域分布、chunkサイズ出力

主要地点のsmoke確認:

- 東京駅: 東京都 / 関東
- 札幌大通: 北海道 / 北海道
- 京都市中心部: 京都府 / 関西
- 博多駅: 福岡県 / 九州
- 那覇国際通り: 沖縄県 / 沖縄
- ソウル、台北: 日本外

現時点の制約:

- 日本ポリゴンは簡易形状なので、全国本番では行政界データへ差し替える余地がある。
- 都道府県タグはbbox判定なので、県境付近では誤分類の可能性がある。全国収集後の分布検証で補正する。

## 参照

- MapillaryJS ViewerOptions: https://mapillary.github.io/mapillary-js/api/interfaces/viewer.ViewerOptions/
- MapillaryJS Viewer: https://mapillary.github.io/mapillary-js/api/classes/viewer.Viewer/
- Mapillary Python SDK image fields: https://mapillary.github.io/mapillary-python-sdk/docs/mapillary.config.api/mapillary.config.api.entities/
- Mapillary API help: https://help.mapillary.com/hc/en-us/articles/360010234680-Accessing-imagery-and-data-through-the-Mapillary-API
