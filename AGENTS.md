# AI開発エージェント向けガイド

このリポジトリは、スマホ1台を回して遊ぶパーティゲーム集 `Party Deck MVP` です。別のAIや開発者が途中参加しても壊しにくいように、作業前にこのファイルを読んでください。

## 最初に把握すること

- 公開URL: https://party-deck.vercel.app
- GitHub: https://github.com/ogasasoft/party-deck
- 本番ホスティング: Vercel `party-deck`
- 現在のブランチ運用: `main` へpushするとVercel本番デプロイ
- 秘密情報: `.env.local` とVercel環境変数にMapillary tokenがある。値を表示、ログ出力、コミットしない。

## プロダクト方針

- ログイン、アカウント、メール、電話番号、SNS連携、端末位置情報は使わない。
- プレイヤー情報はニックネームと担当色のみ。
- 1台のスマホを順番に受け渡して遊ぶ。
- 最大8人。
- 初期ゲームは日本マップ当て、ナンバートーク、ワンナイト人狼、飲み会ゲーム辞典、ワード潜入者、インサイダー推理、スパイロケーション、価値観メーター、ランキング回答、エセアーティスト。
- 収益化は広告想定だが、秘密情報や回答操作を邪魔しないことを優先する。
- 本家系ゲームの進行、役職構成、勝敗条件、採点方法はできるだけ準拠して再現する。文章、画像、音声、UIデザイン、お題リスト、カード文面は許諾やライセンス確認なしに転載しない。

## 重要ドキュメント

- `README.md`: 人間向けの入口、セットアップ、現状。
- `docs/maintenance-guide.md`: 保守引き継ぎ、変更手順、QA。
- `docs/task-list.md`: 現在のタスク状態。実装後は必要に応じて更新する。
- `docs/device-qa-checklist.md`: iPhone Safari / Android Chrome / 低速回線 / AdSense有効化後の実機QA手順。
- `docs/user-stories.md`: 仕様判断の最上位。
- `docs/system-design-units.md`: unit境界と依存ルール。
- `docs/implementation-spec.md`: 実装仕様。
- `docs/drinking-games-database.md`: 飲み会ゲーム辞典の追加、重複判定、AI更新ルール。
- `docs/table-game-expansion-spec.md`: 追加テーブルゲームの原典調査と実装たたき台。
- `docs/table-game-expansion-plan.md`: 追加テーブルゲームの実装順、共通方針、完了条件。
- `docs/table-game-expansion-task-list.md`: 追加テーブルゲームの詳細作業チェックリスト。
- `docs/original-flow-alignment-plan.md`: UI・本家フロー準拠改善計画。秘密漏れ、答え漏れ、参考元フロー差分を直すときに読む。
- `docs/frontend-flow-polish-plan.md`: 友人プレイテスト前のUI・ゲームフロー磨き計画。実機QA、画面状態、共通UI整理の次順を読む。
- `docs/legal-and-ads-plan.md`: 広告ネットワーク、AdSense有効化条件、プライバシーポリシー、利用規約、Mapillary利用条件。
- `docs/mapillary-integration-notes.md`: Mapillary連携方針と収集結果。
- `docs/later-checklist.md`: 後回しタスク、全国データ拡張時の確認項目。

## よく使うコマンド

```sh
npm install
npm run dev
npm run smoke
npm run test
npm run typecheck
npm run build
npm run validate:geo
npm run audit:geo-images
npm run audit:production
npm run audit:storage
npm run geo:qa -- --id <location-id> --status rejected --dry-run
```

変更後の基本確認:

1. ロジック変更: `npm run smoke`
2. unit対象の変更: `npm run test`
3. TypeScript変更: `npm run typecheck`
4. 配布前: `npm run build`
5. UI変更: `npm run dev` でスマホ幅をブラウザ確認

## 実装構造

```txt
src/App.tsx                    # MVPの画面進行の中心
src/features/AddedTableGames.tsx # 追加テーブルゲーム6本の画面群
src/components/PartyScreens.tsx # Topbar、受け渡し、結果アクション、広告枠などの共通UI
src/core/gameRegistry.ts       # ゲーム登録
src/core/types.ts              # 共通型とGameId
src/core/storage.ts            # localStorage保存
src/core/adPolicy.ts           # 広告表示ルール
src/core/reloadSafety.ts       # 秘密情報phaseのリロード復帰保護
src/games/geoGuessr.ts         # Guessr状態、回答、採点
src/games/geoLocationRepository.ts
src/games/mapillaryProvider.ts
src/games/numberTalk.ts
src/games/werewolf.ts
src/games/drinkingGames.ts
src/data/numberTopics.ts
src/data/werewolfRoles.ts
src/data/drinkingGames.ts
public/data/geo/               # 本番出題地点データ
scripts/                       # 収集、検証、smoke
```

