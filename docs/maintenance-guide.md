# 保守引き継ぎガイド

## 目的

このドキュメントは、別のAIや開発者が `Party Deck MVP` を安全に保守、拡張するための引き継ぎ資料です。READMEより詳しく、実装上の注意点と変更手順をまとめます。

## 現在の実装状態

2026-05-18時点で、以下は完了しています。

- GitHub `ogasasoft/party-deck` に初期MVPをpush済み。
- Vercel `party-deck` で本番公開済み。
- `VITE_MAPILLARY_ACCESS_TOKEN` はVercel環境変数に登録済み。
- `https://party-deck.vercel.app` でトップ画面表示を確認済み。
- 本番で日本マップGuessrのMapillary画像表示を確認済み。
- 4人で3ゲームを最後まで進めるQAを実施済み。
- 飲み会ゲーム辞典を追加済み。道具なしゲームの検索、国フィルタ、ルール閲覧ができます。

未完了、または強化余地があるもの:

- 実機のiPhone Safari / Android Chrome QA。
- Guessr画像失敗時のリトライ、代替地点切替UX。
- unit / integration test環境。
- 広告SDK接続。
- 利用規約、プライバシーポリシー、Mapillary利用条件の最終確認。
- 全国Mapillary地点データの拡張。

## アーキテクチャの要点

このアプリはSPAです。サーバー認証、ユーザーDB、オンライン同期はありません。

状態の中心:

- プレイヤー設定: `party:v1:players`
- アプリ状態: `party:v1:app`
- ゲーム進行: `party:v1:sessions:{sessionId}:game:{gameId}`

ゲーム同士の干渉を避けるため、`sessionId` と `gameId` を保存keyに含めています。新しいゲームを追加するときも、この分離を崩さないでください。

## 主要ファイル

### `src/App.tsx`

MVPの画面進行の中心です。以下を持っています。

- home / players / setup / game の大きな画面切り替え
- プレイヤー設定
- 各ゲーム設定
- 各ゲーム画面
- localStorage復元と保存
- 秘密情報画面のリロード対策

今後の大きな改善点は、ここを共通画面とゲーム別画面に分割することです。ただし、分割時は既存の受け渡しとリロード保護を壊さないでください。

### `src/core/gameRegistry.ts`

ホームに表示するゲーム一覧と、ゲーム開始時のstate生成を登録しています。

新しいゲームを追加する場合は、ここを経由してください。

### `src/core/storage.ts`

localStorageの読み書きを集約しています。

注意:

- 破損JSONを読んでもアプリが落ちないようにする。
- 秘密情報画面へ直接復帰しない方針を保つ。
- 保存keyに `sessionId` と `gameId` を含める。

### `src/core/adPolicy.ts`

広告表示可否の判断を集約しています。広告SDKを入れる場合も、まずこのポリシーを通してください。

広告を出してよい画面:

- home
- playerSetup
- gameSetup
- result

広告を出さない画面:

- handoff
- secret
- answering
- voting

### `src/games/mapillaryProvider.ts`

Mapillary Graph APIのresponseをアプリ内部型 `StreetImage` に変換します。UI側がMapillary APIの生構造に依存しないための境界です。

維持すること:

- token未設定でもアプリが落ちない。
- network errorでもゲーム全体を止めない。
- Mapillary attributionを表示できる情報を返す。

### `public/data/geo`

本番出題に使う静的地点データです。

- `playable-index.json`: 出題候補の軽量index。
- `chunks/*.json`: 実地点データ。

`data-generated/` は収集結果の作業領域でgit管理外です。本番へ入れるデータだけ `public/data/geo` へコピーしてコミットします。

## ゲーム別メモ

### 日本マップGuessr

方針:

- 日本マップのみ。
- No Move固定。
- デッキ選択なし。
- 1ラウンドでは全員同じ地点。
- 回答中に前プレイヤーのピンを見せない。

重要ファイル:

- `src/games/geoGuessr.ts`
- `src/games/geoLocationRepository.ts`
- `src/games/mapillaryProvider.ts`
- `public/data/geo`

次に強化するなら:

- 画像取得失敗時の「同じラウンドで代替地点へ切替」。
- 低速回線向けの画像ロード表示。
- 地点QAフラグ `approved/rejected` の運用。

### ナンバートーク

方針:

- 数字は1から100固定。
- 手札は1人1枚。
- お題文はオリジナル。
- 並び順公開前に確認操作を挟む。

重要ファイル:

- `src/games/numberTalk.ts`
- `src/data/numberTopics.ts`

次に強化するなら:

- お題追加。
- カテゴリ別の品質確認。
- unit test追加。

### ワンナイト人狼

方針:

- 基本役職は村人、人狼、占い師、怪盗。
- 使用カードはプレイヤー数+2枚。
- 中央カードは2枚。
- 占い師、人狼、怪盗の順に夜行動。
- 怪盗交換後の最終役職で勝敗判定。

重要ファイル:

- `src/games/werewolf.ts`
- `src/data/werewolfRoles.ts`

