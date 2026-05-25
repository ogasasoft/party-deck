# Party Deck MVP

スマホ1台を友達同士で回して遊ぶ、ログイン不要のブラウザ向けパーティゲーム集です。

公開URL: https://party-deck.vercel.app
GitHub: https://github.com/ogasasoft/party-deck

## 現在の状態

MVPとして、1台のスマホで3ゲームを最後まで触れ、道具なし飲み会ゲーム辞典も確認できる状態です。

- 日本マップGuessr
  - Mapillaryの東京周辺サンプル100件を `public/data/geo` に投入済み
  - 全員が同じ地点を順番に回答
  - No Move固定、デッキ選択なし
  - Mapillary画像とattributionを表示
- ナンバートーク
  - 数字は1から100固定
  - 手札は1人1枚
  - お題カテゴリは通常、変化球、恋愛
  - 会話、並び替え、結果まで実装済み
- ワンナイト人狼
  - 3から8人
  - 村人、人狼、占い師、怪盗
  - 夜行動、議論、秘密投票、勝敗判定まで実装済み
- 飲み会ゲーム辞典
  - 道具なしで遊べる飲み会ゲームを一覧検索
  - 国内外の定番、流行寄り、韓国系リズムゲームなどを収録
  - 国フィルタと `下ネタ` 特別フィルタを表示
  - AI/cronで後から追加しやすい重複判定キー、別名、参照元を保持
- 共通機能
  - プレイヤーはニックネームと担当色のみ
  - localStorageでプレイヤーとゲーム進行を保存
  - sessionId/gameIdでゲーム保存領域を分離
  - 受け渡し画面と秘密情報画面では広告枠を非表示

## 技術スタック

- Vite
- React
- TypeScript
- Leaflet
- localStorage
- Mapillary Graph API
- Vercel

## セットアップ

```sh
npm install
cp .env.example .env.local
```

`.env.local` に必要な値を入れます。実トークンはコミットしないでください。

```sh
MAPILLARY_ACCESS_TOKEN=
VITE_MAPILLARY_ACCESS_TOKEN=
```

用途:

- `MAPILLARY_ACCESS_TOKEN`: 収集スクリプト用
- `VITE_MAPILLARY_ACCESS_TOKEN`: ブラウザアプリでMapillary画像を取得するためのVite環境変数

## 開発コマンド

```sh
npm run dev
npm run smoke
npm run typecheck
npm run build
npm run preview
```

推奨確認順:

1. `npm run smoke`
2. `npm run typecheck`
3. `npm run build`
4. UI変更がある場合は `npm run dev` でスマホ幅を確認

## ディレクトリ

```txt
src/
  App.tsx                         # 画面進行の中心。今はMVP用に大きめ
  core/
    gameRegistry.ts               # ゲーム登録
    storage.ts                    # localStorage保存
    adPolicy.ts                   # 広告表示可否
    random.ts                     # seed/shuffle/sample
    distance.ts                   # Guessr採点用距離
    time.ts                       # タイマー補助
    types.ts                      # 共通型
  games/
    geoGuessr.ts                  # Guessr状態と採点
    geoLocationRepository.ts      # public/data/geoの読み込み
    mapillaryProvider.ts          # Mapillary API変換層
    numberTalk.ts                 # ナンバートーク状態と判定
    werewolf.ts                   # ワンナイト人狼状態と判定
    drinkingGames.ts              # 飲み会ゲーム辞典の検索状態
  data/
    geoLocations.ts               # fallback地点
    numberTopics.ts               # ナンバートークお題
    werewolfRoles.ts              # 役職定義
    drinkingGames.ts              # 道具なし飲み会ゲーム辞典データ
public/data/geo/
  playable-index.json             # 出題地点index
  chunks/*.json                   # Mapillary地点chunk
scripts/
  collect-mapillary-japan.ts      # 地点収集
  validate-geo-locations.ts       # 地点検証
  smoke-test.ts                   # ロジックsmoke
docs/
  user-stories.md                 # 仕様の元
  system-design-units.md          # unit設計
  implementation-spec.md          # 実装仕様
  drinking-games-database.md      # 飲み会ゲーム辞典の更新ルール
  task-list.md                    # 現在のタスク状態
  maintenance-guide.md            # 保守引き継ぎ
```

## 他のAI/開発者が最初に読むもの

AIエージェントで作業する場合は、まず [`AGENTS.md`](./AGENTS.md) を読んでください。

詳細な引き継ぎは [`docs/maintenance-guide.md`](./docs/maintenance-guide.md) にまとめています。

仕様の優先度:

1. [`docs/user-stories.md`](./docs/user-stories.md)
2. [`docs/system-design-units.md`](./docs/system-design-units.md)
3. [`docs/implementation-spec.md`](./docs/implementation-spec.md)
4. [`docs/task-list.md`](./docs/task-list.md)

## Mapillaryデータ収集

友人に遊んでもらえるMVPでは、東京周辺サンプルでゲーム全体を完成させる方針です。全国データ収集は後回しの拡張タスクです。

小範囲テスト収集:

```sh
npm run collect:mapillary:sample
```

通常収集:

```sh
MAPILLARY_ACCESS_TOKEN=... npm run collect:mapillary
```

地点データ検証:

```sh
npm run validate:geo
```

収集結果の投入先:

```txt
public/data/geo/
  playable-index.json
  chunks/*.json
```

生成途中の `data-generated/` はgit管理外です。公開アプリに反映したい地点データだけ `public/data/geo` に入れてコミットします。

## デプロイ

Vercelの `party-deck` プロジェクトにGitHub連携済みです。`main` へのpushで本番デプロイされます。

Vercel側には `VITE_MAPILLARY_ACCESS_TOKEN` を環境変数として登録済みです。値はリポジトリに含めません。

## 重要な保守ルール

- 個人情報、ログイン、位置情報権限を追加しない。
- 本家ゲームの文章、画像、音声、UI、お題をコピーしない。
- ゲーム固有ロジックを他ゲームへ依存させない。
- 新しいゲームは `GameDefinition` と `gameRegistry` 経由で追加する。
- 飲み会ゲーム辞典へ追加するルール文は独自に要約し、外部サイト本文をコピーしない。
- 下ネタ寄りの飲み会ゲームは直接的な名前や説明をUIに出さず、元ネタ名は内部別名で管理する。
- カードや物理アイテムが核の飲み会ゲームは、辞典追加ではなく将来のアプリ内ミニゲーム候補として扱う。
- 秘密情報、回答中、投票中、受け渡し中に広告を表示しない。
- Mapillary tokenや `.env.local` をコミットしない。
- 外部仕様が絡むMapillary、広告、法務は作業時点で最新情報を確認する。

## 直近の残タスク

詳しくは [`docs/task-list.md`](./docs/task-list.md) を参照してください。

- iPhone Safari / Android Chromeの実機QA
- 低速回線でのGuessr画像表示確認
- Guessr画像失敗時のリトライ/代替地点UX強化
- unit/integration test追加
- 広告ネットワーク選定とSDK接続
- 利用規約、プライバシーポリシー、Mapillary利用条件の確認
- 全国Mapillary地点データ拡張