`App.tsx` はまだMVP用に大きいですが、追加テーブルゲーム6本の画面は `src/features/AddedTableGames.tsx` に分割済みです。さらに分割する場合は、現在の進行フロー、受け渡し、リロード保護を保ったまま移してください。

## ゲーム追加ルール

新しいゲームを追加するときは次の順番を守ってください。

1. `src/core/types.ts` の `GameId` に追加する。
2. `src/games/<game>.ts` にゲーム固有の型、config、state生成、判定ロジックを置く。
3. `src/core/gameRegistry.ts` に `GameDefinition` として登録する。
4. `App.tsx` へsetup/game画面を接続する。
5. 保存keyが既存ゲームと混ざらないことを確認する。
6. 秘密情報の受け渡し、リロード、広告非表示を確認する。
7. `docs/task-list.md` と必要な仕様docsを更新する。

飲み会ゲーム辞典へデータを追加するときは、`docs/drinking-games-database.md` を先に読んでください。AI/cron更新では、同じ遊びを別名で重複追加せず、既存レコードの `aliases` や `sourceRefs` へ寄せます。下ネタ寄りの元ネタ名は `hiddenAliases` に入れ、UIには婉曲なタイトルと説明だけを出します。カード、サイコロ、カップ、ブロックなどが核の候補は、辞典ではなく将来のアプリ内ミニゲーム候補として扱います。

禁止:

- 他ゲームのstateや型に直接依存する。
- 汎用coreからゲーム固有ファイルをimportする。
- 同じlocalStorage keyに複数ゲームの進行を混ぜる。

## 秘密情報と広告

秘密情報の代表:

- ナンバートークの数字
- ワンナイト人狼の役職、夜行動、投票
- Guessrの前プレイヤーの回答ピン、距離、スコア

次の画面では広告を出さないでください。

- 受け渡し
- 秘密確認
- Guessr回答中
- ワンナイト人狼投票中
- 夜行動中

広告表示判断は `src/core/adPolicy.ts` を通してください。
AdSenseは `VITE_ADSENSE_CLIENT` と `VITE_ADSENSE_SLOT` が両方ある場合だけ読み込みます。未設定時はプレースホルダー表示です。
AdSense本番有効化前に `/privacy.html`、`/terms.html`、必要地域の同意管理を確認してください。

## Mapillary運用

- ブラウザアプリは `VITE_MAPILLARY_ACCESS_TOKEN` を使う。
- 収集スクリプトは `MAPILLARY_ACCESS_TOKEN` を使う。
- `public/data/geo/playable-index.json` と `public/data/geo/chunks/*.json` が本番アプリの出題データ。
- `data-generated/` は生成途中の作業ディレクトリでgit管理外。
- Mapillary画像は `src/games/mapillaryProvider.ts` でアプリ内部型へ変換する。UIからMapillaryの生responseに直接依存しない。
- attributionリンクを消さない。
- 友人テスト前は `npm run audit:geo-images` でMapillary画像の実取得成功率を確認する。
- 問題画像を見つけたら `npm run geo:qa -- --id <location-id> --status rejected --dry-run` で確認し、問題なければ `--dry-run` なしで反映する。`playable-index.json` はスクリプトが再構築する。

## リリース前チェック

最低限:

```sh
npm run smoke
npm run typecheck
npm run build
```

UI変更がある場合:

- トップ、プレイヤー設定、3ゲームのsetupをスマホ幅で確認する。
- 飲み会ゲーム辞典で検索、国フィルタ、下ネタ特別フィルタが動くことを確認する。
- ナンバートークを結果まで進める。
- ワンナイト人狼を結果まで進める。
- 日本マップ当てでMapillary画像が出ることを確認する。
- リロード時に秘密情報へ直接戻らないことを確認する。

デプロイ後:

- https://party-deck.vercel.app が200で返ること。
- トップ画面でコンソールエラーがないこと。
- GuessrでMapillary実画像が表示されること。

## ドキュメント更新ルール

- 実装状態が変わったら `docs/task-list.md` を更新する。
- 仕様判断を変えたら `docs/user-stories.md` または `docs/implementation-spec.md` を更新する。
- 飲み会ゲーム辞典の追加方針を変えたら `docs/drinking-games-database.md` を更新する。
- Mapillary収集や品質方針を変えたら `docs/mapillary-integration-notes.md` と `docs/later-checklist.md` を更新する。
- 他のAIが次に迷いそうなことは `docs/maintenance-guide.md` に追記する。
