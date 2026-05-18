# Party Deck MVP

スマホ1台を回して遊ぶパーティゲーム集のMVPです。

## 入っているもの

- 日本マップGuessr
  - Mapillary地点データの`index/chunk`読み込みに対応
  - 東京周辺サンプルの実データでプレイ可能
- ナンバートーク
  - 数字は1-100固定
  - 手札は1人1枚
- ワンナイト人狼
  - 村人、人狼、占い師、怪盗の基本セット
- プレイヤー設定
  - ニックネームと担当色のみ
  - 2-8人
- 広告枠
  - ホーム、設定、結果だけに表示

## 開発コマンド

```sh
npm run dev
npm run smoke
npm run typecheck
npm run build
```

## Mapillaryデータ収集

友人に遊んでもらえるMVPでは、まず小範囲サンプルでゲーム全体を完成させます。全国データ収集は後回しの拡張タスクです。

`.env.example`を参考に`MAPILLARY_ACCESS_TOKEN`を用意してから実行します。

```sh
MAPILLARY_ACCESS_TOKEN=... npm run collect:mapillary
```

小範囲テスト収集:

```sh
npm run collect:mapillary:sample
```

`collect:mapillary:sample` は東京周辺を100件前後だけ近傍グリッド方式で収集し、生成結果を `public/data/geo` に反映します。

出力先:

```txt
data-generated/mapillary/public/data/geo/
  playable-index.json
  chunks/*.json
```

小範囲テスト時の出力先:

```txt
data-generated/mapillary/tokyo-sample/public/data/geo/
```

アプリに投入するときは、上記の`data/geo`配下を`public/data/geo`へ配置します。

地点データ検証:

```sh
npm run validate:geo
```

## 次に実装する枠

- ワンナイト人狼の夜行動、投票、結果の仕上げ
- ナンバートークのお題追加と並び替え確認
- Guessr画像失敗時のリトライ/代替地点UX
- 実タイマー
- ゲーム追加用のGameRegistry分割
- 広告SDK接続
- 全国収集データの重複排除、品質フィルタ、QA
