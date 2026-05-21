# 飲み会ゲーム辞典データベース設計

## 目的

飲み会ゲーム辞典は、道具なしでその場ですぐ遊べるゲームを探すためのテキストデータベースです。通常のゲーム実装とは違い、勝敗判定や秘密情報は持たず、ルール確認だけを提供します。

## 対象範囲

入れるもの:

- 道具なしで成立するゲーム
- スマホ、紙、カード、サイコロ、専用アプリがなくても説明できるゲーム
- 飲み会以外でもパーティゲームとして成立する会話、言葉、記憶、心理、ジェスチャー系ゲーム

入れないもの:

- カード、ボード、紙、ペン、サイコロ、専用アプリが必須のゲーム
- 飲酒強要を前提にしないと成立しないゲーム
- ルール文やお題が外部サービスのコピーになるもの

UIで表示するカテゴリは国だけです。国が特定できないもの、国を特定する意味が薄いものは `国際` または未設定にします。

## データ構造

実データは `src/data/drinkingGames.ts` に置きます。

```ts
type DrinkingGameRecord = {
  id: string;
  title: string;
  aliases: string[];
  country?: "日本" | "アメリカ" | "イギリス" | "国際";
  minPlayers: number;
  maxPlayers?: number;
  durationMin: number;
  summary: string;
  rules: string[];
  noEquipment: true;
  mechanics: string[];
  duplicateKey: string;
  aiReviewHint: string;
  sourceRefs: string[];
  reviewedAt: string;
};
```

重要フィールド:

- `aliases`: 日本語名、英語名、地域名、表記ゆれを入れる。
- `mechanics`: AI判定用の内部タグ。UIカテゴリとしては出さない。
- `duplicateKey`: 同じ核の遊びをまとめるためのキー。
- `aiReviewHint`: AIが「これは同じ遊びか、派生か」を判断するためのメモ。
- `sourceRefs`: `drinkingGameSourceRefs` のキーを入れる。URLを直接重複記述しない。
- `reviewedAt`: 最後に人間またはAIが確認した日付。

## 追加判定フロー

AI/cronで新候補を見つけたら、次の順番で判定します。

1. 道具なしで成立するか確認する。
2. 候補名を正規化する。英大小文字、全半角、記号、カタカナ表記ゆれを寄せる。
3. 既存の `title` と `aliases` に近いものがないか探す。
4. 既存の `duplicateKey` と同じ核のルールか確認する。
5. `mechanics` が大きく重なる場合は、まず既存レコードの派生として扱う。
6. 同じ遊びなら新規追加せず、既存レコードの `aliases`、`sourceRefs`、`aiReviewHint` を補強する。
7. 新しい遊びなら、新規 `DrinkingGameRecord` を追加する。
8. ルール文は外部サイトをコピーせず、短い独自文言で書く。
9. `npm run smoke`、`npm run typecheck`、`npm run build` を通す。

## 重複しやすい例

- `古今東西`、`山手線ゲーム`、`Categories` は同じ系統。
- `第一印象ゲーム` と `Most Likely To` は同じ核の指さし投票系。
- `Never Have I Ever`、`I Never`、`10 fingers` は同じ系統。
- `Buzz` と `21` はどちらも数えるゲームだが、Buzzは置換、21はルール蓄積が核なので別レコード。
- `NGワードゲーム`、`英語禁止ゲーム`、`数字禁止ゲーム` は近いが、制限対象が明確に違うので別レコードにしてよい。

## cron更新の将来設計

cronは直接 `main` にpushしません。候補を作り、差分をレビューできる形にします。

想定手順:

1. 国内外の飲み会ゲーム、party games、no equipment gamesの記事を検索する。
2. 候補を `{ title, aliases, country, sourceUrl, roughRules }` に正規化する。
3. 既存 `src/data/drinkingGames.ts` と照合する。
4. 重複なら既存レコード更新案を作る。
5. 新規なら新レコード案を作る。
6. 追加理由、重複でない理由、参照元をログに残す。
7. PRまたは作業ブランチで人間が確認する。

自動判定で迷う場合は追加しないで、候補リストに残します。辞典は件数よりも「同じゲームが名前違いで並ばないこと」を優先します。

## 初期調査で参照したページ

- Space Market: `spacemarket`
- 飲み会ゲーム.com: `nomigame`, `nomigameRate`
- Drinknation: `drinknation`
- CrowdSurf: `crowdsurf`
- Cheers & Fun: `cheersFun`
- Wikipedia: `wikipediaNever`, `wikipediaFingers`

各URLは `src/data/drinkingGames.ts` の `drinkingGameSourceRefs` を参照してください。
