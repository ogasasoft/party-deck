# Party Deck MVP

スマホ1台を友達同士で回して遊ぶ、ログイン不要のブラウザ向けパーティゲーム集です。

公開URL: https://party-deck.vercel.app
GitHub: https://github.com/ogasasoft/party-deck

## 現在の状態

MVPとして、1台のスマホで初期3ゲームと追加テーブルゲーム6本を最後まで触れ、道具なし飲み会ゲーム辞典も確認できる状態です。

- 日本マップ当て
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
- ワード潜入者
  - 3から8人
  - 多数派には秘密語、潜入者にはカテゴリだけを表示
  - ヒント順、議論、秘密投票、潜入者の最終推理、勝敗判定まで実装済み
  - お題はParty Deck用の独自データ
- インサイダー推理
  - 4から8人
  - 進行役、内通者、市民の役職を秘密配布
  - 答え確認、質問タイマー、内通者投票、勝敗判定まで実装済み
  - 答えデータはParty Deck用の独自データ
- スパイロケーション
  - 4から8人
  - スパイ以外には場所、スパイには場所不明を表示
  - 質問タイマー、告発投票、スパイの場所推理、勝敗判定まで実装済み
  - 場所データはParty Deck用の独自データ
- 価値観メーター
  - 2から8人
  - 親だけが0から100の正解位置を確認
  - ヒント入力、スライダー推測、複数ラウンド、採点まで実装済み
  - 尺度データはParty Deck用の独自データ
- ランキング回答
  - 4から8人
  - 1から10の秘密番号を1人1つ配布
  - 回答メモ、キャプテン並び替え、5ラウンド協力判定まで実装済み
  - お題データはParty Deck用の独自データ
- エセアーティスト
  - 5から8人
  - 本物にはお題、偽物にはカテゴリだけを表示
  - スマホ描画、2周の線描画、偽物投票、偽物の最終推理、勝敗判定まで実装済み
  - お題データはParty Deck用の独自データ
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
VITE_ADSENSE_CLIENT=
VITE_ADSENSE_SLOT=
```

用途:

- `MAPILLARY_ACCESS_TOKEN`: 収集スクリプト用
- `VITE_MAPILLARY_ACCESS_TOKEN`: ブラウザアプリでMapillary画像を取得するためのVite環境変数
- `VITE_ADSENSE_CLIENT`: AdSense client id。未設定ならプレースホルダー表示
- `VITE_ADSENSE_SLOT`: AdSense slot id。未設定ならプレースホルダー表示

## 開発コマンド

```sh
npm run dev
npm run smoke
npm run typecheck
npm run build
npm run preview
npm run test
npm run audit:geo-images
npm run audit:storage
npm run geo:qa -- --id <location-id> --status rejected --dry-run
```

推奨確認順:

1. `npm run smoke`
2. `npm run typecheck`
3. `npm run build`
4. UI変更がある場合は `npm run dev` でスマホ幅を確認

## ディレクトリ

```txt
src/
  App.tsx                         # 画面進行の中心。追加ゲーム画面はfeaturesへ分割済み
  features/
    AddedTableGames.tsx           # 追加テーブルゲーム6本の画面群。lazy load対象
  components/
    CountdownTimer.tsx            # 共通タイマー
    PartyScreens.tsx              # Topbar、受け渡し、結果アクション、広告枠などの共通UI
  core/
    gameRegistry.ts               # ゲーム登録
    storage.ts                    # localStorage保存
    adPolicy.ts                   # 広告表示可否
    random.ts                     # seed/shuffle/sample
    reloadSafety.ts               # 秘密情報phaseのリロード復帰保護
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
    wordInfiltrator.ts            # ワード潜入者状態と判定
    insiderGuess.ts               # インサイダー推理状態と判定
    spyLocation.ts                # スパイロケーション状態と判定
    spectrumMeter.ts              # 価値観メーター状態と判定
    rankingAnswers.ts             # ランキング回答状態と判定
    fakeArtist.ts                 # エセアーティスト状態と判定
  data/
    geoLocations.ts               # fallback地点
    numberTopics.ts               # ナンバートークお題
    werewolfRoles.ts              # 役職定義
    drinkingGames.ts              # 道具なし飲み会ゲーム辞典データ
    wordInfiltratorTopics.ts      # ワード潜入者のお題
    insiderAnswers.ts             # インサイダー推理の答え
    spyLocations.ts               # スパイロケーションの場所
    spectrumScales.ts             # 価値観メーターの尺度
    rankingAnswerPrompts.ts       # ランキング回答のお題
    fakeArtistTopics.ts           # エセアーティストのお題
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
  table-game-expansion-spec.md    # パスアンドプレイ向け追加テーブルゲーム仕様
  table-game-expansion-plan.md    # 追加テーブルゲームの実装計画
  table-game-expansion-task-list.md # 追加テーブルゲームの詳細タスク
  original-flow-alignment-plan.md # UI・本家フロー準拠改善計画
  frontend-flow-polish-plan.md    # 友人プレイテスト前のUI・ゲームフロー磨き計画
  legal-and-ads-plan.md           # 広告、規約、プライバシー、Mapillary条件整理
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
5. [`docs/original-flow-alignment-plan.md`](./docs/original-flow-alignment-plan.md)
6. [`docs/frontend-flow-polish-plan.md`](./docs/frontend-flow-polish-plan.md)

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
npm run audit:geo-images
```

`audit:geo-images` はMapillary画像URLを実際に取得し、表示に必要な画像URLと座標が返るかを確認します。結果は `data-generated/mapillary/image-audit-report.json` に出力されます。

問題画像の除外:

```sh
npm run geo:qa -- --id 1426328765487442 --status rejected --dry-run
npm run geo:qa -- --id 1426328765487442 --status rejected
npm run validate:geo
```

`geo:qa` は該当chunkの `qaStatus` を更新し、`public/data/geo/playable-index.json` を再構築します。`rejected` の地点は出題候補から外れます。

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
- 公開表示名は商標リスクを避けるため、公式名そのものよりParty Deck用の名称を優先する。
- 追加テーブルゲームは `docs/table-game-expansion-plan.md` と `docs/table-game-expansion-task-list.md` の順番に沿って実装する。
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
- 実機の低速回線でのGuessr画像ロード、リトライ、代替地点切替確認
- ブラウザ操作を含むintegration test追加
- AdSense本番有効化用のpublisher client id、slot id、必要地域の同意管理
- 追加テーブルゲーム6本のiPhone Safari / Android Chrome戻る操作QA