次に強化するなら:

- 役職追加。
- 同票、処刑なし、平和村の細かいQA。
- unit test追加。

### 飲み会ゲーム辞典

方針:

- 道具なしで遊べる飲み会ゲームだけを扱う。
- UIに出すカテゴリは国だけ。
- ルール文は独自に短く要約し、外部サイト本文をコピーしない。
- AI/cron更新で同じ遊びを重複追加しないよう、`aliases`、`duplicateKey`、`aiReviewHint`、`sourceRefs` を持つ。

重要ファイル:

- `src/data/drinkingGames.ts`
- `src/games/drinkingGames.ts`
- `docs/drinking-games-database.md`

次に強化するなら:

- cronで海外/国内の新候補を調査する。
- 候補を既存データと照合し、新規だけPR化する。
- 国が曖昧なゲームの扱いを `国際` または未設定へ整理する。

## Mapillary地点データ作業

### 小範囲サンプル収集

```sh
npm run collect:mapillary:sample
```

このコマンドは東京周辺のサンプルを収集し、`public/data/geo` へ反映します。

### 通常収集

```sh
MAPILLARY_ACCESS_TOKEN=... npm run collect:mapillary
```

全国収集を始める前に、必ず `docs/later-checklist.md` の「Mapillary全国データ」を確認してください。

### 検証

```sh
npm run validate:geo
```

検証後に確認すること:

- valid / rejected 件数。
- chunk数とサイズ。
- 都道府県、地域分布。
- sequence偏り。
- 画像表示失敗率。

## 変更時の基本手順

1. `git status --short --branch` で作業前状態を確認する。
2. `docs/task-list.md` で関連タスクを確認する。
3. 仕様が曖昧なら `docs/user-stories.md` と `docs/implementation-spec.md` を先に更新する。
4. 実装する。
5. `npm run smoke`、`npm run typecheck`、`npm run build` を通す。
6. UI変更がある場合はブラウザでスマホ幅を確認する。
7. 関連docsを更新する。
8. `git diff` で秘密情報や不要ファイルが入っていないか確認する。

## よくある変更

### お題を追加する

対象:

- `src/data/numberTopics.ts`

確認:

- 本家や既存アプリの文言をコピーしていない。
- カテゴリが適切。
- `npm run smoke` が通る。

### 役職を追加する

対象:

- `src/data/werewolfRoles.ts`
- `src/games/werewolf.ts`
- 必要なら `src/App.tsx`

確認:

- 夜行動順。
- 受け渡し。
- 秘密情報の表示範囲。
- 勝敗判定。

### ゲームを追加する

対象:

- `src/core/types.ts`
- `src/core/gameRegistry.ts`
- `src/games/<new-game>.ts`
- `src/App.tsx`

確認:

- 既存ゲームのstateをimportしていない。
- 保存keyが混ざらない。
- 受け渡し画面がある。
- 秘密情報や回答中に広告が出ない。

### 飲み会ゲーム辞典へ追加する

対象:

- `src/data/drinkingGames.ts`
- `docs/drinking-games-database.md`

確認:

- 道具なしで成立する。
- 既存の `duplicateKey` や `aliases` と重複していない。
- 国カテゴリだけを表示できる。
- ルール文が外部サイトのコピーではない。
- `sourceRefs` と `reviewedAt` が更新されている。

### 広告SDKを接続する

対象:

- `src/core/adPolicy.ts`
- `src/App.tsx` の `AdSlot`
- 必要なSDK初期化ファイル

確認:

- 広告読み込み失敗でゲーム進行が止まらない。
- 秘密情報、回答中、投票中、受け渡しに広告が出ない。
- プライバシーポリシーや同意表示が必要か確認する。

## QAチェック

最低限の自動確認:

```sh
npm run smoke
npm run typecheck
npm run build
```

手動確認:

- トップに3ゲームが表示される。
- プレイヤーを2から8人で変更できる。
- ナンバートークを結果まで進められる。
- ワンナイト人狼を結果まで進められる。
- 日本マップGuessrを結果まで進められる。
- 飲み会ゲーム辞典で検索と国フィルタが動く。
- GuessrでMapillary画像とattributionが表示される。
- 秘密情報画面でリロードしても直接秘密情報が表示されない。
- ゲーム一覧へ戻って別ゲームを始めても状態が混ざらない。

## リリースとデプロイ

GitHub連携済みのため、`main` へpushするとVercelで本番デプロイされます。

デプロイ後の確認:

- `https://party-deck.vercel.app` が表示される。
- コンソールエラーがない。
- GuessrでMapillary画像が表示される。
- Vercel環境変数 `VITE_MAPILLARY_ACCESS_TOKEN` が消えていない。

## 注意する秘密情報

絶対にコミットしないもの:

- `.env`
- `.env.local`
- Mapillary access token
- Vercel token
- SSH秘密鍵

`.gitignore` では `node_modules/`、`dist/`、`data-generated/`、`.env`、`.env.local` を除外しています。
